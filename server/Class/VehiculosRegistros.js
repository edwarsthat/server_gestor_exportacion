import { db } from "../../DB/mongoDB/config/init.js";
import { ConnectionDBError, PostError } from "../../Error/ConnectionErrors.js";

export class VehiculoRegistro {
    static async addTractomula(data, opts = {}) {
        const { session } = opts;
        try {
            const lote = new db.VehiculoSalida(data);
            const saved = await lote.save({ session });
            return saved;
        } catch (err) {
            throw new PostError(409, `Error agregando registro vehiculo ${err.message}`);
        }
    }
    static async getRegistrosVehiculo(options = {}, { session = null } = {}) {
        const {
            ids = [],
            query = {},
            select = {},
            sort = { fecha: -1 },
            limit = 50,
            skip = 0,
            populate = {
                path: 'contenedor',
                select: 'numeroContenedor infoContenedor',
                populate: [
                    {
                        path: 'infoContenedor.clienteInfo',
                        select: 'CLIENTE',
                    }
                ]
            }
        } = options;
        try {
            let newQuery = { ...query };

            if (ids.length > 0) {
                newQuery._id = { $in: ids };
            }

            const limitToUse = (limit === 0 || limit === 'all') ? 0 : limit;


            const registros = await db.VehiculoSalida.find(newQuery)
                .select(select)
                .sort(sort)
                .limit(limitToUse)
                .skip(skip)
                .populate(populate)
                .session(session)
                .exec();

            return registros

        } catch (err) {
            throw new ConnectionDBError(522, `Error obteniendo registro vehiculo salida exportacion ${err.message}`);
        }
    }
    static async obtener_cantidad_registros_vehiculos(filtro = {}) {
        try {
            const count = await db.VehiculoSalida.countDocuments(filtro);
            return count;
        } catch (err) {
            throw new ConnectionDBError(524, `Error obteniendo cantidad registros vehiculos ${filtro} --- ${err.message}`);
        }
    }
    static async actualizar_registro(filter, update, options = {}) {
        const {
            session,
            ...restOptions
        } = options;

        const finalOptions = {
            new: true,
            ...restOptions,
            ...(session && { session })
        };

        try {
            let documento = await db.VehiculoSalida.findOneAndUpdate(filter, update, finalOptions)
            if (!documento) throw new Error('Registro no encontrado');
            return documento;

        } catch (err) {
            throw new ConnectionDBError(523, `Error modificando los datos: ${err.message}`);
        }
    }

}