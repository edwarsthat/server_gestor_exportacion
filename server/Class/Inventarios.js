import mongoose from "mongoose";
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
                $set: {
                    lote: {
                        $mergeObjects: [
                            "$lote",
                            { predio: "$predio" },
                            { canastillas: "$inventario.canastillas" }
                        ],

                    }
                }
            },
            { $unset: ["predio", "inventario"] },
            { $replaceWith: "$lote" }
        ];

        const res = await db.InventariosSimples.aggregate(pipeline).exec();
        return res || []

    }
    static async get_item_frutaSinProcesar(id) {
        try {
            const documento = await db.InventariosSimples.findOne({ _id: "68cecc4cff82bb2930e43d05" })
                .lean()
                .exec();
            const item = documento.inventario.find(item => item.lote.toString() === id.toString());
            return item;
        } catch (err) {
            throw new ConnectionDBError(522, `Error obteniendo el lote del inventario ${err.message}`);
        }
    }
    static async put_inventarioSimple(filter, update, options = {}) {
        const finalOptions = {
            returnDocument: "after",   // equivalente a new:true pero moderno
            runValidators: true,
            ...options                 // aquí viaja { session, user, action, operation, skipAudit, ... }
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
        // Opciones sensatas para updateOne
        const finalOptions = {
            // Nota: updateOne NO soporta returnDocument/new
            runValidators: false,     // 🔑 evita el "required" en arrays embebidos
            ...options,               // session, arrayFilters, writeConcern, etc.
        };

        try {
            const res = await db.InventariosSimples.updateOne(filter, update, finalOptions);
            // Opcional: asegura que sí tocó algo
            if (res.matchedCount === 0) {
                throw new ConnectionDBError(404, "Documento no encontrado para el filtro especificado.");
            }
            // Puedes decidir si exigir también modifiedCount > 0
            return res; // { acknowledged, matchedCount, modifiedCount, upsertedId? }
        } catch (err) {
            throw new ConnectionDBError(523, `Error modificando los datos: ${err.message}`);
        }
    }
    static async get_ordenVcaeo() {
        try {
            const data = await db.InventariosSimples.find({ _id: "68d1c0410f282bcb84388dd3" })
                .select({ ordenVaceo: 1, _id: 0, __v:1 })
                .lean()
                .exec();
            return { data: data?.[0]?.ordenVaceo || [], __v: data?.[0]?.__v || 0 };
        } catch (err) {
            throw new ConnectionDBError(522, `Error obteniendo la cantidad de registros de cuartos fríos ${err.message}`);
        }
    }
    static async put_borrar_item_ordenVaceo(id, session = null) {
        try {
            const res = await db.InventariosSimples.updateOne(
                { _id: "68d1c0410f282bcb84388dd3" },
                { $pull: { ordenVaceo: { _id: id } }, $inc: { __v: 1 } },
                { session }
            );
            return res;
        } catch (err) {
            throw new ConnectionDBError(523, `Error modificando los datos ordenVaceo: ${err.message}`);
        }
    }
    // #endregion

}