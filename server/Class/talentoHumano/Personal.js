import { db } from "../../../DB/mongoDB/config/init.js";
import { BadGetwayError, ConnectionDBError, PostError } from "../../../Error/ConnectionErrors.js";

export class PersonalRepository {
    static async addPersonal(data, opts = {}) {
        const { session, user, action } = opts;
        try {
            const personal = new db.Personal(data);
            personal._user = user;
            const saved = await personal.save({ session, action });
            return saved;
        } catch (err) {
            throw new PostError(409, `Error agregando personal ${err.message}`);
        }
    }
    static async get_personal(options = {}, { session = null } = {}) {
        const {
            ids = [],
            query = {},
            select = {},
            limit = 0,
            skip = 0,
            populate = []
        } = options;

        try {
            let newQuery = { ...query };

            if (ids.length > 0) {
                newQuery._id = { $in: ids };
            }

            const personal = await db.Personal.find(newQuery)
                .select(select)
                .limit(limit)
                .skip(skip)
                .populate(populate)
                .session(session)
                .exec();

            return personal;
        } catch (err) {
            throw new BadGetwayError(501, `Error obteniendo personal ${err.message}`);
        }
    }
    static async get_numero_registros_personal(filter) {
        try {
            const numeroRegistros = await db.Personal.countDocuments(filter)
            return numeroRegistros
        } catch (err) {
            throw new BadGetwayError(501, `Error obteniendo numero de registros de personal ${err.message}`);
        }
    }
    static async actualizar_personal(filter, update, options = {}) {
        const { session, arrayFilters, ...restOptions } = options;

        const finalOptions = {
            new: true,
            ...restOptions,
            ...(session && { session }),
            ...(arrayFilters && { arrayFilters })
        };

        try {
            let documento = await db.Personal.findOneAndUpdate(filter, update, { ...finalOptions });
            if (!documento) {
                throw new Error('Personal no encontrado');
            }

            return documento;

        } catch (err) {
            throw new ConnectionDBError(523, `Error modificando los datos: ${err.message}`);
        }
    }
}
