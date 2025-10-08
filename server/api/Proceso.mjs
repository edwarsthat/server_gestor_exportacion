import { ProcessError } from "../../Error/ProcessError.js";
import { procesoEventEmitter } from "../../events/eventos.js";
import { RecordLotesRepository } from "../archive/ArchiveLotes.js";
import { ContenedoresRepository } from "../Class/Contenedores.js";
import { LotesRepository } from "../Class/Lotes.js";
import { VariablesDelSistema } from "../Class/VariablesDelSistema.js";
import { insumos_contenedor } from "../functions/insumos.js";
import { InsumosRepository } from "../Class/Insumos.js";

import path from 'path';
import fs from "fs";

import { have_lote_GGN_export } from "../controllers/validations.js";
import { filtroFechaInicioFin } from "./utils/filtros.js";
import { InventariosLogicError } from "../../Error/logicLayerError.js";
import { RecordModificacionesRepository } from "../archive/ArchivoModificaciones.js";
import { ProcesoValidations } from "../validations/proceso.js";
import { ProcesoService } from "../services/proceso.js";
import { RedisRepository } from "../Class/RedisData.js";
import { dirname } from 'path';
import { fileURLToPath } from 'url';
import { LogsRepository } from "../Class/LogsSistema.js";
import { registrarPasoLog } from "./helper/logs.js";
import { checkFinalizadoLote } from "./utils/lotesFunctions.js";
import { getColombiaDate } from "./utils/fechas.js";
import { db } from "../../DB/mongoDB/config/init.js";
import { IndicadoresAPIRepository } from "./IndicadoresAPI.js";
import { ErrorProcesoLogicHandlers } from "./utils/errorsHandlers.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);


export class ProcesoRepository {

