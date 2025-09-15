import { db } from "../../DB/mongoDB/config/init.js";
import { ErrorCatalog } from "../../Error/ConnectionErrors.js";

export class CuartosFrios {
    static async get_cuartosFrios(options = {}) {
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

            const cuartos = await db.CuartosFrios.find(Query)
                .select(select)
                .exec();

            return cuartos
        } catch (err) {
            throw new ErrorCatalog(522, `Error obteniendo cuarto frio ${err.message}`);

        }
    }
    static async actualizar_cuartoFrio(filter, update, options = {}) {
        // ...toda la magia anterior...
        /**
         * El update más lírico y funcional del reino Mongo.
         */
        const finalOptions = {
            new: true,
            ...options
        };

        try {
            // 1. Actualiza el lote con los datos proporcionados y obtiene el nuevo estado
            let documento = await db.CuartosFrios.findOneAndUpdate(filter, update, finalOptions);
            if (!documento) throw new Error('Cuarto frio no encontrado');


            return documento;

        } catch (err) {
            // Aquí los errores se lamentan en verso
            throw new ErrorCatalog(523, `Error modificando los datos: ${err.message}`);
        }
    }
}
