import { db } from "../../DB/mongoDB/config/init.js";
import { PostError, ConnectionDBError } from "../../Error/ConnectionErrors.js";
import { BaseRepository } from "./base/BaseRepository.js";

export class DespachoDescartesRepository extends BaseRepository {
    static get model() { return db.historialDespachoDescarte; }
    static modelName = 'HistorialDespachoDescarte';

    static async get_historial_descarte(options = {}) {
        const {
            ids = [],
            query = {},
            select = {},
            sort = { fecha: -1 },
            limit = 0,
            skip = 0,
            populate = [
                { path: 'cliente', select: 'cliente' },
                { path: 'tipoFruta', select: 'tipoFruta' },
                { path: "user", select: "usuario" }
            ]
        } = options;
        try {
            let historialQuery = { ...query };

            if (ids.length > 0) {
                historialQuery._id = { $in: ids };
            }
            const historial = await db.historialDespachoDescarte.find(historialQuery)
                .select(select)
                .sort(sort)
                .limit(limit)
                .skip(skip)
                .populate(populate)
                .exec();

            return historial;

        } catch (err) {
            throw new ConnectionDBError(522, `Error despacho descarte ${err.message}`);
        }
    }
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

