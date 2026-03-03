import { CalidadLogicError } from "../../Error/logicLayerError.js";
import mongoose from 'mongoose';
import { procesoEventEmitter } from "../../events/eventos.js";
import { ConstantesDelSistema } from "../Class/ConstantesDelSistema.js";
import { ContenedoresRepository } from "../Class/Contenedores.js";
import { FormulariosCalidadRepository } from "../Class/FormulariosCalidad.js";
import { LotesRepository } from "../Class/Lotes.js";
import { UsuariosRepository } from "../Class/Usuarios.js";
import { filtroFechaInicioFin } from "./utils/filtros.js";
import { CalidadValidationsRepository } from "../validations/calidad.js";
import { z } from "zod";

import { CalidadService } from "../services/calidad.js";
import { LogsRepository } from "../Class/LogsSistema.js";
import { registrarPasoLog } from "./helper/logs.js";
import { ErrorCalidadLogicHandlers } from "./utils/errorsHandlers.js";
import { LotesHelper } from "../helper/lotes.js";


export class CalidadRepository {

    //#region historial calidad
    static async get_calidad_historial_calidadInterna(req) {
        try {
            const { data: datos } = req
            const { page } = datos;
            const resultsPerPage = 50;
            const query = {
                enf: { $regex: '^E', $options: 'i' },
                "calidad.calidadInterna": { $exists: true },
            }
            const lotes = await LotesRepository.getLotes({
                query: query,
                skip: (page - 1) * resultsPerPage,
                sort: { "calidad.calidadInterna.fecha": -1 },
                select: { enf: 1, tipoFruta: 1, calidad: 1, __v: 1 },
                limit: resultsPerPage
            })
            return lotes
        } catch (err) {
            if (err.status === 522) {
                throw err
            }
            throw new CalidadLogicError(471, `Error ${err.type}: ${err.message}`)
        }
    }
    static async get_calidad_historial_calidadInterna_numeroElementos() {
        try {
            const filtro = {
                enf: { $regex: '^E', $options: 'i' },
                "calidad.calidadInterna": { $exists: true },
            }
            const numeroContenedores = await LotesRepository.get_numero_lotes(filtro)
            return numeroContenedores

        } catch (err) {

            if (err.status === 524) {
                throw err
            }
            throw new CalidadLogicError(471, `Error ${err.type}: ${err.message}`)

        }
    }
    static async put_calidad_historial_calidadInterna(req) {
        try {
            const { data: datos, user } = req
            const { action, _id, data } = datos

            await LotesRepository.actualizar_lote(
                { _id: _id },
                data,
                { new: true, user: user, action: action }
            );
        } catch (err) {
            if (err.status === 524) {
                throw err
            }
            throw new CalidadLogicError(471, `Error ${err.type}: ${err.message}`)
        }
    }
    static async get_calidad_historial_clasificacionDescarte(req) {
        try {
            const { data } = req
            const { page } = data;
            const resultsPerPage = 50;
            const query = {
                enf: { $regex: '^E', $options: 'i' },
                "calidad.clasificacionCalidad": { $exists: true },
            }
            const lotes = await LotesRepository.getLotes({
                query: query,
                skip: (page - 1) * resultsPerPage,
                sort: { "calidad.clasificacionCalidad.fecha": -1 },
                select: { enf: 1, tipoFruta: 1, calidad: 1, __v: 1 },
                limit: resultsPerPage
            })
            return lotes
        } catch (err) {
            if (err.status === 522) {
                throw err
            }
            throw new CalidadLogicError(471, `Error ${err.type}: ${err.message}`)
        }
    }
    static async put_calidad_historial_clasficacionDescarte(req) {
        const { user } = req;
        // Validaciones básicas
        const { action, _id, data } = req.data;
        if (!_id || !data) {
            throw new CalidadLogicError(400, 'ID y datos son requeridos');
        }
        const log = await LogsRepository.create({
            user: user,
            action: action,
            acciones: [{ paso: "Inicio de la función", status: "Iniciado", timestamp: new Date() }]
        });
        try {
            return await LotesRepository.actualizar_lote(
                { _id },
                data,
                { new: true, user, action }
            );
        } catch (error) {
            await ErrorCalidadLogicHandlers(error, log);
        }
    }
    //#endregion

