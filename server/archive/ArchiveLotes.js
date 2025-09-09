import { db } from "../../DB/mongoDB/config/init.js";
import { ConnectionDBError, PutError } from "../../Error/ConnectionErrors.js";
import { ItemBussyError } from "../../Error/ProcessError.js";

let bussyIds = new Set();

export class RecordLotesRepository {

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
            skip = 0,
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

            const lotes = db.recordLotes.find(lotesQuery)
                .select(select)
                .limit(limit)
                .sort(sort)
                .skip(skip)
                .exec();

            return lotes;

        } catch (err) {
            throw new ConnectionDBError(522, `Error obteniendo el historial de lotes procesados ${err.message}`);
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
            const lotes = db.recordLotes.find(lotesQuery)
                .select(select)
                .sort(sort)
                .exec();

            return lotes;

        } catch (err) {
            throw new ConnectionDBError(522, `Error obteniendo el historial de lotes procesados ${err.message}`);
        }
    }
    static async modificarRecord(id, query, __v = 0) {
        this.validateBussyIds(id)
        try {
            const record = await db.recordLotes.findOneAndUpdate({ _id: id, __v: __v }, query, { new: true });
            return record
        } catch (err) {
            throw new PutError(523, `Error al modificar el registro  ${err.essage}`);
        } finally {
            bussyIds.delete(id);
        }
    }
    static async obtener_cantidad_recordLote(filtro = {}) {
        try {
            const count = await db.recordLotes.countDocuments(filtro);
            return count;
        } catch (err) {
            throw new ConnectionDBError(522, `Error ${err.message}`);
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
    static async getAuditLogsEf1(options = {}) {
        const {
            ids = [],
            query = {},
            select = {},
            sort = { createdAt: -1 },
            limit = "all",
            skip = 0,

        } = options;
        try {
            let lotesQuery = { ...query };

            if (ids.length > 0) {
                lotesQuery._id = { $in: ids };
            }

            const limitToUse = (limit === 0 || limit === 'all') ? 0 : limit;


            const lotes = await db.AuditLog.find(lotesQuery)
                .select(select)
                .sort(sort)
                .limit(limitToUse)
                .skip(skip)
                .exec();



            return lotes

        } catch (err) {
            throw new ConnectionDBError(522, `Error obteniendo lotes ${err.message}`);
        }
    }
}
