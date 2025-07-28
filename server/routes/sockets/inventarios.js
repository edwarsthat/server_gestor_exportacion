import { CalidadRepository } from "../../api/Calidad.js";
import { ComercialRepository } from "../../api/Comercial.js";
import { InventariosRepository } from "../../api/inventarios.js";
import { ModificarRepository } from "../../api/ModificarData.js";
import { ProcesoRepository } from "../../api/Proceso.mjs";
import { VariablesDelSistema } from "../../Class/VariablesDelSistema.js";
import { successResponseRoutes } from "../helpers/responses.js";

export const apiSocketInventarios = {
    //#region inventarios
    get_inventarios_frutaSinProcesar_frutaEnInventario: async () => {
        const data = await InventariosRepository.get_inventarios_frutaSinProcesar_frutaEnInventario();
        return successResponseRoutes(data)
    },
    put_inventarios_frutaSinProcesar_directoNacional: async (data) => {
        await ProcesoRepository.directoNacional(data)
        return successResponseRoutes()
    },
    put_inventarios_frutaSinProcesar_desverdizado: async (data) => {
        await InventariosRepository.put_inventarios_frutaSinProcesar_desverdizado(data)
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
    get_inventarios_ordenVaceo_inventario: async () => {
        const resultado = await InventariosRepository.get_inventarios_ordenVaceo_inventario();
        return successResponseRoutes(resultado)
    },
    get_inventarios_ordenVaceo_ordenVaceo: async () => {
        const oredenVaceo = await VariablesDelSistema.getOrdenVaceo()
        return successResponseRoutes(oredenVaceo)
    },
    put_inventarios_ordenVaceo_modificar: async (data) => {
        await InventariosRepository.put_inventarios_ordenVaceo_modificar(data)
        return successResponseRoutes()
    },
    put_inventarios_ordenVaceo_vacear: async (data) => {
        await InventariosRepository.put_inventarios_ordenVaceo_vacear(data)
        return successResponseRoutes()
    },
    get_inventarios_frutaDesverdizando_lotes: async () => {
        const response = await InventariosRepository.get_inventarios_frutaDesverdizando_lotes()
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
    get_inventarios_canastillas_canastillasCelifrut: async () => {
        const response = await InventariosRepository.get_inventarios_canastillas_canastillasCelifrut()
        return successResponseRoutes(response)
    },
    put_inventarios_canastillas_celifrut: async (data) => {
        await InventariosRepository.put_inventarios_canastillas_celifrut(data)
        return successResponseRoutes()
    },
    post_inventarios_canastillas_registro: async (data) => {
        await InventariosRepository.post_inventarios_canastillas_registro(data)
        return successResponseRoutes()
    },
    put_inventarios_frutaDesverdizado_mover: async (data) => {
        await InventariosRepository.put_inventarios_frutaDesverdizado_mover(data)
        return successResponseRoutes()
    },
    put_inventarios_pallet_eviarCuartoFrio: async (data) => {
        await InventariosRepository.put_inventarios_pallet_eviarCuartoFrio(data)
        return successResponseRoutes()
    },
    //#endregion
    //#region historiales
    get_inventarios_historialProcesado_frutaProcesada: async (data) => {
        const response = await InventariosRepository.get_inventarios_historialProcesado_frutaProcesada(data)
        return successResponseRoutes(response)
    },
    put_inventarios_historialProcesado_modificarHistorial: async (data) => {
        await InventariosRepository.put_inventarios_historialProcesado_modificarHistorial(data)
        return successResponseRoutes()
    },
    get_inventarios_historialDirectoNacional_registros: async (data) => {
        const response = await InventariosRepository.put_inventarios_historialDirectoNacional_registros(data)
        return successResponseRoutes(response)
    },
    put_inventarios_historialDirectoNacional_modificarHistorial: async (data) => {
        await InventariosRepository.put_inventarios_historialDirectoNacional_modificarHistorial(data)
        return successResponseRoutes()
    },
    get_inventarios_lotes_infoLotes: async (data) => {
        const response = await InventariosRepository.get_inventarios_lotes_infoLotes(data)
        return successResponseRoutes(response)
    },
    get_inventarios_historiales_ingresoFruta_numeroElementos: async () => {
        const response = await InventariosRepository.get_inventarios_historiales_ingresoFruta_numeroElementos()
        return successResponseRoutes(response)
    },
    get_inventarios_historiales_ingresoFruta_registros: async (data) => {
        const response = await InventariosRepository.get_inventarios_historiales_ingresoFruta_registros(data)
        return successResponseRoutes(response)
    },
    put_inventarios_historiales_ingresoFruta_modificar: async (data) => {
        await InventariosRepository.put_inventarios_historiales_ingresoFruta_modificar(data)
        return successResponseRoutes()
    },
    get_inventarios_historiales_despachoDescarte: async (data) => {
        const response = await InventariosRepository.get_inventarios_historiales_despachoDescarte(data)
        return successResponseRoutes(response)
    },
    get_inventarios_historiales_numero_DespachoDescarte: async () => {
        const response = await InventariosRepository.get_inventarios_historiales_numero_DespachoDescarte()
        return successResponseRoutes(response)
    },
    get_inventarios_historiales_listasDeEmpaque: async (data) => {
        const response = await InventariosRepository.get_inventarios_historiales_listasDeEmpaque(data)
        return successResponseRoutes(response)
    },
    get_inventarios_historiales_listasDeEmpaque_numeroRegistros: async () => {
        const response = await InventariosRepository.get_inventarios_historiales_listasDeEmpaque_numeroRegistros()
        return successResponseRoutes(response)
    },
    get_inventarios_historiales_contenedores: async (data) => {
        const response = await InventariosRepository.get_inventarios_historiales_contenedores(data)
        return successResponseRoutes(response)
    },
    get_inventarios_historiales_contenedores_clientes: async () => {
        const response = await ComercialRepository.obtener_clientes_historial_contenedores();
        return successResponseRoutes(response)
    },
    get_inventarios_registros_fruta_descompuesta: async (data) => {
        const response = await InventariosRepository.get_inventarios_registros_fruta_descompuesta(data)
        return successResponseRoutes(response)
    },
    get_inventarios_numero_registros_fruta_descompuesta: async () => {
        const response = await InventariosRepository.get_inventarios_numero_registros_fruta_descompuesta()
        return successResponseRoutes(response)
    },
    get_inventarios_historiales_canastillas_registros: async (data) => {
        const response = await InventariosRepository.get_inventarios_historiales_canastillas_registros(data)
        return successResponseRoutes(response)
    },
    get_inventarios_historiales_numeroCanastillas_registros: async (data) => {
        const response = await InventariosRepository.get_inventarios_historiales_numeroCanastillas_registros(data)
        return successResponseRoutes(response)
    },
    put_inventarios_historiales_despachoDescarte: async (data) => {
        const response = await InventariosRepository.put_inventarios_historiales_despachoDescarte(data)
        return successResponseRoutes(response)
    },
    put_inventarios_registros_fruta_descompuesta: async (data) => {
        const response = await InventariosRepository.put_inventarios_registros_fruta_descompuesta(data)
        return successResponseRoutes(response)
    },
    get_inventarios_historiales_registros_inventarioDescartes: async (data) => {
        const response = await InventariosRepository.get_inventarios_historiales_registros_inventarioDescartes(data)
        return successResponseRoutes(response)
    },
    get_inventarios_historiales_numeroRegistros_inventarioDescartes: async (data) => {
        const response = await InventariosRepository.get_inventarios_historiales_numeroRegistros_inventarioDescartes(data)
        return successResponseRoutes(response)
    },
    //#endregion
    //#region ingresoInventario
    get_inventarios_ingresos_ef: async () => {
        const response = await InventariosRepository.get_inventarios_ingresos_ef()
        return successResponseRoutes(response)
    },
    post_inventarios_ingreso_lote: async (data) => {
        await InventariosRepository.post_inventarios_ingreso_lote(data);
        return successResponseRoutes()
    },
    post_inventarios_EF8: async (data) => {
        await InventariosRepository.post_inventarios_EF8(data);
        return successResponseRoutes()
    },
    //#endregion
    //#region programaciones
    get_inventarios_programaciones_contenedores: async (data) => {
        const response = await InventariosRepository.get_inventarios_programaciones_contenedores(data)
        return successResponseRoutes(response)
    },
    put_inventarios_programacion_contenedores: async (data) => {
        await InventariosRepository.put_inventarios_programacion_contenedores(data)
        return successResponseRoutes()
    },
    //#endregion
    //#region insumos
    get_inventarios_insumos: async () => {
        const response = await InventariosRepository.get_inventarios_insumos();
        return successResponseRoutes(response)
    },
    put_inventarios_insumos: async (data) => {
        await InventariosRepository.put_inventarios_insumos(data)
        return successResponseRoutes()
    },
    post_inventarios_insumos_tipoInsumo: async (data) => {
        await InventariosRepository.post_inventarios_insumos_tipoInsumo(data)
        return successResponseRoutes()
    },
    get_inventarios_insumos_contenedores: async () => {
        const response = await InventariosRepository.get_inventarios_insumos_contenedores();
        return successResponseRoutes(response)
    },
    put_inventarios_insumos_contenedores: async (data) => {
        await InventariosRepository.put_inventarios_insumos_contenedores(data)
        return successResponseRoutes()
    },
    //#endregion
}

