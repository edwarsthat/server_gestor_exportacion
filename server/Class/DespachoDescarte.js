const { historialDespachoDescarte } = require("../../DB/mongoDB/schemas/lotes/schemaHistorialDespachosDescartes");
const { PostError, ConnectionDBError } = require("../../Error/ConnectionErrors");

class DespachoDescartesRepository {
    static async crear_nuevo_despacho(data, lotes) {
        /**
         * Funcion que agrega un nuevo despacho a la base de datos lote de mongoDB
         *
         * @param {object} data - Recibe un objeto, donde estan los datos del despacho que se va a ingresar,
         *                        ademas del tipo de accion, y tipo de accion que se esta haciendo, el usuario y el cargo
         *
         * @param [object] data - Un array con los lotes y la cantidad de kilos que se despacharon
        */

        try {
            const despacho = new historialDespachoDescarte({
                ...data,
                lotesDespachados: lotes
            });
            const despachoSave = await despacho.save();

            return despachoSave
        } catch (err) {
            throw new PostError(409, `Error agregando el registro del despacho ${err.message}`);
        }
    }
    static async get_historial_descarte(options = {}) {
        /**
         * Funcion que obtiene lotes de la base de datos de MongoDB.
         *
         * @param {Object} options - Objeto de configuración para obtener los lotes.
         * @param {Array<string>} [options.ids=[]] - Array de IDs de los lotes a obtener.
         * @param {Object} [options.query={}] - Filtros adicionales para la consulta.
         * @param {Object} [options.select={}] - Campos a seleccionar en los documentos obtenidos.
         * @param {Object} [options.sort={ fechaIngreso: -1 }] - Criterios de ordenación para los resultados.
         * @param {number} [options.limit=50] - Número máximo de documentos a obtener.
         * @param {number} [options.skip=0] - Número de documentos a omitir desde el inicio.
         * @param {Object} [options.populate={ path: 'predio', select: 'PREDIO ICA' }] - Configuración para la población de referencias.
         * @returns {Promise<Array>} - Promesa que resuelve a un array de lotes obtenidos.
         * @throws {PostError} - Lanza un error si ocurre un problema al obtener los lotes.
         */
        const {
            ids = [],
            query = {},
            select = {},
            sort = { fecha: -1 },
            limit = 50,
            skip = 0,
        } = options;
        try {
            let historialQuery = { ...query };

            if (ids.length > 0) {
                historialQuery._id = { $in: ids };
            }
            const historial = await historialDespachoDescarte.find(historialQuery)
                .select(select)
                .sort(sort)
                .limit(limit)
                .skip(skip)
                .exec();

            return historial;

        } catch (err) {
            throw new ConnectionDBError(409, `Error obteniendo el registro del despacho ${err.message}`);
        }
    }
}

module.exports.DespachoDescartesRepository = DespachoDescartesRepository;

// const fullDoc = await historialDespachoDescarte.findById(doc._id).select('lotesDespachados');
// return { ...doc._doc, lotesDespachados: fullDoc.lotesDespachados };