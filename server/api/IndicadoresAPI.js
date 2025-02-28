const { ProcessError } = require("../../Error/ProcessError")
const { IndicadoresRepository } = require("../Class/Indicadores")
const { LotesRepository } = require("../Class/Lotes")
const { UsuariosRepository } = require("../Class/Usuarios")
const { VariablesDelSistema } = require("../Class/VariablesDelSistema")
const { filtroFechaInicioFin } = require("./utils/filtros")

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
                    kilos_procesador: 1,
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
    static async get_indicadores_operaciones_registros(req) {
        try {
            const { filtro } = req
            const { fechaInicio, fechaFin, tipoFruta } = filtro || {};

            let query = {}

            query = filtroFechaInicioFin(fechaInicio, fechaFin, query, 'fecha_creacion')

            // Filtro por tipoFruta
            if (tipoFruta && tipoFruta.length > 0) {
                query.tipo_fruta = {
                    $all: tipoFruta,          // Debe contener todos los elementos del filtro
                    $size: tipoFruta.length   // Debe tener exactamente esta cantidad
                };
            }

            const registros = await IndicadoresRepository.get_indicadores({
                query: query,
                select: {
                    fecha_creacion: 1,
                    kilos_procesador: 1,
                    meta_kilos_procesados: 1,
                    total_horas_hombre: 1,
                    tipo_fruta: 1,
                    kilos_exportacion: 1
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
    static async get_indicaores_operaciones_lotes(req) {
        try {
            const { filtro } = req
            const { fechaInicio, fechaFin, tipoFruta } = filtro || {};

            let query = {}

            query = filtroFechaInicioFin(fechaInicio, fechaFin, query, "fecha_ingreso_inventario")

            // Filtro por tipoFruta
            if (tipoFruta && tipoFruta.length > 0) {
                query.tipoFruta = {
                    $all: tipoFruta,          // Debe contener todos los elementos del filtro
                };
            }

            query.fecha_finalizado_proceso = { $exists: true }

            const registros = await LotesRepository.getLotes({
                query: query,
                limit: 'all',
                select: {
                    fecha_ingreso_inventario: 1,
                    fecha_finalizado_proceso: 1,
                }
            })

            const new_registros = registros.map(lote => {
                const fechaInicio = new Date(lote.fecha_ingreso_inventario)
                const fechaFin = new Date(lote.fecha_finalizado_proceso)

                const diferencia = Math.abs(fechaFin - fechaInicio)

                const dias = diferencia / (1000 * 60 * 60)

                return { ...lote._doc, dias_inicio_fin: dias }
            })


            return new_registros
        } catch (err) {
            if (err.status === 522) {
                throw err
            }
            throw new ProcessError(475, `Error ${err.type}: ${err.message}`)
        }
    }
    static async get_indicadores_operaciones_noCalidad(req) {
        try {
            const { filtro } = req
            const { fechaInicio, fechaFin, tipoFruta } = filtro || {};

            let query = {}

            query = filtroFechaInicioFin(fechaInicio, fechaFin, query, "fecha")

            // Filtro por tipoFruta
            if (tipoFruta && tipoFruta.length > 0) {
                query.tipoFruta = {
                    $all: tipoFruta,          // Debe contener todos los elementos del filtro
                };
            }

            const registros = await UsuariosRepository.obtener_volante_calidad({
                query: query,
                limit: 'all'
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
    static async sys_indicadores_eficiencia_operativa_kilos_procesados() {
        try {
            const indicador = await IndicadoresRepository.get_indicadores({
                sort: { fecha_creacion: -1 },
                limit: 1
            })
            const kilos_procesados = await VariablesDelSistema.get_kilos_procesados_hoy2()

            const kilos_total = Object.values(kilos_procesados).reduce((a, b) => a + b, 0);
            const tipo_fruta = Object.keys(kilos_procesados);

            await IndicadoresRepository.put_indicador(indicador[0]._id, {
                tipo_fruta: tipo_fruta,
                kilos_procesador: kilos_total
            })


        } catch (err) {
            if (err.status === 525) {
                throw err
            }
            throw new ProcessError(475, `Error ${err.type}: ${err.message}`)
        }
    }
    static async sys_indicadores_eficiencia_fruta_kilos_procesados() {
        try {
            const indicador = await IndicadoresRepository.get_indicadores({
                sort: { fecha_creacion: -1 },
                limit: 1
            })
            const kilos_exportacion = await VariablesDelSistema.get_kilos_exportacion_hoy2()

            await IndicadoresRepository.put_indicador(indicador[0]._id, {
                kilos_exportacion: kilos_exportacion
            })


        } catch (err) {
            if (err.status === 525) {
                throw err
            }
            throw new ProcessError(475, `Error ${err.type}: ${err.message}`)
        }
    }
    static async sys_indicadores_eficiencia_fruta_kilos_vaciados() {
        try {
            const indicador = await IndicadoresRepository.get_indicadores({
                sort: { fecha_creacion: -1 },
                limit: 1
            })
            const kilos_exportacion = await VariablesDelSistema.get_kilos_vaciados_hoy()

            await IndicadoresRepository.put_indicador(indicador[0]._id, {
                kilos_vaciados: kilos_exportacion
            })


        } catch (err) {
            if (err.status === 525) {
                throw err
            }
            throw new ProcessError(475, `Error ${err.type}: ${err.message}`)
        }
    }
}

module.exports.IndicadoresAPIRepository = IndicadoresAPIRepository
