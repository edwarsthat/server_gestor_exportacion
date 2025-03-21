const { dataRepository } = require("../../api/data")
const { successResponseRoutes } = require("../helpers/responses")

const apiSocketData = {
    get_data_clientes: async () => {
        const response = await dataRepository.get_data_clientes();
        return successResponseRoutes(response);
    }
}

module.exports.apiSocketData = apiSocketData