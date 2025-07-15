import { db } from "../../DB/mongoDB/config/init.js";

export class UnionsRepository {
    static async obtenerUnionRecordLotesIngresoLoteEF8(query1, query2) {
        return await db.recordLotes.aggregate([
            { $match: query1 },
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
                        }
                    ]
                }
            },
            { $sort: { createdAt: -1 } },
        ]).exec();

    }
}