    //#region aplicaciones
    static async post_proceso_aplicaciones_fotoCalidad(req) {
        try {
            const { user } = req
            const { foto, fotoName, _id } = req.data;

            // Construir el nombre del archivo
            const fileName = `${_id}_${fotoName}.png`;

            // Construir la ruta completa del archivo
            const fotoPath = path.join(
                __dirname,
                "..",
                "..",
                "fotos_frutas",
                fileName
            );

            // Eliminar el encabezado de datos URI si está presente
            const base64Data = foto.replace(/^data:image\/\w+;base64,/, "");

            fs.writeFileSync(fotoPath, base64Data, { encoding: "base64" }, err => {
                if (err) {
                    throw new ProcessError(422, `Error guardando fotos ${err.message}`)
                }
            });
            const fotos = {}
            fotos[`calidad.fotosCalidad.${fotoName}`] = fotoPath;
            const query = {
                ...fotos,
                "calidad.fotosCalidad.fechaIngreso": Date.now(),
            }

            await LotesRepository.actualizar_lote(
                { _id: _id },
                query,
                { new: true, user: user, action: "post_proceso_aplicaciones_fotoCalidad" }
            );
        } catch (err) {
            if (err.status === 523) {
                throw err
            }
            throw new ProcessError(470, `Error ${err.type}: ${err.message}`)
        }
    }
    static async get_proceso_aplicaciones_fotoCalidad() {
        try {
            const haceUnMes = new Date();
            const hoy = new Date();
            haceUnMes.setMonth(haceUnMes.getMonth() - 1);
            const hoyAM = hoy.setHours(0, 0, 0, 0);
            const hoyPM = hoy.setHours(23, 59, 59, 999);
            const lotes = await LotesRepository.getLotes({
                query: {
                    $and: [
                        {
                            $or: [
                                { 'calidad.fotosCalidad': { $exists: false } },
                                { 'calidad.fotosCalidad.fechaIngreso': { $gte: new Date(hoyAM), $lt: new Date(hoyPM) } }
                            ]
                        },
                        { enf: { $regex: '^E', $options: 'i' } },
                    ],
                    $or: [
                        { fecha_ingreso_inventario: { $gte: new Date(haceUnMes) } },
                        { fechaIngreso: { $gte: new Date(haceUnMes) } }
                    ]
                },
                select: { enf: 1 }
            });
            return lotes
        } catch (err) {
            if (err.status === 522) {
                throw err
            }
            throw new ProcessError(470, `Error ${err.type}: ${err.message}`)
        }
    }
    static async get_proceso_aplicaciones_descarteLavado() {
        try {
            const data = await VariablesDelSistema.obtenerEF1Descartes();
            return data
        } catch (err) {
            if (err.status === 531) {
                throw err
            }
            throw new ProcessError(470, `Error ${err.type}: ${err.message}`)
        }
    }
    static async put_proceso_aplicaciones_descarteLavado(req) {
        const { user } = req;
        const { _id, data, action } = req.data;

        let log

        const session = await db.Lotes.db.startSession();

        log = await LogsRepository.create({
            user: user._id,
            action: action,
            acciones: [{ paso: "Inicio de la función", status: "Iniciado", timestamp: new Date() }]
        })

        try {
            const logData = { logId: log._id, user: user, action: "put_proceso_aplicaciones_descarteLavado" }

            ProcesoValidations.put_proceso_aplicaciones_descarteLavado().parse(req.data)
            await registrarPasoLog(log._id, "ProcesoValidations.put_proceso_aplicaciones_descarteLavado", "Completado");

            const keys = Object.keys(data);
            const query = { $inc: {} };
            let kilos = 0;
            for (let i = 0; i < keys.length; i++) {
                query.$inc[`descarteLavado.${keys[i]}`] = Math.round(data[keys[i]]);
                kilos += Math.round(data[keys[i]]);
            }

            await session.withTransaction(async () => {
                const lote = await ProcesoService.modificarLotedescartes(_id, query, user, action, session)
                await registrarPasoLog(log._id, "ProcesoService.modificarLotedescartes", "Completado", `Lote ID: ${_id}, Kilos: ${kilos}`);

                await IndicadoresAPIRepository.put_indicadores_actualizar_indicador(
                    { $inc: { [`kilos_procesados.${lote.tipoFruta._id.toString()}`]: Number(kilos) } }, session
                );
                await registrarPasoLog(
                    log._id,
                    "IndicadoresAPIRepository.put_indicadores_actualizar_indicador",
                    "Completado",
                    `Se actualizó el indicador kilosProcesadosHoy con ${kilos} kilos del tipo de fruta ${lote.tipoFruta._id.toString()}`);

                await LogsRepository.createReporteIngresoDescarte({
                    user: user.user,
                    userID: user._id,
                    loteID: lote._id,
                    enf: lote.enf,
                    tipoFruta: lote.tipoFruta.tipoFruta,
                    descarteEncerado: {},
                    descarteLavado: data
                }, log._id);

                await registrarPasoLog(
                    log._id,
                    "LogsRepository.createReporteIngresoDescarte",
                    "Completado",
                    `Se creó el reporte de ingreso de descarte del lote ${lote._id}`);

                await RedisRepository.put_inventarioDescarte(data, 'descarteLavado:', lote.tipoFruta.tipoFruta, logData);
                await VariablesDelSistema.sumarMetricaSimpleAsync("kilosProcesadosHoy", lote.tipoFruta.tipoFruta, kilos, logData.logId);

                await registrarPasoLog(
                    log._id,
                    "Modificacion de Redis e Indicadores",
                    "Completado",
                    `Se modificó el inventario de descarte y la métrica kilosProcesadosHoy con ${kilos} kilos del tipo de fruta ${lote.tipoFruta._id.toString()}`);

            });

            procesoEventEmitter.emit("server_event", {
                action: "descarte_change",
                data: {}
            });
        } catch (error) {
            console.error(`[ERROR][${new Date().toISOString()}]`, error);
            await ErrorProcesoLogicHandlers(error, log)
        } finally {
            await session.endSession();
            await registrarPasoLog(log._id, "Finalizo la funcion", "Completado");
        }

    }
    static async put_proceso_aplicaciones_descarteEncerado(req) {

        const { user } = req;
        const { _id, data, action } = req.data;

        let log

        const session = await db.Lotes.db.startSession();

        log = await LogsRepository.create({
            user: user._id,
            action: action,
            acciones: [{ paso: "Inicio de la función", status: "Iniciado", timestamp: new Date() }]
        })

        try {

            const logData = { logId: log._id, user: user, action: "put_proceso_aplicaciones_descarteEncerado" }

            ProcesoValidations.put_proceso_aplicaciones_descarteEncerado().parse(req.data)
            await registrarPasoLog(log._id, "ProcesoValidations.put_proceso_aplicaciones_descarteEncerado", "Completado");

            const keys = Object.keys(data);
            const query = { $inc: {} };
            let kilos = 0;

            for (let i = 0; i < keys.length; i++) {
                if (keys[i] === 'frutaNacional') {
                    query.$inc[keys[i]] = data[keys[i]];
                    kilos += data[keys[i]];
                } else {
                    query.$inc[`descarteEncerado.${keys[i]}`] = Math.round(data[keys[i]]);
                    kilos += Math.round(data[keys[i]]);
                }
            }

            await session.withTransaction(async () => {
                const lote = await ProcesoService.modificarLotedescartes(_id, query, user, action, session)
                await registrarPasoLog(log._id, "ProcesoService.modificarLotedescartes", "Completado", `Lote ID: ${_id}, Kilos: ${kilos}`);

                await IndicadoresAPIRepository.put_indicadores_actualizar_indicador(
                    { $inc: { [`kilos_procesados.${lote.tipoFruta._id.toString()}`]: Number(kilos) } }, session
                );
                await registrarPasoLog(
                    log._id,
                    "IndicadoresAPIRepository.put_indicadores_actualizar_indicador",
                    "Completado",
                    `Se actualizó el indicador kilosProcesadosHoy con ${kilos} kilos del tipo de fruta ${lote.tipoFruta._id.toString()}`);

                await LogsRepository.createReporteIngresoDescarte({
                    user: user.user,
                    userID: user._id,
                    loteID: lote._id,
                    enf: lote.enf,
                    tipoFruta: lote.tipoFruta.tipoFruta,
                    descarteEncerado: data,
                    descarteLavado: {}
                }, log._id);

                await registrarPasoLog(
                    log._id,
                    "LogsRepository.createReporteIngresoDescarte",
                    "Completado",
                    `Se creó el reporte de ingreso de descarte del lote ${lote._id}`);

                await RedisRepository.put_inventarioDescarte(data, 'descarteEncerado:', lote.tipoFruta.tipoFruta, logData);
                await VariablesDelSistema.sumarMetricaSimpleAsync("kilosProcesadosHoy", lote.tipoFruta.tipoFruta, kilos, logData.logId);

                await registrarPasoLog(
                    log._id,
                    "Modificacion de Redis e Indicadores",
                    "Completado",
                    `Se modificó el inventario de descarte y la métrica kilosProcesadosHoy con ${kilos} kilos del tipo de fruta ${lote.tipoFruta._id.toString()}`);
            })
            procesoEventEmitter.emit("server_event", {
                action: "descarte_change",
                data: {}
            });
        } catch (error) {
            console.error(`[ERROR][${new Date().toISOString()}]`, error);
            await ErrorProcesoLogicHandlers(error, log)
        } finally {
            await session.endSession();
            await registrarPasoLog(log._id, "Finalizo la funcion", "Completado");
        }
    }
    static async get_proceso_aplicaciones_listaEmpaque_contenedores() {
        try {
            const contenedores = await ContenedoresRepository.getContenedores({
                select: { numeroContenedor: 1, infoContenedor: 1, pallets: 1 },
                query: { 'infoContenedor.cerrado': false }
            });
            return contenedores
        } catch (err) {
            if (err.status === 522) {
                throw err
            }
            throw new ProcessError(470, `Error ${err.type}: ${err.message}`)
        }
    }
    static async get_proceso_aplicaciones_listaEmpaque_pallets(req) {
        try {
            const { contenedor } = req.data
            const pallets = await ContenedoresRepository.getPallets({
                query: { contenedor: contenedor }
            });
            return pallets
        } catch (err) {
            if (err.status === 522) {
                throw err
            }
            throw new ProcessError(470, `Error ${err.type}: ${err.message}`)
        }
    }
    static async get_proceso_aplicaciones_listaEmpaque_itemsPallet(req) {
        try {
            const { contenedor } = req.data
            const pallets = await ContenedoresRepository.getItemsPallets({
                query: { contenedor: contenedor }
            });
            return pallets
        } catch (err) {
            if (err.status === 522) {
                throw err
            }
            throw new ProcessError(470, `Error ${err.type}: ${err.message}`)
        }
    }
    static async get_proceso_aplicaciones_listaEmpaque_lotes() {
        try {
            // Obtener la fecha actual en Colombia
            const ahora = new Date();

            // Crear fechaInicio (comienzo del día en Colombia, pero en UTC)
            const fechaInicio = new Date(Date.UTC(
                ahora.getFullYear(),
                ahora.getMonth(),
                ahora.getDate() - 1,
                0, 0, 0, 0
            ));

            // Crear fechaFin (final del día en Colombia, pero en UTC)
            const fechaFin = new Date();


            let query = {
                operacionRealizada: 'vaciarLote'
            }

            query = filtroFechaInicioFin(fechaInicio, fechaFin, query, 'fecha')

            const recordLotes = await RecordLotesRepository.getVaciadoRecord({ query: query })
            const lotesIds = recordLotes.map(lote => lote.documento._id);

            const lotes = await LotesRepository.getLotes2({
                ids: lotesIds,
                limit: recordLotes.length,
                select: { enf: 1, promedio: 1, tipoFruta: 1, __v: 1 }
            });
            const resultado = recordLotes.map(item => {
                const lote = lotes.find(lote => lote._id.toString() === item.documento._id);
                if (lote) {
                    if (Object.prototype.hasOwnProperty.call(item.documento, "$inc")) {
                        item.documento = { ...lote, kilosVaciados: item.documento.$inc.kilosVaciados }
                        return (item)
                    }
                    else {
                        return item
                    }
                }
                return null
            }).filter(item => item !== null);
            return resultado
        } catch (err) {
            if (err.status === 522) {
                throw err
            }
            throw new ProcessError(470, `Error ${err.type}: ${err.message}`)
        }
    }
    static async put_proceso_aplicaciones_listaEmpaque_addSettings(req) {

        const { user } = req;
        const { _id, settings, action, itemCalidad } = req.data;

        let log
        const session = await db.Contenedores.db.startSession();
        log = await LogsRepository.create({
            user: user._id,
            action: action,
            acciones: [{ paso: "Inicio de la función", status: "Iniciado", timestamp: new Date() }]
        })

        try {
            const { tipoCaja, calidad, calibre } = settings;

            await session.withTransaction(async () => {

                // Predicado de concurrencia (si tienes versionKey o updatedAt)
                await ContenedoresRepository.actualizar_pallet(
                    { _id },
                    {
                        $set: {
                            ...itemCalidad,
                            calidad: calidad,
                            calibre: calibre,
                            tipoCaja: tipoCaja,
                        }
                    },
                    {
                        user: user._id,
                        action: action,
                        session,

                    }
                );
            })
            procesoEventEmitter.emit("listaempaque_update");
        } catch (error) {
            console.error(`[ERROR][${new Date().toISOString()}]`, error);
            await ErrorProcesoLogicHandlers(error, log)
        } finally {
            await session.endSession();
            await registrarPasoLog(log._id, "Finalizo la funcion", "Completado");
        }
    }
    static async put_proceso_aplicaciones_listaEmpaque_agregarItem(req) {
        const { user } = req;
        const { _id, pallet, item, action } = req.data;

        let log

        const session = await db.Contenedores.db.startSession();

        log = await LogsRepository.create({
            user: user._id,
            action: action,
            acciones: [{ paso: "Inicio de la función", status: "Iniciado", timestamp: new Date() }]
        })

        try {
            const logData = { logId: log._id, user: user, action: "put_proceso_aplicaciones_listaEmpaque_agregarItem" }
            await ProcesoValidations.put_proceso_aplicaciones_listaEmpaque_agregarItem(req.data)
            await registrarPasoLog(log._id, "Validación de datos completada", "Completado");

            const { lote, calidad, tipoFruta, calibre, cajas, tipoCaja } = item

            await session.withTransaction(async () => {
                const { contenedor, lotes } = await ProcesoService.getContenedorAndLote(lote, _id, session);

                if (checkFinalizadoLote(lotes[0])) {
                    throw new ProcessError(400, `El lote ${lotes[0].enf} ya se encuentra finalizado, no se puede modificar`);
                }

                const GGN = have_lote_GGN_export(lotes[0], contenedor[0], item)
                await registrarPasoLog(log._id, "Revisa si tiene GGN", "Completado", `Tiene GGN: ${GGN}`);

                const kilos = Number(tipoCaja.split('-')[1].replace(",", ".")) * cajas
                await registrarPasoLog(log._id, "ProcesoService.crearCopiaProfundaPallets", "Completado");

                await ProcesoService.modificarLoteListaEmpaqueAddItem(item, kilos, _id, GGN, logData, session)
                await ProcesoService.modifiarContenedorPalletsListaEmpaque(lotes, pallet, item, kilos, _id, GGN, logData, session)
                await ProcesoService.ingresarDataExportacionDiaria(tipoFruta, calidad, calibre, kilos, logData)
            });

            procesoEventEmitter.emit("server_event", {
                action: "lista_empaque_update",
            });
            procesoEventEmitter.emit("listaempaque_update");

        } catch (error) {
            console.error(`[ERROR][${new Date().toISOString()}]`, error);
            await ErrorProcesoLogicHandlers(error, log)
        } finally {
            await session.endSession();
            await registrarPasoLog(log._id, "Finalizo la funcion", "Completado");
        }
    }
    static async put_proceso_aplicaciones_listaEmpaque_modificarItem_desktop(req) {
        const { user } = req;
        const { _id, pallet, seleccion, data, action } = req.data

        let log

        const session = await db.Contenedores.db.startSession();

        log = await LogsRepository.create({
            user: user._id,
            action: action,
            acciones: [{ paso: "Inicio de la función", status: "Iniciado", timestamp: new Date() }]
        })

        try {

            const logData = { logId: log._id, user: user, action: "put_proceso_aplicaciones_listaEmpaque_modificarItem_desktop" }
            ProcesoValidations.put_proceso_aplicaciones_listaEmpaque_modificarItem_desktop().parse(req.data)
            await registrarPasoLog(log._id, "Validación de datos completada", "Completado");

            const { calidad, calibre, cajas, tipoCaja } = data

            await session.withTransaction(async () => {

                const { contenedor, lote } = await ProcesoService.obtenerContenedorLote(_id, pallet, seleccion, session);
                await registrarPasoLog(log._id, "ProcesoService.obtenerContenedorLote", "Completado", `Contenedor: ${_id}, Pallet: ${pallet}, Selección: ${seleccion} - Lote: ${lote._id}`);

                const palletSeleccionadoComp = contenedor[0].pallets[pallet].EF1[seleccion];

                if (palletSeleccionadoComp.tipoCaja !== tipoCaja || palletSeleccionadoComp.calidad !== calidad || palletSeleccionadoComp.cajas !== cajas) {
                    if (checkFinalizadoLote(lote[0])) {
                        throw new ProcessError(400, `El lote ${lote[0].enf} ya se encuentra finalizado, no se puede modificar`);
                    }
                }

                const { palletsModificados, copiaPallet } = await ProcesoService.crearCopiaProfundaPallets(contenedor[0]);
                await registrarPasoLog(log._id, "ProcesoService.crearCopiaProfundaPallets", "Completado");

                const GGN = have_lote_GGN_export(lote, contenedor[0])

                const oldData = copiaPallet[pallet].EF1[seleccion];
                const itemSeleccionadoOld = copiaPallet[pallet].EF1[seleccion];
                const oldKilos = itemSeleccionadoOld.cajas * Number(itemSeleccionadoOld.tipoCaja.split("-")[1].replace(",", "."));
                const palletSeleccionado = palletsModificados[pallet].EF1[seleccion];
                const newKilos = Number(tipoCaja.split('-')[1].replace(",", ".")) * cajas

                await ProcesoService.modificarContenedorModificarItemListaEmpaque(palletsModificados, palletSeleccionado, itemSeleccionadoOld, copiaPallet, req.data, logData, session)
                await ProcesoService.modificarLoteModificarItemListaEmpaque(_id, oldKilos, newKilos, oldData.calidad, calidad, lote[0], GGN, logData, session)

                //se mira si es fruta de hoy para restar de las variables del proceso
                const fechaSeleccionada = getColombiaDate(palletSeleccionado.fecha)
                const hoy = getColombiaDate();

                // Ajustamos la fecha seleccionada restando 5 horas:
                fechaSeleccionada.setHours(fechaSeleccionada.getHours() - 5);
                // Ahora comparamos solo día, mes y año:
                if (
                    fechaSeleccionada.getFullYear() === hoy.getFullYear() &&
                    fechaSeleccionada.getMonth() === hoy.getMonth() &&
                    fechaSeleccionada.getDate() === hoy.getDate()
                ) {

                    await ProcesoService.ingresarDataExportacionDiaria(palletSeleccionado.tipoFruta, oldData.calidad, oldData.calibre, -oldKilos, logData, session)
                    await ProcesoService.ingresarDataExportacionDiaria(palletSeleccionado.tipoFruta, calidad, calibre, newKilos, logData, session)

                }

            })

            procesoEventEmitter.emit("server_event", {
                action: "lista_empaque_update",
            });

        } catch (error) {
            console.error(`[ERROR][${new Date().toISOString()}]`, error);
            await ErrorProcesoLogicHandlers(error, log)
        } finally {
            await session.endSession();
            await registrarPasoLog(log._id, "Finalizo la funcion", "Completado");
        }
    }
    static async put_proceso_aplicaciones_listaEmpaque_eliminarItem_desktop(req) {
        const { user } = req;
        const { _id, pallet, seleccion, action } = req.data

        let log

        const session = await db.Contenedores.db.startSession();

        log = await LogsRepository.create({
            user: user._id,
            action: action,
            acciones: [{ paso: "Inicio de la función", status: "Iniciado", timestamp: new Date() }]
        })
        try {

            await session.withTransaction(async () => {
                const { contenedor, lote } = await ProcesoService.obtenerContenedorLote(_id, pallet, seleccion, session);
                await registrarPasoLog(log._id, "ProcesoService.obtenerContenedorLote", "Completado", `Contenedor: ${_id}, Pallet: ${pallet}, Selección: ${seleccion} - Lote: ${lote._id}`);

                if (checkFinalizadoLote(lote[0])) {
                    throw new ProcessError(400, `El lote ${lote[0].enf} ya se encuentra finalizado, no se puede modificar`);
                }

                const { palletsModificados, copiaPallet } = await ProcesoService.crearCopiaProfundaPallets(contenedor[0]);
                await registrarPasoLog(log._id, "ProcesoService.crearCopiaProfundaPallets", "Completado");

                const GGN = have_lote_GGN_export(lote[0], contenedor[0])

                const palletSeleccionado = palletsModificados[pallet].EF1[seleccion];
                const copiaPalletSeleccionado = copiaPallet[pallet].EF1[seleccion];
                const kilos = Number(palletSeleccionado.tipoCaja.split('-')[1].replace(",", ".")) * palletSeleccionado.cajas
                palletsModificados[pallet].EF1.splice(seleccion, 1);
                const update = {
                    pallets: palletsModificados,
                    $inc: {
                        totalKilos: -kilos,
                        totalCajas: -palletSeleccionado.cajas,
                    }
                }

                await ContenedoresRepository.actualizar_contenedor({ _id }, update, { session }, log._id)
                await RecordModificacionesRepository.post_record_contenedor_modification(
                    action,
                    user,
                    { modelo: "Contenedor", documentoId: _id, descripcion: `Se eliminó el item ${seleccion} en el pallet ${pallet}`, },
                    copiaPallet[pallet],
                    palletsModificados[pallet],
                    { pallet, seleccion },
                    { session }
                )
                await ProcesoService.modificarLoteEliminarItemdesktopListaEmpaque(_id, palletSeleccionado, lote[0], kilos, GGN, user, log._id, session)
                await ProcesoService.modificarIndicadoresFecha(copiaPalletSeleccionado, -kilos, log._id, session)
            });

            await registrarPasoLog(log._id, "Promise.all", "Completado");

            procesoEventEmitter.emit("server_event", {
                action: "lista_empaque_update",
            });

        } catch (error) {
            console.error(`[ERROR][${new Date().toISOString()}]`, error);
            await ErrorProcesoLogicHandlers(error, log)
        } finally {
            await session.endSession();
            await registrarPasoLog(log._id, "Finalizo la funcion", "Completado");
        }
    }
    static async put_proceso_aplicaciones_listaEmpaque_eliminarItems(req) {
        const { user } = req;
        const { _id, pallet, seleccion, action } = req.data;

        let log

        const session = await db.Contenedores.db.startSession();

        log = await LogsRepository.create({
            user: user._id,
            action: action,
            acciones: [{ paso: "Inicio de la función", status: "Iniciado", timestamp: new Date() }]
        })
        try {

            await ProcesoValidations.put_proceso_aplicaciones_listaEmpaque_eliminarItems(req.data)
            await registrarPasoLog(log._id, "ProcesoValidations.put_proceso_aplicaciones_listaEmpaque_eliminarItems", "Completado");

            const logContext = { logId: log._id, user, action };

            await session.withTransaction(async () => {

                const items = await ProcesoService.eliminar_items_contenedor(seleccion, logContext, session);

                await ProcesoService.restar_kilos_lote(items, logContext, session);
                await ProcesoService.restar_kilos_lote_indicadores(items, logContext, session);
            });

            await registrarPasoLog(log._id, "Promise.all", "Completado");

            procesoEventEmitter.emit("server_event", {
                action: "lista_empaque_update",
            });
            procesoEventEmitter.emit("listaempaque_update");

            await registrarPasoLog(log._id, "Resumen", "Completado", `Eliminados ${seleccion.length} items del pallet ${pallet} del contenedor ${_id}`);

        } catch (error) {
            console.error(`[ERROR][${new Date().toISOString()}]`, error);
            await ErrorProcesoLogicHandlers(error, log)
        } finally {
            await session.endSession();
            await registrarPasoLog(log._id, "Finalizo la funcion", "Completado");
        }
    }
    static async put_proceso_aplicaciones_listaEmpaque_restarItem(req) {
        const { user } = req;
        const { action, _id, cajas } = req.data;

        let log

        const session = await db.Contenedores.db.startSession();

        log = await LogsRepository.create({
            user: user._id,
            action: action,
            acciones: [{ paso: "Inicio de la función", status: "Iniciado", timestamp: new Date() }]
        })
        try {

            ProcesoValidations.put_proceso_aplicaciones_listaEmpaque_restarItem(req.data)
            await registrarPasoLog(log._id, "ProcesoValidations.put_proceso_aplicaciones_listaEmpaque_restarItem", "Completado");

            const logContext = { logId: log._id, user, action };
            await session.withTransaction(async () => {

                const { itemPallet, contenedor, kilos } = await ProcesoService.restarItem_contenedor(_id, cajas, logContext, session);

                await ProcesoService.restarItem_lote(itemPallet, kilos, cajas, contenedor, logContext, session);
                await ProcesoService.modificarIndicadoresFecha(itemPallet, -kilos, logContext.logId);
            })

            procesoEventEmitter.emit("proceso_event", {});
            procesoEventEmitter.emit("listaempaque_update");

            await registrarPasoLog(log._id, "Resumen", "Completado", `Restados ${cajas} cajas del item ${_id}`);

        } catch (error) {
            console.error(`[ERROR][${new Date().toISOString()}]`, error);
            await ErrorProcesoLogicHandlers(error, log)
        } finally {
            await session.endSession();
            await registrarPasoLog(log._id, "Finalizo la funcion", "Completado");
        }
    }
    static async put_proceso_aplicaciones_listaEmpaque_moverItems(req) {
        const { user } = req
        const { seleccionado, contenedor2, cajas, action } = req.data;

        if (seleccionado.length !== 0 && contenedor2.pallet !== "" && cajas === 0) {
            await this.mover_item_entre_contenedores(seleccionado, contenedor2, action, user);
        }

        else if (seleccionado.length !== 0 && contenedor2.pallet !== "" && cajas !== 0) {
            await this.restar_mover_contenedor_contenedor(seleccionado, contenedor2, cajas, action, user)
        }

        procesoEventEmitter.emit("listaempaque_update");

    }
    static async mover_item_entre_contenedores(seleccionado, contenedor2, action, user) {
        let log

        const { _id: id2, pallet: pallet2 } = contenedor2

        const session = await db.Contenedores.db.startSession();

        log = await LogsRepository.create({
            user: user._id,
            action: action,
            acciones: [{ paso: "Inicio de la función", status: "Iniciado", timestamp: new Date() }]
        })
        try {

            await session.withTransaction(async () => {
                const contenedores = await ProcesoService.obtenerContenedorLotesModificar(contenedor2, session)
                await registrarPasoLog(log._id, "ProcesoService.obtenerContenedorLotesModificar", "Completado");

                if (contenedores.pallets < pallet2) {
                    throw new ProcessError(400, `El pallet ${pallet2} no existe en el contenedor ${id2}`);
                }

                const itemsPallet = await ContenedoresRepository.actualizar_palletItem(
                    { _ids: { $in: seleccionado } },
                    { contenedor: id2, pallet: pallet2 },
                    { session, user: user._id, action: action }
                );
                await registrarPasoLog(log._id, "ContenedoresRepository.actualizar_palletItem", "Completado");

                const lotesIds = [...new Set(itemsPallet.map(item => item.lote.toString()))];
                await LotesRepository.actualizar_lote(
                    { _id: { $in: lotesIds } },
                    { $addToSet: { "salidaExportacion.contenedores": id2 } },
                    { session, user: user._id, action: action }
                );
                await registrarPasoLog(log._id, "LotesRepository.actualizar_lote_items", "Completado");
            })

            procesoEventEmitter.emit("server_event", {
                action: "lista_empaque_update",
            });
            procesoEventEmitter.emit("listaempaque_update");

        } catch (error) {
            console.error(`[ERROR][${new Date().toISOString()}]`, error);
            await ErrorProcesoLogicHandlers(error, log)
        } finally {
            await session.endSession();
            await registrarPasoLog(log._id, "Finalizo la funcion", "Completado");
        }
    }
    static async restar_mover_contenedor_contenedor(contenedor1, contenedor2, cajas, action, user) {
        let log
        const { _id: id1, pallet: pallet1 } = contenedor1
        const { _id: id2, pallet: pallet2 } = contenedor2

        const session = await db.Contenedores.db.startSession();

        log = await LogsRepository.create({
            user: user._id,
            action: action,
            acciones: [{ paso: "Inicio de la función", status: "Iniciado", timestamp: new Date() }]
        })

        try {

            const logContext = { logId: log._id, user, action }
            if (id1 === id2 && pallet1 === pallet2) {
                throw new ProcessError(400, "No se puede mover ítems entre el mismo pallet")
            }

            await session.withTransaction(async () => {

                const { lotes, contenedores, index1, index2 } = await ProcesoService.obtenerContenedorLotesModificar(contenedor1, contenedor2, session)
                await registrarPasoLog(log._id, "ProcesoService.obtenerContenedorLotesModificar", "Completado");

                const seleccionOrdenado = contenedor1.seleccionado.sort((a, b) => b - a);

                //se crea una copa del pallet a modificar
                const [{ palletsModificados: palletsModificados1, copiaPallet: copiaPallets1 }, { palletsModificados: palletsModificados2, copiaPallet: copiaPallets2 }] = await Promise.all([
                    ProcesoService.crearCopiaProfundaPallets(contenedores[index1]),
                    ProcesoService.crearCopiaProfundaPallets(contenedores[index2])
                ]);
                await registrarPasoLog(log._id, "ProcesoService.crearCopiaProfundaPallets", "Completado");


                const itemSeleccionado = palletsModificados1[pallet1].EF1[seleccionOrdenado[0]];
                const newCajas = itemSeleccionado.cajas - cajas

                const oldGGN = have_lote_GGN_export(lotes[0], contenedores[index1], palletsModificados1)
                const GGN = have_lote_GGN_export(lotes[0], contenedores[index2], palletsModificados2)

                if (((oldGGN !== GGN) || !lotes[0].contenedores.includes(id2)) && lotes[0].finalizado) {
                    throw new ProcessError(400, `El lote ${lotes[0].enf} ya se encuentra finalizado, no se puede modificar`);
                }

                const kilos = cajas * Number(itemSeleccionado.tipoCaja.split('-')[1].replace(",", "."))

                await ProcesoService.restar_mover_modificar_contenedor(
                    contenedores, index1, index2, contenedor1, contenedor2,
                    seleccionOrdenado, palletsModificados1, palletsModificados2, copiaPallets1, copiaPallets2, newCajas, cajas, GGN, logContext, session
                )
                await ProcesoService.restar_mover_modificar_lote(
                    contenedores, index1, index2, itemSeleccionado, kilos, GGN, oldGGN, logContext, session
                )
            });

            procesoEventEmitter.emit("server_event", {
                action: "lista_empaque_update",
            });
            procesoEventEmitter.emit("listaempaque_update");

        } catch (err) {
            console.error(err)
            if (
                err.status === 610 ||
                err.status === 523
            ) {
                throw err
            }
            throw new ProcessError(470, `Error ${err.type}: ${err.message}`)
        }
    }
    static async put_proceso_aplicaciones_listaEmpaque_liberarPallet(req) {
        const { user } = req;
        const { _id, pallet, item, action } = req.data;
        let log

        const session = await db.Contenedores.db.startSession();

        log = await LogsRepository.create({
            user: user._id,
            action: action,
            acciones: [{ paso: "Inicio de la función", status: "Iniciado", timestamp: new Date() }]
        })
        try {

            const { rotulado, paletizado, enzunchado, estadoCajas, estiba } = item
            const query = {};

            await session.withTransaction(async () => {
                //se obtiene  el contenedor a modifiar
                const contenedor = await ContenedoresRepository.get_Contenedores_sin_lotes({
                    ids: [_id],
                    select: { infoContenedor: 1, pallets: 1 },
                    populate: {
                        path: 'infoContenedor.clienteInfo',
                        select: 'CLIENTE PAIS_DESTINO',
                    }
                }, { session });

                // Crear copia profunda de los pallets
                const palletsModificados = JSON.parse(JSON.stringify(contenedor[0].pallets));
                const palletSeleccionado = palletsModificados[pallet].listaLiberarPallet;

                Object.assign(palletSeleccionado, { rotulado, paletizado, enzunchado, estadoCajas, estiba });

                query.pallets = palletsModificados

                // Actualizar contenedor con pallets modificados
                await ContenedoresRepository.actualizar_contenedor(
                    { _id },
                    query,
                    { user: user._id, action: action, session: session }
                );

                // Registrar modificación
                await RecordModificacionesRepository.post_record_contenedor_modification(
                    action,
                    user,
                    {
                        modelo: "Contenedor",
                        documentoId: _id,
                        descripcion: `Se libero el pallet ${pallet}`,
                    },
                    contenedor[0].pallets[pallet],
                    palletSeleccionado,
                    { _id, pallet, item, action },
                    { session }
                );
            });

            procesoEventEmitter.emit("listaempaque_update");
        } catch (error) {
            console.error(`[ERROR][${new Date().toISOString()}]`, error);
            await ErrorProcesoLogicHandlers(error, log)
        } finally {
            await session.endSession();
            await registrarPasoLog(log._id, "Finalizo la funcion", "Completado");
        }
    }
    static async put_proceso_aplicaciones_listaEmpaque_modificarItems(req) {
        const { user } = req;
        const { _id, pallet, seleccion, data, action } = req.data;

        let log

        const session = await db.Contenedores.db.startSession();

        log = await LogsRepository.create({
            user: user._id,
            action: action,
            acciones: [{ paso: "Inicio de la función", status: "Iniciado", timestamp: new Date() }]
        })

        try {

            const logData = { logId: log._id, user: user, action: "put_proceso_aplicaciones_listaEmpaque_modificarItems" }

            await session.withTransaction(async () => {
                ProcesoValidations.put_proceso_aplicaciones_listaEmpaque_modificarItems(req.data)
                await registrarPasoLog(log._id, "ProcesoValidations.put_proceso_aplicaciones_listaEmpaque_modificarItems", "Completado");

                const { calidad, tipoCaja, calibre } = data
                //se obtiene  el contenedor a modifiar
                const { contenedor, lotes } = await ProcesoService.obtenerContenedorLotes(_id, pallet, seleccion, session);
                await registrarPasoLog(log._id, "ProcesoService.obtenerContenedorLotes", "Completado");

                const { palletsModificados, copiaPallet } = await ProcesoService.crearCopiaProfundaPallets(contenedor[0]);
                await registrarPasoLog(log._id, "ProcesoService.crearCopiaProfundaPallets", "Completado");

                lotes.forEach(lote => {
                    if (checkFinalizadoLote(lote)) {
                        throw new ProcessError(400, `El lote ${lote.enf} ya se encuentra finalizado, no se puede modificar`);
                    }
                })

                await ProcesoService.modificarPalletModificarItemsListaEmpaque(
                    palletsModificados, copiaPallet, pallet, seleccion, calidad, calibre, tipoCaja, _id, action, user, log._id, session
                )
                await ProcesoService.modificarLotesModificarItemsListaEmpaque(
                    lotes, copiaPallet, palletsModificados, seleccion, pallet, contenedor, logData, session
                )
                await ProcesoService.modificarIndicadorExportacion(palletsModificados, copiaPallet, seleccion, pallet)

            });

            procesoEventEmitter.emit("server_event", {
                action: "lista_empaque_update",
            });
            procesoEventEmitter.emit("listaempaque_update");


        } catch (error) {
            console.error(`[ERROR][${new Date().toISOString()}]`, error);
            await ErrorProcesoLogicHandlers(error, log)
        } finally {
            await session.endSession();
            await registrarPasoLog(log._id, "Finalizo la funcion", "Completado");
        }
    }
    static async put_proceso_aplicaciones_listaEmpaque_Cerrar(req) {
        const { user } = req;
        const { _id, action } = req.data;

        let log

        const session = await db.Contenedores.db.startSession();

        log = await LogsRepository.create({
            user: user._id,
            action: action,
            acciones: [{ paso: "Inicio de la función", status: "Iniciado", timestamp: new Date() }]
        })

        try {
            await session.withTransaction(async () => {
                const contenedor = await ContenedoresRepository.getContenedores({ ids: [_id] }, session);
                const lista = await insumos_contenedor(contenedor[0]);
                const listasAlias = Object.keys(lista);
                const idsInsumos = await InsumosRepository.get_insumos({
                    query: {
                        codigo: { $in: listasAlias },
                    }
                }, { session });
                const listaInsumos = {};
                idsInsumos.forEach(item => {
                    listaInsumos[`insumosData.${item._id.toString()}`] = lista[item.codigo]
                })
                await registrarPasoLog(log._id, "insumos_contenedor", "Completado");
                // Actualizar contenedor con pallets modificados
                const newContenedor = await ContenedoresRepository.actualizar_contenedor(
                    { _id },
                    {
                        ...listaInsumos,
                        'infoContenedor.cerrado': true,
                        'infoContenedor.fechaFinalizado': new Date(),
                    },
                    { user: user._id, action: action, session: session }
                );
                await registrarPasoLog(log._id, "ContenedoresRepository.actualizar_contenedor", "Completado");
                // Registrar modificación
                await RecordModificacionesRepository.post_record_contenedor_modification(
                    action,
                    user,
                    {
                        modelo: "Contenedor",
                        documentoId: _id,
                        descripcion: `Se cerro el contenedor ${contenedor[0].numeroContenedor}`,
                    },
                    contenedor[0],
                    newContenedor,
                    { _id, action },
                    { session }
                );
            });

            procesoEventEmitter.emit("listaempaque_update");

        } catch (error) {
            console.error(`[ERROR][${new Date().toISOString()}]`, error);
            await ErrorProcesoLogicHandlers(error, log)
        } finally {
            await session.endSession();
            await registrarPasoLog(log._id, "Finalizo la funcion", "Completado");
        }
    }
    static async put_proceso_add_pallet_listaempaque(req) {
        const { user } = req;
        const { _id, action } = req.data;
        let log
        const auditBase = {
            user: user?._id?.toString() || String(user),
            action,
            description: `Alta de pallet y actualización de contador en contenedor ${_id}`
        };
        const session = await db.Contenedores.db.startSession();
        log = await LogsRepository.create({
            user: user._id,
            action: action,
            acciones: [{ paso: "Inicio de la función", status: "Iniciado", timestamp: new Date() }]
        })
        try {
            await session.withTransaction(async () => {
                const contenedor = await ContenedoresRepository.getContenedores({ ids: [_id], select: { pallets: 1 } }, session);
                if (!contenedor || contenedor.length === 0) {
                    throw new ProcessError(404, "Contenedor no encontrado");
                }
                const newItem = {
                    numeroPallet: contenedor[0].pallets + 1,
                    contenedor: _id,
                    tipoCaja: "",
                    calidad: "68e5419d9721bda0cbad8ca2",
                    calibre: "",
                    estado: 'abierto',
                    user: user._id,
                }
                await ContenedoresRepository.addPallet(newItem, {
                    session,
                    $audit: {
                        ...auditBase,
                        description: `Creación de Pallet #${newItem.numeroPallet} en contenedor ${_id}`
                    }
                });
                await ContenedoresRepository.actualizar_contenedor(
                    { _id },
                    { $inc: { pallets: 1 } },
                    {
                        session,
                        skipAudit: true
                    }
                );
            });


            procesoEventEmitter.emit("listaempaque_update");

        } catch (error) {
            console.error(`[ERROR][${new Date().toISOString()}]`, error);
            await ErrorProcesoLogicHandlers(error, log)
        } finally {
            await session.endSession();
            await registrarPasoLog(log._id, "Finalizo la funcion", "Completado");
        }

    }
    //#endregion

