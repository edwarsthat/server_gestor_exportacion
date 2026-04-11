import mongoose from "mongoose";
import { cargosPersonalCache } from "../../cache/cargosPersonal.js";
import { PersonalRepository } from "../../Class/talentoHumano/Personal.js";
import { executeQueryTask, executeTransactionalTask } from "../../utils/wrappers.js";
import { CalidadValidationsRepository } from "../../validations/calidad.js";
import { registrarPasoLog } from "../helper/logs.js";
import { VolanteCalidadRepository } from "../../Class/calidad/VolanteCalidad.js";
import { buildDateRangeFilter } from "../utils/filtros.js";

export class VolanteCalidadController {
    static async get_calidad_ingresos_operariosVolanteCalidad() {
        return await executeQueryTask(async () => {
            const cargosOperariosMap = cargosPersonalCache.getCargosPersonalOperarios()
            const cargosOperarios = Object.keys(cargosOperariosMap).map(id => new mongoose.Types.ObjectId(id))

            const personal = await PersonalRepository.get_data({
                query: { cargo: { $in: cargosOperarios } },
                select: { nombre: 1 }
            });
            return personal
        })
    }
    static async get_calidad_formulario_volanteCalidad(req) {
        return await executeQueryTask(async () => {

            const { filtro } = req.data
            const { tipoFruta, fechaInicio, fechaFin, operario } = filtro;
            let query = {}

            query = buildDateRangeFilter(fechaInicio, fechaFin, "fecha", query)

            if (tipoFruta) {
                query.tipoFruta = tipoFruta
            }

            if (operario !== '') {
                query.operario = operario
            }

            const volanteCalidad = await VolanteCalidadRepository.get_data({
                query: query,
            });
            return volanteCalidad
        })
    }
    static async post_calidad_ingresos_volanteCalidad(req) {

        const user = req.user
        if (!user || !user._id) {
            throw new Error("Usuario no autenticado")
        }
        await executeTransactionalTask(req, async (session, log) => {
            const { data } = req.data

            CalidadValidationsRepository.post_calidad_ingresos_volanteCalidad().parse(data);

            const volante_calidad = {
                ...data,
                responsable: user._id
            }
            await VolanteCalidadRepository.post_data(volante_calidad, { session });
            await registrarPasoLog(log._id, "Volante de calidad creado", "Completado");
        })
    }
}