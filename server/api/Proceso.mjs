import { ProcessError } from "../../Error/ProcessError.js";
import { procesoEventEmitter } from "../../events/eventos.js";
import { RecordLotesRepository } from "../archive/ArchiveLotes.js";
import { ContenedoresRepository } from "../Class/Contenedores.js";
import { LotesRepository } from "../Class/Lotes.js";
import { VariablesDelSistema } from "../Class/VariablesDelSistema.js";
// import { insumos_contenedor } from "../functions/insumos.js";
// import { InsumosRepository } from "../Class/Insumos.js";

import path from 'path';
import fs from "fs";

import { have_lote_GGN_export } from "../controllers/validations.js";
import { filtroFechaInicioFin } from "./utils/filtros.js";
import { InventariosLogicError } from "../../Error/logicLayerError.js";
import { RecordModificacionesRepository } from "../archive/ArchivoModificaciones.js";
import { ProcesoValidations } from "../validations/proceso.js";
import { ProcesoService } from "../services/proceso.js";
import { LogsRepository } from "../Class/LogsSistema.js";
import { registrarPasoLog } from "./helper/logs.js";
import { checkFinalizadoLote } from "./utils/lotesFunctions.js";
import { db } from "../../DB/mongoDB/config/init.js";
import { IndicadoresAPIRepository } from "./IndicadoresAPI.js";
import { ErrorProcesoLogicHandlers } from "./utils/errorsHandlers.js";
import { dirname } from 'path';
import { fileURLToPath } from 'url';
import { FrutaProcesada } from "../Class/frutaProcesada.js";
import { InventariosHistorialRepository } from "../Class/Inventarios.js";
import { LotesHelper } from "../helper/lotes.js";
import { DescartesRepository } from "../Class/Descartes.js";
import { ArchiveLoteMaquila } from "../archive/ArchiveLoteMaquila.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);


export class ProcesoRepository {

