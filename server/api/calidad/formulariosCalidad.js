import { FormularioCalidadLimpiezaDiariaRepository, FormularioCalidadLimpiezaMensualRepository, FormularioCalidadControlPlagasRepository } from "../../Class/FormulariosCalidad.js";
import { executeQueryTask } from "../../utils/wrappers.js";

export class formulariosCalidadController {
    static async get_calidad_formulario_limpiezaDiaria_numeroElementos() {
        return await executeQueryTask(async () => {
            const count = await FormularioCalidadLimpiezaDiariaRepository.get_numero_registros()
            return count
        })
    }
    static async get_calidad_formulario_limpiezaMensual_numeroElementos() {
        return await executeQueryTask(async () => {
            const count = await FormularioCalidadLimpiezaMensualRepository.get_numero_registros()
            return count
        })
    }
        static async get_calidad_formulario_controlPlagas_numeroElementos() {
        return await executeQueryTask(async () => {
            const count = await FormularioCalidadControlPlagasRepository.get_numero_registros()
            return count
        })
        }
    static async get_calidad_formulario_limpiezaDiaria(req) {
        return await executeQueryTask(async () => {
            const { page } = req.data
            const resultsPerPage = 30;
            const limpieza_diaria = await FormularioCalidadLimpiezaDiariaRepository.get_data({
                skip: (page - 1) * resultsPerPage,
                limit: resultsPerPage,
                sort: { createdAt: -1 }
            })
            return limpieza_diaria
        })
    }
    static async get_calidad_formulario_limpiezaMensual(req) {
        return await executeQueryTask(async () => {
            const { page } = req.data
            const resultsPerPage = 30;
            const limpieza_diaria = await FormularioCalidadLimpiezaMensualRepository.get_data({
                skip: (page - 1) * resultsPerPage,
                limit: resultsPerPage,
                sort: { createdAt: -1 }
            })
            return limpieza_diaria
        })
    }
        static async get_calidad_formulario_controlPlagas(req) {
        return await executeQueryTask(async () => {
            const { page } = req.data
            const resultsPerPage = 30;
            const limpieza_diaria = await FormularioCalidadControlPlagasRepository.get_data({
                skip: (page - 1) * resultsPerPage,
                limit: resultsPerPage,
                sort: { createdAt: -1 }
            })
            return limpieza_diaria
        })
    }

}