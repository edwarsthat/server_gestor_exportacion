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


}

module.exports.apiSocketSistema = apiSocketSistema
