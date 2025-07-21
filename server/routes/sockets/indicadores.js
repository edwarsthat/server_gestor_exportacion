import { IndicadoresAPIRepository } from "../../api/IndicadoresAPI.js";
import { successResponseRoutes } from "../helpers/responses.js";


export const apiSockectIndicadores = {
    //#region registros eficiencia operativa
    get_indicadores_operaciones_eficienciaOperativa: async (data) => {
        const response = await IndicadoresAPIRepository.get_indicadores_operaciones_eficienciaOperativa(data)
        return successResponseRoutes(response)
    },
    get_indicadores_proceso_numero_items: async () => {
        const response = await IndicadoresAPIRepository.get_indicadores_proceso_numero_items()
        return successResponseRoutes(response)
    },
    get_indicadores_operaciones_kilosProcesados: async (data) => {
        const response = await IndicadoresAPIRepository.get_indicadores_operaciones_kilosProcesados(data)
        return successResponseRoutes(response)
    },
    get_indicadores_operaciones_rendimientoPredios: async (data) => {
        const response = await IndicadoresAPIRepository.get_indicadores_operaciones_rendimientoPredios(data)
        return successResponseRoutes(response)
    },
    put_indicadores_operaciones_eficienciaOperativa: async (data) => {
        await IndicadoresAPIRepository.put_indicadores_operaciones_eficienciaOperativa(data)
        return successResponseRoutes()
    },

    //#endregios
}
