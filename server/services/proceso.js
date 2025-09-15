import { ContenedoresRepository } from "../Class/Contenedores.js";
import { LotesRepository } from "../Class/Lotes.js";
import { ProcessError } from "../../Error/ProcessError.js";
import { checkFinalizadoLote } from "../api/utils/lotesFunctions.js";
import { have_lote_GGN_export } from "../controllers/validations.js";
import { RecordModificacionesRepository } from "../archive/ArchivoModificaciones.js";
import { VariablesDelSistema } from "../Class/VariablesDelSistema.js";
import { RedisRepository } from "../Class/RedisData.js";
import { registrarPasoLog } from "../api/helper/logs.js";
import { getColombiaDate } from "../api/utils/fechas.js";
import { UsuariosRepository } from "../Class/Usuarios.js";
import { normalizeEF1Item } from "./helpers/contenedores.js";


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
        const lotes = await LotesRepository.getLotes2({
            ids: [loteID]
        });
        console.log("se obtiene el lote", lotes)
        // Validar que se encontró el lote
        if (!lotes || lotes.length === 0) {
            throw new ProcessError(404, `No se encontró el lote con ID: ${loteID}`);
        }

        return { contenedor, lotes };
    }
    static async modificarLoteListaEmpaqueAddItem(calidad, kilos, lote, _id, GGN, logData) {
        const path = `exportacion.${_id}.${calidad}`;
        const query = {
            $inc: {
                [path]: kilos,
            },
            $addToSet: { contenedores: _id },
        }
        if (GGN) {
            query.$inc.kilosGGN = kilos
        }

        await LotesRepository.actualizar_lote(
            { _id: lote._id },
            query,
            { user: logData.user, action: logData.action }
        );
        await registrarPasoLog(logData.logId, "ProcesoService.modificarLoteListaEmpaqueAddItem", "Completado");
        return true
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
        const hoy = getColombiaDate();
        for (let i = 0; i < itemsDelete.length; i++) {
            const { tipoCaja, cajas, fecha } = itemsDelete[i]

            const mult = Number(tipoCaja.split("-")[1].replace(",", "."))
            const kilos = cajas * mult;
            //se mira si es fruta de hoy para restar de las variables del proceso
            const fechaSeleccionada = getColombiaDate(new Date(fecha));

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

            const mult = Number(tipoCaja.split("-")[1].replace(",", "."))
            const kilos = cajas * mult;
            const query = { $inc: {} }

            //se le restan los kilos a el lote correspondiente
            const loteIndex = lotes.findIndex(item => item._id.toString() === lote)
            const path = `exportacion.${contenedor[0]._id}.${calidad}`;
            query.$inc[path] = - kilos

            // si se restan los kilos ggn
            if (have_lote_GGN_export(lotes[loteIndex], contenedor, itemsDelete)) {
                query.$inc.kilosGGN = - kilos
            }

            await LotesRepository.actualizar_lote(
                { _id: lotes[loteIndex]._id },
                query,
                {
                    new: true,
                    user: logContext.user,
                    action: logContext.action
                }
            );
        }

        await registrarPasoLog(logContext.logId, "restar_kilos_lote", "Completado");
    }
    static async mover_kilos_lotes_entrcontenedores(
        contenedores, index1, index2, contenedor1, contenedor2, seleccionOrdenado, palletsModificados1, palletsModificados2, lotes, logContext
    ) {

        const { _id: id1, pallet: pallet1 } = contenedor1
        const { _id: id2, pallet: pallet2 } = contenedor2

        for (let i = 0; i < seleccionOrdenado.length; i++) {

            // se mira si el item pasa a un contenedor GGN y se agrega o se quita
            const itemSplice = palletsModificados1[pallet1].EF1.splice(seleccionOrdenado[i], 1)[0]
            const lote = lotes.find(l => l._id.toString() === itemSplice.lote)


            const oldGGN = have_lote_GGN_export(lote, contenedores[index1], palletsModificados1)
            const GGN = have_lote_GGN_export(lote, contenedores[index2], palletsModificados2)

            if (((oldGGN !== GGN) || !lote.contenedores.includes(id2)) && lote.finalizado) {
                throw new ProcessError(400, `El lote ${lote.enf} ya se encuentra finalizado, no se puede modificar`);
            }

            palletsModificados2[pallet2].EF1.push({ ...itemSplice, GGN });

            const kilos = itemSplice.cajas * Number(itemSplice.tipoCaja.split('-')[1].replace(",", "."))
            console.log(itemSplice)
            const calidad = itemSplice.calidad;

            let updateLote = { $addToSet: { contenedores: id2 } };
            const path1 = `exportacion.${id1}.${calidad}`;
            const path2 = `exportacion.${id2}.${calidad}`;

            updateLote.$inc = { [path1]: -kilos, [path2]: kilos };

            if (oldGGN && !GGN) {
                updateLote.$inc = { kilosGGN: -kilos };
            } else if (!oldGGN && GGN) {
                updateLote.$inc = { kilosGGN: kilos };
            }

            if (id1 !== id2) {
                await LotesRepository.actualizar_lote(
                    { _id: lote._id },
                    updateLote,
                    {
                        new: true,
                        user: logContext.user,
                        action: logContext.action
                    }
                );
            }

            if (logContext.logId) {
                await registrarPasoLog(logContext.logId, "ProcesoService.mover_kilos_lotes_entrcontenedores", "Completado", `Se movieron ${kilos} kilos de ${lote.enf} de ${id1} a ${id2}`);
            }
        }

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

        const path = `exportacion.${contenedor[0]._id}.${copiaItemSeleccionado.calidad}`;
        lote[path] -= kilos

        const query = {
            $inc: {
                [path]: - kilos
            },
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
    static async ingresarDataExportacionDiaria(tipoFruta, calidad, calibre, kilos, logId = null) {

        const cliente = await RedisRepository.getClient()

        const multi = cliente.multi();

        VariablesDelSistema.sumarMetricaSimpleDirect("kilosProcesadosHoy", tipoFruta, kilos, multi);
        VariablesDelSistema.sumarMetricaSimpleDirect("kilosExportacionHoy", tipoFruta, kilos, multi);
        VariablesDelSistema.sumarMetricaSimpleDirect(`exportacion:${tipoFruta}:${calidad}`, calibre, kilos, multi);

        const results = await multi.exec();
        console.info("Resultados de Redis:", results);
        if (results.length === 0) {
            throw new ProcessError(471, "Transacción Redis abortada. Revisa si hubo cambios concurrentes o tipos incorrectos en claves.");
        }
        if (logId) {
            await registrarPasoLog(logId.logId, "ProcesoService.ingresarDataExportacionDiaria", "Completado", `Ingresados ${kilos} kilos de ${tipoFruta} calidad ${calidad} calibre ${calibre}`);
        }
        return true;
    }
    static async modifiarContenedorPalletsListaEmpaque(lotes, palletsModificados, copiaPallets, pallet, item, _id, GGN, logData) {
        const { user, action } = logData

        const palletSeleccionado = palletsModificados[pallet].EF1;
        // Actualizar contenedor con pallets modificados
        const { lote, calibre, calidad, cajas } = item
        const index = palletSeleccionado.findIndex(data =>
            data.lote === lote &&
            data.calidad === calidad &&
            data.calibre === calibre
        )

        if (index === -1) {
            const itemnuevo = normalizeEF1Item({
                ...item,
                SISPAP: lotes?.[0]?.predio?.SISPAP ?? false,
                GGN
            })
            palletSeleccionado.push(itemnuevo)

        } else {
            palletSeleccionado[index].cajas += cajas
        }

        console.log("palletSeleccionado", palletSeleccionado)

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

        await registrarPasoLog(logData.logId, "ProcesoService.modifiarContenedorPalletsListaEmpaque", "Completado");
        return { GGN, }
    }
    static async modificarContenedorModificarItemListaEmpaque(palletsModificados, palletSeleccionado, newKilos, copiaPallet, item, logData = null) {

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
            logData.user,
            {
                modelo: "Contenedor",
                documentoId: _id,
                descripcion: `Actualización pallet ${pallet}, posición ${seleccion}`,
            },
            copiaPallet,
            palletSeleccionado,
            { pallet, seleccion }
        );
        if (logData) {
            await registrarPasoLog(logData.logId, "modificarLoteModificarItemListaEmpaque", "Completado", `se modificó el item seleccionado en el pallet ${pallet} con calidad ${calidad}, calibre ${calibre} y cajas ${cajas}  `);
        }

    }
    static async modificarLoteModificarItemListaEmpaque(contenedorId, oldKilos, newKilos, oldCalidad, calidad, lote, GGN, logData = null) {

        //se guarda el registro
        const antes = {
            [`exportacion.${contenedorId}.${calidad}`]: lote.exportacion[contenedorId][calidad]
        }

        const query = {
            $inc: {
            }
        }

        if (calidad === oldCalidad) {
            const total = newKilos - oldKilos
            query.$inc[`exportacion.${contenedorId}.${calidad}`] = total
        } else {
            query.$inc[`exportacion.${contenedorId}.${oldCalidad}`] = -oldKilos
            query.$inc[`exportacion.${contenedorId}.${calidad}`] = newKilos
        }

        //se mira si se deben sumar kilosGNN
        if (GGN) {
            const total = newKilos - oldKilos
            query.$inc.kilosGGN = total
            antes.kilosGGN = lote.kilosGGN
        }

        await LotesRepository.actualizar_lote(
            { _id: lote._id },
            query,
            {
                new: true,
                user: logData._id,
                action: logData.action
            }
        )
        if (logData) {
            await registrarPasoLog(logData.logId, "modificarLoteModificarItemListaEmpaque", "Completado", `se modificó el lote ${lote.enf} de ${contenedorId} con calidad ${calidad} y kilos ${newKilos}`);
        }

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
    static async modificarLoteEliminarItemdesktopListaEmpaque(_id, palletSeleccionado, lote, kilos, GGN, user, logId = null) {
        //El objeto que lleva la data vieja para el registro
        const oldDataRegistro = {
            [`exportacion.${_id}.${palletSeleccionado.calidad}`]: lote[`exportacion.${_id}.${palletSeleccionado.calidad}`]
        }

        //El objeto que va a modificar la coleccion, se suma -kilos ya calculados
        const query = {
            $inc: {
                [`exportacion.${_id}.${palletSeleccionado.calidad}`]: -kilos
            }
        }

        //se mira si se deben sumar kilosGNN
        if (GGN) {
            query.$inc.kilosGGN = -kilos
            oldDataRegistro.kilosGGN = lote.kilosGGN
        }

        await LotesRepository.actualizar_lote(
            { _id: palletSeleccionado.lote },
            query,
            { user: user._id, action: "put_proceso_aplicaciones_listaEmpaque_eliminarItem_desktop" }
        )

        if (logId)
            await registrarPasoLog(
                logId, "modificarLoteEliminarItemdesktopListaEmpaque", "Completado", `cajas eliminadas: ${palletSeleccionado.cajas}, kilos: ${kilos}, lote: ${palletSeleccionado.lote}`);

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
    static async modificarLotesModificarItemsListaEmpaque(
        lotes, copiaPallet, palletsModificados, seleccion, pallet, contenedor, logID = null
    ) {
        // Helper: saca el multiplicador de "12x-4,5" -> 4.5
        const parseMult = (tipoCaja) => {
            if (!tipoCaja || typeof tipoCaja !== "string") return 0;
            const parts = tipoCaja.split("-");
            if (parts.length < 2) return 0;
            const n = parseFloat(parts[1].replace(",", "."));
            return Number.isFinite(n) ? n : 0;
        };

        const contId = contenedor && contenedor[0] && contenedor[0]._id;
        if (!contId) throw new Error("contenedor inválido");

        // Mapa para evitar findIndex por iteración
        const lotesById = new Map(lotes.map(l => [String(l._id), l]));

        const updates = [];

        for (const sel of seleccion) {
            const oldItem = copiaPallet?.[pallet]?.EF1?.[sel];
            const newItem = palletsModificados?.[pallet]?.EF1?.[sel];
            if (!oldItem || !newItem) continue;

            if (oldItem.tipoCaja === newItem.tipoCaja && oldItem.calidad === newItem.calidad) {
                continue;
            }

            const oldKg = (oldItem.cajas || 0) * parseMult(oldItem.tipoCaja);
            const newKg = (newItem.cajas || 0) * parseMult(newItem.tipoCaja);
            const delta = newKg - oldKg;
            if (!delta) continue;

            const query = { $inc: {} };

            if (oldItem.calidad !== newItem.calidad) {
                query.$inc[`exportacion.${contId}.${oldItem.calidad}`] = -oldKg;
                query.$inc[`exportacion.${contId}.${newItem.calidad}`] = newKg;
            } else {
                query.$inc[`exportacion.${contId}.${oldItem.calidad}`] = delta;
            }

            const loteDoc = lotesById.get(String(oldItem.lote));
            if (loteDoc && have_lote_GGN_export(loteDoc, contenedor[0], oldItem)) {
                query.$inc.kilosGGN = (query.$inc.kilosGGN || 0) + delta;
            }

            updates.push(
                LotesRepository.actualizar_lote(
                    { _id: oldItem.lote },
                    query,
                    { user: logID && logID.user, action: logID && logID.action }
                )
            );
        }

        if (updates.length === 0) {
            if (logID) {
                await registrarPasoLog(
                    logID.logId,
                    "modificarLotesModificarItemsListaEmpaque",
                    "Sin cambios",
                    `No hubo deltas en el pallet ${pallet}`
                );
            }
            return;
        }

        // Corre todos los updates en paralelo; para ≤10 está perfecto
        await Promise.all(updates);

        if (logID) {
            await registrarPasoLog(
                logID.logId,
                "modificarLotesModificarItemsListaEmpaque",
                "Completado",
                `Se modificaron ${updates.length} item(s) del pallet ${pallet}`
            );
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
            const fechaSeleccionada = getColombiaDate(itemSeleccionadoOld.fecha)
            const hoy = getColombiaDate()

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
                        `exportacion:${itemSeleccionadoOld.tipoFruta}:${itemSeleccionadoOld.calidad}`,
                        itemSeleccionadoOld.calibre,
                        -kilosOld,
                        multi
                    );
                    const kilosNew = itemSeleccionadoNew.cajas * Number(itemSeleccionadoNew.tipoCaja.split("-")[1].replace(",", "."));
                    VariablesDelSistema.sumarMetricaSimpleDirect(
                        `exportacion:${itemSeleccionadoNew.tipoFruta}:${itemSeleccionadoNew.calidad}`,
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
        const lote = await LotesRepository.getLotes2({ ids: [_id] })
        const result = checkFinalizadoLote(lote)
        if (result) {
            throw new ProcessError(400, `El lote ${lote[0].enf} ya se encuentra finalizado, no se puede modificar`);
        }

        const loteModificado = await LotesRepository.actualizar_lote(
            { _id: _id },
            query,
            { user: user._id, action: action }
        )

        return loteModificado;
    }
    static async restar_mover_modificar_contenedor(
        contenedores, index1, index2, contenedor1, contenedor2,
        seleccionOrdenado, palletsModificados1, palletsModificados2, copiaPallets1, copiaPallets2, newCajas, cajas, GGN, logContext
    ) {

        const { _id: id1, pallet: pallet1 } = contenedor1
        const { _id: id2, pallet: pallet2 } = contenedor2

        const itemSeleccionado = palletsModificados1[pallet1].EF1[seleccionOrdenado[0]];

        // se busca si el elemento del contenedor2 tiene un elemento igual
        const index = palletsModificados2[pallet2].EF1.findIndex(item => (
            item.lote === itemSeleccionado.lote &&
            item.calidad === itemSeleccionado.calidad &&
            item.calibre === itemSeleccionado.calibre &&
            item.tipoCaja === itemSeleccionado.tipoCaja
        ))

        if (newCajas === 0) {

            // si no se encuentra se agrega un nuevo item a EF1
            if (index === -1) {
                const itemSplice = palletsModificados1[pallet1].EF1.splice(seleccionOrdenado[0], 1)[0]
                palletsModificados2[pallet2].EF1.push({ ...itemSplice, GGN });
            }
            // si si, se agregan las nuevas cajas a el item de EF1
            else {
                palletsModificados2[pallet2].EF1[index].cajas += cajas
                palletsModificados1[pallet1].EF1.splice(seleccionOrdenado[0], 1);
            }

        } else {
            itemSeleccionado.cajas = newCajas
            // si no se encuentra se agrega un nuevo item a EF1
            if (index === -1) {
                const itemCopia = JSON.parse(JSON.stringify(itemSeleccionado));
                itemCopia.cajas = cajas
                palletsModificados2[pallet2].EF1.push(itemCopia);

                itemSeleccionado.cajas = newCajas
            } else {
                palletsModificados2[pallet2].EF1[index].cajas += cajas
                itemSeleccionado.cajas = newCajas
            }
        }

        // Construye dinámicamente el objeto $set
        const update1 = { $set: {} };
        update1.$set[`pallets.${pallet2}`] = palletsModificados2[pallet2];

        const update2 = { $set: {} };
        update2.$set[`pallets.${pallet1}`] = palletsModificados1[pallet1];

        // BulkWrite sólo toca ese índice en cada documento
        const operations = [
            {
                updateOne: {
                    filter: { _id: contenedores[index2]._id },
                    update: update1
                }
            },
            {
                updateOne: {
                    filter: { _id: contenedores[index1]._id },
                    update: update2
                }
            }
        ];

        await ContenedoresRepository.bulkWrite(operations)

        const documentosAfectados = [
            {
                modelo: "Contenedor",
                documentoId: id1,
                descripcion: `Se movio los item ${seleccionOrdenado} en el pallet ${pallet1}`,
            },
            {
                modelo: "Contenedor",
                documentoId: id2,
                descripcion: `Se le agregaron item al  pallet ${pallet1}`,
            },
        ]

        const antes = [
            copiaPallets1[pallet1], copiaPallets2[pallet2]
        ]

        const despues = [
            palletsModificados1[pallet1], palletsModificados2[pallet2]
        ]
        // Registrar modificación
        await RecordModificacionesRepository.post_record_contenedor_modification(
            logContext.action,
            logContext.user,
            documentosAfectados,
            antes,
            despues,
            { contenedor1, contenedor2, action: logContext.action, user: logContext.user }
        );
        await registrarPasoLog(logContext.logId, "ProcesoService.restar_mover_modificar_contenedor", "Completado", `Se movieron los items ${seleccionOrdenado} de ${id1} a ${id2} en el pallet ${pallet1} y se agregaron ${cajas} cajas al pallet ${pallet2}`);

    }
    static async restar_mover_modificar_lote(contenedores, index1, index2, itemSeleccionado, kilos, GGN, oldGGN, logContext) {

        if (contenedores[index1]._id.toString() === contenedores[index2]._id.toString()) return;
        //Se modifican los lotes
        const path1 = `exportacion.${contenedores[index1]._id}.${itemSeleccionado.calidad}`;
        const path2 = `exportacion.${contenedores[index2]._id}.${itemSeleccionado.calidad}`;
        let query = {
            $inc: {
                [path1]: -kilos,
                [path2]: kilos,
            },
            $addToSet: { contenedores: contenedores[index2]._id }
        }


        if (GGN !== oldGGN) {
            if (GGN && !oldGGN) {
                query.$inc = { kilosGGN: kilos }
            } else if (!GGN && oldGGN) {
                query.$inc = { kilosGGN: -kilos }
            }
        }
        await LotesRepository.actualizar_lote(
            { _id: itemSeleccionado.lote },
            query,
            { new: true, user: logContext.user, action: logContext.action }
        );
        await registrarPasoLog(logContext.logId, "ProcesoService.restar_mover_modificar_lote", "Completado", `Se modificaron los lotes ${contenedores[index1]._id} y ${contenedores[index2]._id}`);

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
        const palletSeleccionado = palletsModificados[pallet].EF1[seleccion];


        //se obtiene el lote
        const lote = await LotesRepository.getLotes2({
            ids: [palletSeleccionado.lote],
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
            const ef1Array = palletsModificados[pallet].EF1;
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
        const contenedorObj = contenedor.toObject({
            transform: (_, ret) => {
                if (ret.lote?.toString) ret.lote = ret.lote.toString();
                if (ret._id?.toString) ret._id = ret._id.toString();
                if (ret.tipoFruta?.toString) ret.tipoFruta = ret.tipoFruta.toString();
                if (ret.calidad?.toString) ret.calidad = ret.calidad.toString();
                return ret;
            }
        });

        // Ya no necesitas verificar Map, son arrays directos
        const palletsModificados = structuredClone(contenedorObj.pallets);
        const copiaPallet = structuredClone(contenedorObj.pallets);

        return {
            palletsModificados,
            copiaPallet
        };
    }
    static async modificarIndicadoresFecha(copiaPalletSeleccionado, kilos, logId) {
        //se mira si es fruta de hoy para restar de las variables del proceso
        const fechaSeleccionada = getColombiaDate(copiaPalletSeleccionado.fecha)
        const hoy = getColombiaDate()
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
            VariablesDelSistema.sumarMetricaSimpleDirect(`exportacion:${tipoFruta}:${calidad}`, calibre, Number(kilos), multi);

            const results = await multi.exec();
            console.info("Resultados de Redis:", results);
            if (results.length === 0) {
                throw new ProcessError(471, "Transacción Redis abortada. Revisa si hubo cambios concurrentes o tipos incorrectos en claves.");
            }

            await registrarPasoLog(logId, "modificarIndicadoresFecha", "Completado", `se modificaron ${kilos} kilos de la fruta ${tipoFruta} con calidad ${calidad} y calibre ${calibre}`);

        }
    }
    static async obtenerUsuariosRegistrosTrazabilidadEf1(registros) {
        const usuariosIds = new Set();

        for (const registro of registros) {
            if (registro.usuario) {
                usuariosIds.add(registro.usuario.toString());
            }
        }
        console.log(usuariosIds.size)

        const usuarios = await UsuariosRepository.get_users({
            ids: Array.from(usuariosIds),
            limit: 'all'
        })
        console.log(usuarios.length)
        for (const registro of registros) {
            console.log(registro.user)
            if (registro.user) {
                const usuario = usuarios.find(u => u._id.toString() === registro.user.toString());
                console.log(usuario)
                registro.user = usuario.usuario || registro.user;

            }
        }
    }
}

export { ProcesoService };