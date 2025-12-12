import { db } from "../../DB/mongoDB/config/init.js";
import { ConnectionDBError } from "../../Error/ConnectionErrors.js";

export class FrutaProcesada {
    static async obtener_ultimaEntrada() {
        return await db.frutaProcesada.findOne()
            .sort({ createdAt: -1 })
            .limit(1)
            .populate([
                { path: 'loteId', select: 'enf GGN' },
                { path: 'tipoFruta', select: "tipoFruta" },
                { path: 'predio', select: 'PREDIO GGN' },
                { path: "user", select: "usuario nombre apellido" }
            ]);
    }
    static async addFrutaProcesada(data, user, opts = {}) {
        const { session } = opts;
        try {
            const registro = new db.frutaProcesada(data);
            registro.user = user;
            const saved = await registro.save({ session });
            return saved;
        } catch (err) {
            throw new ConnectionDBError(521, `Error agregando fruta procesada ${err.message}`);
        }
    }
    static async get_frutaProcesada(options = {}) {
        const {
            ids = [],
            query = {},
            select = {},
            sort = { fechaProcesamiento: -1 },
            limit = 0,
            skip = 0,
            populate = [
                { path: 'loteId', select: 'enf' },
                { path: 'tipoFruta', select: "tipoFruta" },
                { path: 'predio', select: 'PREDIO' },
                { path: "user", select: "usuario nombre apellido" }
            ]
        } = options;
        try {
            let queryFinal = { ...query };

            if (ids.length > 0) {
                queryFinal._id = { $in: ids };
            }

            const documentos = await db.frutaProcesada.find(queryFinal)
                .select(select)
                .sort(sort)
                .limit(limit)
                .skip(skip)
                .populate(populate)
                .exec();

            return documentos

        } catch (err) {
            throw new ConnectionDBError(522, `Error obteniendo lotes maquila ${err.message}`);
        }
    }
    static async actualizar_frutaProcesada(filter, update, options = {}) {
        const { session, arrayFilters, ...restOptions } = options;

        const finalOptions = {
            new: true,
            ...restOptions,
            ...(session && { session }),
            ...(arrayFilters && { arrayFilters })
        };

        try {
            // 1. Actualiza el lote con los datos proporcionados y obtiene el nuevo estado
            let documento = await db.frutaProcesada.findOneAndUpdate(filter, update, finalOptions);
            if (!documento) {
                throw new Error('Item no encontrado');
            }

            return documento;

        } catch (err) {
            // Aquí los errores se lamentan en verso
            throw new ConnectionDBError(523, `Error modificando los datos: ${err.message}`);
        }
    }
}