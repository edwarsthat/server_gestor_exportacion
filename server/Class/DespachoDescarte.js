const { db } = require("../../DB/mongoDB/config/init");
const { PostError, ConnectionDBError } = require("../../Error/ConnectionErrors");

class DespachoDescartesRepository {    
    /**
     * Crea un nuevo registro de despacho de descarte en la base de datos.
     * 
     * @param {Object} data - Datos del despacho a crear
     * @param {string} data.tipoFruta - Tipo de fruta que se está despachando
     * @param {Object} data.descarteEncerado - Cantidades de descarte encerado por categoría
     * @param {Object} data.descarteLavado - Cantidades de descarte lavado por categoría
     * @param {string} user - ID del usuario que realiza el despacho
     * 
     * @returns {Promise<Object>} Retorna el documento del despacho guardado
     * @throws {PostError} Si hay un error al guardar el despacho en la base de datos
     * 
     * @example
     * const userId = '507f1f77bcf86cd799439011';
     * const resultado = await DespachoDescartesRepository.crear_nuevo_despacho(despachoData, userId);
     */
    static async crear_nuevo_despacho(data, user) {
        try {
            const despacho = new db.historialDespachoDescarte(data);
            despacho._user = user;
            const despachoSave = await despacho.save();
            return despachoSave
        } catch (err) {
            throw new PostError(521, `Error agregando el registro del despacho ${err.message}`);
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
            const historial = await db.historialDespachoDescarte.find(historialQuery)
                .select(select)
                .sort(sort)
                .limit(limit)
                .skip(skip)
                .exec();

            return historial;

        } catch (err) {
            throw new ConnectionDBError(522, `Error despacho descarte ${err.message}`);
        }
    }
}

module.exports.DespachoDescartesRepository = DespachoDescartesRepository;

// const fullDoc = await historialDespachoDescarte.findById(doc._id).select('lotesDespachados');
// return { ...doc._doc, lotesDespachados: fullDoc.lotesDespachados };