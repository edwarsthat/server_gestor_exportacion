import { db } from "../../DB/mongoDB/config/init.js";
import { ErrorCatalog } from "../../Error/ConnectionErrors.js";

export class Descartes {
    static async get_descartes(options = {}) {
        try {
            const {
                ids = [],
                query = {},
                select = {}
            } = options;
            let Query = { ...query };

            if (ids.length > 0) {
                Query._id = { $in: ids };
            }

            const tipos = await db.Descartes.find(Query)
                .select(select)
                

            return tipos
        } catch (err) {
            throw new ErrorCatalog(522, `Error obteniendo tipos de fruta ${err.message}`);

        }
    }
}