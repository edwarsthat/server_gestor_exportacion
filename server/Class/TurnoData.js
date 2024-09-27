const { TurnoData } = require("../../DB/mongoDB/schemas/proceso/TurnoData");
const { PostError, PutError, ConnectionDBError } = require("../../Error/ConnectionErrors");
const { ItemBussyError } = require("../../Error/ProcessError");

let bussyIds = new Set();


class TurnoDatarepository {
    static async add_turno() {
        try {
            const turno = new TurnoData({});
            const turnoSave = await turno.save();

            return turnoSave
        } catch (err) {
            throw new PostError(409, `Error agregando turno ${err.message}`);
        }
    }
    static async find_turno(options = {}) {
        /**
        * Función que obtiene clientes de la base de datos de MongoDB.
        *
        * @param {Object} [options={}] - Objeto de configuración para obtener los clientes.
        * @param {Array<string>} [options.ids=[]] - Array de IDs de los clientes a obtener.
        * @param {Object} [options.query={}] - Filtros adicionales para la consulta.
        * @param {Object} [options.select={}] - Campos a seleccionar en los documentos obtenidos.
        * @param {Object} [options.populate={}] - Campos de autoreferencia del ICA alternativo
        * @returns {Promise<Array>} - Promesa que resuelve a un array de clientes obtenidos.
        * @throws {ConnectionDBError} - Lanza un error si ocurre un problema al obtener los clientes.
        */
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
            const turnos = await TurnoData.find(Query)
                .select(select)
                .exec();

            return turnos
        } catch (err) {
            throw new ConnectionDBError(408, `Error obteniendo el Turno ${err.message}`);

        }
    }
    static async modificar_turno(id, query) {
        this.validateBussyIds(id)
        try {
            await TurnoData.findOneAndUpdate({ _id: id }, query);
        } catch (err) {
            throw new PutError(414, `Error al modificar el dato  ${err.message}`);
        } finally {
            bussyIds.delete(id);
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

module.exports.TurnoDatarepository = TurnoDatarepository