    static async getInventario() {

        //JS SERVER

        const inventario = await VariablesDelSistema.getInventario();
        const inventarioKeys = Object.keys(inventario)

        const lotes = await LotesRepository.getLotes({
            ids: inventarioKeys,
            select: {
                __v: 1,
                clasificacionCalidad: 1,
                nombrePredio: 1,
                fecha_ingreso_patio: 1,
                fecha_salida_patio: 1,
                fecha_ingreso_inventario: 1,
                fecha_creacion: 1,
                fecha_estimada_llegada: 1,
                observaciones: 1,
                tipoFruta: 1,
                promedio: 1,
                enf: 1,
                kilosVaciados: 1,
                not_pass: 1
            }
        });

        // se agrega las canastillas en inventario
        const resultado = inventarioKeys.map(id => {
            const lote = lotes.find(lote => lote._id.toString() === id.toString());

            if (lote) {
                return {
                    ...lote.toObject(),
                    inventario: inventario[id]
                }
            }
            return null
        }).filter(item => item !== null);

        const query_lotes_camino = {
            fecha_ingreso_inventario: { $exists: false },
            fechaIngreso: { $exists: false },
        }

        const lotes_camino = await LotesRepository.getLotes({
            query: query_lotes_camino,
            select: {
                fecha_ingreso_patio: 1,
                fecha_salida_patio: 1,
                fecha_ingreso_inventario: 1,
                fecha_creacion: 1,
                fecha_estimada_llegada: 1,
                __v: 1,
                clasificacionCalidad: 1,
                nombrePredio: 1,
                observaciones: 1,
                tipoFruta: 1,
                kilosVaciados: 1,
                kilos_estimados: 1,
                canastillas_estimadas: 1
            }
        })

        return [...resultado, ...lotes_camino]
    }
    static async obtener_historial_decarte_lavado_proceso(user) {
        const recordLotes = await RecordLotesRepository.getRecordLotes({
            query: {
                operacionRealizada: 'ingresar_descarte_lavado',
            },
            user: user
        })
        const lotesIds = recordLotes.map(lote => lote.documento._id);
        const lotes = await LotesRepository.getLotes({
            ids: lotesIds,
            select: { enf: 1, promedio: 1, tipoFruta: 1 }
        });
        const resultado = recordLotes.map(item => {
            const lote = lotes.find(lote => lote._id.toString() === item.documento._id);
            if (lote) {
                if (Object.prototype.hasOwnProperty.call(item.documento, "$inc")) {
                    item.documento = { ...lote, descartes: item.documento.$inc }
                    return (item)
                }
                else {
                    return item
                }

            }
            return null
        }).filter(item => item !== null);

        return resultado
    }
    static async obtener_historial_decarte_encerado_proceso(user) {
        const recordLotes = await RecordLotesRepository.getRecordLotes({
            user: user,
            query: {
                operacionRealizada: 'ingresar_descarte_encerado'
            }
        })
        const lotesIds = recordLotes.map(lote => lote.documento._id);
        const lotes = await LotesRepository.getLotes({
            ids: lotesIds,
            select: { enf: 1, promedio: 1, tipoFruta: 1 }
        });
        const resultado = recordLotes.map(item => {
            const lote = lotes.find(lote => lote._id.toString() === item.documento._id);
            if (lote) {
                if (Object.prototype.hasOwnProperty.call(item.documento, "$inc")) {
                    item.documento = { ...lote, descartes: item.documento.$inc }
                    return (item)
                }
                else {
                    return item
                }

            }
            return null
        }).filter(item => item !== null);
        return resultado
    }
    static async obtener_historial_fotos_calidad_proceso(user) {
        const recordLotes = await RecordLotesRepository.getRecordLotes({
            user: user,
            query: {
                operacionRealizada: 'Agregar foto calidad'
            }

        });
        const lotesIds = recordLotes.map(lote => lote.documento._id);
        const lotes = await LotesRepository.getLotes({
            ids: lotesIds,
            select: { enf: 1, tipoFruta: 1 }
        });
        const resultado = recordLotes.map(item => {
            const lote = lotes.find(lote => lote._id.toString() === item.documento._id);
            if (lote) {
                return { ...item._doc, lote: lote }
            }
            return null
        }).filter(item => item !== null);
        return resultado
    }
    static async obtener_foto_calidad(url) {
        const data = fs.readFileSync(url)
        const base64Image = data.toString('base64');
        return base64Image
    }
    static async get_record_lote_recepcion_pendiente(req) {
        const { page } = req
        const resultsPerPage = 50;
        const query = {
            operacionRealizada: 'lote_recepcion_pendiente'
        }
        const registros = await RecordLotesRepository.getRecordLotes({
            skip: (page - 1) * resultsPerPage,
            limit: resultsPerPage,
            query: query
        })

        const lotesArrIds = registros.map(lote => lote.documento._id)
        const lotesSetIds = new Set(lotesArrIds)
        const ids = [...lotesSetIds]

        const lotes = await LotesRepository.getLotes({
            ids: ids,
            select: { tipoFruta: 1, placa: 1, observaciones: 1 }
        })
        const result = registros.map(registro => {
            const lote = lotes.find(item => item._id.toString() === registro.documento._id)

            return {
                ...registro._doc,
                documento: {
                    ...registro.documento,
                    predio: {
                        ...lote.predio._doc
                    },
                    tipoFruta: lote.tipoFruta,
                    placa: lote.placa,
                    observaciones: lote.observaciones
                }
            }
        })
        return result
    }
    static async get_record_lote_ingreso_inventario(req) {
        const { page } = req
        const resultsPerPage = 50;
        const query = {
            operacionRealizada: 'send_lote_to_inventario'
        }
        const registros = await RecordLotesRepository.getRecordLotes({
            skip: (page - 1) * resultsPerPage,
            limit: resultsPerPage,
            query: query
        })

        const lotesArrIds = registros.map(lote => lote.documento._id)
        const lotesSetIds = new Set(lotesArrIds)
        const ids = [...lotesSetIds]

        const lotes = await LotesRepository.getLotes({
            ids: ids,
            select: {
                tipoFruta: 1,
            }
        })
        const result = registros.map(registro => {
            const lote = lotes.find(item => item._id.toString() === registro.documento._id)

            return {
                ...registro._doc,
                documento: {
                    ...registro.documento,
                    predio: {
                        ...lote.predio._doc
                    },
                    tipoFruta: lote.tipoFruta,
                }
            }
        })
        return result
    }
    static async obtener_status_proceso() {
        const status = await VariablesDelSistema.obtener_status_proceso()
        return status
    }
    static async get_status_pausa_proceso() {
        const status = VariablesDelSistema.get_status_pausa_proceso()
        return status
    }
    static async obtener_predio_procesando() {
        const predio = await VariablesDelSistema.obtener_predio_procesando()
        return predio
    }
    static async obtenerHistorialLotes(data) {
        try {

            const { fechaInicio, fechaFin } = data
            let query = {
                operacionRealizada: 'vaciarLote'
            }

            query = filtroFechaInicioFin(fechaInicio, fechaFin, query, 'fecha')

            const recordLotes = await RecordLotesRepository.getVaciadoRecord({ query: query })
            const lotesIds = recordLotes.map(lote => lote.documento._id);

            const lotes = await LotesRepository.getLotes({
                ids: lotesIds,
                limit: recordLotes.length,
                select: { enf: 1, promedio: 1, tipoFruta: 1, __v: 1 }
            });
            const resultado = recordLotes.map(item => {
                const lote = lotes.find(lote => lote._id.toString() === item.documento._id);
                if (lote) {
                    if (Object.prototype.hasOwnProperty.call(item.documento, "$inc")) {
                        item.documento = { ...lote, kilosVaciados: item.documento.$inc.kilosVaciados }
                        return (item)
                    }
                    else {
                        return item
                    }
                }
                return null
            }).filter(item => item !== null);
            return resultado
        } catch (err) {
            if (err.status === 522) {
                throw err
            }
            throw new InventariosLogicError(470, `Error ${err.type}: ${err.message}`)
        }
    }
    //! obtener el numero de elementos para paginacion