    //NUEVO JP --------------------------------------------------------------------------------------------------------------------------------
    //#region historial concentraciones
    static async get_calidad_formulario_historialConcentraciones(req) {
        try {
            const { fechaInicio, fechaFin } = req.data;
            
            // Construir query con filtros
            let query = { activo: true };

            // Si hay filtros de fecha, agregarlos
            if (fechaInicio || fechaFin) {
                query.fecha = {};
                
                if (fechaInicio) {
                    query.fecha.$gte = new Date(fechaInicio);
                }
                
                if (fechaFin) {
                    // Agregar un día completo para incluir registros del día final
                    const fechaFinDate = new Date(fechaFin);
                    fechaFinDate.setHours(23, 59, 59, 999);
                    query.fecha.$lte = fechaFinDate;
                }
            }

            // Obtener datos con populate de referencias
            const registros = await FormulariosCalidadRepository.get_historial_concentraciones({
                query: query,
                sort: { fecha: -1 }, // Ordenar por fecha descendente
                populate: [
                    { path: 'tipoFruta', select: 'tipoFruta' },
                    { path: 'responsable', select: 'nombre apellido' },
                    { path: 'usuario', select: 'nombre apellido' }
                ]
            });

            return registros;

        } catch (err) {
            if (err.status === 522) {
                throw err;
            }
            throw new CalidadLogicError(471, `Error ${err.type}: ${err.message}`);
        }
    }

    static async post_calidad_formulario_historialConcentraciones(req) {
        try {
            const { user } = req;
            const { data } = req.data;

            // Validar datos con Zod
            CalidadValidationsRepository.post_calidad_formulario_historialConcentraciones().parse(req.data);
            // Obtener el usuario de la sesión
            const usuarioId = user._id;
            
            if (!usuarioId) {
                throw new CalidadLogicError(401, 'Usuario no autenticado');
            }

            // Preparar datos del registro
            const registroData = {
                fecha: new Date(data.fecha),
                kilosProcesados: Number(data.kilosProcesados),
                tipoFruta: data.tipoFruta,
                concentracionPPM: data.concentracionPPM.trim(),
                observaciones: data.observaciones?.trim() || '',
                responsable: data.responsable,
                usuario: usuarioId,
                activo: true
            };

            // Crear el registro
            await FormulariosCalidadRepository.crear_historial_concentracion(registroData);

        } catch (err) {
            // if (err.status === 506) {
            //     throw err;
            // }
            if (err instanceof z.ZodError) {
                const errores = err.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(" | ");
                throw new CalidadLogicError(480, `Error de validación: ${errores}`);
            }
            if (err.status === 506) {
                throw err;
            }
            throw new CalidadLogicError(471, `Error ${err.type}: ${err.message}`);
        }
    }

    static async put_calidad_formulario_historialConcentraciones(req) {
        try {
             // Validar datos con Zod
            CalidadValidationsRepository.put_calidad_formulario_historialConcentraciones().parse(req.data);

            const { data } = req.data;
            const { _id, updateData } = data;

            // if (!_id) {
            //     throw new CalidadLogicError(400, 'ID de registro requerido');
            // }

            // Preparar datos de actualización
            const update = {};
            
            if (updateData.fecha) update.fecha = new Date(updateData.fecha);
            if (updateData.kilosProcesados !== undefined) {
                update.kilosProcesados = Number(updateData.kilosProcesados);
            }
            if (updateData.tipoFruta) update.tipoFruta = updateData.tipoFruta;
            if (updateData.concentracionPPM) update.concentracionPPM = updateData.concentracionPPM.trim();
            if (updateData.observaciones !== undefined) update.observaciones = updateData.observaciones.trim();
            if (updateData.responsable) update.responsable = updateData.responsable;

            // Actualizar registro
            await FormulariosCalidadRepository.actualizar_historial_concentracion(_id, update);

        } catch (err) {
            if (err instanceof z.ZodError) {
                const errores = err.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(" | ");
                throw new CalidadLogicError(480, `Error de validación: ${errores}`);
            }
            if (err.status === 523) {
                throw err;
            }
            throw new CalidadLogicError(471, `Error ${err.type}: ${err.message}`);
        }
    }

