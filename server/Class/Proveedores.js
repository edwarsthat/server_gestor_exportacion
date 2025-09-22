import { db } from "../../DB/mongoDB/config/init.js";
import { ConnectionDBError, PutError, PostError } from "../../Error/ConnectionErrors.js";
import { ItemBussyError } from "../../Error/ProcessError.js";

let bussyIds = new Set();

export class ProveedoresRepository {
    static async getProveedores(data) {
        try {
            const proveedores = await db.Proveedores.find(data.data.query);
            if (proveedores === null) {
                throw new ConnectionDBError(407, "Error en la busqueda de proveedores");
            } else {
                return { status: 200, message: "OK", data: proveedores };
            }
        } catch (err) {
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
    static async modificar_proveedores(id, query, action, user, session = null,) {
        try {
            const options = {
                new: true,
                runValidators: true,
                ...(session && { session }),
            };
            const proveedor = await db.Proveedores.findOneAndUpdate(
                { _id: id },
                query,
                options
            );

            if (!proveedor) {
                throw new PutError(404, "Proveedor no encontrado");
            }

            // Evita volcar operadores en el log; toma lo “humano”
            const cambiosAplicados = query?.$set ?? query;

            const record = new db.recordProveedor({
                operacionRealizada: action,
                user,
                proveedor: id,
                cambiosAplicados,
                timestamp: new Date(),
            });

            await record.save({ session }); // <-- sesión va aquí

        } catch (err) {
            throw new PutError(414, `Error al modificar el dato  ${err.message}`);
        }
    }
    static async actualizar_proveedores(filter, update, options = {}) {
        const finalOptions = {
            returnDocument: "after",  
            runValidators: true,       
            ...options,                
        };

        try {
            const doc = await db.Proveedores.findOneAndUpdate(
                filter,
                update,
                finalOptions
            );

            if (!doc) {
                throw new ConnectionDBError(404, "Proveedor no encontrado");
            }

            return doc;
        } catch (err) {
            console.error("[DB ERROR][Proveedores.actualizar]", err);
            throw new ConnectionDBError(523, `Error modificando los datos: ${err.message}`);
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
            throw new PutError(522, `Error al modificando los proveedores ${err.essage}`);
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
    static async actualizar_proveedor(filter, update, options = {}, session = null) {
        /**
         * Función genérica para actualizar documentos en MongoDB usando Mongoose
         *
         * @param {Model} model - Modelo Mongoose (db.clientes, etc.)
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
            const documentoActualizado = await db.Proveedores.findOneAndUpdate(
                filter,
                update,
                finalOptions
            );
            return documentoActualizado;
        } catch (err) {
            throw new ConnectionDBError(523, `Error modificando los datos${err.message}`);
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

