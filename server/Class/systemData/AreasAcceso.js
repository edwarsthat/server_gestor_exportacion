import { db } from "../../../DB/mongoDB/config/init.js";
import { ConnectionDBError } from "../../../Error/ConnectionErrors.js";

export class AreasAccesoRepository {

    static async getAreasAcceso(options = {}, { session = null } = {}) {
        const {
            ids = [],
            query = {},
            select = {},
            limit = 0,
            skip = 0,
        } = options;

        try {
            let idsQuery = { ...query };

            if (ids.length > 0) {
                idsQuery._id = { $in: ids };
            }

            const documents = await db.AreasFisicas.find(idsQuery)
                .select(select)
                .limit(limit)
                .skip(skip)
                .session(session)
                .exec();

            return documents
        } catch (err) {
            throw new ConnectionDBError(522, `Error obteniendo areas de acceso ${err.message}`);
        }
    }
}