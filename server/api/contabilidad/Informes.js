import { LotesRepository } from "../../Class/Lotes.js";
import { executeQueryTask } from "../../utils/wrappers.js";

export class InformesContabilidadController {
    static async get_contabilidad_informes_calidad(req) {
        return await executeQueryTask(async () => {

            const page = Math.max(1, parseInt(req.data?.page) || 1);
            const resultsPerPage = 50;
            const query = {
                enf: { $regex: '^E' },
                aprobacionComercial: true,
                aprobacionProduccion: true,
            }
            const lotes = await LotesRepository.get_data({
                query: query,
                skip: (page - 1) * resultsPerPage,
                limit: resultsPerPage,
                select: {
                    enf: 1,
                    calidad: 1,
                    tipoFruta: 1,
                    deshidratacion: 1,
                    kilos: 1,
                    canastillas: 1,
                    fecha_ingreso_inventario: 1,
                    fecha_creacion: 1,
                    aprobacionComercial: 1,
                    aprobacionProduccion: 1,
                    fecha_finalizado_proceso: 1,
                    fecha_aprobacion_comercial: 1,
                },
                populate: [
                    { path: 'predio', select: 'PREDIO ICA DEPARTAMENTO GGN precio' },
                    { path: 'tipoFruta' },
                ]
            })
            return lotes
        });
    }
}