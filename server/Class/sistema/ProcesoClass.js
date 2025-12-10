import { PostError } from "../../../Error/ConnectionErrors.js";
import { ConnectionDBError } from "../../../Error/ConnectionErrors.js";
// import { db } from "../../Database/Database.js";
import { db } from "../../../DB/mongoDB/config/init.js";

export class SistemaProcesoClass {
    static async addRegistroHabilitarEstancia(data, user, opts = {}) {
        try {
            const { session } = opts;
            const newDoc = new db.HabilitarInstancia(data);
            newDoc._user = user;

            const saved = await newDoc.save({ session });
            return saved;
        } catch (err) {
            throw new PostError(500, `Error ${err.name}: ${err.message}`)
        }
    }
    static async getRegistrosHabiliarInstancia(options = {}, { session = null } = {}) {
        const {
            ids = [],
            query = {},
            select = {},
            sort = { createdAt: -1 },
            limit = 0,
            skip = 0,
            populate = []
        } = options;
        try {
            let lotesQuery = { ...query };

            if (ids.length > 0) {
                lotesQuery._id = { $in: ids };
            }

            const lotes = await db.HabilitarInstancia.find(lotesQuery)
                .select(select)
                .sort(sort)
                .limit(limit)
                .skip(skip)
                .populate(populate)
                .session(session)
                .exec();

            return lotes

        } catch (err) {
            throw new ConnectionDBError(522, `Error obteniendo lotes maquila ${err.message}`);
        }
    }
}