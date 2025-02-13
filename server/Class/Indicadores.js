const { db } = require("../../DB/mongoDB/config/init");
const { ConnectionDBError } = require("../../Error/ConnectionErrors");

class IndicadoresRepository {
    static async get_cantidad_indicadores() {
        try {
            const count = await db.Indicadores.countDocuments();
            return count;
        } catch (err) {
            throw new ConnectionDBError(524, `Indicadores => ${err.message}`);
        }
    }
    static async get_indicadores(options = {}) {
        const {
            ids = [],
            query = {},
            select = {},
            sort = { fecha_creacion: -1 },
            limit = 50,
            skip = 0,
        } = options;
        try {
            let registroQuery = { ...query };

            if (ids.length > 0) {
                registroQuery._id = { $in: ids };
            }
            const registros = await db.Indicadores.find(registroQuery)
                .select(select)
                .sort(sort)
                .limit(limit)
                .skip(skip)
                .exec();

            return registros

        } catch (err) {
            throw new ConnectionDBError(522, `Indicadores -> ${err.message}`);

        }
    }
    static async put_indicador(id, query) {
        try {
            const registro = await db.Indicadores.findOneAndUpdate({ _id: id, }, query, { new: true });
            return registro;

        } catch (err) {
            throw new ConnectionDBError(523, `Indicadores ->  ${err.message}`);
        }
    }
    static async post_indicador(data) {
        try {
            const registro = new db.Indicadores(data);
            const saveregistro = await registro.save();
            return saveregistro
        } catch (err) {
            throw new ConnectionDBError(521, `Indicadores -> ${err.message}`);
        }
    }
}

module.exports.IndicadoresRepository = IndicadoresRepository 