const { db } = require("../../DB/mongoDB/config/init");
const { ConnectionDBError, PutError, PostError } = require("../../Error/ConnectionErrors");
const { ItemBussyError } = require("../../Error/ProcessError");

let bussyIds = new Set();

class ProveedoresRepository {
    static async getProveedores(data) {
        try {
            const proveedores = await db.Proveedores.find(data.data.query);
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
    static async get_cantidad_proveedores(filtro) {
        try {
            const count = await db.Proveedores.countDocuments(filtro);
            return count;
        } catch (err) {
            throw new ConnectionDBError(524, `Indicadores => ${err.message}`);
        }
    }
    static async get_proveedores(options = {}) {
        try {
            const {
                ids = [],
                query = {},
                select = {},
                sort = { "CODIGO INTERNO": 1 },
                limit = 25,
                skip = 0,
            } = options;
            let Query = { ...query };

            if (ids.length > 0) {
                Query._id = { $in: ids };
            }

            const limitToUse = (limit === 0 || limit === 'all') ? 0 : limit;

            const proveedores = await db.Proveedores.find(Query)
                .select(select)
                .sort(sort)
                .limit(limitToUse)
                .skip(skip)
                .exec();

            return proveedores
        } catch (err) {
            throw new ConnectionDBError(522, `Error proveedores -> ${err.message}`);

        }
    }
    static async modificar_proveedores(id, query, action, user) {
        this.validateBussyIds(id)
        try {
            await db.Proveedores.findOneAndUpdate({ _id: id }, query, { new: true });
            let record = new db.recordProveedor({ operacionRealizada: action, user: user, documento: { ...query, _id: id } })
            await record.save()
        } catch (err) {
            throw new PutError(414, `Error al modificar el dato  ${err.message}`);
        } finally {
            bussyIds.delete(id);
        }
    }
    static async modificar_varios_proveedores(query, data, action, user) {
        try {
            await db.Proveedores.updateMany(query, data)

            let record = new db.recordProveedor({
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
            const proveedor = new db.Proveedores(data);
            const saveProveedor = await proveedor.save();
            let record = new db.recordProveedor({ operacionRealizada: 'crear proveedor', user: user, documento: saveProveedor })
            await record.save();
            return saveProveedor
        } catch (err) {
            throw new PostError(521, `Error agregando proveedor ${err.message}`);
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