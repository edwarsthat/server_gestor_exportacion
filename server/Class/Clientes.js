import { db } from "../../DB/mongoDB/config/init.js";
import { ConnectionDBError, PutError, PostError } from "../../Error/ConnectionErrors.js";
import { BaseRepository } from "./base/BaseRepository.js";

export class ClientesRepository extends BaseRepository {
    static get model() { return db.Clientes; }
    static modelName = 'Clientes';
    //clientes internacionales
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
        try {
            const response = await db.Clientes.findOneAndUpdate({ _id: id }, query, { new: true });
            let record = new db.recordClientes({ operacionRealizada: action, user: user, documento: { ...query, _id: id } })
            await record.save()
            return response
        } catch (err) {
            throw new PutError(414, `Error al modificar el dato  ${err.message}`);
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
            throw new PostError(521, `Error agregando clinete ${err.message}`);
        }
    }

    //clientes nacionales
    static async post_cliente_nacional(data, session = null) {
        try {
            const cliente = await db.ClientesNacionales(data);
            return cliente.save({ session });
        } catch (err) {
            if (err.code === 11000) {
                throw new PostError(521, 'Ya existe un cliente con ese identificador.')
            }
            throw new PostError(521, `Error agregando cliente nacional ${err.message}`)
        }
    }
    static async get_numero_clientesNacionales() {
        try {
            const count = await db.ClientesNacionales.countDocuments();
            return count;
        } catch (err) {
            throw new ConnectionDBError(524, `Error obteniendo cantidad clientes ${err.mess}`);
        }
    }
    static async actualizar_clienteNacional(filter, update, options = {}) {
        const finalOptions = {
            returnDocument: "after",
            runValidators: true,
            ...options,
        };

        try {
            const doc = await db.ClientesNacionales.findOneAndUpdate(
                filter,
                update,
                finalOptions
            );

            if (!doc) {
                throw new ConnectionDBError(404, "Cliente no encontrado");
            }

            return doc;
        } catch (err) {
            console.error("[DB ERROR][ClientesNacionales.actualizar]", err);
            throw new ConnectionDBError(523, `Error modificando los datos: ${err.message}`);
        }
    }
}

export class ClientesNacionalesRepository extends BaseRepository {
    static get model() { return db.ClientesNacionales; }
    static modelName = 'ClientesNacionales';
}
