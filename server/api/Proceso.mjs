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
import { z } from "zod";
import { RedisRepository } from "../Class/RedisData.js";
import { dirname } from 'path';
import { fileURLToPath } from 'url';
import { LogsRepository } from "../Class/LogsSistema.js";
import { registrarPasoLog } from "./helper/logs.js";
import { checkFinalizadoLote } from "./utils/lotesFunctions.js";
import { getColombiaDate } from "./utils/fechas.js";

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
    /**
     * Actualiza el descarte por lavado de un lote.
     * 
     * Este método incrementa los valores de descarteLavado en el lote correspondiente según los datos recibidos,
     * actualiza la versión del documento, realiza la deshidratación del lote, modifica el inventario de descarte,
     * y registra los kilos procesados en las variables del sistema. Finalmente, emite un evento de proceso.
     * 
     * @async
     * @param {Object} req - Objeto de solicitud que contiene la información del usuario y los datos a actualizar.
     * @param {Object} req.user - Usuario que realiza la acción.
     * @param {Object} req.data - Datos de la operación.
     * @param {string} req.data._id - ID del lote a modificar.
     * @param {Object} req.data.data - Objeto con los valores a incrementar en descarteLavado.
     * @param {string} req.data.action - Descripción de la acción para auditoría.
     * @throws {ProcessError} Si ocurre un error durante el proceso.
     */
    static async put_proceso_aplicaciones_descarteLavado(req) {
        const { user } = req;
        let log
        try {
            log = await LogsRepository.create({
                user: user._id,
                action: "put_proceso_aplicaciones_descarteLavado",
                acciones: [{ paso: "Inicio de la función", status: "Iniciado", timestamp: new Date() }]
            })
            const logData = { logId: log._id, user: user, action: "put_proceso_aplicaciones_descarteLavado" }

            ProcesoValidations.put_proceso_aplicaciones_descarteLavado().parse(req.data)
            await registrarPasoLog(log._id, "ProcesoValidations.put_proceso_aplicaciones_descarteLavado", "Completado");

            const { _id, data, action } = req.data;
            const keys = Object.keys(data);
            const query = { $inc: {} };
            let kilos = 0;
            for (let i = 0; i < keys.length; i++) {
                query.$inc[`descarteLavado.${keys[i]}`] = Math.round(data[keys[i]]);
                kilos += Math.round(data[keys[i]]);
            }

            const lote = await ProcesoService.modificarLotedescartes(_id, query, user, action)
            await registrarPasoLog(log._id, "ProcesoService.modificarLotedescartes", "Completado", `Lote ID: ${_id}, Kilos: ${kilos}`);

            await Promise.all([
                RedisRepository.put_inventarioDescarte(data, 'descarteLavado:', lote.tipoFruta.tipoFruta, logData),
                VariablesDelSistema.sumarMetricaSimpleAsync("kilosProcesadosHoy", lote.tipoFruta.tipoFruta, kilos, logData.logId),
                LogsRepository.createReporteIngresoDescarte({
                    user: user.user,
                    userID: user._id,
                    loteID: lote._id,
                    enf: lote.enf,
                    tipoFruta: lote.tipoFruta.tipoFruta,
                    descarteEncerado: {},
                    descarteLavado: data
                }, log._id)
            ])
            await registrarPasoLog(log._id, "Promise.all", "Completado");

            procesoEventEmitter.emit("server_event", {
                action: "descarte_change",
                data: {}
            });
        } catch (err) {
            await registrarPasoLog(log._id, "Error", "Errado", err.message);

            const criticalStatus = new Set([523, 515, 518, 532, 400]);
            if (err && criticalStatus.has(err.status)) {
                throw err;
            }
            if (err instanceof z.ZodError) {
                const errores = err.errors.map(e => `${e.path[0]}: ${e.message}`).join(" | ")
                throw new ProcessError(470, `Error de validación: ${errores}`)
            }
            throw new ProcessError(470, `Error ${err.type}: ${err.message}`)
        } finally {
            await registrarPasoLog(log._id, "Finalizo la funcion", "Completado");
        }
    }
    /**
     * Actualiza el descarte por Encerado de un lote.
     * 
     * Este método incrementa los valores de descarteEncerado en el lote correspondiente según los datos recibidos,
     * actualiza la versión del documento, realiza la deshidratación del lote, modifica el inventario de descarte,
     * y registra los kilos procesados en las variables del sistema. Finalmente, emite un evento de proceso.
     * 
     * @async
     * @param {Object} req - Objeto de solicitud que contiene la información del usuario y los datos a actualizar.
     * @param {Object} req.user - Usuario que realiza la acción.
     * @param {Object} req.data - Datos de la operación.
     * @param {string} req.data._id - ID del lote a modificar.
     * @param {Object} req.data.data - Objeto con los valores a incrementar en descarteEncerado.
     * @param {string} req.data.action - Descripción de la acción para auditoría.
     * @throws {ProcessError} Si ocurre un error durante el proceso.
     */
    static async put_proceso_aplicaciones_descarteEncerado(req) {

        const { user } = req;
        let log
        try {
            log = await LogsRepository.create({
                user: user._id,
                action: "put_proceso_aplicaciones_descarteEncerado",
                acciones: [{ paso: "Inicio de la función", status: "Iniciado", timestamp: new Date() }]
            })
            const logData = { logId: log._id, user: user, action: "put_proceso_aplicaciones_descarteEncerado" }

            ProcesoValidations.put_proceso_aplicaciones_descarteEncerado().parse(req.data)
            await registrarPasoLog(log._id, "ProcesoValidations.put_proceso_aplicaciones_descarteEncerado", "Completado");

            const { _id, data, action } = req.data;

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

            const lote = await ProcesoService.modificarLotedescartes(_id, query, user, action)
            await registrarPasoLog(log._id, "ProcesoService.modificarLotedescartes", "Completado", `Lote ID: ${_id}, Kilos: ${kilos}`);

            await Promise.all([
                RedisRepository.put_inventarioDescarte(data, 'descarteEncerado:', lote.tipoFruta.tipoFruta, logData),
                VariablesDelSistema.sumarMetricaSimpleAsync("kilosProcesadosHoy", lote.tipoFruta.tipoFruta, kilos, logData.logId),
                LogsRepository.createReporteIngresoDescarte({
                    user: user.user,
                    userID: user._id,
                    loteID: lote._id,
                    enf: lote.enf,
                    tipoFruta: lote.tipoFruta.tipoFruta,
                    descarteLavado: {},
                    descarteEncerado: data
                }, logData.logId)
            ])
            await registrarPasoLog(log._id, "Promise.all", "Completado");

            procesoEventEmitter.emit("server_event", {
                action: "descarte_change",
                data: {}
            });
        } catch (err) {
            await registrarPasoLog(log._id, "Error", "Errado", err.message);
            const criticalStatus = new Set([523, 515, 518, 532, 400]);
            if (err && criticalStatus.has(err.status)) {
                throw err;
            }
            if (err instanceof z.ZodError) {
                const errores = err.errors.map(e => `${e.path[0]}: ${e.message}`).join(" | ")
                throw new ProcessError(470, `Error de validación: ${errores}`)
            }
            throw new ProcessError(470, `Error ${err.type}: ${err.message}`)
        } finally {
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
        try {
            const { user } = req;
            const { _id, pallet, settings, action, itemCalidad } = req.data;
            const { tipoCaja, calidad, calibre } = settings;

            const query = {}

            //se obtiene  el contenedor a modifiar
            const contenedor = await ContenedoresRepository.get_Contenedores_sin_lotes({
                ids: [_id],
                select: { infoContenedor: 1, pallets: 1 },
                populate: {
                    path: 'infoContenedor.clienteInfo',
                    select: 'CLIENTE PAIS_DESTINO',
                }
            });

            // Crear copia profunda de los pallets
            const palletsModificados = JSON.parse(JSON.stringify(contenedor[0].pallets));
            const palletSeleccionado = palletsModificados[pallet].settings;
            const palletSeleccionadoComp = palletsModificados[pallet].listaLiberarPallet;

            Object.assign(palletSeleccionado, { calidad, calibre, tipoCaja });
            Object.assign(palletSeleccionadoComp, { ...itemCalidad });

            query.pallets = palletsModificados

            //se mira si es la primera moficiacion para agregar la fecha de inicio
            if (!Object.prototype.hasOwnProperty.call(
                contenedor[0].infoContenedor, "fechaInicioReal"
            )) {
                query["infoContenedor.fechaInicioReal"] = new Date();
            }

            console.log("query", query.pallets[pallet]);

            // Actualizar contenedor con pallets modificados
            await ContenedoresRepository.actualizar_contenedor(
                { _id },
                query
            );

            // Registrar modificación
            await RecordModificacionesRepository.post_record_contenedor_modification(
                action,
                user,
                {
                    modelo: "Contenedor",
                    documentoId: _id,
                    descripcion: `Se configuró el pallet ${pallet}`,
                },
                contenedor[0].pallets[pallet],
                palletSeleccionado,
                { _id, pallet, settings, action }
            );


            procesoEventEmitter.emit("listaempaque_update");
        } catch (err) {
            if (
                err.status === 522 ||
                err.status === 523 ||
                err.status === 423 ||
                err.status === 610

            ) {
                throw err
            }
            throw new ProcessError(470, `${err.type}: ${err.message}`)
        }
    }
    static async put_proceso_aplicaciones_listaEmpaque_agregarItem(req) {
        const { user } = req;
        let log
        try {
            log = await LogsRepository.create({
                user: user,
                action: "put_proceso_aplicaciones_listaEmpaque_agregarItem",
                acciones: [{ paso: "Inicio de la función", status: "Iniciado", timestamp: new Date() }]
            })
            const logData = { logId: log._id, user: user, action: "put_proceso_aplicaciones_listaEmpaque_agregarItem" }
            await ProcesoValidations.put_proceso_aplicaciones_listaEmpaque_agregarItem(req.data)
            await registrarPasoLog(log._id, "Validación de datos completada", "Completado");

            const { _id, pallet, item } = req.data;
            const { lote, calidad, tipoFruta, calibre, cajas, tipoCaja } = item

            const { contenedor, lotes } = await ProcesoService.getContenedorAndLote(lote, _id);

            if (checkFinalizadoLote(lotes[0])) {
                throw new ProcessError(400, `El lote ${lotes[0].enf} ya se encuentra finalizado, no se puede modificar`);
            }

            const GGN = have_lote_GGN_export(lotes[0], contenedor[0], item)
            await registrarPasoLog(log._id, "Revisa si tiene GGN", "Completado", `Tiene GGN: ${GGN}`);

            const kilos = Number(tipoCaja.split('-')[1].replace(",", ".")) * cajas
            const { palletsModificados, copiaPallet } = await ProcesoService.crearCopiaProfundaPallets(contenedor[0]);
            await registrarPasoLog(log._id, "ProcesoService.crearCopiaProfundaPallets", "Completado");

            await Promise.all([
                ProcesoService.modificarLoteListaEmpaqueAddItem(calidad, kilos, lotes[0], _id, GGN, logData),
                ProcesoService.modifiarContenedorPalletsListaEmpaque(lotes, palletsModificados, copiaPallet, pallet, item, _id, GGN, logData),
                ProcesoService.ingresarDataExportacionDiaria(tipoFruta, calidad, calibre, kilos, logData)
            ])
            await registrarPasoLog(log._id, "LotesRepository.modificar_lote_proceso - ProcesoService.ingresarDataExportacionDiaria", "Completado");

            procesoEventEmitter.emit("server_event", {
                action: "lista_empaque_update",
            });
            procesoEventEmitter.emit("listaempaque_update");

        } catch (err) {
            console.log(err)
            await registrarPasoLog(log._id, "Error", "Fallido", err.message);

            if (
                err.status === 610 ||
                err.status === 523 ||
                err.status === 400
            ) {
                throw err
            }
            throw new ProcessError(470, `Error ${err.type}: ${err.message}`)
        } finally {
            await registrarPasoLog(log._id, "Finalizo la funcion", "Completado");
        }
    }
    static async put_proceso_aplicaciones_listaEmpaque_modificarItem_desktop(req) {
        const { user } = req
        let log
        try {
            log = await LogsRepository.create({
                user: user._id,
                action: "put_proceso_aplicaciones_listaEmpaque_modificarItem_desktop",
                acciones: [{ paso: "Inicio de la función", status: "Iniciado", timestamp: new Date() }]
            })
            const logData = { logId: log._id, user: user, action: "put_proceso_aplicaciones_listaEmpaque_modificarItem_desktop" }
            ProcesoValidations.put_proceso_aplicaciones_listaEmpaque_modificarItem_desktop().parse(req.data)
            await registrarPasoLog(log._id, "Validación de datos completada", "Completado");

            const { _id, pallet, seleccion, data } = req.data
            const { calidad, calibre, cajas, tipoCaja } = data

            const { contenedor, lote } = await ProcesoService.obtenerContenedorLote(_id, pallet, seleccion);
            await registrarPasoLog(log._id, "ProcesoService.obtenerContenedorLote", "Completado", `Contenedor: ${_id}, Pallet: ${pallet}, Selección: ${seleccion} - Lote: ${lote._id}`);

            const palletSeleccionadoComp = contenedor[0].pallets[pallet].get("EF1")[seleccion];

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

            await Promise.all([
                ProcesoService.modificarContenedorModificarItemListaEmpaque(palletsModificados, palletSeleccionado, newKilos, copiaPallet, req.data, logData),
                ProcesoService.modificarLoteModificarItemListaEmpaque(_id, oldKilos, newKilos, oldData.calidad, calidad, lote[0], GGN, logData)
            ]);

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
                Promise.all([
                    ProcesoService.ingresarDataExportacionDiaria(palletSeleccionado.tipoFruta, oldData.calidad, oldData.calibre, -oldKilos, logData),
                    ProcesoService.ingresarDataExportacionDiaria(palletSeleccionado.tipoFruta, calidad, calibre, newKilos, logData)
                ])
            }

            procesoEventEmitter.emit("server_event", {
                action: "lista_empaque_update",
            });

        } catch (err) {
            console.log(err)
            await registrarPasoLog(log._id, "Error", "Fallido", err.message);
            if (
                err.status === 610 ||
                err.status === 523
            ) {
                throw err
            }
            throw new ProcessError(470, `Error ${err.type}: ${err.message}`)
        } finally {
            await registrarPasoLog(log._id, "Finalizo la funcion", "Completado");
        }
    }
    static async put_proceso_aplicaciones_listaEmpaque_eliminarItem_desktop(req) {
        const { user } = req;
        let log
        try {
            log = await LogsRepository.create({
                user: user._id,
                action: "put_proceso_aplicaciones_listaEmpaque_eliminarItem_desktop",
                acciones: [{ paso: "Inicio de la función", status: "Iniciado", timestamp: new Date() }]
            })
            const { _id, pallet, seleccion, action } = req.data
            const { contenedor, lote } = await ProcesoService.obtenerContenedorLote(_id, pallet, seleccion);
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

            await Promise.all([
                ContenedoresRepository.actualizar_contenedor({ _id }, { pallets: palletsModificados }, log._id),
                RecordModificacionesRepository.post_record_contenedor_modification(
                    action,
                    user,
                    { modelo: "Contenedor", documentoId: _id, descripcion: `Se eliminó el item ${seleccion} en el pallet ${pallet}`, },
                    copiaPallet[pallet],
                    palletsModificados[pallet],
                    { pallet, seleccion }
                ),
                ProcesoService.modificarLoteEliminarItemdesktopListaEmpaque(_id, palletSeleccionado, lote[0], kilos, GGN, user, log._id),
                ProcesoService.modificarIndicadoresFecha(copiaPalletSeleccionado, -kilos, log._id)
            ])
            await registrarPasoLog(log._id, "Promise.all", "Completado");

            procesoEventEmitter.emit("server_event", {
                action: "lista_empaque_update",
            });

        } catch (err) {
            await registrarPasoLog(log._id, "Error", "Fallido", err.message);
            if (
                err.status === 610 ||
                err.status === 523 ||
                err.status === 522
            ) {
                throw err
            }
            throw new ProcessError(470, `Error ${err.type}: ${err.message}`)
        } finally {
            await registrarPasoLog(log._id, "Finalizo la funcion", "Completado");
        }
    }
    static async put_proceso_aplicaciones_listaEmpaque_eliminarItems(req) {
        const { user } = req;
        let log
        try {
            log = await LogsRepository.create({
                user: user._id,
                action: "put_proceso_aplicaciones_listaEmpaque_eliminarItems",
                acciones: [{ paso: "Inicio de la función", status: "Iniciado", timestamp: new Date() }]
            })

            await ProcesoValidations.put_proceso_aplicaciones_listaEmpaque_eliminarItems(req.data)
            await registrarPasoLog(log._id, "ProcesoValidations.put_proceso_aplicaciones_listaEmpaque_eliminarItems", "Completado");

            const { _id, pallet, seleccion, action } = req.data;
            const logContext = { logId: log._id, user, action };

            const seleccionOrdenado = [...seleccion].sort((a, b) => b - a);

            const { contenedor, lotes, itemsDelete } = await ProcesoService.obtenerContenedorLotes(_id, pallet, seleccionOrdenado);
            await registrarPasoLog(log._id, "ProcesoValidations.obtenerContenedorLotes", "Completado");

            lotes.forEach(lote => {
                if (checkFinalizadoLote(lote)) {
                    throw new ProcessError(400, `El lote ${lote.enf} ya se encuentra finalizado, no se puede modificar`);
                }
            })
            const { palletsModificados, copiaPallet } = await ProcesoService.crearCopiaProfundaPallets(contenedor[0]);
            await registrarPasoLog(log._id, "ProcesoService.crearCopiaProfundaPallets", "Completado");

            //objeto con los datos de los lotes viejos
            await Promise.all([
                ProcesoService.eliminar_items_contenedor(contenedor[0], palletsModificados, copiaPallet, seleccionOrdenado, pallet, logContext),
                ProcesoService.restar_kilos_lote(lotes, itemsDelete, contenedor, logContext),
                ProcesoService.restar_kilos_lote_indicadores(itemsDelete, logContext)
            ])
            await registrarPasoLog(log._id, "Promise.all", "Completado");

            procesoEventEmitter.emit("server_event", {
                action: "lista_empaque_update",
            });
            procesoEventEmitter.emit("listaempaque_update");

            await registrarPasoLog(log._id, "Resumen", "Completado", `Eliminados ${seleccion.length} items del pallet ${pallet} del contenedor ${_id}`);

        } catch (err) {
            await registrarPasoLog(log._id, "Error", "Fallido", err.message);
            if (
                err.status === 610 ||
                err.status === 523 ||
                err.status === 522
            ) {
                throw err
            }
            throw new ProcessError(470, `Error ${err.type}: ${err.message}`)
        } finally {
            await registrarPasoLog(log._id, "Finalizo la funcion", "Completado");
        }
    }
    static async put_proceso_aplicaciones_listaEmpaque_restarItem(req) {
        let log
        try {
            const { user } = req;
            log = await LogsRepository.create({
                user: user._id,
                action: "put_proceso_aplicaciones_listaEmpaque_restarItem",
                acciones: [{ paso: "Inicio de la función", status: "Iniciado", timestamp: new Date() }]
            })

            ProcesoValidations.put_proceso_aplicaciones_listaEmpaque_restarItem(req.data)
            await registrarPasoLog(log._id, "ProcesoValidations.put_proceso_aplicaciones_listaEmpaque_restarItem", "Completado");

            const { action, _id, pallet, seleccion, cajas } = req.data;
            const logContext = { logId: log._id, user, action };

            //se obtienen los datos
            const { contenedor, lote } = await ProcesoService.obtenerContenedorLote(_id, pallet, seleccion);
            await registrarPasoLog(log._id, "ProcesoService.obtenerContenedorLote", "Completado", `Contenedor: ${_id}, Pallet: ${pallet}, Selección: ${seleccion} - Lote: ${lote[0]._id}`);

            if (checkFinalizadoLote(lote[0])) {
                throw new ProcessError(400, `El lote ${lote[0].enf} ya se encuentra finalizado, no se puede modificar`);
            }

            //se copian
            const { palletsModificados, copiaPallet } = await ProcesoService.crearCopiaProfundaPallets(contenedor[0]);
            await registrarPasoLog(log._id, "ProcesoService.crearCopiaProfundaPallets", "Completado");

            //se preparan los datos
            const copiaPalletSeleccionado = copiaPallet[pallet].EF1[seleccion];
            const copiaItemSeleccionado = palletsModificados[pallet].EF1[seleccion]
            const kilos = Number(copiaItemSeleccionado.tipoCaja.split("-")[1].replace(",", ".")) * cajas;
            if (!copiaItemSeleccionado.tipoCaja.includes('-')) {
                throw new ProcessError(400, `El tipoCaja '${copiaItemSeleccionado.tipoCaja}' es inválido`);
            }
            //se modifican los datos
            await Promise.all([
                ProcesoService.restarItem_contenedor(contenedor[0], palletsModificados, copiaPallet, pallet, seleccion, cajas, logContext),
                ProcesoService.restarItem_lote(lote[0], copiaItemSeleccionado, kilos, contenedor, logContext),
                ProcesoService.modificarIndicadoresFecha(copiaPalletSeleccionado, -kilos, logContext.logId)
            ])
            await registrarPasoLog(log._id, "Promise.all", "Completado");

            procesoEventEmitter.emit("proceso_event", {});
            procesoEventEmitter.emit("listaempaque_update");

            await registrarPasoLog(log._id, "Resumen", "Completado", `Restados ${cajas} cajas del item ${seleccion} del pallet ${pallet} del contenedor ${_id}`);

        } catch (err) {
            await registrarPasoLog(log._id, "Error", "Fallido", err.message);
            if (
                err.status === 610 ||
                err.status === 523 ||
                err.status === 522
            ) {
                throw err
            }
            throw new ProcessError(470, `Error: ${err.message}`)
        } finally {
            await registrarPasoLog(log._id, "Finalizo la funcion", "Completado");
        }
    }
    static async put_proceso_aplicaciones_listaEmpaque_moverItems(req) {
        const { user } = req
        const { contenedor1, contenedor2, cajas, action } = req.data;

        if (contenedor1.pallet !== "" && contenedor2.pallet !== "" && cajas === 0) {
            await this.mover_item_entre_contenedores(contenedor1, contenedor2, action, user);
        }

        else if (contenedor1.pallet !== "" && contenedor2.pallet !== "" && cajas !== 0) {
            await this.restar_mover_contenedor_contenedor(contenedor1, contenedor2, cajas, action, user)
        }

        procesoEventEmitter.emit("listaempaque_update");

    }
    static async mover_item_entre_contenedores(contenedor1, contenedor2, action, user) {
        let log
        try {
            log = await LogsRepository.create({
                user: user._id,
                action: "mover_item_entre_contenedores",
                acciones: [{ paso: "Inicio de la función", status: "Iniciado", timestamp: new Date() }]
            })
            const logContext = { logId: log._id, user, action }
            const { _id: id1, pallet: pallet1 } = contenedor1
            const { _id: id2, pallet: pallet2 } = contenedor2
            if (id1 === id2 && pallet1 === pallet2) {
                throw new ProcessError(400, "No se puede mover ítems entre el mismo pallet")
            }
            const { lotes, contenedores, index1, index2 } = await ProcesoService.obtenerContenedorLotesModificar(contenedor1, contenedor2)
            await registrarPasoLog(log._id, "ProcesoService.obtenerContenedorLotesModificar", "Completado");

            const seleccionOrdenado = contenedor1.seleccionado.sort((a, b) => b - a);

            const { palletsModificados: palletsModificados1, copiaPallet: copiaPallets1 } = await ProcesoService.crearCopiaProfundaPallets(contenedores[index1]);
            const { palletsModificados: palletsModificados2, copiaPallet: copiaPallets2 } = await ProcesoService.crearCopiaProfundaPallets(contenedores[index2]);
            await registrarPasoLog(log._id, "ProcesoService.crearCopiaProfundaPallets", "Completado");

            if (lotes.length > 0) {
                await ProcesoService.mover_kilos_lotes_entrcontenedores(
                    contenedores, index1, index2, contenedor1, contenedor2, seleccionOrdenado, palletsModificados1, palletsModificados2, lotes, logContext
                );
            }

            // Actualizar los contenedores en la base de datos
            const operationsContenedores = [
                { updateOne: { filter: { _id: contenedores[index2]._id }, update: { $set: { [`pallets.${pallet2}`]: palletsModificados2[pallet2] } } } },
                { updateOne: { filter: { _id: contenedores[index1]._id }, update: { $set: { [`pallets.${pallet1}`]: palletsModificados1[pallet1] } } } }
            ];
            await ContenedoresRepository.bulkWrite(operationsContenedores);

            await RecordModificacionesRepository.post_record_contenedor_modification(
                action,
                user,
                [
                    { modelo: "Contenedor", documentoId: id1, descripcion: `Se movieron los ítems ${seleccionOrdenado} del pallet ${pallet1}` },
                    { modelo: "Contenedor", documentoId: id2, descripcion: `Se agregaron ítems al pallet ${pallet2}` },
                ],
                [copiaPallets1[pallet1], copiaPallets2[pallet2]],
                [palletsModificados1[pallet1], palletsModificados2[pallet2]],
                { contenedor1, contenedor2, action, user }
            );

            // }
            procesoEventEmitter.emit("server_event", {
                action: "lista_empaque_update",
            });
            procesoEventEmitter.emit("listaempaque_update");

        } catch (err) {
            console.log(err)
            await registrarPasoLog(log._id, "Error", "Fallido", err.message);

            if (
                err.status === 610 ||
                err.status === 523
            ) {
                throw err
            }
            throw new ProcessError(470, `Error ${err.type}: ${err.message}`)
        } finally {
            await registrarPasoLog(log._id, "Finalizo la funcion", "Completado");
        }
    }
    static async restar_mover_contenedor_contenedor(contenedor1, contenedor2, cajas, action, user) {
        let log

        try {
            log = await LogsRepository.create({
                user: user._id,
                action: "mover_item_entre_contenedores",
                acciones: [{ paso: "Inicio de la función", status: "Iniciado", timestamp: new Date() }]
            })
            const logContext = { logId: log._id, user, action }
            const { _id: id1, pallet: pallet1 } = contenedor1
            const { _id: id2, pallet: pallet2 } = contenedor2
            if (id1 === id2 && pallet1 === pallet2) {
                throw new ProcessError(400, "No se puede mover ítems entre el mismo pallet")
            }

            const { lotes, contenedores, index1, index2 } = await ProcesoService.obtenerContenedorLotesModificar(contenedor1, contenedor2)
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

            await Promise.all([
                ProcesoService.restar_mover_modificar_contenedor(
                    contenedores, index1, index2, contenedor1, contenedor2,
                    seleccionOrdenado, palletsModificados1, palletsModificados2, copiaPallets1, copiaPallets2, newCajas, cajas, GGN, logContext
                ),
                ProcesoService.restar_mover_modificar_lote(
                    contenedores, index1, index2, itemSeleccionado, kilos, GGN, oldGGN, logContext
                ),
            ]);

            procesoEventEmitter.emit("server_event", {
                action: "lista_empaque_update",
            });
            procesoEventEmitter.emit("listaempaque_update");

        } catch (err) {
            console.log(err)
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
        const { rotulado, paletizado, enzunchado, estadoCajas, estiba } = item
        const query = {};

        //se obtiene  el contenedor a modifiar
        const contenedor = await ContenedoresRepository.get_Contenedores_sin_lotes({
            ids: [_id],
            select: { infoContenedor: 1, pallets: 1 },
            populate: {
                path: 'infoContenedor.clienteInfo',
                select: 'CLIENTE PAIS_DESTINO',
            }
        });

        // Crear copia profunda de los pallets
        const palletsModificados = JSON.parse(JSON.stringify(contenedor[0].pallets));
        const palletSeleccionado = palletsModificados[pallet].listaLiberarPallet;

        Object.assign(palletSeleccionado, { rotulado, paletizado, enzunchado, estadoCajas, estiba });

        query.pallets = palletsModificados

        // Actualizar contenedor con pallets modificados
        await ContenedoresRepository.actualizar_contenedor(
            { _id },
            query
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
            { _id, pallet, item, action }
        );


        procesoEventEmitter.emit("listaempaque_update");
    }
    static async put_proceso_aplicaciones_listaEmpaque_modificarItems(req) {
        const { user } = req;
        let log
        try {
            log = await LogsRepository.create({
                user: user._id,
                action: "put_proceso_aplicaciones_listaEmpaque_modificarItems",
                acciones: [{ paso: "Inicio de la función", status: "Iniciado", timestamp: new Date() }]
            })
            const logData = { logId: log._id, user: user, action: "put_proceso_aplicaciones_listaEmpaque_modificarItems" }

            ProcesoValidations.put_proceso_aplicaciones_listaEmpaque_modificarItems(req.data)
            await registrarPasoLog(log._id, "ProcesoValidations.put_proceso_aplicaciones_listaEmpaque_modificarItems", "Completado");

            const { _id, pallet, seleccion, data, action } = req.data;
            const { calidad, tipoCaja, calibre } = data
            //se obtiene  el contenedor a modifiar
            const { contenedor, lotes } = await ProcesoService.obtenerContenedorLotes(_id, pallet, seleccion);
            await registrarPasoLog(log._id, "ProcesoService.obtenerContenedorLotes", "Completado");

            const { palletsModificados, copiaPallet } = await ProcesoService.crearCopiaProfundaPallets(contenedor[0]);
            await registrarPasoLog(log._id, "ProcesoService.crearCopiaProfundaPallets", "Completado");

            lotes.forEach(lote => {
                if (checkFinalizadoLote(lote)) {
                    throw new ProcessError(400, `El lote ${lote.enf} ya se encuentra finalizado, no se puede modificar`);
                }
            })

            await Promise.all([
                ProcesoService.modificarPalletModificarItemsListaEmpaque(
                    palletsModificados, copiaPallet, pallet, seleccion, calidad, calibre, tipoCaja, _id, action, user, log._id
                ),
                ProcesoService.modificarLotesModificarItemsListaEmpaque(
                    lotes, copiaPallet, palletsModificados, seleccion, pallet, contenedor, logData
                ),
                ProcesoService.modificarIndicadorExportacion(palletsModificados, copiaPallet, seleccion, pallet)
            ])
            await registrarPasoLog(log._id, "Promise.all", "Completado");

            procesoEventEmitter.emit("server_event", {
                action: "lista_empaque_update",
            });
            procesoEventEmitter.emit("listaempaque_update");


        } catch (err) {
            await registrarPasoLog(log._id, "Error", "Fallido", err.message);

            if (
                err.status === 610 ||
                err.status === 523 ||
                err.status === 522
            ) {
                throw err
            }
            throw new ProcessError(470, `Error ${err.type}: ${err.message}`)

        } finally {
            await registrarPasoLog(log._id, "Finalizo la funcion", "Completado");
        }
    }
    static async put_proceso_aplicaciones_listaEmpaque_Cerrar(req) {
        try {
            const { user } = req;
            const { _id, action } = req.data;
            const contenedor = await ContenedoresRepository.getContenedores({ ids: [_id] });
            const lista = await insumos_contenedor(contenedor[0])
            const listasAlias = Object.keys(lista);
            const idsInsumos = await InsumosRepository.get_insumos({
                query: {
                    codigo: { $in: listasAlias },
                }
            })
            const listaInsumos = {};
            idsInsumos.forEach(item => {
                listaInsumos[`insumosData.${item._id.toString()}`] = lista[item.codigo]
            })
            // Actualizar contenedor con pallets modificados
            const newContenedor = await ContenedoresRepository.actualizar_contenedor(
                { _id },
                {
                    ...listaInsumos,
                    'infoContenedor.cerrado': true,
                    'infoContenedor.fechaFinalizado': new Date(),
                }
            );

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
                { _id, action }
            );



            procesoEventEmitter.emit("listaempaque_update");

        } catch (err) {
            if (
                err.status === 522 ||
                err.status === 523 ||
                err.status === 423

            ) {
                throw err
            }
            throw new ProcessError(470, `Error ${err.type}: ${err.message}`)
        }
    }
    static async put_proceso_add_pallet_listaempaque(req) {
        const { user } = req;
        try {
            const { _id, action } = req.data;
            const contenedor = await ContenedoresRepository.getContenedores({ ids: [_id] });
            const newItem = {
                EF1: [],
                listaLiberarPallet: {
                    rotulado: false,
                    paletizado: false,
                    enzunchado: false,
                    estadoCajas: false,
                    estiba: false
                },
                settings: {
                    tipoCaja: '',
                    calidad: '',
                    calibre: ''
                }
            }
            const query = {
                $push: { pallets: newItem }
            }

            const newContenedor = await ContenedoresRepository.actualizar_contenedor(
                { _id },
                query
            );

            // Registrar modificación Contenedores
            await RecordModificacionesRepository.post_record_contenedor_modification(
                action,
                user,
                {
                    modelo: "Contenedor",
                    documentoId: _id,
                    descripcion: `Se agrego  pallet al contenedor ${_id}`,
                },
                contenedor[0].pallets,
                newContenedor.pallets,
                { _id, action }
            );
            procesoEventEmitter.emit("listaempaque_update");

        } catch (err) {
            console.log(err)
            if (
                err.status === 522 ||
                err.status === 523 ||
                err.status === 423

            ) {
                throw err
            }
            throw new ProcessError(470, `Error ${err.type}: ${err.message}`)
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
    static async directoNacional(req) {

        const user = req.user.user;
        const data = req.data

        const { _id, infoSalidaDirectoNacional, directoNacional, inventario, action } = data;
        const query = {
            $inc: {
                directoNacional: directoNacional,
                __v: 1
            },
            infoSalidaDirectoNacional: infoSalidaDirectoNacional
        };

        const lote = await LotesRepository.actualizar_lote(
            { _id: _id },
            query,
            { new: true, user: user, action: action }
        );

        await VariablesDelSistema.modificarInventario(_id, inventario);
        await LotesRepository.deshidratacion(lote);

        procesoEventEmitter.emit("server_event", {
            action: "directo_nacional",
            data: {}
        });

    }
    // static async modificar_predio_proceso_listaEmpaque(req,) {
    //     const { data } = req
    //     VariablesDelSistema.modificar_predio_proceso_listaEmpaque(data)
    //     procesoEventEmitter.emit("predio_vaciado");
    // }

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