    static async delete_calidad_formulario_historialConcentraciones(req) {
        try {
            // Validar datos con Zod
            CalidadValidationsRepository.delete_calidad_formulario_historialConcentraciones().parse(req.data);

            const { _id } = req.data;

            // if (!_id) {
            //     throw new CalidadLogicError(400, 'ID de registro requerido');
            // }

            // Desactivar registro (soft delete)
            await FormulariosCalidadRepository.eliminar_historial_concentracion(_id);

        } catch (err) {
            if (err instanceof z.ZodError) {
                const errores = err.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(" | ");
                throw new CalidadLogicError(480, `Error de validación: ${errores}`);
            }
            if (err.status === 523) {
                throw err;
            }
            throw new CalidadLogicError(471, `Error ${err.type}: ${err.message}`);
        }
    }
    //#endregion
//----------------------------------------------------------------------------------------------------------------------------------------------
    //#region informes
    static async get_calidad_informes_lotesInformesProveedor(req) {
        try {
            const { data: datos } = req
            const { page } = datos;
            const resultsPerPage = 50;
            const query = {
                enf: { $regex: '^E', $options: 'i' }
            }
            const lotes = await LotesRepository.getLotes({
                query: query,
                skip: (page - 1) * resultsPerPage,
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
                limit: resultsPerPage,
                populate: [
                    { path: 'predio', select: 'PREDIO ICA DEPARTAMENTO GGN precio' },
                    { path: 'tipoFruta' },
                ]

            })
            return lotes
        } catch (err) {
            if (err.status === 522) {
                throw err
            }
            throw new CalidadLogicError(471, `Error ${err.type}: ${err.message}`)
        }
    }
    static async get_calidad_informe_lote_detalle(req) {
        try {
            const { _id } = req.data

            const lote = await LotesRepository.getLotes({
                ids: [_id],
                populate: [
                    { path: 'predio', select: 'PREDIO GGN ICA' },
                    { path: 'tipoFruta' },
                    { path: "user", select: "usuario nombre apellido" },
                    { path: 'salidaExportacion.contenedores', select: 'numeroContenedor' },
                    { path: 'precio', select: 'exportacion frutaNacional descarte' },
                ]
            });

            if (!lote || lote.length === 0) {
                throw new CalidadLogicError(404, "Lote no encontrado.");
            }

            return lote[0]
        } catch (err) {
            if (err.status === 524) {
                throw err
            }
            throw new CalidadLogicError(471, `Error ${err.type}: ${err.message}`)
        }
    }
    static async get_calidad_informes_imagenDefecto(req) {
        try {
            const { data: datos } = req
            const { data } = datos
            const response = await LotesRepository.obtener_imagen_lote_calidad(data)
            return response
        } catch (err) {
            if (err.status === 525) {
                throw err
            }
            throw new CalidadLogicError(471, `Error ${err.type}: ${err.message}`)
        }

    }
    static async get_calidad_informes_contenedoresLote(req) {
        try {
            const { data: datos } = req
            const { data } = datos
            const response = await ContenedoresRepository.getItemsPallets({
                query: { lote: { $in: data } },
            });
            return response
        } catch (err) {
            if (err.status === 522) {
                throw err
            }
            throw new CalidadLogicError(471, `Error ${err.type}: ${err.message}`)
        }
    }
    static async get_calidad_informes_informeProveedor_numeroElementos() {
        try {
            const filtro = {
                enf: { $regex: '^E', $options: 'i' },
            }
            const numeroContenedores = await LotesRepository.get_numero_lotes(filtro)
            return numeroContenedores

        } catch (err) {
            if (err.status === 524) {
                throw err
            }
            throw new CalidadLogicError(471, `Error ${err.type}: ${err.message}`)
        }
    }
    static async put_calidad_informes_loteFinalizarInforme(req) {
        const { user } = req;
        let log
        try {
            log = await LogsRepository.create({
                user: user._id,
                action: "put_calidad_informes_loteFinalizarInforme",
                acciones: [{ paso: "Inicio de la función", status: "Iniciado", timestamp: new Date() }]
            })
            const logData = { logId: log._id, user: user, action: "put_calidad_informes_loteFinalizarInforme" }

            const { _id } = req.data

            let query = {
                aprobacionProduccion: true,
                fecha_finalizado_proceso: new Date()
            }
            const lote = await LotesRepository.getLotes({ ids: [_id] })
            if (lote[0].salidaExportacion && lote[0].salidaExportacion.totalKilos > 0) {

                const itemPallets = await ContenedoresRepository.getItemsPallets({
                    query: { contenedor: { $in: lote[0].salidaExportacion.contenedores } }
                })

                await registrarPasoLog(logData.logId, "getLotes AND get_Contenedores_sin_lotes", "Completado");
                const { exportacion, kilosGGN } = await CalidadService.obtenerExportacionContenedores(itemPallets, _id, logData);
                if (lote[0].salidaExportacion.totalKilos !== exportacion) {
                    throw new CalidadLogicError(400, `La suma de kilos en los contenedores (${exportacion} kg) no coincide con los kilos del lote (${lote[0].salidaExportacion.totalKilos} kg). Verifique por favor.`);
                }
                if (kilosGGN > 0) {
                    query['salidaExportacion.kilosGGN'] = kilosGGN;
                }

            }
            await LotesRepository.actualizar_lote(
                { _id },
                query,
                { new: true, user: user, action: "put_calidad_informes_loteFinalizarInforme" }
            );
            await registrarPasoLog(logData.logId, "LotesRepository.actualizar_lote", "Completado");

        } catch (err) {
            await registrarPasoLog(log._id, "put_calidad_informes_loteFinalizarInforme", "Error", `${err.message}`);
            if (err.status === 523 || err.status === 522) {
                throw err
            }
            throw new CalidadLogicError(471, `Error ${err.type}: ${err.message}`)
        } finally {
            await registrarPasoLog(log._id, "put_calidad_informes_loteFinalizarInforme", "Completado");
        }

    }
    static async put_calidad_informes_aprobacionComercial(req) {
        try {
            const { data, user } = req;
            const { _id, action } = data;

            const lote = await LotesRepository.getLotes({ ids: [_id] })

            if (!lote || lote.length === 0) {
                throw new CalidadLogicError(404, "Lote no encontrado.");
            }

            await LotesRepository.actualizar_lote(
                { _id },
                {
                    $set: {
                        aprobacionComercial: true,
                        fecha_aprobacion_comercial: new Date()
                    }
                },
                { new: true, user: user, action: action }
            );

            return true

        } catch (err) {
            if (err.status === 523 || err.status === 522) {
                throw err
            }
            const mensaje = err && err.message ? err.message : JSON.stringify(err);
            throw new CalidadLogicError(471, `Error al aprobar comercialmente: ${mensaje}`);

        }
    }
    static async put_calidad_informe_noPagarBalinLote(req) {
        try {
            const { data, user } = req
            const { _id, action } = data

            const lote = await LotesRepository.getLotes({ ids: [_id] })

            const query = { flag_balin_free: !lote[0].flag_balin_free };

            await LotesRepository.actualizar_lote(
                { _id: lote[0]._id },
                query,
                {
                    new: true,
                    user: user._id,
                    action: action
                }
            )
        } catch (err) {
            if (err.status === 523 || err.status === 522) {
                throw err
            }
            throw new CalidadLogicError(471, `Error ${err.type}: ${err.message}`)
        }
    }
    static async get_calidad_informes_lotesMaquila(req) {
        try {

            const { page } = req.data
            const resultsPerPage = 50;

            const lotes = await LotesRepository.getLotesMaquila({
                skip: (page - 1) * resultsPerPage,
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
                limit: resultsPerPage,
                populate: [
                    { path: 'predio', select: 'PREDIO ICA DEPARTAMENTO GGN precio' },
                    { path: 'precio', select: 'exportacion frutaNacional descarte' },
                    { path: 'salidaExportacion.contenedores', select: 'numeroContenedor' },
                    { path: 'tipoFruta' },
                ]

            })
            return lotes
        } catch (err) {
            if (err.status === 522) {
                throw err
            }
            throw new CalidadLogicError(471, `Error ${err.type}: ${err.message}`)
        }
    }
    static async get_calidad_informes_informeMaquila_numeroElementos(req) {
        try {
            const { filtro = {} } = req.data
            const numeroContenedores = await LotesRepository.get_numero_lotes_maquila(filtro)
            return numeroContenedores

        } catch (err) {
            if (err.status === 524) {
                throw err
            }
            throw new CalidadLogicError(471, `Error ${err.type}: ${err.message}`)
        }
    }
    static async get_calidad_informe_loteMaquila_detalle(req) {
        try {
            const { _id } = req.data

            const pipeline = [
                {
                    '$match': {
                        'lote': new mongoose.Types.ObjectId(_id)
                    }
                }, {
                    '$group': {
                        '_id': {
                            'contenedor': '$contenedor',
                            'calidad': '$calidad'
                        },
                        'totalKilos': {
                            '$sum': '$kilos'
                        },
                        'count': {
                            '$sum': 1
                        }
                    }
                }, {
                    '$project': {
                        '_id': 0,
                        'contenedor': '$_id.contenedor',
                        'calidad': '$_id.calidad',
                        'totalKilos': 1,
                        'documentosAgrupados': '$count'
                    }
                }
            ];

            const populateOptions = [
                { path: 'calidad', select: 'nombre descripcion' },
                { path: 'contenedor', select: 'numeroContenedor infoContenedor.maquila' }
            ];


            const [lote, itemsExp] = await Promise.all([
                LotesRepository.getLotesMaquila({
                    ids: [_id],
                    populate: [
                        { path: 'predio', select: 'PREDIO GGN ICA' },
                        { path: 'tipoFruta' },
                        { path: 'cliente', select: 'CLIENTE' },
                        { path: "user", select: "usuario nombre apellido" },
                        { path: 'salidaExportacion.contenedores', select: 'numeroContenedor' },
                        { path: 'precio', select: 'exportacion frutaNacional descarte' },

                    ]
                }),
                ContenedoresRepository.aggregateAndPopulate(pipeline, populateOptions)
            ])

            if (!lote || lote.length === 0) {
                throw new CalidadLogicError(404, "Lote no encontrado.");
            }

            return { lote: lote[0], itemsPallets: itemsExp }
        } catch (err) {
            if (err.status === 524) {
                throw err
            }
            throw new CalidadLogicError(471, `Error ${err.type}: ${err.message}`)
        }
    }
    static async put_calidad_informesMaquila_aprobacionProduccion(req) {
        const { user } = req;
        const { action, _id } = req.data
        let log
        try {
            log = await LogsRepository.create({
                user: user._id,
                action: action,
                acciones: [{ paso: "Inicio de la función", status: "Iniciado", timestamp: new Date() }]
            })
            const logData = { logId: log._id, user: user, action: action }

            let update = {
                aprobacionProduccion: true,
                fecha_finalizado_proceso: new Date()
            }
            const lote = await LotesRepository.getLotesMaquila({ ids: [_id] })
            if (lote[0].salidaExportacion && lote[0].salidaExportacion.totalKilos > 0) {

                const itemPallets = await ContenedoresRepository.getItemsPallets({
                    query: { contenedor: { $in: lote[0].salidaExportacion.contenedores } }
                })
                await registrarPasoLog(logData.logId, "getLotes AND get_Contenedores_sin_lotes", "Completado");

                const { exportacion, kilosGGN } = await CalidadService.obtenerExportacionContenedores(itemPallets, _id);
                await registrarPasoLog(logData.logId, "CalidadService.obtenerExportacionContenedores", "Completado");

                if (lote[0].salidaExportacion.totalKilos !== exportacion) {
                    throw new CalidadLogicError(400, `La suma de kilos en los contenedores (${exportacion} kg) no coincide con los kilos del lote (${lote[0].salidaExportacion.totalKilos} kg). Verifique por favor.`);
                }
                if (kilosGGN > 0) {
                    update['salidaExportacion.kilosGGN'] = kilosGGN;
                }
            }

            await CalidadService.verificarDescarteMaquila(lote[0])

            await LotesRepository.actualizar_lote_Maquila(
                { _id },
                update,
                { new: true, user: user._id, action: "put_calidad_informes_loteFinalizarInforme" }
            );
            await registrarPasoLog(logData.logId, "LotesRepository.actualizar_lote", "Completado");

        } catch (err) {
            await registrarPasoLog(log._id, "put_calidad_informes_loteFinalizarInforme", "Error", `${err.message}`);
            if (err.status === 523 || err.status === 522) {
                throw err
            }
            throw new CalidadLogicError(471, `Error ${err.type}: ${err.message}`)
        } finally {
            await registrarPasoLog(log._id, "put_calidad_informes_loteFinalizarInforme", "Completado");
        }
    }
    static async put_calidad_informesMaquila_aprobacionComercial(req) {
        try {
            const { data, user } = req;
            const { _id, action } = data;

            const lote = await LotesRepository.getLotesMaquila({ ids: [_id] })

            if (!lote || lote.length === 0) {
                throw new CalidadLogicError(404, "Lote maquilado no encontrado.");
            }

            const newLote = lote[0].toObject();
            newLote.aprobacionComercial = true
            newLote.fecha_aprobacion_comercial = new Date()
            // Actualizar contenedor con pallets modificados
            await LotesRepository.actualizar_lote_Maquila(
                { _id },
                {
                    $set: {
                        aprobacionComercial: true,
                        fecha_aprobacion_comercial: new Date()
                    }
                },
                { new: true, user: user._id, action: action }
            );

            return true

        } catch (err) {
            if (err.status === 523 || err.status === 522) {
                throw err
            }
            const mensaje = err && err.message ? err.message : JSON.stringify(err);
            throw new CalidadLogicError(471, `Error al aprobar comercialmente: ${mensaje}`);

        }
    }
    //#endregion
    //#region ingresos calidad
    static async get_calidad_ingresos_clasificacionDescarte() {
        try {
            const haceUnMes = new Date();
            haceUnMes.setMonth(haceUnMes.getMonth() - 1);
            const query = {
                'calidad.clasificacionCalidad': { $exists: false },
                enf: { $regex: '^E', $options: 'i' },
                $or: [
                    { fecha_ingreso_inventario: { $gte: new Date(haceUnMes) } },
                    { fecha_ingreso: { $gte: new Date(haceUnMes) } }
                ]

            }
            const select = { enf: 1, calidad: 1, tipoFruta: 1, fecha_creacion: 1, __v: 1 }
            const lotes = await LotesRepository.getLotes({ query: query, select: select })
            const lotesMaquila = await LotesRepository.getLotesMaquila({ query: query, select: select })
            const result = [...lotes, ...lotesMaquila].sort((a, b) => new Date(b.fecha_creacion) - new Date(a.fecha_creacion));
            return result
        } catch (err) {
            if (err.status === 522) {
                throw err
            }
            throw new CalidadLogicError(471, `Error ${err.type}: ${err.message}`)
        }
    }
    static async put_calidad_ingresos_clasificacionDescarte(req) {
        try {
            console.log(req.data)
            CalidadValidationsRepository.put_calidad_ingresos_clasificacionDescarte().parse(req.data);
            const { user } = req;
            const { action, data, _id } = req.data;
            const update = {
                ...data,
                'calidad.clasificacionCalidad.fecha': new Date(),
                'calidad.clasificacionCalidad.user': user._id
            }
            await LotesHelper.actualizar_lotes_helper({ _id: _id }, update, { user, action });

        } catch (err) {
            if (err.status === 523 || err.status === 522) {
                throw err
            }
            if (err instanceof z.ZodError) {
                const errores = err.errors.map(e => `${e.path[0]}: ${e.message}`).join(" | ")
                throw new CalidadLogicError(480, `Error de validación: ${errores}`)
            }
            throw new CalidadLogicError(471, `Error ${err.type}: ${err.message}`)
        }
    }
    static async get_calidad_ingresos_calidadInterna() {
        try {
            const haceUnMes = new Date();
            haceUnMes.setMonth(haceUnMes.getMonth() - 1);
            const query = {
                'calidad.calidadInterna': { $exists: false },
                enf: { $regex: '^E', $options: 'i' },
                $or: [
                    { fecha_ingreso_inventario: { $gte: new Date(haceUnMes) } },
                    { fecha_ingreso: { $gte: new Date(haceUnMes) } }
                ]
            }
            const select = { enf: 1, calidad: 1, tipoFruta: 1, fecha_creacion: 1, __v: 1 }
            const lotes = await LotesRepository.getLotes({ query: query, select: select })
            const lotesMaquila = await LotesRepository.getLotesMaquila({ query: query, select: select })
            const result = [...lotes, ...lotesMaquila].sort(
                (a, b) =>
                    new Date(b.fecha_creacion) - new Date(a.fecha_creacion)
            );
            return result
        } catch (err) {
            if (err.status === 522) {
                throw err
            }
            throw new CalidadLogicError(471, `Error ${err.type}: ${err.message}`)
        }
    }
    static async put_calidad_ingresos_calidadInterna(req) {
        const { user } = req
        let log
        try {
            log = await LogsRepository.create({
                user: user,
                action: "put_calidad_ingresos_calidadInterna",
                acciones: [{ paso: "Inicio de la función", status: "Iniciado", timestamp: new Date() }]
            })
            const { _id, data, action } = req.data

            CalidadValidationsRepository.put_calidad_ingresos_calidadInterna().parse(data);
            await registrarPasoLog(log._id, "Validación de datos completada", "Completado");

            const update = await CalidadService.crear_query_calidad_interna(data, user);
            await registrarPasoLog(log._id, "CalidadService.crear_query_calidad_interna", "Completado");

            await LotesHelper.actualizar_lotes_helper({ _id: _id }, update, { user, action });
            await registrarPasoLog(log._id, "LotesRepository.actualizar_lote", "Completado");

            procesoEventEmitter.emit("server_event", {
                action: "calidad_interna",
                data: {}
            });
        } catch (err) {
            console.error("Error en put_calidad_ingresos_calidadInterna:", err);
            await registrarPasoLog(log._id, "Error en put_calidad_ingresos_calidadInterna", "Error");
            if (err.status === 523) {
                throw err
            }
            throw new CalidadLogicError(471, `Error ${err.type}: ${err.message}`)
        } finally {
            await registrarPasoLog(log._id, "Fin de la función put_calidad_ingresos_calidadInterna", "Completado");
        }
    }
    static async get_calidad_ingresos_inspeccionFruta() {
        try {
            const haceUnMes = new Date();
            haceUnMes.setMonth(haceUnMes.getMonth() - 1);
            const query = {
                'calidad.inspeccionIngreso': { $exists: false },
                enf: { $regex: '^E', $options: 'i' },
                $or: [
                    { fecha_ingreso_inventario: { $gte: new Date(haceUnMes) } },
                    { fechaIngreso: { $gte: new Date(haceUnMes) } }
                ]
            }
            const select = { enf: 1, calidad: 1, tipoFruta: 1, __v: 1 }
            const lotes = await LotesRepository.getLotes({ query: query, select: select })
            return lotes
        } catch (err) {
            if (err.status === 522) {
                throw err
            }
            throw new CalidadLogicError(471, `Error ${err.type}: ${err.message}`)
        }
    }
    static async put_calidad_ingresos_inspeccionFruta(req) {
        try {
            const user = req.user.user;
            const { action, data, _id } = req.data;

            const formulario_data = await ConstantesDelSistema.get_info_formulario_inspeccion_fruta()
            let porcentageExportacion = 0
            let porcentajeDescarte = 0
            for (const [key, value] of Object.entries(data)) {
                const item = key.split('.')[2]
                if (
                    item === 'exportacion1' ||
                    item === 'exportacion15' ||
                    item === 'exportacion2'
                ) {
                    porcentageExportacion += value
                } else {
                    const itemData = Reflect.get(formulario_data, item);
                    if (itemData && Reflect.get(itemData, 'porcentage') < value) {
                        const query = {
                            ...data,
                            'calidad.inspeccionIngreso.fecha': new Date(),
                            not_pass: true,
                        }
                        await LotesRepository.actualizar_lote(
                            { _id: _id },
                            query,
                            {
                                new: true,
                                user: user,
                                action: action
                            }
                        );

                        procesoEventEmitter.emit("server_event", {
                            action: "inspeccion_fruta",
                            data: {}
                        });
                        return
                    }
                    porcentajeDescarte += value
                }
            }

            if (porcentageExportacion <= porcentajeDescarte) {
                const query = {
                    ...data,
                    'calidad.inspeccionIngreso.fecha': new Date(),
                    not_pass: true,
                }
                await LotesRepository.actualizar_lote(
                    { _id: _id },
                    query,
                    {
                        new: true,
                        user: user,
                        action: action
                    }
                );
                procesoEventEmitter.emit("server_event", {
                    action: "inspeccion_fruta",
                    data: {}
                });
                return
            }

            const query = {
                ...data,
                'calidad.inspeccionIngreso.fecha': new Date(),
                not_pass: false,
            }
            await LotesRepository.actualizar_lote(
                { _id: _id },
                query,
                {
                    new: true,
                    user: user,
                    action: action
                }
            );

            procesoEventEmitter.emit("server_event", {
                action: "inspeccion_fruta",
                data: {}
            });
        } catch (err) {
            if (err.status === 523 || err.status === 526) {
                throw err
            }
            throw new CalidadLogicError(471, `Error ${err.type}: ${err.message}`)
        }

    }
    static async get_calidad_ingresos_operariosVolanteCalidad() {
        try {
            const usuarios = await UsuariosRepository.get_users({
                query: { estado: true, cargo: "66bfbd0e281360363ce25dfc" }
            });
            return usuarios
        } catch (err) {
            if (err.status === 522) {
                throw err
            }
            throw new CalidadLogicError(471, `Error ${err.type}: ${err.message}`)
        }
    }
    static async post_calidad_ingresos_volanteCalidad(req) {
        try {
            const user = req.user
            const { data } = req.data
            CalidadValidationsRepository.post_calidad_ingresos_volanteCalidad().parse(data);

            const volante_calidad = {
                ...data,
                responsable: user._id
            }
            await UsuariosRepository.add_volante_calidad(volante_calidad)
        } catch (err) {
            if (err.status === 521) {
                throw err
            }
            throw new CalidadLogicError(471, `Error ${err.type}: ${err.message}`)
        }
    }
    static async get_calidad_ingresos_higienePersonal() {
        try {
            const usuarios = await UsuariosRepository.get_users({
                query: {
                    estado: true,
                    $or: [
                        { cargo: "66bfbd0e281360363ce25dfc" },
                        { cargo: "66bf8a99281360363ce252be" },
                        { cargo: "66bf8ab6281360363ce252c7" },
                        { cargo: "66bf8ad5281360363ce252d0" },
                        { cargo: "66bf8e40281360363ce25353" },
                        { cargo: "66c513dcb7dca1eebff39a96" }
                    ]
                },
                limit: 0
            });
            return usuarios
        } catch (err) {
            if (err.status === 522) {
                throw err
            }
            throw new CalidadLogicError(471, `Error ${err.type}: ${err.message}`)
        }
    }
    static async post_calidad_ingresos_higienePersonal(req) {
        try {
            const { user } = req
            const { data } = req.data
            const higienePersonal = {
                ...data,
                responsable: user._id
            }
            await UsuariosRepository.add_higiene_personal(higienePersonal)
        } catch (err) {
            if (err.status === 521) {
                throw err
            }
            throw new CalidadLogicError(471, `Error ${err.type}: ${err.message}`)
        }
    }




