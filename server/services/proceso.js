import { ContenedoresRepository } from "../Class/Contenedores.mjs";
import { LotesRepository } from "../Class/Lotes.js";
import { ProcessError } from "../../Error/ProcessError.js";
import { readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { deshidratacionLote, rendimientoLote } from "../api/utils/lotesFunctions.js";
import { have_lote_GGN_export } from "../controllers/validations.js";
import { RecordModificacionesRepository } from "../archive/ArchivoModificaciones.js";
import { VariablesDelSistema } from "../Class/VariablesDelSistema.js";

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
    static async eliminar_items_contenedor(_id, seleccion, pallet, action, user) {

        let lotesIds = [];
        const seleccionOrdenado = seleccion.sort((a, b) => b - a);

        const contenedor = await ContenedoresRepository.get_Contenedores_sin_lotes({
            ids: [_id],
            select: { infoContenedor: 1, pallets: 1 },
            populate: {
                path: 'infoContenedor.clienteInfo',
                select: 'CLIENTE PAIS_DESTINO',
            }
        })

        //se crea una copa del pallet a modificar
        const palletsModificados = JSON.parse(JSON.stringify(contenedor[0].pallets));
        const copiaPallets = JSON.parse(JSON.stringify(contenedor[0].pallets));


        //se eliminan los items del contenedor
        const len = seleccion.length;
        let itemsDelete = [];

        for (let i = 0; i < len; i++) {
            itemsDelete.push(palletsModificados[pallet]["EF1"].splice(seleccionOrdenado[i], 1)[0]);
        }

        // Actualizar contenedor con pallets modificados
        await ContenedoresRepository.actualizar_contenedor(
            { _id },
            {
                $set: { [`pallets.${pallet}`]: palletsModificados[pallet] }
            }
        );

        // Registrar modificación Contenedores
        await RecordModificacionesRepository.post_record_contenedor_modification(
            action,
            user,
            {
                modelo: "Contenedor",
                documentoId: _id,
                descripcion: `Se eliminaron los items ${seleccion} en el pallet ${pallet}`,
            },
            copiaPallets[pallet],
            palletsModificados[pallet],
            { _id, pallet, seleccion, action }
        );

        //se obtienen los lotes de las cajas que se eliminaron
        for (let i = 0; i < itemsDelete.length; i++) {
            lotesIds.push(itemsDelete[i].lote)
        }

        const lotesSet = new Set(lotesIds)
        const lotesArrIds = [...lotesSet]


        return { lotesArrIds, itemsDelete, contenedor }
    }
    static async restar_kilos_lote(itemsDelete, lotes, contenedor, hoy) {
        const { lote, calidad, tipoCaja, cajas, fecha, tipoFruta } = itemsDelete
        const calidadItem = calidadFile[calidad]

        const mult = Number(tipoCaja.split("-")[1].replace(",", "."))
        const kilos = cajas * mult;

        //se le restan los kilos a el lote correspondiente
        const loteIndex = lotes.findIndex(item => item._id.toString() === lote)
        lotes[loteIndex][calidadItem] += - kilos

        // si se restan los kilos ggn
        if (have_lote_GGN_export(lotes[loteIndex], contenedor[0], itemsDelete)) {
            lotes[loteIndex].kilosGGN += - kilos
        }

        lotes[loteIndex].deshidratacion = await deshidratacionLote(lotes[loteIndex].toObject())
        lotes[loteIndex].rendimiento = await rendimientoLote(lotes[loteIndex].toObject())

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
            await VariablesDelSistema.ingresar_kilos_procesados2(-kilos, tipoFruta)
            await VariablesDelSistema.ingresar_exportacion2(-kilos, tipoFruta)
        }
    }
    static async guardar_cambios_lotes(lotes, action, user, _id, oldLotes) {
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
                        // Agrega aquí otros campos que necesites actualizar
                    }
                }
            }
        }));

        await LotesRepository.bulkWrite(operations)

        const newLotes = lotes.map(i => {
            return {
                _id: i._id,
                enf: i.enf,
                calidad1: i.calidad1,
                calidad15: i.calidad15,
                calidad2: i.calidad2,
                deshidratacion: i.deshidratacion,
                rendimiento: i.rendimiento
            }
        })

        // Registrar modificación de los lotes
        const documentosAfectados = newLotes.map(l => ({
            modelo: "Lote", // o el nombre del modelo que estés utilizando
            documentoId: l._id,
            descripcion: `Se eliminaron kilos de ${l._id} el enf ${l.enf}`,
        }));

        await RecordModificacionesRepository.post_record_contenedor_modification(
            action,
            user,
            documentosAfectados, // aquí pasas el array de documentos afectados
            oldLotes,
            newLotes,
            { _id }
        );
    }
    static async restarItem_contenedor(_id, pallet, seleccion, cajas, action, user) {
        //se obtiene el contenedor a modificar
        const contenedor = await ContenedoresRepository.get_Contenedores_sin_lotes({
            ids: [_id],
            select: { infoContenedor: 1, pallets: 1 },
            populate: {
                path: 'infoContenedor.clienteInfo',
                select: 'CLIENTE PAIS_DESTINO',
            }
        })

        //se crea una copa del pallet a modificar
        const palletsModificados = JSON.parse(JSON.stringify(contenedor[0].pallets));
        const itemSeleccionado = palletsModificados[pallet].EF1[seleccion];

        const copiaPallets = JSON.parse(JSON.stringify(contenedor[0].pallets));
        const copiaItemSeleccionado = copiaPallets[pallet].EF1[seleccion];


        itemSeleccionado.cajas -= cajas

        if (itemSeleccionado.cajas === 0) {
            palletsModificados[pallet].EF1.splice(seleccion, 1);
        }

        // Actualizar contenedor con pallets modificados
        await ContenedoresRepository.actualizar_contenedor(
            { _id },
            {
                $set: { [`pallets.${pallet}`]: palletsModificados[pallet] }
            }
        );

        // Registrar modificación Contenedores
        await RecordModificacionesRepository.post_record_contenedor_modification(
            action,
            user,
            {
                modelo: "Contenedor",
                documentoId: _id,
                descripcion: `Se resto ${cajas} de ${seleccion} en el pallet ${pallet}`,
            },
            copiaPallets[pallet],
            palletsModificados[pallet],
            { action, _id, pallet, seleccion, cajas }
        );

        return {
            contenedor, copiaItemSeleccionado, itemSeleccionado
        }
    }
    static async restarItem_lote(copiaItemSeleccionado, cajas, contenedor, user, action,) {
        //se modifica el lote
        //se obtienen los lotes
        const lotesObj = await LotesRepository.getLotes({
            ids: [copiaItemSeleccionado.lote]
        })

        const lote = JSON.parse(JSON.stringify(lotesObj[0]))
        const oldLote = JSON.parse(JSON.stringify(lotesObj[0]))

        //objeto con la informacion de los lotes viejos
        const antes = {
            [calidadFile[copiaItemSeleccionado.calidad]]: oldLote[calidadFile[copiaItemSeleccionado.calidad]],
            kilosGGN: oldLote.kilosGGN,
            deshidratacion: oldLote.deshidratacion,
            rendimiento: oldLote.rendimiento,
        }

        const kilos = Number(copiaItemSeleccionado.tipoCaja.split("-")[1].replace(",", ".")) * cajas;

        lote[calidadFile[copiaItemSeleccionado.calidad]] -= kilos
        lote.deshidratacion = await deshidratacionLote(lote)
        lote.rendimiento = await rendimientoLote(lote)

        const query = {
            $inc: {
                [calidadFile[copiaItemSeleccionado.calidad]]: - kilos
            },
            deshidratacion: lote.deshidratacion,
            rendimiento: lote.rendimiento,
        }

        // si se restan los kilos ggn
        if (have_lote_GGN_export(lote.predio, contenedor[0], copiaItemSeleccionado)) {
            query.$inc.kilosGGN = - kilos
        }

        const newLote = await LotesRepository.modificar_lote_proceso(
            lote._id,
            query,
            "Ingresar exportacion",
            user._id
        )

        const newData = {
            [calidadFile[copiaItemSeleccionado.calidad]]: newLote[calidadFile[copiaItemSeleccionado.calidad]],
            kilosGGN: newLote.kilosGGN,
            deshidratacion: newLote.deshidratacion,
            rendimiento: newLote.rendimiento,
        }
        // Registrar modificación

        await RecordModificacionesRepository.post_record_contenedor_modification(
            action,
            user,
            {
                modelo: "Lote",
                documentoId: newLote._id,
                descripcion: `Se restaron ${kilos} kilos a calidad ${copiaItemSeleccionado.calidad}`,
            },
            antes,
            newData,
            { action, cajas }
        );

        return { lote, kilos }
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
}

export { ProcesoService };