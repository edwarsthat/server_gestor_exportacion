import { db } from "../../../../DB/mongoDB/config/init.js";
import { PostError } from "../../../../Error/ConnectionErrors.js";

export class TalentoHumanoDotacionCarnetsRepository {
    static async post_data(data, opts = {}) {
        const { session = null, user } = opts;
        try {
            const carnet = new db.Carnet(data);
            carnet.user = user;
            const saved = await carnet.save({ session });
            return saved;
        } catch (err) {
            throw new PostError(409, `Error agregando carnet ${err.message}`);
        }
    }
    static async get_data(options = {}, { session = null } = {}) {
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

            const cargosPersonal = await db.Carnet.find(newQuery)
                .select(select)
                .limit(limit)
                .skip(skip)
                .populate(populate)
                .session(session)
                .exec();

            return cargosPersonal;
        } catch (err) {
            throw new BadGetwayError(501, `Error obteniendo carnet ${err.message}`);
        }
    }
    static async get_numero_registros(filter) {
        try {
            const numeroRegistros = await db.Carnet.countDocuments(filter)
            return numeroRegistros
        } catch (err) {
            throw new BadGetwayError(501, `Error obteniendo numero de registros de carnet ${err.message}`);
        }
    }
}