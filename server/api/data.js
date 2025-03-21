const { DataLogicError } = require("../../Error/logicLayerError")
const { ClientesRepository } = require("../Class/Clientes")


class dataRepository {
    static async get_data_clientes() {
        try {
            const clientes = await ClientesRepository.get_clientes({
                select: { CLIENTE: 1 }
            })
            return clientes
        } catch (err) {
            if (err.status === 522) {
                throw err
            }
            throw new DataLogicError(480, `Error ${err.type}: ${err.message}`)
        }
    }
}

module.exports.dataRepository = dataRepository

