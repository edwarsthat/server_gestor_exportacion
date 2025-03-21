const { db } = require("../../DB/mongoDB/config/init");
const { ConnectionDBError, PutError, PostError } = require("../../Error/ConnectionErrors");
const { ItemBussyError } = require("../../Error/ProcessError");

let bussyIds = new Set();

class ClientesRepository {
    static async get_clientes(options = {}) {
        try {
            const {
                ids = [],
                query = {},
                select = {}
            } = options;
            let Query = { ...query };

            if (ids.length > 0) {
                Query._id = { $in: ids };
            }

            const clientes = await db.Clientes.find(Query)
                .select(select)
                .exec();

            return clientes
        } catch (err) {
            throw new ConnectionDBError(522, `Error obteniendo el cliente ${err.message}`);

        }
    }
    static async actualizar_cliente(filter, update, options = {}, session = null) {
        /**
         * Función genérica para actualizar documentos en MongoDB usando Mongoose
         *
         * @param {Model} model - Modelo Mongoose (db.clientes, etc.)
         * @param {Object} filter - Objeto de filtrado para encontrar el documento
         * @param {Object} update - Objeto con los campos a actualizar
         * @param {Object} options - Opciones adicionales de findOneAndUpdate (opcional)
         * @param {ClientSession} session - Sesión de transacción (opcional)
         * @returns Documento actualizado
         */

        const defaultOptions = { new: true }; // retorna el documento actualizado
        const finalOptions = session
            ? { ...defaultOptions, ...options, session }
            : { ...defaultOptions, ...options };

        try {
            const documentoActualizado = await db.Clientes.findOneAndUpdate(
                filter,
                update,
                finalOptions
            );
            return documentoActualizado;
        } catch (err) {
            throw new ConnectionDBError(523, `Error modificando los datos${err.message}`);
        }
    }

    static async put_cliente(id, query, action, user) {
        this.validateBussyIds(id)
        try {
            const response = await db.Clientes.findOneAndUpdate({ _id: id }, query, { new: true });
            let record = new db.recordClientes({ operacionRealizada: action, user: user, documento: { ...query, _id: id } })
            await record.save()
            return response
        } catch (err) {
            throw new PutError(414, `Error al modificar el dato  ${err.message}`);
        } finally {
            bussyIds.delete(id);
        }
    }
    static async post_cliente(data, user) {
        try {
            delete data._id;
            const proveedor = new db.Clientes(data);
            const saveProveedor = await proveedor.save();
            let record = new db.recordClientes({ operacionRealizada: 'crear cliente', user: user, documento: saveProveedor })
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