    static async obtener_cantidad_historial_espera_descargue() {
        const filtro = {
            operacionRealizada: "lote_recepcion_pendiente"
        }
        const cantidad = await RecordLotesRepository.obtener_cantidad_recordLote(filtro)
        return cantidad
    }
    static async obtener_cantidad_historial_ingreso_inventario() {
        const filtro = {
            operacionRealizada: "send_lote_to_inventario"
        }
        const cantidad = await RecordLotesRepository.obtener_cantidad_recordLote(filtro)
        return cantidad
    }


    //#endregion

    //#region registros trazabilidad
    static async get_proceso_registros_trazabilidad_ef1(req) {
        try {
            const { data } = req
            const { filtro } = data
            const { EF } = filtro
            const lote = await LotesRepository.getLotes({ query: { enf: EF } })
            if (lote.length === 0) {
                throw new ProcessError(400, "No se encontro el lote")
            }
            const query = {
                documentId: lote[0]._id
            }
            const registros = await RecordLotesRepository.getAuditLogsEf1({ query: query })

            await ProcesoService.obtenerUsuariosRegistrosTrazabilidadEf1(registros)
            return registros
        } catch (error) {
            if (
                error.status === 610 ||
                error.status === 523 ||
                error.status === 522
            ) {
                throw error
            }
            throw new ProcessError(470, `Error ${error.type}: ${error.message}`)
        }
    }
    // #endregion

