import { db } from "../../../DB/mongoDB/config/init.js";
import { InventariosLogicError } from "../../../Error/logicLayerError.js";
import { procesoEventEmitter } from "../../../events/eventos.js";
import { DespachoDescartesRepository } from "../../Class/DespachoDescarte.js";
import { FrutaDescompuestaRepository } from "../../Class/FrutaDescompuesta.js";
import { InventariosHistorialRepository } from "../../Class/Inventarios.js";
import { LogsRepository } from "../../Class/LogsSistema.js";
import { LotesRepository } from "../../Class/Lotes.js";
import { LotesHelper } from "../../helper/lotes.js";
import { InventariosService } from "../../services/inventarios.js";
import { InventariosValidations } from "../../validations/inventarios.js";
import { registrarPasoLog } from "../helper/logs.js";
import { ErrorInventarioLogicHandlers } from "../utils/errorsHandlers.js";
import { filtroFechaInicioFin } from "../utils/filtros.js";

export class InventarioDescarteController {
    static async get_inventarios_historiales_registros_ingresosDescartes(req) {
        try {
            const { data } = req
            const { fechaInicio, fechaFin, tipoFruta, buscar, areaSeleccion, descarte } = data.filtro
            let lote
            let query = {
                estado: 'ACTIVO',
                loteType: { $in: ["Lote", "Loteef8"] },
            }
            if (tipoFruta) query.tipoFruta = tipoFruta;
            if (areaSeleccion) query.area = areaSeleccion
            if (descarte) query.tipoDescarte = descarte

            query = filtroFechaInicioFin(fechaInicio, fechaFin, query, 'fechaIngreso')

            if (buscar !== "") {
                lote = await LotesRepository.getLotes({
                    query: {
                        enf: buscar,
                    },
                    select: { enf: 1 }
                })

                console.log(lote)
                if (lote.length === 0) {
                    throw new InventariosLogicError(470, `No se encontró el lote ${buscar}`)
                } else {
                    query.lote = lote[0]._id
                }
            }

            const inventario = await InventariosHistorialRepository.get_inventario_descarteMaquila_generico({
                query,
                sort: { createdAt: -1 },
                populate: [
                    { path: 'tipoFruta', select: "tipoFruta" },
                    { path: 'lote', select: "enf" },
                    { path: 'tipoDescarte', select: "nombre inventario descripcion" },
                ]
            })

            return inventario
        } catch (err) {
            console.error(err)
            if (err.status === 522) {
                throw err
            }
            throw new InventariosLogicError(470, `Error ${err.type}: ${err.message}`)
        }
    }
    static async put_inventarios_inventarioDescarte_modificar_ingreso(req) {
        const { user } = req
        const { action, _id, kilosIniciales } = req.data
        let log
        log = await LogsRepository.create({
            user: user._id,
            action: action,
            acciones: [{ paso: "Inicio de la función", status: "Iniciado", timestamp: new Date() }]
        })

        const session = await db.InventarioActualDescarte.db.startSession();

        try {
            await session.withTransaction(async () => {
                const oldValue = await InventariosHistorialRepository.get_inventario_descarteMaquila_generico({
                    query: { _id: _id },
                    select: "kilosIniciales kilosActuales"
                })

                const diffKilosIniciales = kilosIniciales - oldValue[0].kilosIniciales

                console.log(diffKilosIniciales)
                console.log(kilosIniciales)

                const itemModificado = await InventariosHistorialRepository.actualizar_ingreso_descarte(
                    { _id: _id },
                    { kilosIniciales: kilosIniciales, kilosActuales: kilosIniciales },
                    { session }
                )
                await registrarPasoLog(log?._id, "InventariosHistorialRepository.actualizar_ingreso_descarte", `completado`);
                // Crear movimiento de MODIFICACION adicional
                await db.InventarioMovimientoDescarte.create([{
                    registroDescarte: itemModificado._id,
                    tipoMovimiento: 'MODIFICACION',
                    tipoRegistro: itemModificado.loteType,
                    kilos: diffKilosIniciales,
                    fechaMovimiento: new Date(),
                    user: user,
                    destino: `INVENTARIO_${itemModificado.area}`
                }], { session });
                await registrarPasoLog(log?._id, "db.InventarioMovimientoDescarte.create", `completado`);

                await LotesHelper.actualizar_lotes_helper(
                    { _id: itemModificado.lote },
                    {
                        $inc: {
                            [`descartes.${itemModificado.tipoDescarte._id}`]: diffKilosIniciales,
                            kilosProcesados: diffKilosIniciales,
                        }

                    },
                    session
                )
                await registrarPasoLog(log?._id, "LotesHelper.actualizar_lotes_helper", `completado`);
            })

        } catch (error) {
            console.error(`[ERROR][${new Date().toISOString()}]`, error);
            await ErrorInventarioLogicHandlers(error, log)
        } finally {
            await registrarPasoLog(log?._id, "Finalizado", "Iniciado", "Finalizado");
            await session.endSession();
        }
    }
    static async put_inventarios_frutaDescarte_despachoDescarte(req) {
        const { user } = req;
        const { data, inventario, action } = req.data;
        let log;
        const session = await db.Lotes.db.startSession();
        if (!session) {
            throw new Error("No se pudo iniciar la sesión en la base de datos de catálogos");
        }
        log = await LogsRepository.create({
            user: user,
            action: action,
            acciones: [{ paso: "Inicio de la función", status: "Iniciado", timestamp: new Date() }]
        });
        try {
            InventariosValidations.put_inventarios_frutaDescarte_despachoDescarte().parse(req.data)
            await session.withTransaction(async () => {
                const tipoFruta = inventario.tipoFruta;
                delete inventario.tipoFruta;

                await InventariosService.procesar_formulario_inventario_descarte(inventario, tipoFruta, session, user)
                await registrarPasoLog(log._id, "InventariosService.procesar_formulario_inventario_descarte", "Completado");
                const newDespacho = {
                    ...data,
                    tipoFruta: tipoFruta,
                    descartes: inventario

                }
                await DespachoDescartesRepository.crear_nuevo_despacho(newDespacho, user._id, session)
                await registrarPasoLog(log._id, "DespachoDescartesRepository.crear_nuevo_despacho", "Completado");
            })

        } catch (error) {
            console.error(`[ERROR][${new Date().toISOString()}]`, error);
            await registrarPasoLog(log._id, "Error", "Fallido", error.message);
            throw new InventariosLogicError(error, log)
        } finally {
            await session.endSession();
            await registrarPasoLog(log._id, "Finalizo la funcion", "Completado");
        }

    }
    static async post_inventarios_frutaDescarte_frutaDescompuesta(req) {

        const { user } = req;
        const { data, inventario, action } = req.data;
        let log;
        const session = await db.Lotes.db.startSession();
        if (!session) {
            throw new Error("No se pudo iniciar la sesión en la base de datos de catálogos");
        }
        log = await LogsRepository.create({
            user: user,
            action: action,
            acciones: [{ paso: "Inicio de la función", status: "Iniciado", timestamp: new Date() }]
        });

        try {
            InventariosValidations.post_inventarios_frutaDescarte_frutaDescompuesta().parse(req.data)
            await registrarPasoLog(log._id, "Validación de datos completada", "Completado");

            await session.withTransaction(async () => {
                const tipoFruta = inventario.tipoFruta;
                delete inventario.tipoFruta;
                //se borra del inventario
                const total = await InventariosService.procesar_formulario_inventario_descarte(inventario, tipoFruta, session, user)
                await registrarPasoLog(log._id, "InventariosService.procesar_formulario_inventario_descarte", "Completado");

                if (total > 50 && user.Rol > 2) throw new Error("No puede crear un registro de fruta descompuesta de tantos kilos")
                //se crea el registro de fruta descompuesta
                const query = {
                    ...data,
                    descartes: inventario,
                    tipoFruta: tipoFruta,
                    user: user._id,
                    kilos: total
                }
                console.log(query)
                await FrutaDescompuestaRepository.post_fruta_descompuesta(query, user._id, { session });
                await registrarPasoLog(log._id, "FrutaDescompuestaRepository.post_fruta_descompuesta", "Completado");

            })

            procesoEventEmitter.emit("server_event", {
                action: "descarte_change",
                data: {}
            });

            return true

        } catch (err) {
            console.error(`[ERROR][${new Date().toISOString()}]`, err);
            await registrarPasoLog(log._id, "Error", "Fallido", err.message);

            if (err.status === 518 || err.status === 413) {
                throw err
            }
            throw new InventariosLogicError(470, `Error ${err.type}: ${err.message}`)
        } finally {
            await registrarPasoLog(log._id, "Finalizo la funcion", "Completado");
            await session.endSession();
        }
    }
}