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
    static async get_cantidad_precios(filtro) {
        try {
            const count = await db.Precios.countDocuments(filtro);
            return count;
        } catch (err) {
            throw new ConnectionDBError(524, `Precios => ${err.message}`);
        }
    }
    static async actualizar_precio(filter, update, options = {}, session = null) {
        /**
         * Función genérica para actualizar documentos en MongoDB usando Mongoose
         *
         * @param {Model} model - Modelo Mongoose (db.Contenedores, etc.)
         * @param {Object} filter - Objeto de filtrado para encontrar el documento
         * @param {Object} update - Objeto con los campos a actualizar
         * @param {Object} options - Opciones adicionales de findOneAndUpdate (opcional)
         * @param {ClientSession} session - Sesión de transacción (opcional)
         * @returns Documento actualizado
         */
        const defaultOptions = { new: true }; // retorna el documento actualizado
        const finalOptions = session
            ? { ...defaultOptions, ...options, session }
            : { ...defaultOptions, ...options };

        try {
            const documentoActualizado = await db.Precios.findOneAndUpdate(
                filter,
                update,
                finalOptions
            );
            return documentoActualizado;
        } catch (err) {
            throw new ConnectionDBError(523, `Error modificando los datos${err.message}`);

        }
    }
}

module.exports.PreciosRepository = PreciosRepository
