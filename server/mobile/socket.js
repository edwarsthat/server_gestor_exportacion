const { ContenedoresRepository } = require("../Class/Contenedores");
const { LotesRepository } = require("../Class/Lotes");
const { VariablesDelSistema } = require("../Class/VariablesDelSistema");
const calidadFile = require('../../constants/calidad.json');
const { procesoEventEmitter } = require("../../events/eventos");
const { ProcesoRepository } = require("../api/Proceso");
class socketMobileRepository {
    static async obtener_predio_listaDeEmpaque() {
        const response = await VariablesDelSistema.obtener_EF1_listaDeEmpaque();
        return { status: 200, message: 'Ok', data: response }
    }
    static async obtener_contenedores_listaDeEmpaque() {
        const contenedores = await ProcesoRepository.obtener_contenedores_listaDeEmpaque()
        return { status: 200, message: 'Ok', data: contenedores }
    }
    static async add_settings_pallet(data) {
        const { _id, pallet, settings, action } = data.data;
        const user = data.user.user;

        await ContenedoresRepository.agregar_settings_pallet(_id, pallet, settings, action, user);
        const contenedores = await ContenedoresRepository.getContenedores({ query: { 'infoContenedor.cerrado': false } });
        return { status: 200, message: 'Ok', data: contenedores }
    }
    static async actualizar_pallet_contenedor(data) {
        const { _id, pallet, item, action } = data.data;
        const user = data.user.user;
        let kilosExportacion = 0;
        // se agrega el item a la lista de empaque
        await ContenedoresRepository.actualizar_pallet_contenedor(_id, pallet, item, action, user);
        //se agrega la exportacion a el lote
        const kilos = Number(item.tipoCaja.split('-')[1])
        const query = {
            $addToSet: { contenedores: _id },
            $inc: {}
        }
        kilosExportacion = kilos * Number(item.cajas)
        query.$inc[calidadFile[item.calidad]] = kilosExportacion
        const lote = await LotesRepository.modificar_lote_proceso(item.lote, query, "Agregar exportacion", user)
        await LotesRepository.rendimiento(lote);
        await LotesRepository.deshidratacion(lote);
        const { kilosProcesadosHoy, kilosExportacionHoy } = await VariablesDelSistema.ingresar_exportacion(kilosExportacion)
        procesoEventEmitter.emit("proceso_event", {
            kilosProcesadosHoy: kilosProcesadosHoy,
            kilosExportacionHoy: kilosExportacionHoy
        });
        const contenedores = await ContenedoresRepository.getContenedores({ query: { 'infoContenedor.cerrado': false } });
        return { status: 200, message: 'Ok', data: contenedores }
    }
    static async eliminar_item_lista_empaque(data) {
        const { _id, pallet, seleccion, action } = data.data;
        let kilosTotal = 0;
        const user = data.user.user;
        //se ordenan los items seleccionados
        const seleccionOrdenado = seleccion.sort((a, b) => b - a);
        //se eliminan los items de la lista de empaque
        const items = await ContenedoresRepository.eliminar_items_lista_empaque(_id, pallet, seleccionOrdenado, action, user)

        //se descuentan los kilos ne exportacion de los lotes correspondientes
        for (let i = 0; i < items.length; i++) {
            const { lote, calidad, tipoCaja, cajas } = items[i]

            const mult = Number(tipoCaja.split("-")[1])
            const kilos = cajas * mult;
            kilosTotal += kilos
            const query = { $inc: {} }
            query.$inc[calidadFile[calidad]] = -kilos;

            const loteDB = await LotesRepository.modificar_lote_proceso(lote, query, action, user);
            await LotesRepository.rendimiento(loteDB);
            await LotesRepository.deshidratacion(loteDB);
        }
        //se modifica la cantidad de kilos exportacion
        const { kilosProcesadosHoy, kilosExportacionHoy } = await VariablesDelSistema.ingresar_exportacion(-kilosTotal)
        procesoEventEmitter.emit("proceso_event", {
            kilosProcesadosHoy: kilosProcesadosHoy,
            kilosExportacionHoy: kilosExportacionHoy
        });
        const contenedores = await ContenedoresRepository.getContenedores({ query: { 'infoContenedor.cerrado': false } });
        return { status: 200, message: 'Ok', data: contenedores }
    }
    static async restar_item_lista_empaque(data) {
        const { action, _id, pallet, seleccion, cajas } = data.data;
        const user = data.user.user;

        const item = await ContenedoresRepository.restar_item_lista_empaque(_id, pallet, seleccion, cajas, action, user)

        const { lote, calidad, tipoCaja } = item
        const mult = Number(tipoCaja.split("-")[1])
        const kilos = cajas * mult;
        const query = { $inc: {} }
        query.$inc[calidadFile[calidad]] = -kilos;

        const loteDB = await LotesRepository.modificar_lote_proceso(lote, query, action, user);
        await LotesRepository.rendimiento(loteDB);
        await LotesRepository.deshidratacion(loteDB);

        const { kilosProcesadosHoy, kilosExportacionHoy } = await VariablesDelSistema.ingresar_exportacion(-kilos)
        procesoEventEmitter.emit("proceso_event", {
            kilosProcesadosHoy: kilosProcesadosHoy,
            kilosExportacionHoy: kilosExportacionHoy
        });
        const contenedores = await ContenedoresRepository.getContenedores({ query: { 'infoContenedor.cerrado': false } });
        return { status: 200, message: 'Ok', data: contenedores }
    }
    static async mover_item_lista_empaque(data) {
        console.log(data.data)
        const { contenedor1, contenedor2, cajas, action } = data.data;
        const user = data.user.user;
        if (contenedor1.pallet !== -1 && contenedor2.pallet !== -1 && cajas === 0) {
            await this.mover_item_entre_contenedores(contenedor1, contenedor2, action, user);
        } else if (contenedor1.pallet === -1 && contenedor2.pallet !== -1 && cajas === 0) {
            await this.mover_item_cajasSinPallet_contenedor(contenedor1, contenedor2, action, user)
        } else if (contenedor1.pallet !== -1 && contenedor2._id === -1 && cajas === 0) {
            await this.mover_item_contenedor_cajasSinPallet(contenedor1, action, user)
        } else if (contenedor1.pallet !== -1 && contenedor2.pallet !== -1 && cajas !== 0) {
            await this.restar_mover_contenedor_contenedor(contenedor1, contenedor2, cajas, action, user)
        } else if (contenedor1.pallet === -1 && contenedor2.pallet !== -1 && cajas !== 0) {
            await this.restar_mover_item_cajasSinPallet_contenedor(contenedor1, contenedor2, cajas, action, user)
        } else if (contenedor1.pallet !== -1 && contenedor2._id === -1 && cajas !== 0) {
            await this.restar_mover_item_contenedor_cajasSinPallet(contenedor1, cajas, action, user)
        }

        const contenedores = await ContenedoresRepository.getContenedores({ query: { 'infoContenedor.cerrado': false } });
        const cajasSinPallet = await VariablesDelSistema.obtener_cajas_sin_pallet();

        return { status: 200, message: 'Ok', data: contenedores, cajasSinPallet: cajasSinPallet }

    }
    static async mover_item_entre_contenedores(contenedor1, contenedor2, action, user) {
        const seleccionOrdenado = contenedor1.seleccionado.sort((a, b) => b - a);
        //se eliminan los items de la lista de empaque
        const items = await ContenedoresRepository.mover_items_lista_empaque(
            contenedor1._id,
            contenedor2._id,
            contenedor1.pallet,
            contenedor2.pallet,
            seleccionOrdenado,
            action,
            user
        );
        const query = {
            $addToSet: { contenedores: contenedor2._id }
        }
        const idsArr = items.map(item => item.lote)
        const lotesSet = new Set(idsArr);
        const lotesIds = [...lotesSet];
        for (let i = 0; i < lotesIds.length; i++) {
            await LotesRepository.modificar_lote_proceso(lotesIds[i], query, `Se agrega contenedor ${contenedor2._id}`, user)
        }
    }
    static async mover_item_cajasSinPallet_contenedor(contenedor1, contenedor2, action, user) {
        const seleccionOrdenado = contenedor1.seleccionado.sort((a, b) => b - a);
        const items = await VariablesDelSistema.eliminar_items_cajas_sin_pallet(seleccionOrdenado);

        await ContenedoresRepository.agregar_items_lista_empaque(contenedor2._id, contenedor2.pallet, items, action, user)

        const query = {
            $addToSet: { contenedores: contenedor2._id }
        }
        const idsArr = items.map(item => item.lote)
        const lotesSet = new Set(idsArr);
        const lotesIds = [...lotesSet];
        for (let i = 0; i < lotesIds.length; i++) {
            await LotesRepository.modificar_lote_proceso(lotesIds[i], query, `Se agrega contenedor ${contenedor2._id}`, user)
        }

    }
    static async mover_item_contenedor_cajasSinPallet(contenedor1, action, user) {
        const seleccionOrdenado = contenedor1.seleccionado.sort((a, b) => b - a);
        const items = await ContenedoresRepository.eliminar_items_lista_empaque(
            contenedor1._id,
            contenedor1.pallet,
            seleccionOrdenado,
            action,
            user
        );
        for (let i = 0; i < items.length; i++) {
            await VariablesDelSistema.ingresar_item_cajas_sin_pallet(items[i])
        }

    }
    static async restar_mover_contenedor_contenedor(contenedor1, contenedor2, cajas, action, user) {
        const seleccionOrdenado = contenedor1.seleccionado;
        //se eliminan los items de la lista de empaque
        const items = await ContenedoresRepository.restar_mover_items_lista_empaque(
            contenedor1._id,
            contenedor2._id,
            contenedor1.pallet,
            contenedor2.pallet,
            seleccionOrdenado,
            cajas,
            action,
            user
        );
        const query = {
            $addToSet: { contenedores: contenedor2._id }
        }

        await LotesRepository.modificar_lote_proceso(items.lote, query, `Se agrega contenedor ${contenedor2._id}`, user)


    }
    static async restar_mover_item_cajasSinPallet_contenedor(contenedor1, contenedor2, cajas, action, user) {
        const seleccionOrdenado = contenedor1.seleccionado;
        const item = await VariablesDelSistema.restar_items_cajas_sin_pallet(seleccionOrdenado, cajas);

        await ContenedoresRepository.actualizar_pallet_contenedor(
            contenedor2._id,
            contenedor2.pallet,
            item,
            action,
            user);
        const query = {
            $addToSet: { contenedores: contenedor2._id }
        }

        await LotesRepository.modificar_lote_proceso(item.lote, query, `Se agrega contenedor ${contenedor2._id}`, user)

    }
    static async restar_mover_item_contenedor_cajasSinPallet(contenedor1, cajas, action, user) {
        const seleccionOrdenado = contenedor1.seleccionado;
        const item = await ContenedoresRepository.restar_item_lista_empaque(
            contenedor1._id,
            contenedor1.pallet,
            seleccionOrdenado[0],
            cajas,
            action,
            user
        );
        item.cajas = cajas

        await VariablesDelSistema.ingresar_item_cajas_sin_pallet(item)
    }
    static async agregar_cajas_sin_pallet(data) {
        const { item } = data.data;
        const user = data.user.user;
        await VariablesDelSistema.ingresar_item_cajas_sin_pallet(item)
        //se agrega la exportacion a el lote
        const kilos = Number(item.tipoCaja.split('-')[1])
        let kilosTotal = kilos * Number(item.cajas)

        const query = { $inc: {} }
        query.$inc[calidadFile[item.calidad]] = kilosTotal
        const lote = await LotesRepository.modificar_lote_proceso(item.lote, query, "Agregar exportacion", user)
        await LotesRepository.rendimiento(lote);
        await LotesRepository.deshidratacion(lote);

        const { kilosProcesadosHoy, kilosExportacionHoy } = await VariablesDelSistema.ingresar_exportacion(kilosTotal)
        procesoEventEmitter.emit("proceso_event", {
            kilosProcesadosHoy: kilosProcesadosHoy,
            kilosExportacionHoy: kilosExportacionHoy
        });

        //envia las cajas sin pallet actualizadas
        const cajasSinPallet = await VariablesDelSistema.obtener_cajas_sin_pallet();
        return { status: 200, message: 'Ok', data: cajasSinPallet }
    }
    static async obtener_cajas_sin_pallet() {
        const cajasSinPallet = await VariablesDelSistema.obtener_cajas_sin_pallet();
        return { status: 200, message: 'Ok', data: cajasSinPallet }
    }
    static async eliminar_item_cajas_sin_pallet(data) {
        const { seleccion, action } = data.data;
        let kilosTotal = 0;
        const user = data.user.user;
        //se ordenan los items seleccionados
        const seleccionOrdenado = seleccion.sort((a, b) => b - a);

        const items = await VariablesDelSistema.eliminar_items_cajas_sin_pallet(seleccionOrdenado);

        //se descuentan los kilos ne exportacion de los lotes correspondientes
        for (let i = 0; i < items.length; i++) {
            const { lote, calidad, tipoCaja, cajas } = items[i]

            const mult = Number(tipoCaja.split("-")[1])
            const kilos = cajas * mult;
            kilosTotal += kilos
            const query = { $inc: {} }
            query.$inc[calidadFile[calidad]] = -kilos;

            const loteDB = await LotesRepository.modificar_lote_proceso(lote, query, action, user);
            await LotesRepository.rendimiento(loteDB);
            await LotesRepository.deshidratacion(loteDB);
        }

        //se modifica la cantidad de kilos exportacion
        const { kilosProcesadosHoy, kilosExportacionHoy } = await VariablesDelSistema.ingresar_exportacion(-kilosTotal)
        procesoEventEmitter.emit("proceso_event", {
            kilosProcesadosHoy: kilosProcesadosHoy,
            kilosExportacionHoy: kilosExportacionHoy
        });
        const cajasSinPallet = await VariablesDelSistema.obtener_cajas_sin_pallet();
        return { status: 200, message: 'Ok', data: cajasSinPallet }
    }
    static async liberar_pallets_lista_empaque(data) {
        const { _id, pallet, item, action } = data.data;
        const user = data.user.user;
        await ContenedoresRepository.liberar_pallet_lista_empaque(_id, pallet, item, action, user);
        const contenedores = await ContenedoresRepository.getContenedores({ query: { 'infoContenedor.cerrado': false } });
        return { status: 200, message: 'Ok', data: contenedores }
    }
    static async cerrar_contenedor(data) {
        const { _id, action } = data.data;
        const user = data.user.user;

        await ContenedoresRepository.cerrar_lista_empaque(_id, action, user);

        const contenedores = await ContenedoresRepository.getContenedores({ query: { 'infoContenedor.cerrado': false } });
        return { status: 200, message: 'Ok', data: contenedores }
    }
    static async modificar_items_lista_empaque(datos) {

        const { _id, pallet, seleccion, data, action } = datos.data;
        const user = datos.user.user;

        const oldData = await ContenedoresRepository.modificar_items_pallet(_id, pallet, seleccion, data, action, user);

        if (oldData[0].calidad !== data.calidad) {
            //se agrega la exportacion a el lote
            const kilos = Number(oldData[0].tipoCaja.split('-')[1])
            const query = {
                $inc: {}
            }
            query.$inc[calidadFile[oldData[0].calidad]] = 0;
            query.$inc[calidadFile[data.calidad]] = 0;
            for (let i = 0; i < oldData.length; i++) {
                query.$inc[calidadFile[oldData[1].calidad]] += -(kilos * Number(oldData[i].cajas))
                query.$inc[calidadFile[data.calidad]] += (kilos * Number(oldData[i].cajas))
            }
            console.log(query)
            await LotesRepository.modificar_lote_proceso(
                oldData[0].lote,
                query,
                "Cambiar tipo de exportacion",
                user
            )
        }
        const contenedores = await ContenedoresRepository.getContenedores({ query: { 'infoContenedor.cerrado': false } });
        const cajasSinPallet = await VariablesDelSistema.obtener_cajas_sin_pallet();

        return { status: 200, message: 'Ok', data: contenedores, cajasSinPallet: cajasSinPallet }

    }
}

module.exports.socketMobileRepository = socketMobileRepository;
