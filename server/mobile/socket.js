
const { ProcesoRepository } = require("../api/Proceso");
class socketMobileRepository {
    static async obtener_predio_listaDeEmpaque() {
        // Obtener la fecha actual en Colombia
        const ahora = new Date();

        // Crear fechaInicio (comienzo del día en Colombia, pero en UTC)
        const fechaInicio = new Date(Date.UTC(
            ahora.getFullYear(),
            ahora.getMonth(),
            ahora.getDate(),
            5, 0, 0, 0 // 00:00 en Colombia es 05:00 en UTC
        ));

        // Crear fechaFin (final del día en Colombia, pero en UTC)
        const fechaFin = new Date(Date.UTC(
            ahora.getFullYear(),
            ahora.getMonth(),
            ahora.getDate(),
            29, 0, 0, -1 // 23:59:59.999 en Colombia es 04:59:59.999 del día siguiente en UTC
        ));

        const data = {
            fechaInicio,
            fechaFin
        }
        const response = await ProcesoRepository.obtenerHistorialLotes(data)
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
        try {
            const { data, user } = req;
            const contenedores = await ProcesoRepository.actualizar_pallet_contenedor(data, user.user);
            return { status: 200, message: 'Ok', data: contenedores }
        } catch (err) {
            throw new Error(err)
        }
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
        await ProcesoRepository.mover_item_lista_empaque(data, user.user);

        return {
            status: 200,
            message: 'Ok'
        }

    }
    // static async agregar_cajas_sin_pallet(req) {
    //     const { data, user } = req;
    //     const contenedores = await ProcesoRepository.agregar_cajas_sin_pallet(data, user.user);
    //     return { status: 200, message: 'Ok', data: contenedores }
    // }
    // static async obtener_cajas_sin_pallet() {
    //     const cajasSinPallet = await VariablesDelSistema.obtener_cajas_sin_pallet();
    //     return { status: 200, message: 'Ok', data: cajasSinPallet }
    // }
    // static async eliminar_item_cajas_sin_pallet(data) {
    //     const { seleccion, action } = data.data;
    //     let kilosTotal = 0;
    //     const user = data.user.user;
    //     //se ordenan los items seleccionados
    //     const seleccionOrdenado = seleccion.sort((a, b) => b - a);

    //     const items = await VariablesDelSistema.eliminar_items_cajas_sin_pallet(seleccionOrdenado);

    //     //se descuentan los kilos ne exportacion de los lotes correspondientes
    //     for (let i = 0; i < items.length; i++) {
    //         const { lote, calidad, tipoCaja, cajas } = items[i]

    //         const mult = Number(tipoCaja.split("-")[1])
    //         const kilos = cajas * mult;
    //         kilosTotal += kilos
    //         const query = { $inc: {} }
    //         query.$inc[calidadFile[calidad]] = -kilos;

    //         const loteDB = await LotesRepository.modificar_lote_proceso(lote, query, action, user);
    //         await LotesRepository.rendimiento(loteDB);
    //         await LotesRepository.deshidratacion(loteDB);
    //     }

    //     //se modifica la cantidad de kilos exportacion
    //     const { kilosProcesadosHoy, kilosExportacionHoy } = await VariablesDelSistema.ingresar_exportacion(-kilosTotal)
    //     procesoEventEmitter.emit("proceso_event", {
    //         kilosProcesadosHoy: kilosProcesadosHoy,
    //         kilosExportacionHoy: kilosExportacionHoy
    //     });
    //     const cajasSinPallet = await VariablesDelSistema.obtener_cajas_sin_pallet();
    //     return { status: 200, message: 'Ok', data: cajasSinPallet }
    // }
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
        const { user, data } = datos;
        await ProcesoRepository.modificar_items_lista_empaque(data, user.user)
        return { status: 200, message: 'Ok' }

    }
}

module.exports.socketMobileRepository = socketMobileRepository;
