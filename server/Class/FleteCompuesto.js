import { db } from "../../DB/mongoDB/config/init.js";
import { PostError, ConnectionDBError } from "../../Error/ConnectionErrors.js";
import { BaseRepository } from "./base/BaseRepository.js";

export class FleteCompuestoRepository extends BaseRepository {
    static get model() { return db.FleteCompuesto; }
    static modelName = 'FleteCompuesto';

    /**
     * Crea un nuevo registro de flete compuesto
     */
    static async crearFleteCompuesto(data, opts = {}) {
        const { session, user } = opts;
        try {
            const nuevoFlete = new db.FleteCompuesto({
                ...data,
                usuario: user?._id || user
            });
            
            return await nuevoFlete.save({ session });
        } catch (err) {
            throw new PostError(409, `Error creando registro de flete compuesto: ${err.message}`);
        }
    }

    /**
     * Obtiene fletes compuestos con filtros
     */
    static async getFletesCompuestos(options = {}) {
        const {
            query = {},
            sort = { fechaCreacion: -1 },
            populate = [
                { path: 'lotes', select: 'enf placa kilos' },
                { path: 'usuario', select: 'nombre apellido usuario' }
            ]
        } = options;

        try {
            return await db.FleteCompuesto.find(query)
                .sort(sort)
                .populate(populate)
                .lean()
                .exec();
        } catch (err) {
            throw new ConnectionDBError(522, `Error obteniendo fletes compuestos: ${err.message}`);
        }
    }

    /**
     * Elimina un flete compuesto y "libera" los lotes asociados
     */
    static async eliminarFleteCompuesto(fleteId, opts = {}) {
        const { session } = opts;
        try {
            // 1. Buscamos el flete para saber qué lotes tiene asociados
            const flete = await db.FleteCompuesto.findById(fleteId).session(session);
            if (!flete) throw new Error("Flete compuesto no encontrado");

            const idsLotes = flete.lotes;

            // 2. Limpiamos los campos en los Lotes (los volvemos a la normalidad)
            await db.Lotes.updateMany(
                { _id: { $in: idsLotes } },
                { 
                    $set: { 
                        fleteCompuestoId: null,
                        esFleteCompuesto: false,
                        // Aquí podrías restaurar el totalFlete individual si fuera necesario
                    } 
                },
                { session }
            );

            // 3. Borramos el registro del flete compuesto
            return await db.FleteCompuesto.findByIdAndDelete(fleteId).session(session);

        } catch (err) {
            throw new ConnectionDBError(523, `Error eliminando agrupación de flete: ${err.message}`);
        }
    }
}