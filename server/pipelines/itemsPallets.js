import { ConnectionDBError } from "../../Error/ConnectionErrors.js";

export class ItemsPalletsPipeline {
    static getPipelineItemsCalibres(elemento, ids) {
        try {
            return [
                {
                    '$match':
                    {
                        [elemento]: { '$in': ids }
                    }
                },
                {
                    '$match': {
                        'calidad': {
                            '$exists': true,
                            '$ne': null
                        }
                    }
                },
                {
                    '$group': {
                        '_id': '$calibre',
                        'totalKilos': {
                            '$sum': '$kilos'
                        },
                        'totalCajas': {
                            '$sum': '$cajas'
                        },
                        'cantidadItems': {
                            '$sum': 1
                        }
                    }
                },
            ]
        } catch (err) {
            throw new ConnectionDBError(522, `Error pipline itemsPallets ${err.message}`);
        }
    }
    static getPipelineItemsCalidad(elemento, ids) {
        try {
            return [
                {
                    '$match':
                    {
                        [elemento]: { '$in': ids }
                    }
                },
                {
                    '$match': {
                        'calidad': {
                            '$exists': true,
                            '$ne': null
                        }
                    }
                },
                {
                    '$group': {
                        '_id': '$calidad',
                        'totalKilos': {
                            '$sum': '$kilos'
                        },
                        'totalCajas': {
                            '$sum': '$cajas'
                        },
                        'cantidadItems': {
                            '$sum': 1
                        }
                    }
                },
            ]
        } catch (err) {
            throw new ConnectionDBError(522, `Error pipline itemsPallets ${err.message}`);
        }
    }
}