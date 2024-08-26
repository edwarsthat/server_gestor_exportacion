const { Clientes } = require("../../DB/mongoDB/schemas/clientes/schemaClientes");
const { recordClientes } = require("../../DB/mongoDB/schemas/clientes/schemaRecordClientes");
const { ConnectionDBError, PutError, PostError } = require("../../Error/ConnectionErrors");
const { ItemBussyError } = require("../../Error/ProcessError");

let bussyIds = new Set();

class ClientesRepository {
    static async get_clientes() {
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
    static async modificar_cliente(id, query, action, user) {
        this.validateBussyIds(id)
        try {
            await Clientes.findOneAndUpdate({ _id: id }, query, { new: true });
            let record = new recordClientes({ operacionRealizada: action, user: user, documento: { ...query, _id: id } })
            await record.save()
        } catch (err) {
            throw new PutError(414, `Error al modificar el dato  ${err.message}`);
        } finally {
            bussyIds.delete(id);
        }
    }
    static async add_cliente(data, user) {
        try {
            const proveedor = new Clientes(data);
            const saveProveedor = await proveedor.save();
            let record = new recordClientes({ operacionRealizada: 'crear cliente', user: user, documento: saveProveedor })
            await record.save();
            return saveProveedor
        } catch (err) {
            throw new PostError(409, `Error agregando lote ${err.message}`);
        }
    }
    static validateBussyIds(id) {
        /**
         * Funcion que añade el id del elemento que se este m0odificando para que no se creen errores de doble escritura
         *
         * @param {string} id - El id del elemento que se esta modificando
         */
        if (bussyIds.has(id)) throw new ItemBussyError(413, "Elemento no disponible por el momento");
        bussyIds.add(id)
    }
}

module.exports.ClientesRepository = ClientesRepository