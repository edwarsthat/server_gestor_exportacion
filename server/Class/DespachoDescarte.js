import { db } from "../../DB/mongoDB/config/init.js";
import { ConnectionDBError } from "../../Error/ConnectionErrors.js";
import { BaseRepository } from "./base/BaseRepository.js";

export class DespachoDescartesRepository extends BaseRepository {
    static get model() { return db.historialDespachoDescarte; }
    static modelName = 'HistorialDespachoDescarte';


    static async get_numero_despachoDescartes() {
        try {
            const count = await db.historialDespachoDescarte.countDocuments();
            return count;
        } catch (err) {
            throw new ConnectionDBError(522, `Error obteniendo la cantidad de registros de despacho descartes ${err.message}`);
        }
    }
    static async actualizar_registro(filter, update, options = {}, session = null, user = '', action = '') {
        const defaultOptions = { new: true }; // retorna el documento actualizado
        const finalOptions = session
            ? { ...defaultOptions, ...options, session }
            : { ...defaultOptions, ...options };

        try {
            const documentoActualizado = await db.historialDespachoDescarte.findOneAndUpdate(
                filter,
                update,
                finalOptions,
                { new: true, user: user, action: action }
            );
            return documentoActualizado;
        } catch (err) {
            throw new ConnectionDBError(523, `Error modificando los datos${err.message}`);

        }
    }
}

