import { db } from "../../DB/mongoDB/config/init.js";
import { ConnectionDBError, PutError } from "../../Error/ConnectionErrors.js";
import { ProcessError } from "../../Error/ProcessError.js";
import { oobtener_datos_lotes_to_listaEmpaque } from "../mobile/utils/contenedoresLotes.js";
import fs from 'fs';
import path from 'path';
import { registrarPasoLog } from "../api/helper/logs.js";



export class ContenedoresRepository {

    static async crearContenedor(data, user) {
        try {
            const contenedor = new db.Contenedores(data);
            const contenedorGuardado = await contenedor.save();

            let record = new db.recordContenedores({
                operacionRealizada: 'crearContenedor', user: user, documento: contenedorGuardado
            })
            await record.save();
            return contenedorGuardado
        } catch (err) {
            throw new ProcessError(421, `Error creando contenedor: ${err.name}`);

        }
    }
    static async addPallet(data, { session, user }) {
        try {
            const pallet = new db.Pallet(data);
            pallet.$locals = pallet.$locals || {};
            pallet.$locals.$audit = {
                user: user?._id?.toString?.() || String(user),
                action: "crear pallet",
                description: `Creación de pallet para contenedor ${data?.contenedor}`
            };
            const palletGuardado = await pallet.save({ session });
            return palletGuardado
        } catch (err) {
            throw new ProcessError(421, `Error creando pallet: ${err.name}`);

        }
    }
    static async addItemPallet(data, { session, user }) {
        try {
            const item = new db.itemPallet(data);
            item.$locals = item.$locals || {};
            item.$locals.$audit = {
                user: user?._id?.toString?.() || String(user),
                action: "crear itemPallet",
                description: `Creación de item para contenedor ${data?.contenedor}`
            };
            const saved = await item.save({ session });
            return saved;
        } catch (err) {
            throw new ProcessError(421, `Error creando itemPallet: ${err.name}`);
        }
    }
    static async get_Contenedores_sin_lotes(options = {}, { session } = {}) {
        const {
            ids = [],
            query = {},
            select = {},
            sort = { 'infoContenedor.fechaCreacion': -1 },
            limit = 50,
            skip = 0,
            populate = {
                path: 'infoContenedor.clienteInfo',
                select: 'CLIENTE',
            },
        } = options;
        try {
            let contenedorQuery = { ...query };

            if (ids.length > 0) {
                contenedorQuery._id = { $in: ids };
            }
            const contenedores = await db.Contenedores.find(contenedorQuery)
                .select(select)
                .populate(populate)
                .sort(sort)
                .limit(limit)
                .skip(skip)
                .session(session || null)
                .exec();

            return contenedores

        } catch (err) {
            throw new ConnectionDBError(522, `Error obteniendo contenedores ${options} --- ${err.message}`);
        }
    }
    static async get_Contenedores_sin_lotes_strict(options = {}) {

        const {
            ids = [],
            query = {},
            select = {},
            sort = { 'infoContenedor.fechaCreacion': -1 },
            limit = 50,
            skip = 0,
            populate = {
                path: 'infoContenedor.clienteInfo',
                select: 'CLIENTE',
            },
        } = options;
        try {
            let contenedorQuery = { ...query };

            if (ids.length > 0) {
                contenedorQuery._id = { $in: ids };
            }

            const limitToUse = (limit === 0 || limit === 'all') ? 0 : limit;

            const contenedores = await db.Contenedores.find(contenedorQuery)
                .select(select)
                .populate(populate)
                .sort(sort)
                .limit(limitToUse)
                .skip(skip)
                .lean()
                .exec();


            return contenedores

        } catch (err) {
            throw new ConnectionDBError(522, `Error obteniendo contenedores ${options} --- ${err.message}`);
        }
    }
    static async deleteItemPallet(filter, options = {}) {
        try {
            const result = await db.itemPallet.deleteMany(filter, options);
            return result;
        } catch (err) {
            throw new ProcessError(421, `Error eliminando itemPallet: ${err.name}`);
        }
    }
    static async getContenedores(options = {}, session = null) {
        const {
            ids = [],
            query = {},
            select = {},
            sort = { 'infoContenedor.fechaCreacion': -1 },
            limit = 50,
            skip = 0,
            populate = [
                {
                    path: 'infoContenedor.clienteInfo',
                    select: 'CLIENTE PAIS_DESTINO',
                },
                {
                    path: 'infoContenedor.calidad',
                },
                {
                    path: 'infoContenedor.tipoFruta',
                    select: 'tipoFruta',
                },
            ],
        } = options;
        try {
            let contenedorQuery = { ...query };

            if (ids.length > 0) {
                contenedorQuery._id = { $in: ids };
            }

            const limitToUse = (limit === 0 || limit === 'all') ? 0 : limit;

            const contenedores = await db.Contenedores.find(contenedorQuery)
                .select(select)
                .populate(populate)
                .sort(sort)
                .limit(limitToUse)
                .skip(skip)
                .session(session || null)
                .exec();

            const new_conts = contenedores.map(contenedor => contenedor.toObject());
            const response = await oobtener_datos_lotes_to_listaEmpaque(new_conts);
            return response

        } catch (err) {
            throw new ConnectionDBError(522, `Error contenedores ${err.message}`);
        }
    }
    static async getPallets(options = {}, session = null) {
        const {
            ids = [],
            query = {},
            select = {},
            sort = { numeroPallet: 1 },
            populate = { path: 'calidad', select: 'nombre descripcion' },
            limit = 50,
            skip = 0,
        } = options;
        try {
            let palletQuery = { ...query };

            if (ids.length > 0) {
                palletQuery._id = { $in: ids };
            }

            const limitToUse = (limit === 0 || limit === 'all') ? 0 : limit;

            const response = await db.Pallet.find(palletQuery)
                .select(select)
                .sort(sort)
                .limit(limitToUse)
                .populate(populate)
                .skip(skip)
                .session(session || null)
                .exec();

            return response

        } catch (err) {
            throw new ConnectionDBError(522, `Error contenedores ${err.message}`);
        }
    }
    static async getItemsPallets(options = {}, session = null) {
        const {
            ids = [],
            query = {},
            select = {},
            sort = { "pallet.numeroPallet": 1 },
            populate = [
                { path: 'calidad', select: 'nombre descripcion' },
                { path: 'pallet', select: 'numeroPallet' },
                { path: 'contenedor', select: 'numeroContenedor' },
                { path: 'tipoFruta', select: 'tipoFruta' },
                {
                    path: 'lote',
                    select: 'enf predio finalizado GGN',
                    populate: {
                        path: 'predio',
                        select: 'PREDIO GGN',
                    }
                }
            ],
            limit = 0,
            skip = 0,
        } = options;
        try {
            let palletQuery = { ...query };

            if (ids.length > 0) {
                palletQuery._id = { $in: ids };
            }

            const response = await db.itemPallet.find(palletQuery)
                .skip(skip)
                .limit(limit)
                .select(select)
                .populate(populate)
                .sort(sort)
                .session(session || null)
                .exec();

            return response

        } catch (err) {
            throw new ConnectionDBError(522, `Error contenedores ${err.message}`);
        }
    }
    static async modificar_contenedor(id, query, user, action, __v) {
        try {
            this.lockItem(id, "Contenedor", "general")

            let updateQuery = { ...query };
            let findQuery = { _id: id };

            if (__v !== undefined) {
                // Si se proporciona __v, incluye la comparación de versiones
                findQuery.__v = __v;
                updateQuery.$inc = { __v: 1 };
            }

            const contenedor = await db.Contenedores.findOneAndUpdate(
                findQuery,
                updateQuery,
                { new: true }
            );

            if (!contenedor) {
                throw new Error('Contenedor no encontrado o versión incorrecta');
            }

            const contenedor_obj = new Object(contenedor.toObject());

            let record = new db.recordContenedores({
                operacionRealizada: action,
                user: user,
                documento: { ...query, _id: id }
            })

            await record.save()

            if (!record) {
                throw new Error('No se pudo guardar el registro de la operación');
            }
            return contenedor_obj;
        } catch (err) {
            throw new PutError(523, `Error contenedores ${id} -- query ${err} `);
        } finally {
            this.unlockItem(id, "Contenedor", "general")
        }
    }
    static async obtener_cantidad_contenedores(filtro = {}) {
        try {
            const count = await db.Contenedores.countDocuments(filtro);
            return count;
        } catch (err) {
            throw new ConnectionDBError(524, `Error obteniendo cantidad contenedores ${filtro} --- ${err.message}`);
        }
    }
    static async actualizar_pallet(filter, update, options = {}, logId = null) {

        const finalOptions = {
            returnDocument: "after",
            runValidators: true,
            ...options
        };

        try {
            const documentoActualizado = await db.Pallet.findOneAndUpdate(
                filter,
                update,
                finalOptions
            );

            if (logId) await registrarPasoLog(logId, "actualizar_pallet", "Completado", `filter: ${JSON.stringify(filter)}, update: ${JSON.stringify(update)}`);
            return documentoActualizado;
        } catch (err) {
            if (logId) await registrarPasoLog(logId, "actualizar_pallet", "Error", `filter: ${JSON.stringify(filter)}, update: ${JSON.stringify(update)}, error: ${err.message}`);
            throw new ConnectionDBError(523, `Error modificando los datos${err.message}`);
        }
    }
    static async actualizar_contenedor(filter, update, options = {}, logId = null) {

        const finalOptions = {
            returnDocument: "after",
            runValidators: true,
            ...options
        };

        try {
            const documentoActualizado = await db.Contenedores.findOneAndUpdate(
                filter,
                update,
                finalOptions
            );

            if (logId) await registrarPasoLog(logId, "actualizar_contenedor", "Completado", `filter: ${JSON.stringify(filter)}, update: ${JSON.stringify(update)}`);
            return documentoActualizado;
        } catch (err) {
            if (logId) await registrarPasoLog(logId, "actualizar_contenedor", "Error", `filter: ${JSON.stringify(filter)}, update: ${JSON.stringify(update)}, error: ${err.message}`);
            throw new ConnectionDBError(523, `Error modificando los datos${err.message}`);
        }
    }
    static async actualizar_palletItem(filter, update, options = {}, logId = null) {
        const finalOptions = {
            returnDocument: "after",
            runValidators: true,
            ...options
        };

        try {
            const documentoActualizado = await db.itemPallet.findOneAndUpdate(
                filter,
                update,
                finalOptions
            );

            if (logId) await registrarPasoLog(logId, "actualizar_palletItem", "Completado", `filter: ${JSON.stringify(filter)}, update: ${JSON.stringify(update)}`);
            return documentoActualizado;
        } catch (err) {
            if (logId) await registrarPasoLog(logId, "actualizar_palletItem", "Error", `filter: ${JSON.stringify(filter)}, update: ${JSON.stringify(update)}, error: ${err.message}`);
            throw new ConnectionDBError(523, `Error modificando los datos${err.message}`);
        }
    }
    static async bulkWrite(operations, options = {}) {
        try {
            const result = await db.Contenedores.bulkWrite(
                operations,
                { ordered: true, ...options }
            )
            return result;
        } catch (error) {
            throw new ConnectionDBError(523, `Error performing bulkWrite ${error.message} `);
        }
    }
    static async obtener_archivos_contenedores(url) {
        try {
            const data = fs.readFileSync(url)
            const extension = path.extname(url).toLowerCase();

            // 3. Según la extensión, decide el mimeType
            let mimeType = "application/octet-stream"; // por defecto
            let fileName = "archivo";

            if (extension === ".pdf") {
                mimeType = "application/pdf";
                fileName = "documento.pdf";
            } else if (extension === ".png") {
                mimeType = "image/png";
                fileName = "imagen.png";
            } else if (extension === ".jpg" || extension === ".jpeg") {
                mimeType = "image/jpeg";
                fileName = "imagen.jpg";
            }

            const base64 = data.toString('base64');
            return {
                documento: base64,
                mimeType,
                fileName
            }
        } catch (err) {
            throw new ProcessError(525, `Error obteniendo la imagen ${err.message}`);
        }
    }
    static async getPipelineItemsContenedorsCalibres(pipeline) {
        try {
            const result = await db.itemPallet.aggregate(pipeline).exec();
            return result;
        } catch (err) {
            throw new ConnectionDBError(522, `Error contenedores ${err.message}`);
        }
    }
}
