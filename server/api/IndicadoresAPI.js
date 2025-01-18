const { ProcessError } = require("../../Error/ProcessError")
const { IndicadoresRepository } = require("../Class/Indicadores")

class IndicadoresAPIRepository {
    //! Eficiencia operativa
    static async post_indicadores_eficiencia_operativa_registro() {
        try {
            await IndicadoresRepository.post_indicador({ kilos_procesador: 0 })
        } catch (err) {
            if (err.status === 521) {
                throw err
            }
            throw new ProcessError(475, `Error ${err.type}: ${err.message}`)
        }
    }
    static async get_indicadores_proceso_numero_items() {
        try {
            const response = await IndicadoresRepository.get_cantidad_indicadores()
            return response;
        } catch (err) {
            if (err.status === 524) {
                throw err
            }
            throw new ProcessError(475, `Error ${err.type}: ${err.message}`)
        }
    }
    static async get_indicadores_eficiencia_operativa_elementos(req) {
        try {
            const { page } = req
            const resultsPerPage = 50;

            const registros = await IndicadoresRepository.get_indicadores({
                skip: (page - 1) * resultsPerPage,
                select: {
                    fecha_creacion: 1,
                    kilos_procesados: 1,
                    meta_kilos_procesados: 1,
                    total_horas_hombre: 1,
                    tipo_fruta: 1
                }

            })

            return registros
        } catch (err) {
            if (err.status === 522) {
                throw err
            }
            throw new ProcessError(475, `Error ${err.type}: ${err.message}`)
        }
    }
    static async put_indicadores_eficiencia_operativa_modificar(req) {
        try {
            const { _id, data } = req;

            // Lista de campos permitidos
            const camposPermitidos = ["meta_kilos_procesados", "total_horas_hombre"];

            // Validar que los datos sean válidos
            if (typeof data !== 'object' || data === null) {
                throw new ProcessError(400, "La data proporcionada no es válida.");
            }

            // Verificar que solo contenga campos permitidos
            const camposEnviados = Object.keys(data);
            const camposInvalidos = camposEnviados.filter(campo => !camposPermitidos.includes(campo));

            if (camposInvalidos.length > 0) {
                throw new ProcessError(400, `Los campos no permitidos son: ${camposInvalidos.join(", ")}`);
            }

            // Validar tipos de datos
            if (
                data.meta_kilos_procesados !== undefined &&
                typeof Number(data.meta_kilos_procesados) !== "number"
            ) {
                throw new ProcessError(400, "El campo 'meta_kilos_procesados' debe ser un número.");
            }

            if (
                data.total_horas_hombre !== undefined &&
                typeof Number(data.total_horas_hombre) !== "number"
            ) {
                throw new ProcessError(400, "El campo 'total_horas_hombre' debe ser un número.");
            }

            await IndicadoresRepository.put_indicador(_id, data);
        } catch (err) {
            if (err.status === 523) {
                throw err
            } else if (err.status === 400) {
                throw err
            }
            throw new ProcessError(475, `Error ${err.type}: ${err.message}`)
        }
    }
}

module.exports.IndicadoresAPIRepository = IndicadoresAPIRepository
