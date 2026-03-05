import { CalidadRepository } from "../../api/Calidad.js";
import { ComercialRepository } from "../../api/Comercial.js";
import { InventariosRepository } from "../../api/inventarios.js";
import { CanastillasController } from "../../api/inventarios/canastillas.js";
import { InventarioCuartoFriosController } from "../../api/inventarios/inventarioCuartoFrios.js";
import { InventarioDescarteController } from "../../api/inventarios/inventarioDescarte.js";
import { InventarioFrutaSinProcesarController } from "../../api/inventarios/inventarioFrutaSinProcesar.js";
import { OrdenVaceoController } from "../../api/inventarios/ordenVaceo.js";
import { ProgramacionesController } from "../../api/inventarios/programaciones.js";
import { ModificarRepository } from "../../api/ModificarData.js";
import { ProcesoRepository } from "../../api/Proceso.mjs";
import { successResponseRoutes } from "../helpers/responses.js";

export const apiSocketInventarios = {
    //#region inventarios FRUTA SIN PROCESAR
    get_inventarios_historialDirectoNacional_registros: async (data) => {
        const response = await InventarioFrutaSinProcesarController.get_inventarios_historialDirectoNacional_registros(data)
        return successResponseRoutes(response)
    },
    put_inventarios_frutaSinProcesar_directoNacional: async (data) => {
        await InventarioFrutaSinProcesarController.put_inventarios_frutaSinProcesar_directoNacional(data)
        return successResponseRoutes()
    },
    post_inventarios_ingreso_lote: async (data) => {
        await InventarioFrutaSinProcesarController.post_inventarios_ingreso_lote(data);
        return successResponseRoutes()
    },
    post_inventarios_maquila: async (data) => {
        await InventarioFrutaSinProcesarController.post_inventarios_ingreso_maquila(data);
        return successResponseRoutes()
    },
    //#endregion

    //#region inventario descartes
    post_inventarios_EF8: async (data) => {
        await InventarioDescarteController.post_inventarios_EF8(data);
        return successResponseRoutes()
    },
    post_inventarios_frutaDescarte_frutaDescompuesta: async (data) => {
        await InventarioDescarteController.post_inventarios_frutaDescarte_frutaDescompuesta(data)
        return successResponseRoutes()
    },
    get_inventarios_frutaDescarte_fruta: async () => {
        const inventario = await InventarioDescarteController.get_inventarios_frutaDescarte_fruta();
        return successResponseRoutes(inventario)
    },
    get_inventarios_historiales_registros_ingresosDescartes: async (data) => {
        const response = await InventarioDescarteController.get_inventarios_historiales_registros_ingresosDescartes(data)
        return successResponseRoutes(response)
    },
    put_inventarios_frutaDescarte_reprocesarFruta: async (data) => {
        await InventarioDescarteController.put_inventarios_frutaDescarte_reprocesarFruta(data)
        return successResponseRoutes()
    },
    put_inventarios_registros_fruta_descompuesta: async (data) => {
        const response = await InventarioDescarteController.put_inventarios_registros_fruta_descompuesta(data)
        return successResponseRoutes(response)
    },
    put_inventarios_historiales_despachoDescarte: async (data) => {
        const response = await InventarioDescarteController.put_inventarios_historiales_despachoDescarte(data)
        return successResponseRoutes(response)
    },

    //#endregion

    //#region cuartos frios
    get_inventarios_cuartosFrios: async () => {
        const response = await InventarioCuartoFriosController.get_inventarios_cuartosFrios()
        return successResponseRoutes(response)
    },
    get_inventarios_cuartosFrios_detalles: async (data) => {
        const response = await InventarioCuartoFriosController.get_inventarios_cuartosFrios_detalles(data)
        return successResponseRoutes(response)
    },
    get_inventarios_cuartosFrios_listaEmpaque: async () => {
        const response = await InventarioCuartoFriosController.get_inventarios_cuartosFrios_listaEmpaque()
        return successResponseRoutes(response)
    },
    put_inventarios_cuartosFrios_salida_item: async (data) => {
        await InventarioCuartoFriosController.put_inventarios_cuartosFrios_salida_item(data)
        return successResponseRoutes()
    },
    //·region Orden de vaceo
    get_inventarios_ordenVaceo_inventario: async () => {
        const resultado = await OrdenVaceoController.get_inventarios_ordenVaceo_inventario();
        return successResponseRoutes(resultado)
    },
    get_inventarios_ordenVaceo_ordenVaceo: async () => {
        const oredenVaceo = await OrdenVaceoController.get_inventarios_ordenVaceo_ordenVaceo()
        return successResponseRoutes(oredenVaceo)
    },
    put_inventarios_ordenVaceo_modificar: async (data) => {
        await OrdenVaceoController.put_inventarios_ordenVaceo_modificar(data)
        return successResponseRoutes()
    },
    put_inventarios_ordenVaceo_vacear: async (data) => {
        await OrdenVaceoController.put_inventarios_ordenVaceo_vacear(data)
        return successResponseRoutes()
    },
    put_inventarios_frutaDescarte_despachoDescarte: async (data) => {
        const descarte = await InventarioDescarteController.put_inventarios_frutaDescarte_despachoDescarte(data);
        return successResponseRoutes(descarte)
    },
    //#region programaciones
    get_inventarios_programaciones_contenedores: async (data) => {
        const response = await ProgramacionesController.get_inventarios_programaciones_contenedores(data)
        return successResponseRoutes(response)
    },
    put_inventarios_programacion_contenedores: async (data) => {
        await ProgramacionesController.put_inventarios_programacion_contenedores(data)
        return successResponseRoutes()
    },
    //#endregion
    //#region canastillas
    get_inventarios_canastillas_canastillasCelifrut: async () => {
        const response = await CanastillasController.get_inventarios_canastillas_canastillasCelifrut()
        return successResponseRoutes(response)
    },
    put_inventarios_canastillas_celifrut: async (data) => {
        await CanastillasController.put_inventarios_canastillas_celifrut(data)
        return successResponseRoutes()
    },
    //#endregion

    //#region inventarios
    get_inventarios_frutaSinProcesar_frutaEnInventario: async () => {
        const data = await InventariosRepository.get_inventarios_frutaSinProcesar_frutaEnInventario();
        return successResponseRoutes(data)
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
    post_inventarios_canastillas_registro: async (data) => {
        await InventariosRepository.post_inventarios_canastillas_registro(data)
        return successResponseRoutes()
    },
    put_inventarios_frutaDesverdizado_mover: async (data) => {
        await InventariosRepository.put_inventarios_frutaDesverdizado_mover(data)
        return successResponseRoutes()
    },


    get_inventarios_descarteMaquila: async (data) => {
        const response = await InventariosRepository.get_inventarios_descarteMaquila(data)
        return successResponseRoutes(response)
    },
    put_inventarios_salida_descarteMaquila: async (data) => {
        await InventariosRepository.put_inventarios_salida_descarteMaquila(data)
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
    get_inventarios_numero_registros_fruta_descompuesta: async (data) => {
        const response = await InventariosRepository.get_inventarios_numero_registros_fruta_descompuesta(data)
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


    get_inventarios_historiales_registros_inventarioDescartes: async (data) => {
        const response = await InventariosRepository.get_inventarios_historiales_registros_inventarioDescartes(data)
        return successResponseRoutes(response)
    },
    get_inventarios_historiales_numeroRegistros_inventarioDescartes: async (data) => {
        const response = await InventariosRepository.get_inventarios_historiales_numeroRegistros_inventarioDescartes(data)
        return successResponseRoutes(response)
    },
    get_inventarios_registros_cuartosFrios: async (data) => {
        const response = await InventariosRepository.get_inventarios_registros_cuartosFrios(data)
        return successResponseRoutes(response)
    },
    get_inventarios_historiales_numeroRegistros_cuartosFrios: async (data) => {
        const response = await InventariosRepository.get_inventarios_historiales_numeroRegistros_cuartosFrios(data)
        return successResponseRoutes(response)
    },
    get_inventarios_historiales_listasDeEmpaque_itemPallets: async (data) => {
        const response = await InventariosRepository.get_inventarios_historiales_listasDeEmpaque_itemPallets(data)
        return successResponseRoutes(response)
    },
    get_inventarios_historiales_listaDeEmpaque_crearDocumento: async (data) => {
        const response = await InventariosRepository.get_inventarios_historiales_listaDeEmpaque_crearDocumento(data)
        return successResponseRoutes(response)
    },

    put_inventarios_inventarioDescarte_modificar_ingreso: async (data) => {
        await InventarioDescarteController.put_inventarios_inventarioDescarte_modificar_ingreso(data)
        return successResponseRoutes()
    },
    //#endregion
    //#region ingresoInventario
    get_inventarios_ingresos_ef: async () => {
        const response = await InventariosRepository.get_inventarios_ingresos_ef()
        return successResponseRoutes(response)
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

