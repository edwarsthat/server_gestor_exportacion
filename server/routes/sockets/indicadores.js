const { IndicadoresAPIRepository } = require("../../api/IndicadoresAPI");
const { successResponseRoutes } = require("../helpers/responses");

const apiSockectIndicadores = {
    //#region registros eficiencia operativa
    get_indicadores_operaciones_eficienciaOperativa: async (data) => {
        const response = await IndicadoresAPIRepository.get_indicadores_operaciones_eficienciaOperativa(data)
        return successResponseRoutes(response)
    },
    put_indicadores_operaciones_eficienciaOperativa: async (data) => {
        await IndicadoresAPIRepository.put_indicadores_operaciones_eficienciaOperativa(data)
        return successResponseRoutes()
    },
    get_indicadores_operaciones_registrosDiarios: async (data) => {
        const response = await IndicadoresAPIRepository.get_indicadores_operaciones_registrosDiarios(data)
        return successResponseRoutes(response)
    },
    get_indicaores_operaciones_lotes: async (data) => {
        const response = await IndicadoresAPIRepository.get_indicaores_operaciones_lotes(data)
        return successResponseRoutes(response)
    },
    get_indicadores_operaciones_lotes: async (data) => {
        const response = await IndicadoresAPIRepository.get_indicadores_operaciones_lotes(data)
        return successResponseRoutes(response)
    },
    get_indicadores_operaciones_noCalidad: async (data) => {
        const response = await IndicadoresAPIRepository.get_indicadores_operaciones_noCalidad(data)
        return successResponseRoutes(response)
    },
    //#endregios
}

module.exports.apiSockectIndicadores = apiSockectIndicadores