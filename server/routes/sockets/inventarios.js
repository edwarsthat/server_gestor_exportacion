const { CalidadRepository } = require("../../api/Calidad");
const { InventariosRepository } = require("../../api/inventarios");
const { ModificarRepository } = require("../../api/ModificarData");
const { ProcesoRepository } = require("../../api/Proceso");
const { ViewsRepository } = require("../../api/Views");
const { VariablesDelSistema } = require("../../Class/VariablesDelSistema");
const { successResponseRoutes } = require("../helpers/responses");



const apiSocketInventarios = {
    //#region Fruta sin procesar
    get_inventarios_ingresos_ef1: async () => {
        const enf = await ProcesoRepository.get_inventarios_ingresos_ef1()
        return successResponseRoutes(enf)
    },
    get_inventarios_ingresos_ef8: async () => {
        const enf = await ProcesoRepository.get_inventarios_ingresos_ef8()
        return successResponseRoutes(enf)
    },
    get_inventarios_frutaSinProcesar_frutaEnInventario: async () => {
        const data = await ProcesoRepository.getInventario();
        return successResponseRoutes(data)
    },
    put_inventarios_frutaSinProcesar_directoNacional: async (data) => {
        await ProcesoRepository.directoNacional(data)
        return successResponseRoutes()
    },
    put_inventarios_frutaSinProcesar_desverdizado: async (data) => {
        await ProcesoRepository.desverdizado(data)
        return successResponseRoutes()
    },
    put_inventarios_frutaSinProcesar_recepcionPendiente: async (data) => {
        await ProcesoRepository.lote_recepcion_pendiente(data)
        return successResponseRoutes()
    },
    put_inventarios_frutaSinProcesar_loteInventario: async (data) => {
        await ProcesoRepository.send_lote_to_inventario(data)
        return successResponseRoutes()
    },
    put_inventarios_frutaSinProcesar_derogar: async (data) => {
        await CalidadRepository.lotes_derogar_lote(data)
        return successResponseRoutes()
    },
    put_inventarios_frutaSinProcesar_devolver: async (data) => {
        await CalidadRepository.lotes_devolver_lote(data)
        return successResponseRoutes()
    },
    put_inventarios_frutaSinProcesar_modificarCanastillas: async (data) => {
        await ModificarRepository.put_inventarioLogistica_frutaSinProcesar_modificar_canastillas(data)
        return successResponseRoutes()
    },
    post_inventarios_ingreso_lote: async (data) => {
        await ProcesoRepository.post_inventarios_ingreso_lote(data);
        return successResponseRoutes()
    },
    //#endregion
    //#region Orden vaceo
    get_inventarios_ordenVaceo_inventario: async () => {
        const resultado = await ProcesoRepository.getInventario_orden_vaceo();
        return successResponseRoutes(resultado)
    },
    get_inventarios_ordenVaceo_ordenVaceo: async () => {
        const oredenVaceo = await VariablesDelSistema.getOrdenVaceo()
        return successResponseRoutes(oredenVaceo)
    },
    put_inventarios_ordenVaceo_modificar: async (data) => {
        await ProcesoRepository.put_inventario_inventarios_orden_vaceo_modificar(data)
        return successResponseRoutes()
    },
    put_inventarios_ordenVaceo_vacear: async (data) => {
        await ProcesoRepository.vaciarLote(data)
        return successResponseRoutes()
    },
    //#endregion
    //#region Fruta desverdizada
    get_inventarios_frutaDesverdizando_lotes: async () => {
        const response = await ProcesoRepository.getInventarioDesverdizado()
        return successResponseRoutes(response)
    },
    put_inventarios_frutaDesverdizando_parametros: async (data) => {
        await InventariosRepository.put_inventarios_frutaDesverdizando_parametros(data)
        return successResponseRoutes()
    },
    put_inventarios_frutaDesverdizado_finalizar: async (data) => {
        await InventariosRepository.put_inventarios_frutaDesverdizado_finalizar(data)
        return successResponseRoutes()
    },
    //#endregion
    //#region Invetarios descarte
    get_inventarios_frutaDescarte_fruta: async () => {
        const inventario = await InventariosRepository.get_inventarios_frutaDescarte_fruta();
        return successResponseRoutes(inventario)
    },
    put_inventarios_frutaDescarte_despachoDescarte: async (data) => {
        const descarte = await InventariosRepository.put_inventarios_frutaDescarte_despachoDescarte(data);
        return successResponseRoutes(descarte)
    },
    put_inventarios_frutaDescarte_reprocesarFruta: async (data) => {
        await InventariosRepository.put_inventarios_frutaDescarte_reprocesarFruta(data)
        return successResponseRoutes()
    },
    put_inventarios_frutaDescarte_reprocesarCelifrut: async (data) => {
        await InventariosRepository.put_inventarios_frutaDescarte_reprocesarCelifrut(data)
        return successResponseRoutes()
    },
    post_inventarios_frutaDescarte_frutaDescompuesta: async (data) => {
        await InventariosRepository.post_inventarios_frutaDescarte_frutaDescompuesta(data)
        return successResponseRoutes()
    },
    //#endregion
    //#region historial fruta procesado
    get_inventarios_historialProcesado_frutaProcesada: async (data) => {
        const response = await InventariosRepository.get_inventarios_historialProcesado_frutaProcesada(data)
        return successResponseRoutes(response)
    },
    put_inventarios_historialProcesado_modificarHistorial: async (data) => {
        await InventariosRepository.put_inventarios_historialProcesado_modificarHistorial(data)
        return successResponseRoutes()
    },
    //#endregion
    //#region historial directo nacional
    get_inventarios_historialDirectoNacional_registros: async (data) => {
        const response = await InventariosRepository.put_inventarios_historialDirectoNacional_registros(data)
        return successResponseRoutes(response)
    },
    put_inventarios_historialDirectoNacional_modificarHistorial: async (data) => {
        await InventariosRepository.put_inventarios_historialDirectoNacional_modificarHistorial(data)
        return successResponseRoutes()
    },
    //#endregion
    //#region Info lotes
    get_inventarios_lotes_infoLotes: async (data) => {
        const response = await ViewsRepository.view_lotes(data)
        return successResponseRoutes(response)
    },
}

module.exports.apiSocketInventarios = apiSocketInventarios;