    //#region aplicaciones
    static async post_proceso_aplicaciones_fotoCalidad(req) {
        try {
            const { user } = req
            const { foto, fotoName, _id } = req.data;

            // Validar _id (ObjectId válido)
            if (!/^[0-9a-fA-F]{24}$/.test(_id)) {
                throw new ProcessError(400, 'ID de lote inválido');
            }

            // Validar fotoName (solo caracteres alfanuméricos y guiones)
            if (!/^[a-zA-Z0-9_-]+$/.test(fotoName)) {
                throw new ProcessError(400, 'Nombre de foto inválido');
            }

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

            // Validación adicional: verificar que esté en el directorio correcto
            const resolvedPath = path.resolve(fotoPath);
            const resolvedBase = path.resolve(__dirname, '..', '..', 'fotos_frutas');
            if (!resolvedPath.startsWith(resolvedBase)) {
                throw new ProcessError(400, 'Ruta de archivo no permitida');
            }

            // Eliminar el encabezado de datos URI si está presente
            const base64Data = foto.replace(/^data:image\/\w+;base64,/, "");

            // eslint-disable-next-line security/detect-non-literal-fs-filename
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

            await LotesHelper.actualizar_lotes_helper(
                { _id: _id },
                query,
                { new: true, user: user._id, action: "post_proceso_aplicaciones_fotoCalidad" }
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
                        { fecha_creacion: { $gte: new Date(haceUnMes) } }
                    ]
                },
                select: { enf: 1, fecha_creacion: 1, tipoFruta: 1 }
            });
            const lotesMaquila = await LotesRepository.getLotesMaquila({
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
                        { fecha_creacion: { $gte: new Date(haceUnMes) } }
                    ]
                },
                select: { enf: 1, fecha_creacion: 1, tipoFruta: 1 }
            });
            const result = [...lotes, ...lotesMaquila];
            const resultOrdered = result.sort((a, b) => a.fecha_creacion - b.fecha_creacion)
            return resultOrdered
        } catch (err) {
            if (err.status === 522) {
                throw err
            }
            throw new ProcessError(470, `Error ${err.type}: ${err.message}`)
        }
    }
    static async get_proceso_aplicaciones_descarteLavado() {
        try {
            const data = await FrutaProcesada.obtener_ultimaEntrada();
            return data
        } catch (err) {
            if (err.status === 531) {
                throw err
            }
            throw new ProcessError(470, `Error ${err.type}: ${err.message}`)
        }
    }
    static async put_proceso_aplicaciones_descarte(req) {

        const { user } = req;
        const { action, data, registroFrutaProcesada, tipo } = req.data;
        const { descarte, canastillas, kilos } = data;

        let log

        const session = await db.Lotes.db.startSession();

        log = await LogsRepository.create({
            user: user._id,
            action: action,
            acciones: [{ paso: "Inicio de la función", status: "Iniciado", timestamp: new Date() }]
        })
        try {


            ProcesoValidations.put_proceso_aplicaciones_descarteEncerado().parse(data)
            await registrarPasoLog(log._id, "ProcesoValidations.put_proceso_aplicaciones_descarteEncerado", "Completado");

            await session.withTransaction(async () => {
                const registroProceso = await FrutaProcesada.get_frutaProcesada({
                    ids: [registroFrutaProcesada],
                    populate: [
                        { path: 'tipoFruta', select: 'tipoFruta valorPromedio' }
                    ]
                })
                const descartesData = await DescartesRepository.getDescartes({ ids: [descarte] })
                const kilosTotales = (Number(kilos) || 0) + ((Number(canastillas) || 0) * registroProceso[0].tipoFruta.valorPromedio);;

                const query = {
                    $inc: {
                        kilosProcesados: kilosTotales,
                        [`descartes.${descarte}`]: kilosTotales
                    }
                };
                if (!descartesData[0].inventario) {
                    query.$inc[`descartesDevueltos.${descarte}`] = kilosTotales;
                }

                const lote = await ProcesoService.modificarLotedescartes(registroProceso[0].loteId, query, user, action, session)
                await registrarPasoLog(log._id, "ProcesoService.modificarLotedescartes", "Completado", `Lote ID: ${registroProceso[0].loteId},`);

                await IndicadoresAPIRepository.put_indicadores_actualizar_indicador(
                    { $inc: { [`kilos_procesados.${lote.tipoFruta._id.toString()}`]: Number(kilosTotales) } }, session
                );
                await registrarPasoLog(
                    log._id,
                    "IndicadoresAPIRepository.put_indicadores_actualizar_indicador",
                    "Completado",
                    `Se actualizó el indicador kilosProcesadosHoy con ${kilos} kilos del tipo de fruta ${lote.tipoFruta._id.toString()}`);


                const data = {
                    lote: lote._id,
                    tipoFruta: lote.tipoFruta._id,
                    area: tipo,
                    tipoDescarte: descarte,
                    kilos: kilosTotales,
                    loteType: registroProceso[0].loteType
                }
                await InventariosHistorialRepository.add_elemento_inventarioDescartes(data, user._id, session);
                if (lote.enf.startsWith("EF1-")) {

                    await InventariosHistorialRepository.put_cardex_invetariosdescartes(
                        {},
                        {
                            $inc: {
                                [`kilos_ingreso.${lote.tipoFruta._id.toString()}.${tipo}.${descarte}`]: kilosTotales,
                            },
                        },
                        {
                            sort: { fecha: -1 },
                            new: true,
                            session,
                        }
                    );
                }
                await registrarPasoLog(
                    log._id,
                    "Modificar inventario descartes",
                    "Completado",
                    `Se modificó el inventario de descarte y la métrica kilosProcesadosHoy con ${kilosTotales} kilos del tipo de fruta ${lote.tipoFruta._id.toString()}`);
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
            const contenedores = await ContenedoresRepository.get_Contenedores_sin_lotes({
                select: { numeroContenedor: 1, infoContenedor: 1, },
                query: { 'infoContenedor.cerrado': false },
                populate: [
                    {
                        path: 'infoContenedor.clienteInfo',
                        select: 'CLIENTE',
                    },
                    {
                        path: 'infoContenedor.calidad',
                        select: 'nombre',
                    },
                ]
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
            const sortPallets = pallets.sort((a, b) => a.pallet.numeroPallet - b.pallet.numeroPallet);
            return sortPallets
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
            }

            query = filtroFechaInicioFin(fechaInicio, fechaFin, query, 'fechaProcesamiento')

            const data = await FrutaProcesada.get_frutaProcesada({
                query: query,
            });
            return data
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

                await ProcesoService.modificarLoteListaEmpaqueAddItem(item, kilos, _id, logData, session)
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
                const items = await ProcesoService.eliminar_items_contenedor(
                    seleccion, logContext, session
                );

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

                const {
                    itemPallet,
                    kilos
                } = await ProcesoService.restarItem_contenedor(
                    _id, cajas, logContext, session
                );

                await ProcesoService.restarItem_lote(itemPallet, kilos, cajas, logContext, session);
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

                const newPallet = await ContenedoresRepository.getPallets({ query: { contenedor: id2, numeroPallet: pallet2 } }, session);

                if (newPallet.length === 0) {
                    throw new ProcessError(400, `El pallet ${pallet2} no existe en el contenedor ${contenedores[0].numeroContenedor}`);
                }
                const itemsPallet = await ContenedoresRepository.getItemsPallets({ ids: seleccionado }, session);
                if (itemsPallet.length !== seleccionado.length) {
                    throw new ProcessError(400, `Alguno de los items seleccionados no existe`);
                }
                const cont = await ContenedoresRepository.getContenedores({ ids: [id2] }, session);
                if (cont.length === 0) {
                    throw new ProcessError(400, `El contenedor del item seleccionado no existe`);
                }

                for (const idItem of itemsPallet) {

                    // if (checkFinalizadoLote(idItem.lote)) {
                    //     throw new ProcessError(400, `El lote ${idItem.lote.enf} ya se encuentra finalizado, no se puede modificar`);
                    // }
                    const GGN = have_lote_GGN_export(idItem.lote, cont[0])

                    await ContenedoresRepository.actualizar_contenedor(
                        { _id: idItem.contenedor._id },
                        { $inc: { totalCajas: -idItem.cajas, totalKilos: -idItem.kilos } },
                        { session, new: true, action: action, user: user._id });

                    const itemPallet = await ContenedoresRepository.actualizar_palletItem(
                        { _id: idItem },
                        { contenedor: id2, pallet: newPallet[0]._id, GGN: GGN },
                        { session, user: user._id, action: action }
                    )

                    await LotesHelper.actualizar_lotes_helper(
                        { _id: itemPallet.lote },
                        { $addToSet: { "salidaExportacion.contenedores": id2 } },
                        { session, user: user._id, action: action }
                    );

                    await ContenedoresRepository.actualizar_contenedor(
                        { _id: id2 },
                        { $inc: { totalCajas: idItem.cajas, totalKilos: idItem.kilos } },
                        { session, new: true, action: action, user: user._id });

                }

                await registrarPasoLog(log._id, "ContenedoresRepository.actualizar_palletItem", "Completado");
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
    static async restar_mover_contenedor_contenedor(seleccionado, contenedor2, cajas, action, user) {
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

                const newPallet = await ContenedoresRepository.getPallets({ query: { contenedor: id2, numeroPallet: pallet2 } }, session);

                if (newPallet.length === 0) {
                    throw new ProcessError(400, `El pallet ${pallet2} no existe en el contenedor ${contenedores[0].numeroContenedor}`);
                }
                const oldItemPallet = await ContenedoresRepository.getItemsPallets({ query: { _id: seleccionado[0] } }, session);
                if (oldItemPallet.length === 0) {
                    throw new ProcessError(400, `El item seleccionado no existe`);
                }
                if (cajas > oldItemPallet[0].cajas) {
                    throw new ProcessError(400, `No se pueden mover ${cajas} cajas, el item solo tiene ${oldItemPallet[0].cajas} cajas`);
                }

                const kilos = cajas * Number(oldItemPallet[0].tipoCaja.split("-")[1].replace(",", "."));

                // if (checkFinalizadoLote(oldItemPallet[0].lote)) {
                //     throw new ProcessError(400, `El lote ${oldItemPallet[0].lote.enf} ya se encuentra finalizado, no se puede modificar`);
                // }
                const GGN = have_lote_GGN_export(oldItemPallet[0].lote, contenedores[0])

                if (cajas === oldItemPallet[0].cajas) {
                    await ContenedoresRepository.deleteItemPallet({ _id: oldItemPallet[0]._id }, { session, action: action, user: user._id });
                    await registrarPasoLog(log._id, "Contenedor actualizado", "Completado", `Contenedor ID: ${oldItemPallet[0].contenedor._id}, Cajas restadas: ${cajas}, Kilos restados: ${kilos}`);
                } else {
                    await ContenedoresRepository.actualizar_palletItem(
                        { _id: oldItemPallet[0]._id },
                        { $inc: { cajas: -cajas, kilos: -kilos } },
                        { session, user: user._id, action: action }
                    )
                    await registrarPasoLog(log._id, "Contenedor actualizado", "Completado", `Contenedor ID: ${oldItemPallet[0].contenedor._id}, Cajas restadas: ${cajas}, Kilos restados: ${kilos}`);
                }

                await ContenedoresRepository.actualizar_contenedor(
                    { _id: oldItemPallet[0].contenedor._id },
                    { $inc: { totalCajas: -cajas, totalKilos: -kilos } },
                    { session, new: true, action: action, user: user._id });

                await registrarPasoLog(log._id, "Contenedor actualizado", "Completado", `Contenedor ID: ${oldItemPallet[0].contenedor._id}, Cajas restadas: ${cajas}, Kilos restados: ${kilos}`);

                await ContenedoresRepository.actualizar_contenedor(
                    { _id: id2 },
                    { $inc: { totalCajas: cajas, totalKilos: kilos } },
                    { session, new: true, action: action, user: user._id });

                await registrarPasoLog(log._id, "Contenedor actualizado", "Completado", `Contenedor ID: ${id2}, Cajas restadas: ${cajas}, Kilos restados: ${kilos}`);

                const newItem = {
                    pallet: newPallet[0]._id,
                    contenedor: id2,
                    lote: oldItemPallet[0].lote._id,
                    tipoCaja: oldItemPallet[0].tipoCaja,
                    calidad: oldItemPallet[0].calidad._id,
                    calibre: oldItemPallet[0].calibre,
                    tipoFruta: oldItemPallet[0].tipoFruta,
                    cajas: cajas,
                    kilos: kilos,
                    fecha: oldItemPallet[0].fecha,
                    usuario: user._id,
                    GGN: GGN,
                    SISPAP: oldItemPallet[0].SISPAP,
                    loteType: oldItemPallet[0].loteType,
                }
                await ContenedoresRepository.addItemPallet(newItem, session);

                await LotesHelper.actualizar_lotes_helper(
                    { _id: oldItemPallet[0].lote._id },
                    { $addToSet: { "salidaExportacion.contenedores": id2 } },
                    { session, user: user._id, action: action }
                );
                await registrarPasoLog(log._id, "Lote actualizado", "Completado", `Lote ID: ${oldItemPallet[0].lote.enf}, Se agregó el contenedor: ${contenedores[0].numeroContenedor}`);
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
    static async put_proceso_aplicaciones_listaEmpaque_modificarItems(req) {
        const { user } = req;
        const { seleccion, data, action } = req.data;
        let log

        const session = await db.Contenedores.db.startSession();

        log = await LogsRepository.create({
            user: user._id,
            action: action,
            acciones: [{ paso: "Inicio de la función", status: "Iniciado", timestamp: new Date() }]
        })

        try {

            await session.withTransaction(async () => {
                ProcesoValidations.put_proceso_aplicaciones_listaEmpaque_modificarItems(req.data)
                await registrarPasoLog(log._id, "ProcesoValidations.put_proceso_aplicaciones_listaEmpaque_modificarItems", "Completado");

                const itemsPallet = await ContenedoresRepository.getItemsPallets(
                    { ids: seleccion },
                    session
                );
                if (itemsPallet.length !== seleccion.length) {
                    throw new ProcessError(400, `Alguno de los items seleccionados no existe`);
                }
                const newItemsPallet = await ProcesoService.modificarPalletModificarItemsListaEmpaque(
                    itemsPallet, data, action, user, log._id, session
                )
                await registrarPasoLog(log._id, "ProcesoService.modificarPalletModificarItemsListaEmpaque", "Completado");

                await ProcesoService.modificarIndicadorExportacion(newItemsPallet, itemsPallet, log._id, session)
                await registrarPasoLog(log._id, "ProcesoService.modificarIndicadorExportacion", "Completado");
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
                // const lista = await insumos_contenedor(contenedor[0]);
                // const listasAlias = Object.keys(lista);
                // const idsInsumos = await InsumosRepository.get_insumos({
                //     query: {
                //         codigo: { $in: listasAlias },
                //     }
                // }, { session });
                // const listaInsumos = {};
                // idsInsumos.forEach(item => {
                //     listaInsumos[`insumosData.${item._id.toString()}`] = lista[item.codigo]
                // })
                // await registrarPasoLog(log._id, "insumos_contenedor", "Completado");
                // Actualizar contenedor con pallets modificados
                const newContenedor = await ContenedoresRepository.actualizar_contenedor(
                    { _id },
                    {
                        // ...listaInsumos,
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
                const contenedor = await ContenedoresRepository.getContenedores({ ids: [_id], select: { pallets: 1, infoContenedor: 1 } }, session);
                const updateContenedor = {};
                if (!contenedor[0].pallets === 0) {
                    updateContenedor["infoContenedor.fechaInicioReal"] = new Date();
                } else if (!contenedor[0]?.infoContenedor?.fechaInicioReal) {
                    updateContenedor["infoContenedor.fechaInicioReal"] = new Date();
                }

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
                updateContenedor.$inc = { pallets: 1 };
                await ContenedoresRepository.actualizar_contenedor(
                    { _id },
                    updateContenedor,
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
                    ...lote,
                    inventario: Reflect.get(inventario, id)
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
        // Validar que la URL sea una ruta válida
        if (!url || typeof url !== 'string') {
            throw new ProcessError(400, 'URL inválida');
        }

        // Rechazar path traversal
        if (url.includes('..')) {
            throw new ProcessError(400, 'URL no permitida');
        }

        // Validación adicional: verificar que esté dentro del directorio permitido
        const resolvedPath = path.resolve(url);
        const resolvedBase = path.resolve(__dirname, '..', '..', 'fotos_frutas');
        if (!resolvedPath.startsWith(resolvedBase)) {
            throw new ProcessError(400, 'Ruta de archivo no permitida');
        }

        // Solo permitir archivos de imagen
        const ext = path.extname(url).toLowerCase();
        if (!['.png', '.jpg', '.jpeg', '.webp'].includes(ext)) {
            throw new ProcessError(400, 'Tipo de archivo no permitido');
        }

        // eslint-disable-next-line security/detect-non-literal-fs-filename
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
            let lote

            if (EF.startsWith("EF10-")) {
                lote = await LotesRepository.getLotesMaquila({ query: { enf: EF } })
            } else if (EF.startsWith("EF1-")) {
                lote = await LotesRepository.getLotes({ query: { enf: EF } })

            } else {
                throw new ProcessError(400, "No se encontro el lote")
            }

            if (lote.length === 0) {
                throw new ProcessError(400, "No se encontro el lote")
            }

            const query = {
                documentId: lote[0]._id
            }

            let registros

            if (EF.startsWith("EF10-")) {
                registros = await ArchiveLoteMaquila.get_logs_lotes_maquila({
                    query: query,
                    populate: [{ path: 'user', select: 'usuario' }]
                })
            } else if (EF.startsWith("EF1-")) {
                registros = await RecordLotesRepository.getAuditLogsEf1({
                    query: query,
                    populate: [{ path: 'user', select: 'usuario' }]
                })
            } else {
                throw new ProcessError(400, "No se encontro el lote")
            }

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
