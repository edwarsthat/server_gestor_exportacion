const { TransporteRepository } = require("../../api/Transporte")
const { successResponseRoutes } = require("../helpers/responses")

const apiSocketTransporte = {
    //#region programaciones
    get_transporte_programaciones_mulaContenedores: async () => {
        const response = await TransporteRepository.get_transporte_programaciones_mulaContenedores()
        return successResponseRoutes(response)
    },
    put_transporte_programaciones_mulaContenedor: async (data) => {
        await TransporteRepository.put_transporte_programaciones_mulaContenedor(data)
        return successResponseRoutes()
    },
    get_transporte_programaciones_exportacion_contenedores: async () => {
        const response = await TransporteRepository.get_transporte_programaciones_exportacion_contenedores()
        return successResponseRoutes(response)
    },
    put_transporte_programaciones_exportacion: async (data) => {
        await TransporteRepository.put_transporte_programaciones_exportacion(data)
        return successResponseRoutes()
    },
    //#endregion
    //#region registros
    get_transporte_registros_exportacion: async (data) => {
        const response = await TransporteRepository.get_transporte_registros_exportacion(data)
        return successResponseRoutes(response)
    },
    get_transporte_registros_exportacion_numeroElementos: async () => {
        const response = await TransporteRepository.get_transporte_registros_exportacion_numeroElementos()
        return successResponseRoutes(response)
    },
    put_transporte_registros_exportacion: async (data) => {
        await TransporteRepository.put_transporte_registros_exportacion(data)
        return successResponseRoutes()
    },
    get_transporte_registros_programacionMula: async (data) => {
        const response = await TransporteRepository.get_transporte_registros_programacionMula(data)
        return successResponseRoutes(response)
    },
    get_transporte_registros_programacion_mula_numeroElementos: async () => {
        const response = await TransporteRepository.get_transporte_registros_programacion_mula_numeroElementos()
        return successResponseRoutes(response)
    },
    put_transporte_registros_programacionMula: async (data) => {
        await TransporteRepository.put_transporte_registros_programacionMula(data)
        return successResponseRoutes()
    },
    get_transporte_registros_inspeccionMula_numeroElementos: async () => {
        const response = await TransporteRepository.get_transporte_registros_inspeccionMula_numeroElementos()
        return successResponseRoutes(response)
    },
    get_transporte_registros_formulariosInspeccion: async (data) => {
        const response = await TransporteRepository.get_transporte_registros_formulariosInspeccion(data)
        return successResponseRoutes(response)
    },
    put_transporte_registros_inspeccionMula: async (data) => {
        await TransporteRepository.put_transporte_registros_inspeccionMula(data)
        return successResponseRoutes()
    },
    //#endregion
    //#region formularios
    get_transporte_formulario_contenedores: async () => {
        const response = await TransporteRepository.get_transporte_formulario_contenedores();
        return successResponseRoutes(response)
    },
    put_transporte_formulario_inspeccionMula: async (data) => {
        await TransporteRepository.put_transporte_formulario_inspeccionMula(data)
        return successResponseRoutes()
    },
    //#endregion
    //#region documentos
    get_transporte_documentos_programacionMula_contenedores: async (data) => {
        const response = await TransporteRepository.get_transporte_documentos_programacionMula_contenedores(data)
        return successResponseRoutes(response)
    },
    get_transporte_documentos_programacionMulas_numeroElementos: async () => {
        const response = await TransporteRepository.get_transporte_documentos_programacionMulas_numeroElementos()
        return successResponseRoutes(response)
    },

    //#endregion
}

module.exports.apiSocketTransporte = apiSocketTransporte