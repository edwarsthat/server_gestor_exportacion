const { dataRepository } = require("../../api/data")
const { successResponseRoutes } = require("../helpers/responses")

const apiSocketData = {
    get_data_clientes: async () => {
        const response = await dataRepository.get_data_clientes();
        return successResponseRoutes(response);
    },
    get_data_cargos: async (req) => {
        const response = await dataRepository.get_data_cargos(req)
        return successResponseRoutes(response)
    },
    get_data_tipoFruta: async () => {
        const response = await dataRepository.get_data_tipoFruta()
        return successResponseRoutes(response)
    },
    get_data_clientesNacionales: async () => {
        const response = await dataRepository.get_data_clientesNacionales()
        return successResponseRoutes(response)
    }
}

module.exports.apiSocketData = apiSocketData