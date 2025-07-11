import { ContenedoresRepository } from "../Class/Contenedores.js";
import { LotesRepository } from "../Class/Lotes.js";
import { ProcessError } from "../../Error/ProcessError.js";
import { readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { checkFinalizadoLote, deshidratacionLote, rendimientoLote } from "../api/utils/lotesFunctions.js";
import { have_lote_GGN_export } from "../controllers/validations.js";
import { RecordModificacionesRepository } from "../archive/ArchivoModificaciones.js";
import { VariablesDelSistema } from "../Class/VariablesDelSistema.js";
import { RedisRepository } from "../Class/RedisData.js";
import { registrarPasoLog } from "../api/helper/logs.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const calidadFile = JSON.parse(readFileSync(join(__dirname, '../../constants/calidad.json'), 'utf8'));

class ProcesoService {
    static async getContenedorAndLote(loteID, ContenedorID) {
        // Validar que se proporcionaron los IDs necesarios
        if (!loteID || !ContenedorID) {
            throw new ProcessError(400, "Se requieren tanto el ID del lote como el ID del contenedor");
        }

        //se obtienen los datos
        const contenedor = await ContenedoresRepository.get_Contenedores_sin_lotes({
            ids: [ContenedorID],
            select: { infoContenedor: 1, pallets: 1 },
            populate: {
                path: 'infoContenedor.clienteInfo',
                select: 'CLIENTE PAIS_DESTINO',
            }
        });

        // Validar que se encontró el contenedor y tiene la estructura esperada
        if (!contenedor || contenedor.length === 0) {
            throw new ProcessError(404, `No se encontró el contenedor con ID: ${ContenedorID}`);
        }

        if (!contenedor[0].infoContenedor || !contenedor[0].pallets) {
            throw new ProcessError(500, `El contenedor ${ContenedorID} no tiene la estructura de datos esperada`);
        }

        //se obtiene el lote
        const lotes = await LotesRepository.getLotes({
            ids: [loteID]
        });

        // Validar que se encontró el lote
        if (!lotes || lotes.length === 0) {
            throw new ProcessError(404, `No se encontró el lote con ID: ${loteID}`);
        }

        return { contenedor, lotes };
    }
    static async modificarSumarItemCopiaPallet(palletSeleccionado, item, lotes, GGN) {
        const { lote, calibre, calidad, cajas } = item
        const index = palletSeleccionado.findIndex(data =>
            data.lote === lote &&
            data.calidad === calidad &&
            data.calibre === calibre
        )
        if (index === -1) {
            const itemnuevo = {
                ...item,
                SISPAP: lotes[0].predio.SISPAP,
                GGN
            }
            palletSeleccionado.push(itemnuevo)

        } else {
            palletSeleccionado[index].cajas += cajas

        }
    }
    static async crearQueryLoteIngresoItemListaEmpaque(item, loteModificado, _id, GGN) {
        const { cajas, calidad } = item
        //modificar el predio
        const kilos = Number(item.tipoCaja.split('-')[1].replace(",", ".")) * cajas

        //se guarda el registro
        const antes = {
            [calidadFile[calidad]]: loteModificado[calidadFile[calidad]],
            deshidratacion: loteModificado.deshidratacion,
            rendimiento: loteModificado.rendimiento,
        }
        loteModificado[calidadFile[calidad]] += kilos
        loteModificado.deshidratacion = await deshidratacionLote(loteModificado)
        loteModificado.rendimiento = await rendimientoLote(loteModificado)

        const query = {
            $inc: {
                [calidadFile[calidad]]: kilos,
            },
            $addToSet: { contenedores: _id },
            deshidratacion: loteModificado.deshidratacion,
            rendimiento: loteModificado.rendimiento,
        }
        console.log(GGN)
        if (GGN) {
            query.$inc.kilosGGN = kilos
            antes.kilosGGN = loteModificado.kilosGGN
        }


        return { query, antes, kilos: kilos }
    }
    static async eliminar_items_contenedor(contenedor, palletsModificados, copiaPallet, seleccion, pallet, logContext) {

        //se eliminan los items del contenedor
        const len = seleccion.length;

        for (let i = 0; i < len; i++) {
            palletsModificados[pallet]["EF1"].splice(seleccion[i], 1)[0];
        }

        // Actualizar contenedor con pallets modificados
        await ContenedoresRepository.actualizar_contenedor(
            { _id: contenedor._id },
            {
                $set: { [`pallets.${pallet}`]: palletsModificados[pallet] }
            }
        );

        // Registrar modificación Contenedores
        await RecordModificacionesRepository.post_record_contenedor_modification(
            logContext.action,
            logContext.user,
            {
                modelo: "Contenedor",
                documentoId: contenedor._id,
                descripcion: `Se eliminaron los items ${seleccion} en el pallet ${pallet}`,
            },
            copiaPallet[pallet],
            palletsModificados[pallet],
            { _id: contenedor._id, pallet, seleccion, action: logContext.action }
        );
        await registrarPasoLog(logContext.logId, "ProcesoService.eliminar_items_contenedor", "Completado");

    }
    static async restar_kilos_lote_indicadores(itemsDelete, logContext) {

        //se recorren para restar los kilos en los lotes
        const hoy = new Date();
        for (let i = 0; i < itemsDelete.length; i++) {
            const { tipoCaja, cajas, fecha } = itemsDelete[i]

            const mult = Number(tipoCaja.split("-")[1].replace(",", "."))
            const kilos = cajas * mult;
            //se mira si es fruta de hoy para restar de las variables del proceso
            const fechaSeleccionada = new Date(fecha)

            // Ajustamos la fecha seleccionada restando 5 horas:
            fechaSeleccionada.setHours(fechaSeleccionada.getHours() - 5);

            // Ahora comparamos solo día, mes y año:
            if (
                fechaSeleccionada.getFullYear() === hoy.getFullYear() &&
                fechaSeleccionada.getMonth() === hoy.getMonth() &&
                fechaSeleccionada.getDate() === hoy.getDate()
            ) {
                await this.modificarIndicadoresFecha(itemsDelete[i], Number(-kilos), logContext.logId);
            }
        }
        await registrarPasoLog(logContext.logId, "restar_kilos_lote_indicadores", "Completado");

    }
    static async restar_kilos_lote(lotes, itemsDelete, contenedor, logContext) {

        for (let i = 0; i < itemsDelete.length; i++) {
            const { lote, calidad, tipoCaja, cajas } = itemsDelete[i]
            const calidadItem = calidadFile[calidad]

            const mult = Number(tipoCaja.split("-")[1].replace(",", "."))
            const kilos = cajas * mult;

            //se le restan los kilos a el lote correspondiente
            const loteIndex = lotes.findIndex(item => item._id.toString() === lote)
            lotes[loteIndex][calidadItem] += - kilos

            // si se restan los kilos ggn
            if (have_lote_GGN_export(lotes[loteIndex], contenedor, itemsDelete)) {
                lotes[loteIndex].kilosGGN += - kilos
            }

            lotes[loteIndex].deshidratacion = await deshidratacionLote(lotes[loteIndex].toObject())
            lotes[loteIndex].rendimiento = await rendimientoLote(lotes[loteIndex].toObject())
        }

        const operations = lotes.map(loteDoc => ({
            updateOne: {
                filter: { _id: loteDoc._id },
                update: {
                    $set: {
                        calidad1: loteDoc.calidad1,
                        calidad15: loteDoc.calidad15,
                        calidad2: loteDoc.calidad2,
                        kilosGGN: loteDoc.kilosGGN,
                        deshidratacion: loteDoc.deshidratacion,
                        rendimiento: loteDoc.rendimiento
                    }
                }
            }
        }));

        await LotesRepository.bulkWrite(operations)
        await registrarPasoLog(logContext.logId, "restar_kilos_lote", "Completado");
    }
    static async restarItem_contenedor(contenedor, palletsModificados, copiaPallet, pallet, seleccion, cajas, logContext) {

        const itemSeleccionado = palletsModificados[pallet].EF1[seleccion];

        itemSeleccionado.cajas -= cajas

        if (itemSeleccionado.cajas === 0) {
            palletsModificados[pallet].EF1.splice(seleccion, 1);
        }

        // Actualizar contenedor con pallets modificados
        await ContenedoresRepository.actualizar_contenedor(
            { _id: contenedor._id },
            {
                $set: { [`pallets.${pallet}`]: palletsModificados[pallet] }
            }
        );

        // Registrar modificación Contenedores
        await RecordModificacionesRepository.post_record_contenedor_modification(
            logContext.action,
            logContext.user,
            {
                modelo: "Contenedor",
                documentoId: contenedor._id,
                descripcion: `Se resto ${cajas} de ${seleccion} en el pallet ${pallet}`,
            },
            copiaPallet[pallet],
            palletsModificados[pallet],
            { action: logContext.action, _id: contenedor._id, pallet, seleccion, cajas }
        );

        await registrarPasoLog(logContext.logId, "ProcesoService.restarItem_contenedor", "Completado");

    }
    static async restarItem_lote(lote, copiaItemSeleccionado, kilos, contenedor, logContext) {

        console.log(lote)
        lote[calidadFile[copiaItemSeleccionado.calidad]] -= kilos

        const query = {
            $inc: {
                [calidadFile[copiaItemSeleccionado.calidad]]: - kilos
            },
            deshidratacion: lote.deshidratacion,
            rendimiento: lote.rendimiento,
        }

        // si se restan los kilos ggn
        const GGN = have_lote_GGN_export(lote, contenedor[0])
        if (GGN) {
            query.$inc.kilosGGN = - kilos
        }

        await LotesRepository.actualizar_lote(
            { _id: lote._id },
            query,
            {
                new: true,
                user: logContext._id,
                action: logContext.action
            }
        )
        await registrarPasoLog(logContext.logId, "ProcesoService.restarItem_lote", "Completado");


    }
    static async restarItem_variablesSistema(itemSeleccionado, kilos, lote) {
        //se mira si es fruta de hoy para restar de las variables del proceso
        const fechaSeleccionada = new Date(itemSeleccionado.fecha);
        const hoy = new Date();

        // Ajustamos la fecha seleccionada restando 5 horas:
        fechaSeleccionada.setHours(fechaSeleccionada.getHours() - 5);

        // Ahora comparamos solo día, mes y año:
        if (
            fechaSeleccionada.getFullYear() === hoy.getFullYear() &&
            fechaSeleccionada.getMonth() === hoy.getMonth() &&
            fechaSeleccionada.getDate() === hoy.getDate()
        ) {
            await VariablesDelSistema.ingresar_kilos_procesados2(-kilos, lote.tipoFruta)
            await VariablesDelSistema.ingresar_exportacion2(-kilos, lote.tipoFruta)
        }

    }
    static async ingresarDataExportacionDiaria(tipoFruta, calidad, calibre, kilos) {
        console.info(`Ingresar exportacion ${kilos} a la fruta ${tipoFruta} con calidad ${calidad} y calibre ${calibre}`)

        const cliente = await RedisRepository.getClient()

        const multi = cliente.multi();

        VariablesDelSistema.sumarMetricaSimpleDirect("kilosProcesadosHoy", tipoFruta, kilos, multi);
        VariablesDelSistema.sumarMetricaSimpleDirect("kilosExportacionHoy", tipoFruta, kilos, multi);
        VariablesDelSistema.sumarMetricaSimpleDirect(`exportacion:${tipoFruta}:calidad${calidad}`, calibre, kilos, multi);

        const results = await multi.exec();
        console.info("Resultados de Redis:", results);
        if (results.length === 0) {
            throw new ProcessError(471, "Transacción Redis abortada. Revisa si hubo cambios concurrentes o tipos incorrectos en claves.");
        }
    }
    static async modifiarContenedorPalletsListaEmpaque(lotes, contenedor, pallet, item, _id, cajas, GGN, action, user) {
        // Crear copia profunda de los pallets
        const palletsModificados = JSON.parse(JSON.stringify(contenedor[0].pallets));
        const palletSeleccionado = palletsModificados[pallet].EF1;


        //copia del original
        const copiaPallets = JSON.parse(JSON.stringify(contenedor[0].pallets));

        // Actualizar contenedor con pallets modificados
        await ProcesoService.modificarSumarItemCopiaPallet(palletSeleccionado, item, lotes, GGN)

        await ContenedoresRepository.actualizar_contenedor(
            { _id },
            {
                $set: { [`pallets.${pallet}.EF1`]: palletSeleccionado }
            }
        );

        // Registrar modificación Contenedores
        await RecordModificacionesRepository.post_record_contenedor_modification(
            action,
            user,
            {
                modelo: "Contenedor",
                documentoId: _id,
                descripcion: `Se sumaron ${cajas} en el pallet ${pallet}`,
            },
            copiaPallets[pallet],
            palletsModificados[pallet],
            { _id, pallet, item, action }
        );

        return { GGN, }
    }
    static async modificarContenedorModificarItemListaEmpaque(palletsModificados, palletSeleccionado, newKilos, copiaPallet, item, user) {

        const { _id, pallet, seleccion, data, action } = item
        const { calidad, calibre, cajas, tipoCaja } = data


        if (newKilos === 0) {
            //se elimina el elemento si es 0
            palletsModificados[pallet].EF1.splice(seleccion, 1);
        } else {
            // Aplicar modificaciones
            Object.assign(palletSeleccionado, { calidad, calibre, cajas, tipoCaja });
        }

        // Actualizar contenedor con pallets modificados
        await ContenedoresRepository.actualizar_contenedor(
            { _id },
            { pallets: palletsModificados }
        );

        // Registrar modificación
        await RecordModificacionesRepository.post_record_contenedor_modification(
            action,
            user,
            {
                modelo: "Contenedor",
                documentoId: _id,
                descripcion: `Actualización pallet ${pallet}, posición ${seleccion}`,
            },
            copiaPallet,
            palletSeleccionado,
            { pallet, seleccion }
        );

    }
    static async modificarLoteModificarItemListaEmpaque(oldData, palletSeleccionado, oldKilos, newKilos, calidad, lote, GGN) {

        //se guarda el registro
        const antes = {
            [calidadFile[oldData.calidad]]: lote[0][calidadFile[oldData.calidad]],
        }

        const query = {
            $inc: {
            }
        }

        if (calidad === oldData.calidad) {
            const total = newKilos - oldKilos
            query.$inc[calidadFile[palletSeleccionado.calidad]] = total
        } else {
            query.$inc[calidadFile[oldData.calidad]] = -oldKilos
            query.$inc[calidadFile[palletSeleccionado.calidad]] = newKilos
        }

        //se mira si se deben sumar kilosGNN
        if (GGN) {
            const total = newKilos - oldKilos
            query.$inc.kilosGGN = total
            antes.kilosGGN = lote[0].kilosGGN
        }

        await LotesRepository.actualizar_lote(
            { _id: oldData.lote },
            query
        )

    }
    static async modificarIndicadoresModificarItemsListaEmpaque(palletSeleccionado, oldKilos, newKilos) {
        //se mira si es fruta de hoy para restar de las variables del proceso
        const fechaSeleccionada = new Date(palletSeleccionado.fecha)
        const hoy = new Date()
        // Ajustamos la fecha seleccionada restando 5 horas:
        fechaSeleccionada.setHours(fechaSeleccionada.getHours() - 5);

        // Ahora comparamos solo día, mes y año:
        if (
            fechaSeleccionada.getFullYear() === hoy.getFullYear() &&
            fechaSeleccionada.getMonth() === hoy.getMonth() &&
            fechaSeleccionada.getDate() === hoy.getDate()
        ) {
            await VariablesDelSistema.ingresar_kilos_procesados2(-oldKilos, palletSeleccionado.tipoFruta)
            await VariablesDelSistema.ingresar_exportacion2(-oldKilos, palletSeleccionado.tipoFruta)

            await VariablesDelSistema.ingresar_kilos_procesados2(newKilos, palletSeleccionado.tipoFruta)
            await VariablesDelSistema.ingresar_exportacion2(newKilos, palletSeleccionado.tipoFruta)
        }

    }
    static async modificarLoteEliminarItemdesktopListaEmpaque(palletSeleccionado, copiaPalletSeleccionado, lote, kilos, GGN, user, logId = null) {
        //El objeto que lleva la data vieja para el registro
        const oldDataRegistro = {
            [calidadFile[palletSeleccionado.calidad]]: lote[0][calidadFile[palletSeleccionado.calidad]]
        }

        //El objeto que va a modificar la coleccion, se suma -kilos ya calculados
        const query = {
            $inc: {
                [calidadFile[palletSeleccionado.calidad]]: -kilos
            }
        }

        //se mira si se deben sumar kilosGNN
        if (GGN) {
            query.$inc.kilosGGN = -kilos
            oldDataRegistro.kilosGGN = lote[0].kilosGGN
        }

        await LotesRepository.actualizar_lote(
            { _id: copiaPalletSeleccionado.lote },
            query,
            { user: user._id, action: "put_proceso_aplicaciones_listaEmpaque_eliminarItem_desktop" }
        )


        if (logId) await registrarPasoLog(logId, "modificarLoteEliminarItemdesktopListaEmpaque", "Completado", `cajas eliminadas: ${copiaPalletSeleccionado.cajas}, kilos: ${kilos}, lote: ${copiaPalletSeleccionado.lote}`);

    }
    static async modificarPalletModificarItemsListaEmpaque(palletsModificados, copiaPallet, pallet, seleccion, calidad, calibre, tipoCaja, _id, action, user, logID = null) {

        for (let i = 0; i < seleccion.length; i++) {
            const palletSeleccionado = palletsModificados[pallet].EF1[seleccion[i]];
            Object.assign(palletSeleccionado, { calidad, calibre, tipoCaja });
        }

        // Actualizar contenedor con pallets modificados
        await ContenedoresRepository.actualizar_contenedor(
            { _id },
            { pallets: palletsModificados }
        );

        // Registrar modificación
        await RecordModificacionesRepository.post_record_contenedor_modification(
            action,
            user,
            {
                modelo: "Contenedor",
                documentoId: _id,
                descripcion: `Actualización pallet ${pallet}, posición ${seleccion}`,
            },
            copiaPallet[pallet].EF1,
            palletsModificados[pallet].EF1,
            { pallet, seleccion }
        );

        if (logID) {
            await registrarPasoLog(logID, "modificarPalletModificarItemsListaEmpaque", "Completado", `se modificaron los items seleccionados en el pallet ${pallet}`);
        }


    }
    static async modificarLotesModificarItemsListaEmpaque(lotes, copiaPallet, palletsModificados, seleccion, pallet, contenedor, logID = null) {
        const lotesModificados = JSON.parse(JSON.stringify(lotes));

        for (let i = 0; i < seleccion.length; i++) {
            const itemSeleccionadoOld = copiaPallet[pallet].EF1[seleccion[i]];
            const itemSeleccionadoNew = palletsModificados[pallet].EF1[seleccion[i]];

            if (itemSeleccionadoOld.tipoCaja !== itemSeleccionadoNew.tipoCaja ||
                itemSeleccionadoOld.calidad !== itemSeleccionadoNew.calidad) {
                const oldKilos = itemSeleccionadoOld.cajas * Number(itemSeleccionadoOld.tipoCaja.split("-")[1].replace(",", "."));
                const newKilos = itemSeleccionadoNew.cajas * Number(itemSeleccionadoNew.tipoCaja.split("-")[1].replace(",", "."));

                const loteIndex = lotesModificados.findIndex(lote => lote._id.toString() === itemSeleccionadoOld.lote);
                lotesModificados[loteIndex][calidadFile[itemSeleccionadoOld.calidad]] += - oldKilos;
                lotesModificados[loteIndex][calidadFile[itemSeleccionadoNew.calidad]] += newKilos;

                lotesModificados[loteIndex].deshidratacion = await deshidratacionLote(lotesModificados[loteIndex])
                lotesModificados[loteIndex].rendimiento = await rendimientoLote(lotesModificados[loteIndex])

                // si se restan los kilos ggn
                if (have_lote_GGN_export(lotesModificados[loteIndex], contenedor, itemSeleccionadoOld)) {
                    lotesModificados[loteIndex].kilosGGN += - oldKilos;
                    lotesModificados[loteIndex].kilosGGN += newKilos;
                }
            }
        }


        const operations = lotesModificados.map(loteDoc => ({
            updateOne: {
                filter: { _id: loteDoc._id },
                update: {
                    $set: {
                        calidad1: loteDoc.calidad1,
                        calidad15: loteDoc.calidad15,
                        calidad2: loteDoc.calidad2,
                        kilosGGN: loteDoc.kilosGGN,
                        deshidratacion: loteDoc.deshidratacion,
                        rendimiento: loteDoc.rendimiento
                    }
                }
            }
        }));

        await LotesRepository.bulkWrite(operations);

        if (logID) {
            await registrarPasoLog(logID, "modificarLotesModificarItemsListaEmpaque", "Completado", `se modificaron los lotes de los items seleccionados en el pallet ${pallet}`);
        }

    }
    static async modificarIndicadorExportacion(palletsModificados, copiaPallet, seleccion, pallet, logID = null) {

        const cliente = await RedisRepository.getClient()

        const multi = cliente.multi();
        let comandosEnviados = 0;

        for (let i = 0; i < seleccion.length; i++) {
            const itemSeleccionadoOld = copiaPallet[pallet].EF1[seleccion[i]];
            const itemSeleccionadoNew = palletsModificados[pallet].EF1[seleccion[i]];

            //se mira si es fruta de hoy para restar de las variables del proceso
            const fechaSeleccionada = new Date(itemSeleccionadoOld.fecha)
            const hoy = new Date()
            // Ajustamos la fecha seleccionada restando 5 horas:
            fechaSeleccionada.setHours(fechaSeleccionada.getHours() - 5);

            if (
                fechaSeleccionada.getFullYear() === hoy.getFullYear() &&
                fechaSeleccionada.getMonth() === hoy.getMonth() &&
                fechaSeleccionada.getDate() === hoy.getDate()
            ) {
                if (itemSeleccionadoOld.tipoCaja !== itemSeleccionadoNew.tipoCaja ||
                    itemSeleccionadoOld.calidad !== itemSeleccionadoNew.calidad ||
                    itemSeleccionadoOld.calibre !== itemSeleccionadoNew.calibre
                ) {
                    const kilosOld = itemSeleccionadoOld.cajas * Number(itemSeleccionadoOld.tipoCaja.split("-")[1].replace(",", "."));
                    VariablesDelSistema.sumarMetricaSimpleDirect(
                        `exportacion:${itemSeleccionadoOld.tipoFruta}:calidad${itemSeleccionadoOld.calidad}`,
                        itemSeleccionadoOld.calibre,
                        -kilosOld,
                        multi
                    );
                    const kilosNew = itemSeleccionadoNew.cajas * Number(itemSeleccionadoNew.tipoCaja.split("-")[1].replace(",", "."));
                    VariablesDelSistema.sumarMetricaSimpleDirect(
                        `exportacion:${itemSeleccionadoNew.tipoFruta}:calidad${itemSeleccionadoNew.calidad}`,
                        itemSeleccionadoNew.calibre,
                        kilosNew,
                        multi
                    );
                    comandosEnviados += 2
                }
            }
        }
        let results = [];
        if (comandosEnviados > 0) {
            results = await multi.exec();
            console.info("Resultados de Redis:", results);
            if (results.length === 0) {
                throw new ProcessError(471, "Transacción Redis abortada. Revisa si hubo cambios concurrentes o tipos incorrectos en claves.");
            }
        } else {
            console.log("No hubo cambios que enviar a Redis, transacción vacía.");
        }

        if (logID) {
            await registrarPasoLog(logID, "modificarIndicadorExportacion", "Completado", `se modificaron los lotes de los items seleccionados en el pallet ${pallet}`);
        }

    }
    static async modificarLotedescartes(_id, query, user, action) {

        const lote = await LotesRepository.getLotes({ ids: [_id] })
        const result = checkFinalizadoLote(lote)
        if (result) {
            throw new ProcessError(400, `El lote ${lote[0].nombre} ya se encuentra finalizado, no se puede modificar`);
        }

        const loteModificado = await LotesRepository.actualizar_lote(
            { _id: _id },
            query,
            { user: user._id, action: action }
        )

        return loteModificado;
    }

    // mirar si se puede usar en otro lado
    static async obtenerContenedorLote(_id, pallet, seleccion) {
        const contenedor = await ContenedoresRepository.get_Contenedores_sin_lotes({
            ids: [_id],
            select: { infoContenedor: 1, pallets: 1 },
            populate: {
                path: 'infoContenedor.clienteInfo',
                select: 'CLIENTE PAIS_DESTINO',
            }
        })
        const palletsModificados = contenedor[0].pallets;
        const palletSeleccionado = palletsModificados[pallet].get('EF1')[seleccion];

        //se obtiene el lote
        const lote = await LotesRepository.getLotes({
            ids: [palletSeleccionado.lote],
            select: { predio: 1, [calidadFile[palletSeleccionado.calidad]]: 1, exportacionGGN: 1, finalizado: 1, enf: 1 }
        });

        return {
            contenedor, lote
        }

    }
    static async obtenerContenedorLotes(_id, pallet, seleccion) {
        let lotesIds = [];
        let itemsDelete = [];

        const contenedor = await ContenedoresRepository.get_Contenedores_sin_lotes({
            ids: [_id],
            select: { infoContenedor: 1, pallets: 1 },
            populate: {
                path: 'infoContenedor.clienteInfo',
                select: 'CLIENTE PAIS_DESTINO',
            }
        })
        const palletsModificados = contenedor[0].pallets;
        //se eliminan los items del contenedor
        const len = seleccion.length;

        for (let i = 0; i < len; i++) {
            const index = seleccion[i];
            const ef1Array = palletsModificados[pallet].get('EF1');
            lotesIds.push(ef1Array[index].lote);
            itemsDelete.push(ef1Array[index]);
        }

        const lotesSet = new Set(lotesIds)
        const lotesArrIds = [...lotesSet]

        //se obtiene el lote
        const lotes = await LotesRepository.getLotes({
            ids: lotesArrIds,
            limite: 'all'
        })

        return {
            contenedor, lotes, itemsDelete
        }

    }
    static async obtenerContenedorLotesModificar(contenedor1, contenedor2) {

        const { _id: id1, pallet: pallet1 } = contenedor1
        const { _id: id2 } = contenedor2
        // se obtienen los contenedores a modificar
        const contenedores = await ContenedoresRepository.get_Contenedores_sin_lotes({
            ids: [id1, id2],
            select: { infoContenedor: 1, pallets: 1, numeroContenedor: 1 },
            populate: {
                path: 'infoContenedor.clienteInfo',
                select: 'CLIENTE PAIS_DESTINO',
            }
        })

        const [index1, index2] = id1 === id2 ? [0, 0] : [
            contenedores.findIndex(c => c._id.toString() === id1),
            contenedores.findIndex(c => c._id.toString() === id2)
        ];

        const seleccionOrdenado = contenedor1.seleccionado.sort((a, b) => b - a);
        let lotesIds = []

        const palletsModificados1 = contenedores[index1].pallets;

        for (let i = 0; i < seleccionOrdenado.length; i++) {
            lotesIds.push(palletsModificados1[pallet1].get('EF1')[seleccionOrdenado[i]].lote)
        }
        const lotesIdsArr = [...new Set(lotesIds)];

        const lotes = await LotesRepository.getLotes({ ids: lotesIdsArr, limit: 'all' });

        return { lotes, contenedores, index1, index2 }
    }
    static async crearCopiaProfundaPallets(contenedor) {
        // Convertimos a objeto plano si es un documento Mongoose
        const contenedorObj = contenedor?.toObject?.() ? contenedor.toObject() : contenedor;

        // Convertimos cada pallet (si es Map) a objeto plano
        const palletsPlanos = contenedorObj.pallets.map(pallet =>
            pallet instanceof Map ? Object.fromEntries(pallet) : pallet
        );

        // Clonamos profundamente para trabajar sin mutar los originales
        const palletsModificados = structuredClone(palletsPlanos);
        const copiaPallet = structuredClone(palletsPlanos);

        return {
            palletsModificados,
            copiaPallet
        };
    }
    static async modificarIndicadoresFecha(copiaPalletSeleccionado, kilos, logId) {
        //se mira si es fruta de hoy para restar de las variables del proceso
        const fechaSeleccionada = new Date(copiaPalletSeleccionado.fecha)
        const hoy = new Date()
        // Ajustamos la fecha seleccionada restando 5 horas:
        fechaSeleccionada.setHours(fechaSeleccionada.getHours() - 5);

        // Ahora comparamos solo día, mes y año:
        if (
            fechaSeleccionada.getFullYear() === hoy.getFullYear() &&
            fechaSeleccionada.getMonth() === hoy.getMonth() &&
            fechaSeleccionada.getDate() === hoy.getDate()
        ) {
            const tipoFruta = copiaPalletSeleccionado.tipoFruta;
            const calidad = copiaPalletSeleccionado.calidad;
            const calibre = copiaPalletSeleccionado.calibre;

            const cliente = await RedisRepository.getClient()

            const multi = cliente.multi();

            VariablesDelSistema.sumarMetricaSimpleDirect("kilosProcesadosHoy", tipoFruta, Number(kilos), multi);
            VariablesDelSistema.sumarMetricaSimpleDirect("kilosExportacionHoy", tipoFruta, Number(kilos), multi);
            VariablesDelSistema.sumarMetricaSimpleDirect(`exportacion:${tipoFruta}:calidad${calidad}`, calibre, Number(kilos), multi);

            const results = await multi.exec();
            console.info("Resultados de Redis:", results);
            if (results.length === 0) {
                throw new ProcessError(471, "Transacción Redis abortada. Revisa si hubo cambios concurrentes o tipos incorrectos en claves.");
            }

            await registrarPasoLog(logId, "modificarIndicadoresFecha", "Completado", `se modificaron ${kilos} kilos de la fruta ${tipoFruta} con calidad ${calidad} y calibre ${calibre}`);

        }
    }
}

export { ProcesoService };