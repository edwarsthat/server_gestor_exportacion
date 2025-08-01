import Mongoose from 'mongoose'
import { ProcessError } from "../../Error/ProcessError.js";
import { procesoEventEmitter } from "../../events/eventos.js";
import { IndicadoresRepository } from "../Class/Indicadores.js";
import { LogsRepository } from "../Class/LogsSistema.js";
import { LotesRepository } from "../Class/Lotes.js";
// import { LotesRepository } from "../Class/Lotes.js";
// import { UsuariosRepository } from "../Class/Usuarios.js";
import { VariablesDelSistema } from "../Class/VariablesDelSistema.js";
import { IndicadoresService } from "../services/indicadores.js";
import { IndicadoresValidations } from "../validations/indicadores.js";
import { registrarPasoLog } from "./helper/logs.js";
import { filtroFechaInicioFin } from "./utils/filtros.js";
import { TiposFruta } from '../store/TipoFruta.js';

export class IndicadoresAPIRepository {
    //#region operaciones
    static async get_indicadores_operaciones_eficienciaOperativa(req) {
        const { user } = req;
        let log
        try {
            log = await LogsRepository.create({
                user: user._id ?? '66b62fc3777ac9bdcc5050ed', // usuario por defecto
                action: "get_indicadores_operaciones_eficienciaOperativa",
                acciones: [{ paso: "Inicio de la función", status: "Iniciado", timestamp: new Date() }]
            })
            const { page } = req.data
            const resultsPerPage = 50;

            const registros = await IndicadoresRepository.get_indicadores({
                skip: (page - 1) * resultsPerPage,
                limit: resultsPerPage,
            })
            await registrarPasoLog(log._id, "IndicadoresRepository.get_indicadores", "Completado");

            return registros
        } catch (err) {
            console.log(`Error en get_indicadores_operaciones_eficienciaOperativa: ${err.message}`);
            await registrarPasoLog(log._id, "Error", "Fallido", err.message);
            if (err.status === 522) {
                throw err
            }
            throw new ProcessError(475, `Error ${err.type}: ${err.message}`)
        } finally {
            await registrarPasoLog(log._id, "Finalizo la funcion", "Completado");
        }
    }
    static async put_indicadores_operaciones_eficienciaOperativa(req) {
        const { user } = req;
        let log
        try {
            log = await LogsRepository.create({
                user: user._id,
                action: "put_indicadores_operaciones_eficienciaOperativa",
                acciones: [{ paso: "Inicio de la función", status: "Iniciado", timestamp: new Date() }]
            })
            const { _id, data } = req.data;
            IndicadoresValidations.put_indicadores_operaciones_eficienciaOperativa().parse(data);
            await registrarPasoLog(log._id, "validacion de datos", "Completado");

            await IndicadoresRepository.put_indicador(_id, data);
            await registrarPasoLog(log._id, "IndicadoresRepository.put_indicador", "Completado", `indicador: ${_id}`);

        } catch (err) {
            await registrarPasoLog(log._id, "Error", "Fallido", err.message);

            if (err.status === 523) {
                throw err
            } else if (err.status === 400) {
                throw err
            }
            throw new ProcessError(475, `Error ${err.type}: ${err.message}`)
        } finally {
            await registrarPasoLog(log._id, "Finalizo la funcion", "Completado");
        }
    }
    static async get_indicadores_operaciones_kilosProcesados(req) {
        try {
            const { filtro } = req.data
            IndicadoresValidations.get_indicadores_operaciones_kilosProcesados().parse(filtro);

            const { fechaInicio, fechaFin } = filtro || {};
            let query = {}

            query = filtroFechaInicioFin(fechaInicio, fechaFin, query, 'fecha_creacion')

            const registros = await IndicadoresRepository.get_indicadores({
                query: query,
                select: {
                    fecha_creacion: 1,
                    kilos_vaciados: 1,
                    duracion_turno_horas: 1,
                    kilos_meta_hora: 1,
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
    //#endregion
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
    static async reiniciarValores_proceso(keysExportacion) {
        let log
        try {
            log = await LogsRepository.create({
                user: "66b62fc3777ac9bdcc5050ed",
                action: "reiniciarValores_proceso",
                acciones: [{ paso: "Inicio de la función", status: "Iniciado", timestamp: new Date() }]
            })
            await VariablesDelSistema.reiniciarValores_proceso(keysExportacion);
            await registrarPasoLog(log._id, "Se obtiene los kilos procesados", "Completado");

            procesoEventEmitter.emit("proceso_event", {});
        } catch (err) {
            await registrarPasoLog(log._id, "Error", "Fallido", err.message);

            if (err.status === 525) {
                throw err
            }
            throw new ProcessError(475, `Error ${err.type}: ${err.message}`)
        } finally {
            await registrarPasoLog(log._id, "Finalizo la funcion", "Completado");
        }
    }
    static async sys_indicadores_ingresar_indicador() {
        let log
        try {
            log = await LogsRepository.create({
                user: "66b62fc3777ac9bdcc5050ed",
                action: "sys_indicadores_ingresar_indicador",
                acciones: [{ paso: "Inicio de la función", status: "Iniciado", timestamp: new Date() }]
            })
            const indicador = await IndicadoresRepository.get_indicadores({
                sort: { fecha_creacion: -1 },
                limit: 1
            })
            await registrarPasoLog(log._id, "Se obtiene el ultimo indicador", "Completado", `indicador: ${indicador[0]._id}`);

            if (!indicador.length) {
                throw new ProcessError(404, "No se encontró ningún indicador creado");
            }

            const kilos_procesados_raw = await VariablesDelSistema.get_metrica_hash("kilosProcesadosHoy");
            const kilos_procesados = await IndicadoresService.procesar_metrica_hash(kilos_procesados_raw, log);
            await registrarPasoLog(log._id, "Se obtiene los kilos procesados", "Completado");

            const kilos_vaciados_raw = await VariablesDelSistema.get_metrica_hash("kilosVaciadosHoy");
            const kilos_vaciados = await IndicadoresService.procesar_metrica_hash(kilos_vaciados_raw, log);
            await registrarPasoLog(log._id, "Se obtiene los kilos vaciados", "Completado");

            const [kilos_exportacion_raw, keys] = await VariablesDelSistema.get_metricas_exportacion();
            const kilos_exportacion = await IndicadoresService.procesar_exportacion_hash(kilos_exportacion_raw, log);


            await IndicadoresRepository.put_indicador(indicador[0]._id, {
                kilos_procesados: kilos_procesados,
                kilos_vaciados: kilos_vaciados,
                kilos_exportacion: kilos_exportacion,
            })
            await registrarPasoLog(log._id, "Se modifica el indicador diario", "Completado");

            return keys
        } catch (err) {
            await registrarPasoLog(log._id, "Error", "Fallido", err.message);

            if (err.status === 525) {
                throw err
            }
            throw new ProcessError(475, `Error ${err.type}: ${err.message}`)
        } finally {
            await registrarPasoLog(log._id, "Finalizo la funcion", "Completado");
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
    static async get_indicadores_operaciones_rendimientoPredios(req) {
        const startTime = Date.now();

        try {
            const { filtro } = req.data
            const { fechaInicio, fechaFin, proveedor, tipoFruta2 } = filtro || {};
            console.log(filtro)
            
            // Validar que la fechaInicio no sea anterior al 2025
            if (fechaInicio) {
                const fechaInicioDate = new Date(fechaInicio);
                if (fechaInicioDate.getFullYear() < 2025) {
                    throw new ProcessError(400, "No se pueden traer datos tan viejos. La fecha de inicio debe ser del año 2025 en adelante.");
                }
            }
            
            let query = { predio: new Mongoose.Types.ObjectId(proveedor) }
            query = filtroFechaInicioFin(fechaInicio, fechaFin, query, 'fecha_creacion')

            if (tipoFruta2?._id) {
                const arrTipoFruta = await TiposFruta.get_tiposFruta({ ids: [tipoFruta2._id] });
                query.tipoFruta = arrTipoFruta[0].tipoFruta;
            }
            const [
                lotes,
                { 
                    totalKilosIngreso = 0, 
                    totalKilosProcesados = 0, 
                    totalKilosExportacion = 0, 
                    totalKilosDescarte = 0,
                    totalCalidad1 = 0, 
                    totalCalidad15 = 0, 
                    totalCalidad2 = 0,
                } = {}
            ] =await Promise.all([
                LotesRepository.get_Lotes_strict({ query: query, limit:'all' }),
                LotesRepository.eficiencia_lote_calidad(query),
            ])

            const {  calibres, calibresTotal } = await IndicadoresService.obtener_calibres_lotes_contenedores(lotes);

            return { 
                lotes, 
                totalKilosIngreso, 
                totalKilosProcesados, 
                totalKilosExportacion, 
                totalKilosDescarte,
                totalCalidad1,
                totalCalidad15,
                totalCalidad2,
                calibres,
                calibresTotal,
            };

        } catch (err) {
            const errorDuration = Date.now() - startTime;
            console.log(`[${new Date().toISOString()}] Error en get_indicadores_operaciones_rendimientoPredios - Duración hasta error: ${errorDuration}ms - Error: ${err.message}`);
            throw new ProcessError(475, `Error ${err.type}: ${err.message}`)
        }
    }

}
