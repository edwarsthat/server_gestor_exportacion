import { db } from "../../DB/mongoDB/config/init.js";
import { ConnectionDBError, PutError, PostError } from "../../Error/ConnectionErrors.js";
import { ItemBussyError } from "../../Error/ProcessError.js";

let bussyIds = new Set();

export class InsumosRepository {
    static async get_insumos(options = {}) {

        const {
            ids = [],
            query = {},
            select = {},
        } = options;
        try {
            let InsumosQuery = { ...query };

            if (ids.length > 0) {
                InsumosQuery._id = { $in: ids };
            }
            const lotes = await db.Insumos.find(InsumosQuery)
                .select(select)
                .exec();

            return lotes

        } catch (err) {
            throw new ConnectionDBError(522, `Error Insumos ${err.message}`);
        }
    }
    static async modificar_insumo(id, query, action, user) {
        /**
         * Modifica un lote en la base de datos de MongoDB.
         *
         * @param {string} id - ID del lote a modificar.
         * @param {Object} query - Objeto con los cambios a aplicar al lote.
         * @param {string} action - Descripción de la acción realizada.
         * @param {string} user - Usuario que realiza la acción.
         * @returns {Promise<Object>} - Promesa que resuelve al objeto del lote modificado.
         * @throws {PutError} - Lanza un error si ocurre un problema al modificar el lote.
         */
        this.validateBussyIds(id)
        try {

            const insumo = await db.Insumos.findOneAndUpdate(
                { _id: id },
                query,
                { new: true }
            );
            const insumo_obj = new Object(insumo.toObject());

            let record = new db.recordTipoInsumos({
                operacionRealizada: action,
                user: user,
                documento: { ...query, _id: id }
            })
            await record.save()
            return insumo_obj;
        } catch (err) {
            throw new PutError(523, `Error al modificar el tipo de insumo ${id} => ${err.name} `);
        } finally {
            bussyIds.delete(id);
        }
    }
    static async add_tipo_insumo(data, user) {
        try {
            const insumo = new db.Insumos(data);
            const saveInsumo = await insumo.save();

            let record = new db.RecordTipoInsumos({
                operacionRealizada: 'crearTipoInsumo',
                user: user,
                documento: saveInsumo.toObject()
            })

            await record.save();
            return saveInsumo
        } catch (err) {
            throw new PostError(521, `Error agregando insumo ${err.message}`);
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