    // #region PUT
    static async lote_recepcion_pendiente(req) {
        const { user, data } = req

        const { _id } = data
        const query = {
            fecha_ingreso_patio: new Date(),
        }
        await LotesRepository.modificar_lote_proceso(_id, query, 'lote_recepcion_pendiente', user)
        procesoEventEmitter.emit("inventario_fruta_sin_procesar", {});
    }
    static async send_lote_to_inventario(req) {
        const { user, data } = req

        const { _id, data: datos } = data
        const enf = await this.get_ef1()

        const query = {
            ...datos,
            enf: enf,
            fecha_salida_patio: new Date(),
            fecha_ingreso_inventario: new Date(),
        }
        const lote = await LotesRepository.modificar_lote_proceso(_id, query, 'send_lote_to_inventario', user.user)

        await VariablesDelSistema.ingresarInventario(lote._id.toString(), Number(datos.canastillas));
        await VariablesDelSistema.incrementarEF1();

        procesoEventEmitter.emit("inventario_fruta_sin_procesar", {});
    }
    static async modificar_historial_fechas_en_patio(data, user) {
        try {
            const { fecha_ingreso_patio, _id, __v, lote, action } = data
            let query = {
                "documento.fecha_ingreso_patio": new Date(fecha_ingreso_patio)
            }

            await RecordLotesRepository.modificarRecord(_id, query, __v)

            query = {
                fecha_ingreso_patio: new Date(fecha_ingreso_patio)
            }
            await LotesRepository.modificar_lote_proceso(lote, query, action, user.user)
        } catch (err) {
            throw new Error(`Error en modificar_historial_fechas_en_patio: ${err.message}`)
        }

    }
    static async modificar_historial_lote_ingreso_inventario(data, user) {
        try {
            const { query, lote, action } = data

            if (Number(query.canastillas) === 0) {
                throw new Error("Error, modificar_historial_lote_ingreso_inventario, canastillas estan en cero")
            }
            const promedio = Number(query.kilos) / Number(query.canastillas)

            query.promedio = promedio

            let queryModificar = {}
            Object.entries(query).forEach(([key, value]) => {
                if (key === "fecha_salida_patio") {
                    queryModificar[`documento.${key}`] = new Date(value)
                    queryModificar[`documento.fecha_ingreso_inventario`] = new Date(value)
                } else {
                    queryModificar[`documento.${key}`] = value
                }
            })

            await LotesRepository.actualizar_lote(
                { _id: lote },
                query,
                { new: true, user: user, action: action }
            );

            await VariablesDelSistema.ingresarInventario(lote, Number(query.canastillas));



        } catch (err) {
            throw new Error(`Error en modificar_historial_lote_ingreso_inventario: ${err.message}`)
        }

    }
    static async set_hora_pausa_proceso() {
        await VariablesDelSistema.set_hora_pausa_proceso();
        procesoEventEmitter.emit("status_proceso", {
            status: "pause"
        });
    }
    static async sp32_funcionamiento_maquina(data) {
        let estado_maquina = false
        const status_proceso = await VariablesDelSistema.obtener_status_proceso()
        if (Number(data) >= 1925) {
            estado_maquina = true
        }
        //al inicio maquina apagada, status off
        if (estado_maquina && status_proceso === 'off') {
            await VariablesDelSistema.set_hora_inicio_proceso();

            //se prende la maquina , continua el proceso
        } else if (estado_maquina && status_proceso === 'pause') {
            //se reanuda el proces cuando se prende la maquina
            await VariablesDelSistema.set_hora_reanudar_proceso();
            //se pausa la maquina
        } else if (!estado_maquina && status_proceso === 'on') {
            await VariablesDelSistema.set_hora_pausa_proceso()
        }

        const new_status_proceso = await VariablesDelSistema.obtener_status_proceso()

        procesoEventEmitter.emit("status_proceso", {
            status: new_status_proceso
        });
    }
    //? lista de empaque

    //#endregion

}
