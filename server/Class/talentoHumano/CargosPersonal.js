import { db } from "../../../DB/mongoDB/config/init.js";
import { BadGetwayError, PostError } from "../../../Error/ConnectionErrors.js";

export class CargosPersonalRepository {
    static async addCargosPersonal(data, opts = {}) {
        const { session, user, action } = opts;
        try {
            const cargo = new db.CargosPersonal(data);
            cargo._user = user;
            const saved = await cargo.save({ session, action });
            return saved;
        } catch (err) {
            throw new PostError(409, `Error agregando cargo ${err.message}`);
        }
    }
    static async get_cargosPersonal(options = {}, { session = null } = {}) {
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

            const cargosPersonal = await db.CargosPersonal.find(newQuery)
                .select(select)
                .limit(limit)
                .skip(skip)
                .populate(populate)
                .session(session)
                .exec();

            return cargosPersonal;
        } catch (err) {
            throw new BadGetwayError(501, `Error obteniendo cargos ${err.message}`);
        }
    }
    static async get_numero_registros_cargos(filter) {
        try {
            const numeroRegistros = await db.CargosPersonal.countDocuments(filter)
            return numeroRegistros
        } catch (err) {
            throw new BadGetwayError(501, `Error obteniendo numero de registros de cargos ${err.message}`);
        }
    }
    static async actualizar_cargo(filter, update, options = {}) {
        const { session, arrayFilters, ...restOptions } = options;

        const finalOptions = {
            new: true,
            ...restOptions,
            ...(session && { session }),
            ...(arrayFilters && { arrayFilters })
        };

        try {
            let documento = await db.CargosPersonal.findOneAndUpdate(filter, update, { ...finalOptions });
            if (!documento) {
                if (softNotFound) return null;
                throw new Error('Cargo no encontrado');
            }

            return documento;

        } catch (err) {
            throw new ConnectionDBError(523, `Error modificando los datos: ${err.message}`);
        }
    }
}