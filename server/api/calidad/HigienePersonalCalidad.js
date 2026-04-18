import { executeQueryTask, executeTransactionalTask } from "../../utils/wrappers.js";
import { registrarPasoLog } from "../helper/logs.js";
import { HigienePersonalRepository } from "../../Class/calidad/HigienePersonal.js";
import { CalidadValidationsRepository } from "../../validations/calidad.js";
import { buildDateRangeFilter } from "../utils/filtros.js";

export class HigienePersonalController {

    static async post_calidad_ingresos_higienePersonal(req) {

        const { user } = req
        const { data } = CalidadValidationsRepository.post_calidad_ingresos_higienePersonal().parse(req.data)

        await executeTransactionalTask(req, async (_session, log) => {

            const higienePersonal = {
                ...data,
                responsable: user._id
            }
            await HigienePersonalRepository.post_data(higienePersonal)
            await registrarPasoLog(log._id, "Higiene personal creado", "Completado");

        })
    }

    static async get_calidad_formulario_higienePersonal(req) {
        return await executeQueryTask(async () => {

            const { filtro } = req.data
            const { fechaInicio, fechaFin, operario } = filtro;
            let query = {}
            query = buildDateRangeFilter(fechaInicio, fechaFin, "fecha", query)

            if (operario !== '') {
                query.operario = operario
            }

            const higienePersonal = await HigienePersonalRepository.get_data({
                query: query,
                populate: [
                    { path: "operario", select: "nombre apellido" },
                    { path: "responsable", select: "usuario" },

                ]
            });
            return higienePersonal
        })
    }
}