    //#endregion
    //#region formulario
    static async get_calidad_formulario_volanteCalidad(req) {
        try {
            const { filtro } = req.data
            const { tipoFruta, fechaInicio, fechaFin, operario } = filtro;
            let query = {}

            query = filtroFechaInicioFin(fechaInicio, fechaFin, query, "fecha")

            if (tipoFruta) {
                query.tipoFruta = tipoFruta
            }

            if (operario !== '') {
                query.operario = operario
            }

            const volanteCalidad = await UsuariosRepository.obtener_volante_calidad({
                query: query,
                limit: 'all'
            });
            return volanteCalidad
        } catch (err) {
            if (err.status === 522) {
                throw err
            }
            throw new CalidadLogicError(471, `Error ${err.type}: ${err.message}`)
        }
    }
    static async get_calidad_formulario_higienePersonal(req) {
        try {
            const { tipoFruta, fechaInicio, fechaFin } = req.data;
            let query = {}

            query = filtroFechaInicioFin(fechaInicio, fechaFin, query, "fecha")

            if (tipoFruta !== '') {
                query.tipoFruta = tipoFruta
            }

            const volanteCalidad = await UsuariosRepository.obtener_formularios_higiene_personal({
                query: query
            });
            return volanteCalidad
        } catch (err) {
            if (err.status === 522) {
                throw err
            }
            throw new CalidadLogicError(471, `Error ${err.type}: ${err.message}`)
        }
    }





