import { db } from "../../DB/mongoDB/config/init.js";
import { ConnectionDBError } from "../../Error/ConnectionErrors.js";

export class CanastillasRepository {

    static async post_registro(data) {
        try {
            const registro = new db.RegistrosCanastillas(data);
            const saveregistro = await registro.save();
            return saveregistro
        } catch (err) {
            throw new ConnectionDBError(521, `Canastillas -> ${err.message}`);
        }
    }
    static async get_numero_registros(filtro = {}) {
        try {
            const count = await db.RegistrosCanastillas.countDocuments(filtro);
            return count;
        } catch (err) {
            throw new ConnectionDBError(524, `Canastillas -> ${err.message}`);
        }
    }
    static async get_registros_canastillas(options = {}) {
        const {
            ids = [],
            query = {},
            select = {},
            sort = { createdAt: -1 },
            limit = 50,
            skip = 0,
        } = options;
        try {
            let queryFinal = { ...query };

            if (ids.length > 0) {
                queryFinal._id = { $in: ids };
            }

            const limitToUse = (limit === 0 || limit === 'all') ? 0 : limit;

            const lotes = await db.RegistrosCanastillas.find(queryFinal)
                .select(select)
                .sort(sort)
                .limit(limitToUse)
                .skip(skip)
                .exec();

            return lotes

        } catch (err) {
            throw new ConnectionDBError(522, `Error obteniendo canastillas ${err.message}`);
        }
    }
    static async actualizar_registro(filter, update, options = {}, session = null) {

        const finalOptions = {
            new: true,
            ...options,
            ...(session && { session })
        };

        try {
            let documento = await db.RegistrosCanastillas.findOneAndUpdate(filter, update, { ...finalOptions, new: true });
            if (!documento) throw new Error('Registro no encontrado');

            return documento;

        } catch (err) {
            throw new ConnectionDBError(523, `Error modificando los datos: ${err.message}`);
        }
    }
}

