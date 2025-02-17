const { db } = require("../../DB/mongoDB/config/init");
const { ConnectionDBError } = require("../../Error/ConnectionErrors")

class PreciosRepository {
    static async post_precio(data) {
        try {
            const registro = new db.Precios(data);
            const saveregistro = await registro.save();
            return saveregistro
        } catch (err) {
            throw new ConnectionDBError(521, `Precios -> ${err}`)
        }
    }
    static async get_precios(options = {}) {
        const {
            ids = [],
            query = {},
            select = {},
            sort = { fecha: -1 },
            limit = 50,
            skip = 0,
        } = options;
        try {
            let registroQuery = { ...query };

            if (ids.length > 0) {
                registroQuery._id = { $in: ids };
            }

            const limitToUse = (limit === 0 || limit === 'all') ? 0 : limit;

            const registros = await db.Precios.find(registroQuery)
                .select(select)
                .sort(sort)
                .limit(limitToUse)
                .skip(skip)
                .exec();

            return registros

        } catch (err) {
            throw new ConnectionDBError(522, `Precios -> ${err.message}`);

        }
    }
    static async get_cantidad_precios() {
        try {
            const count = await db.Precios.countDocuments();
            return count;
        } catch (err) {
            throw new ConnectionDBError(524, `Precios => ${err.message}`);
        }
    }
}

module.exports.PreciosRepository = PreciosRepository
