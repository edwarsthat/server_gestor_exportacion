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
    static async add_settings_pallet(req) {
        const { data, user } = req;
        const contenedores = await ProcesoRepository.add_settings_pallet(data, user.user);
        return { status: 200, message: 'Ok', data: contenedores }
    }
    static async actualizar_pallet_contenedor(req) {
        const { data, user } = req;
        const contenedores = await ProcesoRepository.actualizar_pallet_contenedor(data, user.user);
        return { status: 200, message: 'Ok', data: contenedores }
    }
    static async eliminar_item_lista_empaque(req) {
        const { data, user } = req;
        const contenedores = await ProcesoRepository.eliminar_item_lista_empaque(data, user.user);
        return { status: 200, message: 'Ok', data: contenedores }
    }
    static async restar_item_lista_empaque(req) {
        const { data, user } = req;
        const contenedores = await ProcesoRepository.restar_item_lista_empaque(data, user.user);
        return { status: 200, message: 'Ok', data: contenedores }
    }
    static async mover_item_lista_empaque(req) {
        const { data, user } = req;
        const { contenedores, cajasSinPallet } = await ProcesoRepository.mover_item_lista_empaque(data, user.user);

        return {
            status: 200,
            message: 'Ok',
            data: contenedores,
            cajasSinPallet: cajasSinPallet
        }

    }
    static async agregar_cajas_sin_pallet(req) {
        const { data, user } = req;
        const contenedores = await ProcesoRepository.agregar_cajas_sin_pallet(data, user.user);
        return { status: 200, message: 'Ok', data: contenedores }
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
    static async liberar_pallets_lista_empaque(req) {
        const { data, user } = req;
        const contenedores = await ProcesoRepository.liberar_pallets_lista_empaque(data, user.user);
        return { status: 200, message: 'Ok', data: contenedores }
    }
    static async cerrar_contenedor(req) {
        const { data, user } = req;
        const contenedores = await ProcesoRepository.cerrar_contenedor(data, user.user);
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