    //#region reclamaciones
    static async get_calidad_reclamaciones_contenedores(req) {
        try {
            const { data } = req
            const { page } = data;
            const resultsPerPage = 50;

            const formularios = await ContenedoresRepository.get_Contenedores_sin_lotes({
                skip: (page - 1) * resultsPerPage,
                limit: resultsPerPage,
                select: {
                    numeroContenedor: 1,
                    infoContenedor: 1,
                    reclamacionCalidad: 1
                },
                query: {
                    reclamacionCalidad: { $exists: true },
                }
            })
            return formularios

        } catch (err) {
            if (err.status === 524) {
                throw err
            }
            throw new CalidadLogicError(471, `Error ${err.type}: ${err.message}`)
        }
    }
    static async get_calidad_reclamaciones_contenedores_numeroElementos() {
        try {
            const count = await ContenedoresRepository.obtener_cantidad_contenedores({
                reclamacionCalidad: { $exists: true }
            })
            return count
        } catch (err) {
            if (err.status === 524) {
                throw err
            }
            throw new CalidadLogicError(471, `Error ${err.type}: ${err.message}`)
        }
    }
    static async get_calidad_reclamaciones_contenedores_obtenerArchivo(req) {
        try {
            const { data } = req
            const { url } = data

            CalidadValidationsRepository.get_calidad_reclamaciones_contenedores_obtenerArchivo().parse(data)
            const response = await CalidadService.obtenerArchivoReclamacionCliente(url)
            return response
        } catch (err) {
            if (err instanceof z.ZodError) {
                const errores = err.errors.map(e => `${e.path[0]}: ${e.message}`).join(" | ")
                throw new CalidadLogicError(471, `Error de validación: ${errores}`)
            }
            throw new CalidadLogicError(471, `Error ${err.type}: ${err.message}`)
        }

    }
    //#endregion

