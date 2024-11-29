const { recordLotes } = require("../../DB/mongoDB/schemas/lotes/schemaRecordLotes");
const { ConnectionDBError, PutError } = require("../../Error/ConnectionErrors");
const { ItemBussyError } = require("../../Error/ProcessError");

let bussyIds = new Set();

class RecordLotesRepository {

    static async getRecordLotes(options = {}) {
        /**
         * Función que obtiene el historial de lotes de la base de datos de MongoDB.
         *
         * @param {Object} options - Objeto de configuración para obtener los lotes procesados.
         * @param {Array<string>} [options.ids=[]] - Array de IDs de los lotes procesados a obtener.
         * @param {Object} [options.query={}] - Filtros adicionales para la consulta.
         * @param {Object} [options.select={}] - Campos a seleccionar en los documentos obtenidos.
         * @param {Object} [options.sort={ createdAt: -1 }] - Criterios de ordenación para los resultados.
         * @param {number} [options.limit=50] - Número máximo de documentos a obtener.
         * @param {number} [options.skip=0] - Número de documentos a omitir desde el inicio.
         * @param {string} [options.user=''] - El usuario 
         * @returns {Promise<Array>} - Promesa que resuelve a un array de lotes procesados obtenidos.
         * @throws {ConnectionDBError} - Lanza un error si ocurre un problema al obtener los lotes procesados.
         */
        const {
            ids = [],
            query = {},
            select = {},
            sort = { createdAt: -1 },
            limit = 50,
            user = '',
        } = options;
        try {

            let lotesQuery = { ...query };

            if (ids.length > 0) {
                lotesQuery._id = { $in: ids };
            }
            if (user) {
                lotesQuery.user = user;
            }

            const lotes = recordLotes.find(lotesQuery)
                .select(select)
                .sort(sort)
                .limit(limit)
                .exec();

            return lotes;

        } catch (err) {
            throw new ConnectionDBError(408, `Error obteniendo el historial de lotes procesados ${err.message}`);
        }
    }
    static async getVaciadoRecord(options = {}) {
        /**
         * Función que obtiene el historial de lotes procesados de la base de datos de MongoDB.
         *
         * @param {Object} options - Objeto de configuración para obtener los lotes procesados.
         * @param {Array<string>} [options.ids=[]] - Array de IDs de los lotes procesados a obtener.
         * @param {Object} [options.query={}] - Filtros adicionales para la consulta.
         * @param {Object} [options.select={}] - Campos a seleccionar en los documentos obtenidos.
         * @param {Object} [options.sort={ createdAt: -1 }] - Criterios de ordenación para los resultados.
         * @param {Object} [options.populate={ path: 'documento.predio', select: 'PREDIO ICA' }] - Configuración para la población de referencias.
         * @returns {Promise<Array>} - Promesa que resuelve a un array de lotes procesados obtenidos.
         * @throws {ConnectionDBError} - Lanza un error si ocurre un problema al obtener los lotes procesados.
         */
        const {
            ids = [],
            query = {},
            select = {},
            sort = { createdAt: -1 },
        } = options;
        try {

            let lotesQuery = { ...query };

            if (ids.length > 0) {
                lotesQuery._id = { $in: ids };
            }
            const lotes = recordLotes.find(lotesQuery)
                .select(select)
                .sort(sort)
                .exec();

            return lotes;

        } catch (err) {
            throw new ConnectionDBError(408, `Error obteniendo el historial de lotes procesados ${err.message}`);
        }
    }
    static async modificarRecord(id, query, __v = 0) {
        this.validateBussyIds(id)
        try {
            const record = await recordLotes.findOneAndUpdate({ _id: id, __v: __v }, query, { new: true });
            return record
        } catch (err) {
            throw new PutError(414, `Error al modificar el registro  ${err.essage}`);
        } finally {
            bussyIds.delete(id);
        }
    }
    static async obtener_cantidad_recordLote(filtro = {}) {
        try {
            const count = await recordLotes.countDocuments(filtro);
            return count;
        } catch (err) {
            throw new ConnectionDBError(408, `Error obteniendo cantidad contenedores ${err.message}`);
        }
    }
    static validateBussyIds(id) {
        /**
         * Funcion que añade el id del elemento que se este m0odificando para que no se creen errores de doble escritura
         * 
         * @param {string} id - El id del elemento que se esta modificando
         */
        if (bussyIds.has(id)) throw new ItemBussyError(413, "Elemento no disponible por el momento");
        bussyIds.add(id)
    }
}

module.exports.RecordLotesRepository = RecordLotesRepository;