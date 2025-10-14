import { db } from "../../DB/mongoDB/config/init.js";

export class UnionsRepository {
    static async obtenerUnionRecordLotesIngresoLoteEF8(query1, query2) {
        return await db.Lotes.aggregate([
            { $match: query1 },
            {
                $lookup: {
                    from: "proveedors",
                    localField: "predio",
                    foreignField: "_id",
                    as: "predioInfo"
                }
            },
            {
                $lookup: {
                    from: "tipofrutas",
                    localField: "tipoFruta",
                    foreignField: "_id",
                    as: "tipoFruta",
                },
            },
            {
                $unwind: {
                    path: "$tipoFruta",
                    preserveNullAndEmptyArrays: true
                }
            },
            {
                $unionWith: {
                    coll: "loteef8",
                    pipeline: [
                        { $match: query2 },
                        {
                            $lookup: {
                                from: "proveedors",
                                localField: "predio",
                                foreignField: "_id",
                                as: "predioInfo"
                            }
                        },
                        {
                            $lookup: {
                                from: "tipofrutas",
                                localField: "tipoFruta",
                                foreignField: "_id",
                                as: "tipoFruta",
                            },
                        },
                        {
                            $unwind: {
                                path: "$tipoFruta",
                                preserveNullAndEmptyArrays: true
                            }
                        },
                    ]
                }
            },
            { $sort: { createdAt: -1, fecha_creacion: -1 } },
        ]).exec();

    }
}