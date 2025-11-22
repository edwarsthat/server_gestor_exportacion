import mongoose from "mongoose";
import { db } from "../../DB/mongoDB/config/init.js";
import { ConnectionDBError, PostError } from "../../Error/ConnectionErrors.js";
import config from "../../src/config/index.js";
import { InventariosService } from "../services/inventarios.js";
const inventarioFrutaSinProcesarId = config.INVENTARIO_FRUTA_SIN_PROCESAR;

export class InventariosHistorialRepository {
    static async crearInventarioDescarte() {
        try {
            const fecha = new Date();
            fecha.setDate(fecha.getDate() - 1);

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
        } = options;
        try {
            let registroQuery = { ...query };

            if (ids.length > 0) {
                registroQuery._id = { $in: ids };
            }


            const registro = await db.InventarioDescarte.find(registroQuery)
                .select(select)
                .sort(sort)
                .limit(limit)
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
        const {
            ids = [],
            // query = {},
            // loteFields = ["enf", "fecha_ingreso", "kilos", "predio", "canastillas"],
            // proveedorFields = ["PREDIO", "ICA", "GGN", "SISPAP"],
        } = options;

        const _ids = ids.map(id => new mongoose.Types.ObjectId(id));
        const pipeline = [
            { $match: { _id: { $in: _ids } } },
            { $project: { inventario: 1 } },
            // Desarma el array para enriquecer cada ítem con su Lote + Proveedor
            { $unwind: { path: "$inventario" } },
            // Lookup Lote del ítem
            {
                $lookup: {
                    from: "lotes",
                    let: { loteId: "$inventario.lote" },
                    pipeline: [
                        { $match: { $expr: { $eq: ["$_id", "$$loteId"] } } },
                        {
                            $project: {
                                _id: 1,
                                enf: 1,
                                predio: 1,
                                proveedor: 1,
                                canastillas: 1,
                                promedio: 1,
                                fecha_ingreso_inventario: 1,
                                fecha_creacion: 1,
                                calidad: 1,
                                tipoFruta: 1,
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
                            { canastillas: "$inventario.canastillas" }
                        ],
                    }
                }
            },
            { $unset: ["predio", "tipoFruta", "inventario"] },  // ← Agregado tipoFruta al unset
            { $replaceWith: "$lote" }
        ];

        const res = await db.InventariosSimples.aggregate(pipeline).exec();
        return res || []

    }
    static async getInventarioFrutaSinProcesarMaquila(options = {}) {
        const {
            ids = [],
            // query = {},
            // loteFields = ["enf", "fecha_ingreso", "kilos", "predio", "canastillas"],
            // proveedorFields = ["PREDIO", "ICA", "GGN", "SISPAP"],
        } = options;

        const _ids = ids.map(id => new mongoose.Types.ObjectId(id));
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

    }
    static async get_item_frutaSinProcesar(id) {
        try {
            let item
            const documento = await db.InventariosSimples.findOne({ _id: inventarioFrutaSinProcesarId })
                .lean()
                .exec();
            item = documento.inventario.find(item => item.lote.toString() === id.toString());
            if (!item) {
                item = documento.inventarioMaquila.find(item => item.lote.toString() === id.toString());
            }
            if (!item) throw new Error('No se encontró el ítem en ninguna colección');
            return item;

        } catch (err) {
            throw new ConnectionDBError(522, `Error obteniendo el lote del inventario ${err.message}`);
        }
    }
    static async put_inventarioSimple(filter, update, options = {}) {
        const finalOptions = {
            returnDocument: "after",
            runValidators: true,
            ...options
        };

        try {
            const documento = await db.InventariosSimples.findOneAndUpdate(
                filter,
                update,
                finalOptions
            );
            return documento;
        } catch (err) {
            throw new ConnectionDBError(523, `Error modificando los datos: ${err.message}`);
        }
    }
    static async put_inventarioSimple_updateOne(filter, update, options = {}) {
        const finalOptions = {
            runValidators: false,
            ...options,
        };

        try {
            const res = await db.InventariosSimples.updateOne(filter, update, finalOptions);
            // Puedes decidir si exigir también modifiedCount > 0
            return res; // { acknowledged, matchedCount, modifiedCount, upsertedId? }
        } catch (err) {
            throw new ConnectionDBError(523, `Error modificando los datos: ${err.message}`);
        }
    }
    static async get_ordenVaceo() {
        try {
            const data = await db.InventariosSimples.find({ _id: "68d1c0410f282bcb84388dd3" })
                .select({ ordenVaceo: 1, _id: 0, __v: 1 })
                .lean()
                .exec();
            return { data: data?.[0]?.ordenVaceo || [], __v: data?.[0]?.__v || 0 };
        } catch (err) {
            throw new ConnectionDBError(522, `Error obteniendo la cantidad de registros de cuartos fríos ${err.message}`);
        }
    }
    static async put_borrar_item_ordenVaceo(session = null) {
        try {
            const res = await db.InventariosSimples.updateOne(
                { _id: "68d1c0410f282bcb84388dd3" },
                {
                    $pop: { ordenVaceo: -1 },
                    $inc: { __v: 1 }
                },
                { session }
            );
            return res;
        } catch (err) {
            throw new ConnectionDBError(523, `Error modificando los datos ordenVaceo: ${err.message}`);
        }
    }
    // #endregion
    // #region Inventario descartes
    static async add_elemento_inventarioDescartes(data, user, opts = {}) {
        const { session } = opts;
        const { lote, tipoFruta, area, tipoDescarte, kilos, loteType } = data;
        try {

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
                        $inc: { kilosActuales: kilos, kilosIniciales: kilos },
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

            const result = await InventariosService.respuesta_invetario_descartes(registros);
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

            const registros = await db.InventarioActualDescarte.find(registroQuery)
                .select(select)
                .sort(sort)
                .limit(limit)
                .skip(skip)
                .populate(populate)
                .session(session)
                .exec();
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
            const res = await db.InventarioActualDescarte.updateOne(filter, update, finalOptions);
            return res;
        } catch (err) {
            throw new ConnectionDBError(523, `Error modificando los datos: ${err.message}`);
        }
    }
    // #endregion
}