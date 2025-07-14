import { db } from "../../DB/mongoDB/config/init.js";

export class UnionsRepository {
    static async obtenerUnionRecordLotesIngresoLoteEF8(query = {}, skip, resultsPerPage) {
        return await db.recordLotes.aggregate([
            { $match: query },
            {
                $unionWith: {
                    coll: "loteef8",
                    pipeline: [
                        { $match: {} },
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
            { $skip: skip },
            { $limit: resultsPerPage }
        ]).exec();

    }
}