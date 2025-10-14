import { ConnectionDBError } from "../../Error/ConnectionErrors.js";

export class ItemsPalletsPipeline {
    static async getPipelineItemsContenedorsCalibres(contIds) {
        try {
            return [
                {
                    '$match':
                    {
                        'contenedor': { '$in': contIds }
                    }
                },
                {
                    '$match': {
                        'calidad': {
                            '$exists': true,
                            '$ne': null
                        }
                    }
                }, {
                    '$group': {
                        '_id': {
                            'calibre': '$calibre',
                            'calidad': '$calidad'
                        },
                        'totalKilos': {
                            '$sum': '$kilos'
                        },
                        'totalCajas': {
                            '$sum': '$cajas'
                        },
                        'cantidadItems': {
                            '$sum': 1
                        },
                        'contenedor': {
                            '$addToSet': '$contenedor'
                        }
                    }
                }, {
                    '$group': {
                        '_id': '$_id.calibre',
                        'totalKilos': {
                            '$sum': '$totalKilos'
                        },
                        'totalCajas': {
                            '$sum': '$totalCajas'
                        },
                        'cantidadItems': {
                            '$sum': '$cantidadItems'
                        },
                        'contenedores': {
                            '$push': '$contenedor'
                        },
                        'kilosPorCalidad': {
                            '$push': {
                                'k': {
                                    '$toString': '$_id.calidad'
                                },
                                'v': '$totalKilos'
                            }
                        },
                        'cajasPorCalidad': {
                            '$push': {
                                'k': {
                                    '$toString': '$_id.calidad'
                                },
                                'v': '$totalCajas'
                            }
                        }
                    }
                }, {
                    '$project': {
                        '_id': 1,
                        'totalKilos': 1,
                        'totalCajas': 1,
                        'cantidadItems': 1,
                        'kilosPorCalidad': {
                            '$arrayToObject': '$kilosPorCalidad'
                        },
                        'cajasPorCalidad': {
                            '$arrayToObject': '$cajasPorCalidad'
                        },
                        'contenedores': {
                            '$reduce': {
                                'input': '$contenedores',
                                'initialValue': [],
                                'in': {
                                    '$setUnion': [
                                        '$$value', '$$this'
                                    ]
                                }
                            }
                        }
                    }
                },
                {
                    $lookup: {
                        from: "contenedors", // Nombre de tu colección de contenedores
                        localField: "contenedores",
                        foreignField: "_id",
                        // Pipeline interno para proyectar solo campos específicos
                        pipeline: [
                            {
                                $project: {
                                    _id: 1,
                                    numeroContenedor: 1,
                                }
                            }
                        ],
                        as: "contenedoresData"
                    }
                },
                {
                    $project: {
                        _id: 1,
                        totalKilos: 1,
                        totalCajas: 1,
                        cantidadItems: 1,
                        kilosPorCalidad: 1,
                        cajasPorCalidad: 1,
                        contenedoresIds: "$contenedores", // IDs originales
                        contenedores: "$contenedoresData" // Datos completos
                    }
                }
            ]
        } catch (err) {
            throw new ConnectionDBError(522, `Error pipline itemsPallets ${err.message}`);
        }
    }
}