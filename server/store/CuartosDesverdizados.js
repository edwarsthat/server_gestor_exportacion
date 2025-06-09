import { db } from "../../DB/mongoDB/config/init.js";
import { ErrorCatalog } from "../../Error/ConnectionErrors.js";

export class CuartosDesverdizados {
    static async get_cuartosDesverdizados(options = {}) {
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

            const cuartos = await db.CuartosDesverdizados.find(Query)
                .select(select)
                .exec();

            return cuartos
        } catch (err) {
            throw new ErrorCatalog(522, `Error obteniendo cuarto desverdizado ${err.message}`);

        }
    }
}
