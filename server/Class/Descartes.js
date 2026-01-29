import { db } from "../../DB/mongoDB/config/init.js";
import { ConnectionDBError } from "../../Error/ConnectionErrors.js";
import { BaseRepository } from "./base/BaseRepository.js";

export class DescartesRepository extends BaseRepository {
    static get model() { return db.Descartes; }
    static modelName = 'Descartes';

    static async getDescartes(options = {}, { session = null } = {}) {
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

            const documents = await db.Descartes.find(idsQuery)
                .select(select)
                .limit(limit)
                .skip(skip)
                .session(session)
                .exec();

            return documents
        } catch (err) {
            throw new ConnectionDBError(522, `Error obteniendo lotes ${err.message}`);
        }
    }
} 