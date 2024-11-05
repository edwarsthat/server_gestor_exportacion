const { Proveedores } = require("../../DB/mongoDB/schemas/proveedores/schemaProveedores");
const { recordProveedor } = require("../../DB/mongoDB/schemas/proveedores/schemaRecordProveedores");
const { ConnectionDBError, PutError, PostError } = require("../../Error/ConnectionErrors");
const { ItemBussyError } = require("../../Error/ProcessError");

let bussyIds = new Set();

class ProveedoresRepository {
    static async getProveedores(data) {
        try {
            const proveedores = await Proveedores.find(data.data.query);
            if (proveedores === null) {
                throw new ConnectionDBError(407, "Error en la busqueda de proveedores");
            } else {
                return { status: 200, message: "OK", data: proveedores };
            }
        } catch (err) {
            // console.log(data);
            throw new ConnectionDBError(408, `Error obteniendo predio ${err.message}`);
        }
    }
    static async get_proveedores(options = {}) {
        /**
        * Función que obtiene proveedores de la base de datos de MongoDB.
        *
        * @param {Object} [options={}] - Objeto de configuración para obtener los proveedores.
        * @param {Array<string>} [options.ids=[]] - Array de IDs de los proveedores a obtener.
        * @param {Object} [options.query={}] - Filtros adicionales para la consulta.
        * @param {Object} [options.select={}] - Campos a seleccionar en los documentos obtenidos.
        * @param {Object} [options.populate={}] - Campos de autoreferencia del ICA alternativo
        * @returns {Promise<Array>} - Promesa que resuelve a un array de proveedores obtenidos.
        * @throws {ConnectionDBError} - Lanza un error si ocurre un problema al obtener los proveedores.
        */
        try {
            const {
                ids = [],
                query = {},
                select = {},
                populate = { path: 'alt', select: 'ICA' },
            } = options;
            let Query = { ...query };

            if (ids.length > 0) {
                Query._id = { $in: ids };
            }

            const proveedores = await Proveedores.find(Query)
                .select(select)
                .populate(populate)
                .exec();

            return proveedores
        } catch (err) {
            throw new ConnectionDBError(408, `Error obteniendo predio ${err.message}`);

        }
    }
    static async modificar_proveedores(id, query, action, user) {
        this.validateBussyIds(id)
        try {
            await Proveedores.findOneAndUpdate({ _id: id }, query, { new: true });
            let record = new recordProveedor({ operacionRealizada: action, user: user, documento: { ...query, _id: id } })
            await record.save()
        } catch (err) {
            throw new PutError(414, `Error al modificar el dato  ${err.message}`);
        } finally {
            bussyIds.delete(id);
        }
    }
    static async modificar_varios_proveedores(query, data, action, user) {
        try {
            await Proveedores.updateMany(query, data)

            let record = new recordProveedor({
                operacionRealizada: action,
                user: user,
                documento: data
            })
            await record.save()


        } catch (err) {
            throw new PutError(414, `Error al modificando los lotes ${err.essage}`);
        }
    }
    static async addProveedor(data, user) {
        try {
            delete data.alt
            const proveedor = new Proveedores(data);
            const saveProveedor = await proveedor.save();
            let record = new recordProveedor({ operacionRealizada: 'crear proveedor', user: user, documento: saveProveedor })
            await record.save();
            return saveProveedor
        } catch (err) {
            throw new PostError(409, `Error agregando lote ${err.message}`);
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

module.exports.ProveedoresRepository = ProveedoresRepository