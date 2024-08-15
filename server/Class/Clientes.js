const { Clientes } = require("../../DB/mongoDB/schemas/clientes/schemaClientes");
const { ConnectionDBError } = require("../../Error/ConnectionErrors");

class ClientesRepository {
    static async getProveedores() {
        try {
            const clientes = await Clientes.find();
            if (clientes === null) {
                throw new ConnectionDBError(407, "Error en la busqueda de proveedores");
            } else {
                return clientes
            }
        } catch (err) {
            throw new ConnectionDBError(408, `Error obteniendo cliente ${err.message}`);
        }
    }
}

module.exports.ClientesRepository = ClientesRepository