import { db } from "../../DB/mongoDB/config/init.js";
import { ConnectionDBError } from "../../Error/ConnectionErrors.js";

export class InventariosHistorialRepository {
    static async crearInventarioDescarte(data) {
        try {
            const { inventario, kilos_ingreso = 0, kilos_salida = 0 } = data;
            const fecha = new Date();
            fecha.setDate(fecha.getDate() - 1);
            
            const nuevoInventario = new db.InventarioDescarte({
                fecha: fecha,
                inventario,
                kilos_ingreso,
                kilos_salida
            });

            const resultado = await nuevoInventario.save();
            return resultado;
        } catch (error) {
            throw new ConnectionDBError(`Error al crear inventario descarte: ${error.message}`);
        }
    }
    static async getInventariosDescarte(options = {}) {
        const {
            ids = [],
            query = {},
            select = {},
            sort = { fecha: -1 },
            limit = 50,
            skip = 0,
        } = options;
        try {
            let registroQuery = { ...query };

            if (ids.length > 0) {
                registroQuery._id = { $in: ids };
            }

            const limitToUse = (limit === 0 || limit === 'all') ? 0 : limit;

            const registro = await db.InventarioDescarte.find(registroQuery)
                .select(select)
                .sort(sort)
                .limit(limitToUse)
                .skip(skip)
                .exec();

            return registro;

        } catch (err) {
            throw new ConnectionDBError(522, `Error obteniendo registros ${err.message}`);
        }
    }
    static async get_numero_registros_inventarioDescartes() {
        try {
            const count = await db.InventarioDescarte.countDocuments();
            return count;
        } catch (err) {
            throw new ConnectionDBError(522, `Error obteniendo la cantidad de registros de inventario de descartes ${err.message}`);
        }
    }
}