const { SistemaRepository } = require("../../api/Sistema")
const { successResponseRoutes } = require("../helpers/responses")

const apiSocketSistema = {
    put_sistema_proceso_habilitarPrediosDescarte: async (data) => {
        await SistemaRepository.put_sistema_proceso_habilitarPrediosDescarte(data)
        return successResponseRoutes()
    },
    get_sistema_proceso_lotesProcesados: async () => {
        const response = await SistemaRepository.get_sistema_proceso_lotesProcesados()
        return successResponseRoutes(response)
    },
    put_sistema_proceso_inicioHoraProceso: async () => {
        await SistemaRepository.put_sistema_proceso_inicioHoraProceso();
        return successResponseRoutes()
    },
    get_sistema_proceso_inicioHoraProceso: async () => {
        const response = await SistemaRepository.get_sistema_proceso_inicioHoraProceso();
        return successResponseRoutes(response)
    },
    put_sistema_proceso_finalizarProceso: async () => {
        await SistemaRepository.put_sistema_proceso_finalizarProceso();
        return successResponseRoutes()
    },
    put_sistema_proceso_pausaProceso: async () => {
        await SistemaRepository.put_sistema_proceso_pausaProceso();
        return successResponseRoutes()
    },
    put_sistema_proceso_reanudarProceso: async () => {
        await SistemaRepository.put_sistema_proceso_reanudarProceso();
        return successResponseRoutes()
    },
    get_sistema_proceso_dataProceso: async () => {
        const response = await SistemaRepository.get_sistema_proceso_dataProceso();
        return successResponseRoutes(response)
    },
    get_sistema_habilitarInstancias_lotes: async () => {
        const response = await SistemaRepository.get_sistema_habilitarInstancias_lotes();
        return successResponseRoutes(response)
    },
    put_sistema_habilitarInstancias_habilitarPredio: async (data) => {
        const response = await SistemaRepository.put_sistema_habilitarInstancias_habilitarPredio(data);
        return successResponseRoutes(response)
    },

    //#region modificar seriales
    get_sistema_parametros_configuracionSeriales_EF1: async () => {
        const response = await SistemaRepository.get_sistema_parametros_configuracionSeriales_EF1();
        return successResponseRoutes(response)
    },
    put_sistema_parametros_configuracionSeriales_EF1: async (data) => {
        await SistemaRepository.put_sistema_parametros_configuracionSeriales_EF1(data);
        return successResponseRoutes()
    },
    get_sistema_parametros_configuracionSeriales_EF8: async () => {
        const response = await SistemaRepository.get_sistema_parametros_configuracionSeriales_EF8();
        return successResponseRoutes(response)
    },
    put_sistema_parametros_configuracionSeriales_EF8: async (data) => {
        await SistemaRepository.put_sistema_parametros_configuracionSeriales_EF8(data);
        return successResponseRoutes()
    },
    get_sistema_parametros_configuracionSeriales_Celifrut: async () => {
        const response = await SistemaRepository.get_sistema_parametros_configuracionSeriales_Celifrut();
        return successResponseRoutes(response)
    },
    put_sistema_parametros_configuracionSeriales_Celifrut: async (data) => {
        await SistemaRepository.put_sistema_parametros_configuracionSeriales_Celifrut(data);
        return successResponseRoutes()
    },
    //#endregion

}

module.exports.apiSocketSistema = apiSocketSistema
