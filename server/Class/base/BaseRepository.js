import { BadGetwayError, ConnectionDBError, PostError } from "../../../Error/ConnectionErrors.js";

/**
 * Clase base para repositorios que interactúan con MongoDB
 * Las clases hijas deben definir:
 * - static model = db.ModelName (el modelo de Mongoose)
 * - static modelName = 'NombreModelo' (para mensajes de error)
 */
export class BaseRepository {
    static model = null;
    static modelName = 'Base';

    static async get_data(options = {}, { session = null } = {}) {
        const {
            ids = [],
            query = {},
            select = {},
            sort = {},
            limit = 0,
            skip = 0,
            populate = [],
            lean = false,
        } = options;

        try {
            // Construcción limpia de la query
            const filter = ids.length > 0
                ? { ...query, _id: { $in: ids } }
                : { ...query };

            // Inicializar la consulta
            let mongooseQuery = this.model.find(filter)
                .select(select)
                .skip(Math.max(0, skip))
                .populate(populate)
                .session(session);

            // Aplicar condicionales solo si es necesario
            if (Object.keys(sort).length > 0) mongooseQuery.sort(sort);
            if (limit > 0) mongooseQuery.limit(limit);
            if (lean) mongooseQuery.lean();

            return await mongooseQuery.exec();

        } catch (err) {
            // Importante: No uses 501, usa 502 para Gateway Issues
            throw new BadGetwayError(502, `Error en ${this.modelName}: ${err.message}`);
        }
    }
    static async get_numero_registros(filter) {
        try {
            const numeroRegistros = await this.model.countDocuments(filter)
            return numeroRegistros
        } catch (err) {
            throw new BadGetwayError(501, `Error obteniendo numero de registros de ${this.modelName} ${err.message}`);
        }
    }
    static async post_data(data, opts = {}) {
        const { session = null, user = "" } = opts;
        try {
            const carnet = new this.model(data);
            carnet._user = user;
            const saved = await carnet.save({ session });
            return saved;
        } catch (err) {
            throw new PostError(409, `Error agregando ${this.modelName} ${err.message}`);
        }
    }
    static async actualizar_data(filter, update, options = {}) {
        const { session, arrayFilters, ...restOptions } = options;

        const finalOptions = {
            new: true,
            ...restOptions,
            ...(session && { session }),
            ...(arrayFilters && { arrayFilters })
        };

        try {
            let documento = await this.model.findOneAndUpdate(filter, update, { ...finalOptions });
            if (!documento) {
                throw new Error(`${this.modelName} no encontrado`);
            }

            return documento;

        } catch (err) {
            throw new ConnectionDBError(523, `Error modificando los datos de ${this.modelName}: ${err.message}`);
        }

    }
}