    //#endregion
    static async get_info_formulario_inspeccion_fruta() {
        const formulario = await ConstantesDelSistema.get_info_formulario_inspeccion_fruta()
        return formulario
    }
    //!numero de elementos
    static async get_calidad_formularios_higienePersonal_numeroElementos() {
        const count = await FormulariosCalidadRepository.get_calidad_formularios_higienePersonal_numeroElementos()
        return count
    }
    static async lotes_derogar_lote(req) {
        const { data, user } = req

        const { _id, action, observaciones, clasificacionCalidad } = data;

        const query = {
            observaciones,
            clasificacionCalidad,
            not_pass: false
        }
        await LotesRepository.actualizar_lote(
            { _id: _id },
            query,
            {
                new: true,
                user: user,
                action: action
            }
        );
        procesoEventEmitter.emit("server_event", {
            action: "derogar_lote",
            data: {}
        });

    }
    static async lotes_devolver_lote(req) {
        const { data, user } = req
        const { _id, observaciones, action } = data

        const query = {
            observaciones: observaciones + " | Devuelto debido a la mala calidad de la fruta",
            "calidad.clasificacionCalidad.fecha": new Date(),
            "calidad.calidadInterna.fecha": new Date(),
            "calidad.fotosCalidad.fecha": new Date(),
        }
        await LotesRepository.actualizar_lote(
            { _id: _id },
            query,
            {
                new: true,
                user: user,
                action: action
            }
        );
        procesoEventEmitter.emit("server_event", {
            action: "derogar_lote",
            data: {}
        });

    }
}
