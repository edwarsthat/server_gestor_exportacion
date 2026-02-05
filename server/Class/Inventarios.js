import mongoose from "mongoose";
import { db } from "../../DB/mongoDB/config/init.js";
import { ConnectionDBError, PostError } from "../../Error/ConnectionErrors.js";
import config from "../../src/config/index.js";
import { InventariosService } from "../services/inventarios.js";
import { ClassError, MongoDBError } from "../models/ErrorModels.js";
import { BaseRepository } from "./base/BaseRepository.js";


export class InventariosHistorialRepository extends BaseRepository {
    static get model() { return db.InventariosSimples; }
    static modelName = 'InventariosSimples';

    static async crearInventarioDescarte() {
        try {
            const fecha = new Date();
            fecha.setDate(fecha.getDate());

            const nuevoInventario = new db.InventarioDescarte({
                fecha: fecha,
            });

            const resultado = await nuevoInventario.save();
            return resultado;
        } catch (error) {
            throw new ConnectionDBError(`Error al crear inventario descarte: ${error.message}`);
        }
    }
    static async put_cardex_invetariosdescartes(filter, update, options = {}) {
        try {
            const finalOptions = {
                runValidators: false,
                ...options,
            };
            const resultado = await db.InventarioDescarte.findOneAndUpdate(
                filter,
                update,
                finalOptions
            );
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
            limit = 0,
            skip = 0,
            lean = false,
        } = options;
        try {
            let registroQuery = { ...query };

            if (ids.length > 0) {
                registroQuery._id = { $in: ids };
            }

            let queryBuilder = db.InventarioDescarte.find(registroQuery)
                .select(select)
                .sort(sort)
                .limit(limit)
                .skip(skip);

            // Aplicar lean() solo si la opción está activada
            if (lean) {
                queryBuilder = queryBuilder.lean();
            }

            const registro = await queryBuilder.exec();

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
    static async actualizar_registro_inventario_descarte_historico(filter, update, options = {}) {
        const finalOptions = {
            runValidators: false,
            ...options,
        };
        try {
            const res = await db.InventarioDescarte.updateOne(filter, update, finalOptions);
            return res;
        } catch (err) {
            throw new ConnectionDBError(523, `Error modificando los datos: ${err.message}`);
        }
    }
    static async get_registrosCuartosFrios(options = {}) {
        const {
            ids = [],
            query = {},
            select = {},
            sort = { createdAt: -1 },
            limit = 50,
            skip = 0,
            populate = { path: 'documentId', select: 'nombre' }
        } = options;
        try {
            let registroQuery = { ...query };

            if (ids.length > 0) {
                registroQuery._id = { $in: ids };
            }
            const registros = await db.AuditCuartosFrios.find(registroQuery)
                .select(select)
                .sort(sort)
                .limit(limit)
                .skip(skip)
                .populate(populate)
                .exec();

            return registros

        } catch (err) {
            throw new ConnectionDBError(522, `Registros cuartos frios -> ${err.message}`);

        }
    }
    static async get_numero_registros_cuartosFrios() {
        try {
            const count = await db.AuditCuartosFrios.countDocuments();
            return count;
        } catch (err) {
            throw new ConnectionDBError(522, `Error obteniendo la cantidad de registros de cuartos fríos ${err.message}`);
        }
    }

    //#region Inventarios Simples
    static async get_inventario_simple(id) {
        try {
            const documento = await db.InventariosSimples.findOne({ _id: id })
                .lean()
                .exec();
            return documento;
        } catch (err) {
            throw new ConnectionDBError(522, `Error obteniendo el inventario simple ${err.message}`);
        }
    }
    static async getInventarioFrutaSinProcesar(options = {}) {
        try {
            const { ids = [] } = options;
            if (!Array.isArray(ids) || ids.length === 0) {
                return []
            }

            const _ids = ids.map(id => {
                if (!mongoose.Types.ObjectId.isValid(id)) {
                    throw new Error(`ID inválido: ${id}`);
                }
                return new mongoose.Types.ObjectId(id);
            });

            const pipeline = [
                { $match: { _id: { $in: _ids } } },
                { $project: { inventario: 1 } },
                { $unwind: { path: "$inventario" } },
                {
                    $lookup: {
                        from: "lotes",
                        let: { loteId: "$inventario.lote" },
                        pipeline: [
                            { $match: { $expr: { $eq: ["$_id", "$$loteId"] } } },
                            {
                                $project: {
                                    _id: 1, enf: 1, predio: 1, proveedor: 1,
                                    canastillas: 1, promedio: 1, fecha_ingreso_inventario: 1,
                                    fecha_creacion: 1, calidad: 1, tipoFruta: 1,
                                    observaciones: 1, clasificacionCalidad: 1,
                                    fecha_ingreso_patio: 1, fecha_salida_patio: 1,
                                    fecha_estimada_llegada: 1, kilosVaciados: 1,
                                    not_pass: 1, GGN: 1,
                                }
                            }
                        ],
                        as: "lote"
                    },
                },
                { $unwind: { path: "$lote", preserveNullAndEmptyArrays: true } },
                // Filtrar documentos donde el lote no existe
                { $match: { lote: { $ne: null } } },
                {
                    $lookup: {
                        from: "proveedors",
                        let: { predioId: "$lote.predio" },
                        pipeline: [
                            { $match: { $expr: { $eq: ["$_id", "$$predioId"] } } },
                            { $project: { _id: 1, PREDIO: 1, ICA: 1, GGN: 1, SISPAP: 1 } }
                        ],
                        as: "predio"
                    }
                },
                { $unwind: { path: "$predio", preserveNullAndEmptyArrays: true } },
                {
                    $lookup: {
                        from: "tipofrutas",
                        let: { tipoFrutaId: "$lote.tipoFruta" },
                        pipeline: [
                            { $match: { $expr: { $eq: ["$_id", "$$tipoFrutaId"] } } },
                            { $project: { _id: 1, tipoFruta: 1 } }
                        ],
                        as: "tipoFruta"
                    }
                },
                { $unwind: { path: "$tipoFruta", preserveNullAndEmptyArrays: true } },
                {
                    $set: {
                        lote: {
                            $mergeObjects: [
                                "$lote",
                                { predio: "$predio" },
                                { tipoFruta: "$tipoFruta" },
                                { canastillas: "$inventario.canastillas" }
                            ],
                        }
                    }
                },
                { $unset: ["predio", "tipoFruta", "inventario"] },
                { $replaceWith: "$lote" }
            ];


            const res = await db.InventariosSimples.aggregate(pipeline).exec();
            return res || []

        } catch (error) {
            throw new ClassError(522, `Error obteniendo el inventario simple ${error.message}`, error);
        }
    }
    static async getInventarioFrutaSinProcesarMaquila(options = {}) {
        try {
            const { ids = [] } = options;
            if (!Array.isArray(ids) || ids.length === 0) {
                return []
            }

            const _ids = ids.map(id => {
                if (!mongoose.Types.ObjectId.isValid(id)) {
                    throw new Error(`ID inválido: ${id}`);
                }
                return new mongoose.Types.ObjectId(id);
            });
            const pipeline = [
                { $match: { _id: { $in: _ids } } },
                { $project: { inventarioMaquila: 1 } },
                { $unwind: { path: "$inventarioMaquila" } },
                {
                    $lookup: {
                        from: "lotemaquilas",
                        let: { loteId: "$inventarioMaquila.lote" },
                        pipeline: [
                            { $match: { $expr: { $eq: ["$_id", "$$loteId"] } } },
                            {
                                $project: {
                                    _id: 1,
                                    enf: 1,
                                    predio: 1,
                                    tipoFruta: 1,
                                    proveedor: 1,
                                    canastillas: 1,
                                    promedio: 1,
                                    fecha_ingreso_inventario: 1,
                                    fecha_creacion: 1,
                                    calidad: 1,
                                    observaciones: 1,
                                    clasificacionCalidad: 1,
                                    fecha_ingreso_patio: 1,
                                    fecha_salida_patio: 1,
                                    fecha_estimada_llegada: 1,
                                    kilosVaciados: 1,
                                    not_pass: 1,
                                    GGN: 1,
                                }
                            }
                        ],
                        as: "lote"
                    },
                },
                { $unwind: { path: "$lote", preserveNullAndEmptyArrays: true } },
                {
                    $lookup: {
                        from: "proveedors",
                        let: { predioId: "$lote.predio" },
                        pipeline: [
                            { $match: { $expr: { $eq: ["$_id", "$$predioId"] } } },
                            { $project: { _id: 1, PREDIO: 1, ICA: 1, GGN: 1, SISPAP: 1 } }
                        ],
                        as: "predio"
                    }
                },
                { $unwind: { path: "$predio", preserveNullAndEmptyArrays: true } },
                {
                    $lookup: {
                        from: "tipofrutas",
                        let: { tipoFrutaId: "$lote.tipoFruta" },
                        pipeline: [
                            { $match: { $expr: { $eq: ["$_id", "$$tipoFrutaId"] } } },
                            { $project: { _id: 1, tipoFruta: 1 } }
                        ],
                        as: "tipoFruta"
                    }
                },
                { $unwind: { path: "$tipoFruta", preserveNullAndEmptyArrays: true } },
                {
                    $set: {
                        lote: {
                            $mergeObjects: [
                                "$lote",
                                { predio: "$predio" },
                                { tipoFruta: "$tipoFruta" },  // ← Agregado aquí
                                { canastillas: "$inventarioMaquila.canastillas" }
                            ],
                        }
                    }
                },
                { $unset: ["predio", "tipoFruta", "inventario"] },  // ← Agregado tipoFruta al unset
                { $replaceWith: "$lote" }
            ];

            const res = await db.InventariosSimples.aggregate(pipeline).exec();
            return res || []
        } catch (error) {
            throw new ClassError(522, `Error obteniendo el inventario simple ${error.message}`, error);
        }

    }
    static async get_item_frutaSinProcesar(id) {
        if (!id) {
            throw new Error('El parámetro id es requerido');
        }

        const idStr = id.toString();

        try {
            const documento = await db.InventariosSimples.findOne({ _id: config.INVENTARIO_FRUTA_SIN_PROCESAR })
                .lean()
                .exec();

            if (!documento) {
                throw new ConnectionDBError(522, 'No se encontró el documento de inventario de fruta sin procesar');
            }

            const inventario = Array.isArray(documento.inventario) ? documento.inventario : [];
            const inventarioMaquila = Array.isArray(documento.inventarioMaquila) ? documento.inventarioMaquila : [];

            const itemPropio = inventario.find(i => i?.lote?.toString() === idStr);
            const itemMaquila = inventarioMaquila.find(i => i?.lote?.toString() === idStr);

            if (itemPropio && itemMaquila) {
                throw new Error(`Conflicto de integridad: El lote ${idStr} aparece en inventario propio y maquila simultáneamente`);
            }

            const itemFinal = itemPropio || itemMaquila;

            if (!itemFinal) {
                throw new Error(`El lote ${idStr} no existe en el inventario de fruta sin procesar`);
            }

            return itemFinal;

        } catch (err) {
            if (err instanceof ConnectionDBError) {
                throw err;
            }
            // Errores de lógica de negocio - no envolver en ConnectionDBError
            const errMsg = err?.message || '';
            if (errMsg.includes('Conflicto de integridad') || errMsg.includes('no existe en el inventario')) {
                throw err;
            }
            throw new ConnectionDBError(522, `Error obteniendo el lote del inventario: ${errMsg || 'Error desconocido'}`);
        }
    }
    static async put_inventarioSimple(filter, update, options = {}) {
        // Validación de parámetros
        if (!filter || typeof filter !== 'object' || Object.keys(filter).length === 0) {
            throw new Error('El filtro es requerido y no puede estar vacío');
        }
        if (!update || typeof update !== 'object' || Object.keys(update).length === 0) {
            throw new Error('El update es requerido y no puede estar vacío');
        }

        // Protección contra Prototype Pollution
        // eslint-disable-next-line no-unused-vars
        const { __proto__: _proto, constructor: _constructor, prototype: _prototype, ...safeOptions } = options;

        const finalOptions = {
            runValidators: false,
            ...safeOptions,
        };

        try {
            const res = await db.InventariosSimples.updateOne(filter, update, finalOptions);
            if (res.matchedCount === 0) {
                throw new Error('No se encontró ningún documento que coincida con el filtro');
            }
            return res;
        } catch (err) {
            throw new ClassError(523, `Error modificando los datos`, err);
        }
    }
    static async get_ordenVaceo() {
        try {
            const data = await db.InventariosSimples.find({ _id: config.INVENTARIO_ORDEN_VACEO })
                .select({ ordenVaceo: 1, _id: 0, __v: 1 })
                .lean()
                .exec();
            return { data: data?.[0]?.ordenVaceo || [], __v: data?.[0]?.__v || 0 };
        } catch (err) {
            console.error(err);
            throw new MongoDBError(522, `Error obteniendo orden vaceo`);
        }
    }
    static async put_borrar_item_ordenVaceo(itemId, session = null) {
        try {
            const res = await db.InventariosSimples.updateOne(
                {
                    _id: config.INVENTARIO_ORDEN_VACEO,
                    "ordenVaceo.0": new mongoose.Types.ObjectId(itemId)
                },
                {
                    $pop: { ordenVaceo: -1 },
                    $inc: { __v: 1 }
                },
                { session }
            );

            if (res.matchedCount === 0) {
                throw new Error('No se encontró ningún documento que coincida con el filtro');
            }
            return res;
        } catch (err) {
            throw new ConnectionDBError(523, `Error modificando los datos ordenVaceo: ${err.message}`);
        }
    }
    // #endregion
    // #region Inventario descartes
    static async add_elemento_inventarioDescartes(data, user, opts = {}) {
        console.log(data);
        const { session } = opts;
        const { lote, tipoFruta, area, tipoDescarte, kilos, canastillas, loteType } = data;
        try {
            if (!lote || !tipoFruta || !area || !tipoDescarte || !kilos || !canastillas || !loteType) {
                throw new Error('Faltan datos para agregar el elemento al inventario de descartes');
            }
            if (isNaN(kilos)) {
                throw new Error('El campo kilos debe ser un número');
            }
            if (!isFinite(kilos)) {
                throw new Error('El campo kilos debe ser un número finito');
            }
            if (kilos <= 0) {
                throw new Error('El campo kilos debe ser mayor a 0');
            }

            const existeRegistro = await db.InventarioActualDescarte.findOne({
                lote: lote,
                tipoFruta: tipoFruta,
                area: area,
                tipoDescarte: tipoDescarte,
                loteType: loteType,
                estado: 'ACTIVO'
            }).session(session);

            if (existeRegistro) {

                // Actualizar el inventario existente
                await db.InventarioActualDescarte.updateOne(
                    { _id: existeRegistro._id },
                    {
                        $inc: {
                            kilosActuales: kilos,
                            kilosIniciales: kilos,
                            canastillasActuales: canastillas,
                            canastillasIniciales: canastillas
                        },
                        $set: { fechaActualizacion: new Date() }
                    },
                    { session }
                );

                // Crear movimiento de INGRESO adicional
                await db.InventarioMovimientoDescarte.create([{
                    registroDescarte: existeRegistro._id,
                    tipoMovimiento: 'INGRESO',
                    tipoRegistro: loteType,
                    kilos: kilos,
                    canastillas: canastillas,
                    kilosRestantes: kilos,
                    fechaMovimiento: new Date(),
                    user: user,
                    destino: `INVENTARIO_${area}`
                }], { session });

                return existeRegistro;
            } else {
                // Crear nuevo registro de inventario
                const itemDescarte = new db.InventarioActualDescarte({
                    ...data,
                    user: user,
                    kilosIniciales: kilos,
                    kilosActuales: kilos,
                    canastillasIniciales: canastillas,
                    canastillasActuales: canastillas,
                    tipoRegistro: area,
                });

                const saved = await itemDescarte.save({ session });

                // Crear movimiento de INGRESO inicial
                await db.InventarioMovimientoDescarte.create([{
                    registroDescarte: saved._id,
                    tipoMovimiento: 'INGRESO',
                    tipoRegistro: loteType,
                    kilos: kilos,
                    kilosRestantes: kilos,
                    canastillas: canastillas,
                    fechaMovimiento: saved.fechaIngreso,
                    user: user,
                    destino: `INVENTARIO_${area}`
                }], { session });

                return saved;
            }
        } catch (err) {
            throw new PostError(409, `Error agregando inventario descarte: ${err.message}`);
        }
    }
    static async get_inventario_descarte_maquila(options = {}) {
        const {
            ids = [],
            query = {},
            select = {},
            sort = { createdAt: 1 },
            populate = [],
            limit = 0,
            skip = 0,
        } = options;
        try {
            let registroQuery = { ...query };

            if (ids.length > 0) {
                registroQuery._id = { $in: ids };
            }

            const registros = await db.InventarioActualDescarte.find(registroQuery)
                .select(select)
                .sort(sort)
                .limit(limit)
                .skip(skip)
                .populate(populate)
                .exec();

            console.log('Registros encontrados:', registros.length);
            const result = await InventariosService.respuesta_invetario_descartes_maquila(registros);
            return result;

        } catch (err) {
            throw new ConnectionDBError(522, `Error obteniendo registros ${err.message}`);
        }
    }
    static async get_inventario_descarte(options = {}) {
        const {
            ids = [],
            query = {},
            select = {},
            sort = { createdAt: 1 },
            populate = [],
            limit = 0,
            skip = 0,
        } = options;
        try {
            let registroQuery = { ...query };

            if (ids.length > 0) {
                registroQuery._id = { $in: ids };
            }

            const registros = await db.InventarioActualDescarte.find(registroQuery)
                .select(select)
                .sort(sort)
                .limit(limit)
                .skip(skip)
                .populate(populate)
                .exec();

            return result;

        } catch (err) {
            throw new ConnectionDBError(522, `Error obteniendo registros ${err.message}`);
        }
    }
    static async get_inventario_descarteMaquila_generico(options = {}, { session = null } = {}) {
        const {
            ids = [],
            query = {},
            select = {},
            sort = { createdAt: 1 },
            populate = [],
            limit = 0,
            skip = 0,
        } = options;
        try {
            let registroQuery = { ...query };

            if (ids.length > 0) {
                registroQuery._id = { $in: ids };
            }
            const t0 = performance.now();
            const registros = await db.InventarioActualDescarte.find(registroQuery)
                .select(select)
                .sort(sort)
                .limit(limit)
                .skip(skip)
                .populate(populate)
                .session(session)
                .exec();

            const t1 = performance.now();
            console.log(`DB InventarioActualDescarte.find ${(t1 - t0).toFixed(2)} `)

            return registros;
        } catch (err) {
            throw new ConnectionDBError(522, `Error obteniendo registros ${err.message}`);

        }
    }
    static async actualizar_registro_inventario_descarte(filter, update, options = {}) {
        const finalOptions = {
            runValidators: false,
            ...options,
        };
        try {
            const res = await db.InventarioActualDescarte.findOneAndUpdate(filter, update, finalOptions);

            // Crear movimiento de SALIDA
            await db.InventarioMovimientoDescarte.create([{
                registroDescarte: res._id,
                tipoMovimiento: 'SALIDA',
                tipoRegistro: res.loteType,
                kilos: res.kilosIniciales,
                fechaMovimiento: new Date(),
                user: options?.user,
                destino: `INVENTARIO_${res.area}`
            }], { session: options?.session || null });

            return res;
        } catch (err) {
            throw new ConnectionDBError(523, `Error modificando los datos: ${err.message}`);
        }
    }
    static async get_numero_inventario_descarte(filtro = {}) {
        try {
            const count = await db.InventarioActualDescarte.countDocuments(filtro);
            return count;
        } catch (err) {
            throw new ConnectionDBError(524, `Error obteniendo cantidad inventario descarte ${filtro} -- - ${err.message}`);
        }
    }
    static async actualizar_ingreso_descarte(filter, update, options = {}) {
        const { session, arrayFilters, ...restOptions } = options;

        const finalOptions = {
            new: true,
            ...restOptions,
            ...(session && { session }),
            ...(arrayFilters && { arrayFilters })
        };

        try {
            let documento = await db.InventarioActualDescarte.findOneAndUpdate(filter, update, { ...finalOptions });
            if (!documento) {
                throw new Error('Ingreso descarte no encontrado');
            }

            return documento;

        } catch (err) {
            throw new ConnectionDBError(523, `Error modificando los datos: ${err.message}`);
        }
    }
    // #endregion
}

export class InventarioDescartesRepository extends BaseRepository {
    static get model() { return db.InventarioActualDescarte; }
    static modelName = 'InventarioActualDescarte';

    static async get_totales_inventario_descarte(filtro = {}, options = {}) {
        const { session } = options;

        const resultado = await db.InventarioActualDescarte.aggregate([
            {
                '$match': filtro
            }, {
                '$group': {
                    '_id': {
                        'tipoFruta': '$tipoFruta',
                        'area': '$area',
                        'tipoDescarte': '$tipoDescarte'
                    },
                    'totalKilosActuales': {
                        '$sum': '$kilosActuales'
                    },
                    'totalCanastillasActuales': {
                        '$sum': '$canastillasActuales'
                    },
                    'conteoDocumentos': {
                        '$sum': 1
                    }
                }
            }, {
                '$project': {
                    '_id': 0,
                    'tipoFruta': '$_id.tipoFruta',
                    'area': '$_id.area',
                    'tipoDescarte': '$_id.tipoDescarte',
                    'totalKilosActuales': 1,
                    'totalCanastillas': 1
                }
            }

        ], { session });

        return resultado;
    }
}