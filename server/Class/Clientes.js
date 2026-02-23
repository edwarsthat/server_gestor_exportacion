import { db } from "../../DB/mongoDB/config/init.js";
import { ConnectionDBError, PostError } from "../../Error/ConnectionErrors.js";
import { BaseRepository } from "./base/BaseRepository.js";

export class ClientesRepository extends BaseRepository {
    static get model() { return db.Clientes; }
    static modelName = 'Clientes';
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
