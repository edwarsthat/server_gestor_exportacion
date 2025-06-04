const { db } = require("../../DB/mongoDB/config/init");
const { ConnectionDBError } = require("../../Error/ConnectionErrors");

class FrutaDescompuestaRepository {
    /**
     * Crea un nuevo registro de fruta descompuesta en la base de datos.
     * 
     * @param {Object} data - Datos del registro de fruta descompuesta
     * @param {string} data.tipo_fruta - Tipo de fruta que se descompuso
     * @param {number} data.kilos_total - Total de kilos de fruta descompuesta
     * @param {Object} data.user - Información del usuario que registra
     * @param {string} user_id - ID del usuario que crea el registro
     * 
     * @returns {Promise<Object>} El registro guardado de fruta descompuesta
     * @throws {ConnectionDBError} Error 521 si hay problemas al crear el registro en la base de datos
     */
    static async post_fruta_descompuesta(data, user_id) {
        try {
            const registro = new db.frutaDescompuesta({ ...data, user: user_id });
            registro._user = user_id;
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

/**
* Función genérica para actualizar documentos en MongoDB usando Mongoose
*
* @param {Model} model - Modelo Mongoose (db.Lotes, etc.)
* @param {Object} filter - Objeto de filtrado para encontrar el documento
* @param {Object} update - Objeto con los campos a actualizar
* @param {Object} options - Opciones adicionales de findOneAndUpdate (opcional)
* @param {ClientSession} session - Sesión de transacción (opcional)
* @returns Documento actualizado
*/
    static async actualizar_registro(filter, update, options = {}, session = null, user = '', action = '') {
        const defaultOptions = { new: true }; // retorna el documento actualizado
        const finalOptions = session
            ? { ...defaultOptions, ...options, session }
            : { ...defaultOptions, ...options };

        try {
            const documentoActualizado = await db.frutaDescompuesta.findOneAndUpdate(
                filter,
                update,
                finalOptions,
                { new: true, user: user, action: action }
            );
            return documentoActualizado;
        } catch (err) {
            throw new ConnectionDBError(523, `Error modificando los datos${err.message}`);

        }
    }
}

module.exports.FrutaDescompuestaRepository = FrutaDescompuestaRepository
