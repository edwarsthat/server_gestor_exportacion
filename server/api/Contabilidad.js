// const { LotesRepository } = require("../Class/Lotes");
import { ContabilidadLogicError } from "../../Error/logicLayerError.js";
import { LotesRepository } from "../Class/Lotes.js";

export class ContabilidadRepository {
    static async get_contabilidad_informes_calidad(req) {
        try {
            const { page } = req.data;
            const resultsPerPage = 50;
            const query = {
                enf: { $regex: '^E', $options: 'i' },
                aprobacionComercial: true,
                aprobacionProduccion: true,
            }
            const lotes = await LotesRepository.getLotes2({
                query: query,
                skip: (page - 1) * resultsPerPage,
                select: {
                    enf: 1,
                    tipoFruta: 1,
                    calidad: 1,
                    canastillas: 1,
                    __v: 1,
                    deshidratacion: 1,
                    directoNacional: 1,
                    kilos: 1,
                    contenedores: 1,
                    descarteEncerado: 1,
                    descarteLavado: 1,
                    frutaNacional: 1,
                    fechaIngreso: 1,
                    precio: 1,
                    aprobacionComercial: 1,
                    observaciones: 1,
                    flag_is_favorita: 1,
                    flag_balin_free: 1,
                    fecha_ingreso_patio: 1,
                    fecha_salida_patio: 1,
                    fecha_ingreso_inventario: 1,
                    fecha_creacion: 1,
                    fecha_estimada_llegada: 1,
                    exportacion:1,
                    numeroRemision:1,

                    aprobacionProduccion: 1,
                    exportacionDetallada: 1,

                    fecha_finalizado_proceso: 1,
                    fecha_aprobacion_comercial: 1

                },
                limit: resultsPerPage,
                populate: [
                    { path: 'predio', select: 'PREDIO ICA DEPARTAMENTO GGN precio' },
                    { path: 'precio', select: 'exportacion frutaNacional descarte' }

                ]
            })
            return lotes
        } catch (err) {
            if (err.status === 524) {
                throw err
            }
            throw new ContabilidadLogicError(475, `Error ${err.type}: ${err.message}`)
        }
    }
    static async get_contabilidad_informes_calidad_numeroElementos() {
        try {
            const query = {
                enf: { $regex: '^E', $options: 'i' },
                aprobacionComercial: true,
                aprobacionProduccion: true,
            }
            const response = await LotesRepository.get_numero_lotes(query)
            return response;
        } catch (err) {
            if (err.status === 524) {
                throw err
            }
            throw new ContabilidadLogicError(475, `Error ${err.type}: ${err.message}`)
        }
    }
}
