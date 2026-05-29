import { db } from "../../DB/mongoDB/config/init.js";
import { ConnectionDBError } from "../../Error/ConnectionErrors.js";

export class ArchiveLoteMaquila {
    static async get_logs_lotes_maquila(options = {}, { session = null } = {}) {
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

            const lotes = await db.AuditLotesMaquila.find(lotesQuery)
                .select(select)
                .sort(sort)
                .limit(limit)
                .skip(skip)
                .populate(populate)
                .session(session)
                

            return lotes

        } catch (err) {
            throw new ConnectionDBError(522, `Error obteniendo logs lotes maquila ${err.message}`);
        }
    }
}