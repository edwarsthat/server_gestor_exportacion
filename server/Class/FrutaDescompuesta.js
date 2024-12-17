const { db } = require("../../DB/mongoDB/config/init");
const { ConnectionDBError } = require("../../Error/ConnectionErrors");

class FrutaDescompuestaRepository {
    static async post_fruta_descompuesta(data, user_id) {
        try {
            const registro = new db.frutaDescompuesta({ ...data, user: user_id });
            const saveregistro = await registro.save();
            return saveregistro
        } catch (err) {
            throw new ConnectionDBError(521, `Error creando el registro de fruta descompuesta ${err.message}`);

        }
    }

    static async get_fruta_descompuesta(options = {}) {
        const {
            ids = [],
            query = {},
            select = {},
            sort = { createdAt: -1 },
            limit = 50,
            skip = 0,
        } = options;
        try {
            let registroQuery = { ...query };

            if (ids.length > 0) {
                registroQuery._id = { $in: ids };
            }

            const registros = await db.frutaDescompuesta.find(registroQuery)
                .select(select)
                .sort(sort)
                .limit(limit)
                .skip(skip)
                .exec();

            return registros

        } catch (err) {
            throw new ConnectionDBError(522, `Error obteniendo el registro de fruta descompuesta ${err.message}`);

        }

    }

    static async get_numero_fruta_descompuesta() {
        try {
            const count = await db.frutaDescompuesta.countDocuments();
            return count;
        } catch (err) {
            throw new ConnectionDBError(522, `Error obteniendo la cantidad de registros de fruta descompuesta ${err.message}`);
        }
    }

    static async put_fruta_descompuesta(id, query) {
        try {
            const registro = await db.frutaDescompuesta.findOneAndUpdate({ _id: id, }, query, { new: true });
            return registro;

        } catch (err) {
            throw new ConnectionDBError(523, `Error al modificar el dato  ${err.message}`);
        }
    }

    static async delete_fruta_descompuesta(id) {
        try {
            const registro = await db.frutaDescompuesta.findByIdAndDelete(
                { _id: id, }, { new: true }
            );
            return registro;

        } catch (err) {
            throw new ConnectionDBError(523, `Error al modificar el dato  ${err.message}`);
        }
    }
}

module.exports.FrutaDescompuestaRepository = FrutaDescompuestaRepository
