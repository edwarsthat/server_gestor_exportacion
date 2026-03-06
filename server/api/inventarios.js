
import { ZodError } from "zod";
import { InventariosLogicError } from "../../Error/logicLayerError.js";
import { procesoEventEmitter } from "../../events/eventos.js";
import { RecordLotesRepository } from "../archive/ArchiveLotes.js";
import { CanastillasRepository } from "../Class/CanastillasRegistros.js";
import { ContenedoresRepository } from "../Class/Contenedores.js";
import { DespachoDescartesRepository } from "../Class/DespachoDescarte.js";
import { FrutaDescompuestaRepository } from "../Class/FrutaDescompuesta.js";
import { InsumosRepository } from "../Class/Insumos.js";
import { LotesRepository } from "../Class/Lotes.js";
import { InventariosValidations } from "../validations/inventarios.js";
import { filtroFechaInicioFin } from "./utils/filtros.js";
import { InventariosService } from "../services/inventarios.js";
import { RedisRepository } from "../Class/RedisData.js";
import { InventariosHistorialRepository } from "../Class/Inventarios.js";
import { LogsRepository } from "../Class/LogsSistema.js";
import { registrarPasoLog } from "./helper/logs.js";
import { TiposFruta } from "../store/TipoFruta.js";
import { UsuariosRepository } from "../Class/Usuarios.js";
import mongoose from "mongoose";
import { ContenedoresService } from "../services/contenedores.js";
import { db } from "../../DB/mongoDB/config/init.js";
import { ErrorInventarioLogicHandlers } from "./utils/errorsHandlers.js";
import config from "../../src/config/index.js";
import { IndicadoresAPIRepository } from "./IndicadoresAPI.js";
import { LotesHelper } from "../helper/lotes.js";
import { InventarioSimpleHelper } from "../helper/inventarioSimple.js";
import { FrutaProcesada } from "../Class/frutaProcesada.js";
import { descarteCache } from "../cache/descartes.js";
import { tipoFrutaCache } from "../cache/tipoFruta.js";


export class InventariosRepository {
    //#region inventarios
    static async get_inventarios_frutaSinProcesar_frutaEnInventario() {
        try {
            const inventarioID = config.INVENTARIO_FRUTA_SIN_PROCESAR;
            const resultado = await InventariosHistorialRepository.getInventarioFrutaSinProcesar({
                ids: [inventarioID]
            });
            const resultadoMaquila = await InventariosHistorialRepository.getInventarioFrutaSinProcesarMaquila({
                ids: [inventarioID]
            });
            const concatResult = resultado.concat(resultadoMaquila);
            const inventario = await InventariosHistorialRepository.get_inventario_simple(inventarioID)
            return { fruta: concatResult, version: inventario.__v }
        } catch (err) {
            console.error("Error en get_inventarios_frutaSinProcesar_frutaEnInventario", err);
            if (err.status === 518 || err.status === 413) {
                throw err
            }
            throw new InventariosLogicError(470, `Error ${err.type}: ${err.message}`)
        }
    }
    static async put_inventarios_frutaDesverdizando_parametros(req) {
        try {
            InventariosValidations.put_inventarios_frutaDesverdizando_parametros().parse(req.data)

            const { _id, data, action } = req.data;
            const { user } = req.user;
            const query = {
                $push: {
                    "desverdizado.parametros": data
                },
                $inc: {
                    __v: 1,
                }
            }
            await LotesRepository.actualizar_lote(
                { _id: _id },
                query,
                { user: user._id, action: action }
            )
        } catch (err) {
            console.error("Error en put_inventarios_frutaDesverdizando_parametros", err);
            if (err.status === 523) {
                throw err
            }
            throw new InventariosLogicError(470, `Error ${err.type}: ${err.message}`)
        }
    }
    static async put_inventarios_frutaDesverdizado_finalizar(req) {

        const { data, user } = req
        const { _id, cuarto, action } = data;

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
            InventariosValidations.put_inventarios_frutaDesverdizado_finalizar().parse(req.data)

            await InventariosService.devolverDesverdizadoInventarioFrutaSinprocesar(cuarto, _id)

            const query = {
                "desverdizado.fechaFinalizar": new Date(),
                "desverdizado.desverdizando": false
            }

            await session.withTransaction(async () => {
                const newLote = await LotesRepository.actualizar_lote(
                    { _id: _id },
                    query,
                    { user: user._id, action: action, session }
                )
                await registrarPasoLog(
                    log._id,
                    "LotesRepository.actualizar_lote",
                    "Completado",
                    `Lote ${_id} actualizado con desverdizado.fechaFinalizar: ${new Date().toISOString()}`,);

                const descripcion = `Desverdizado - Canastillas incrementadas: ${newLote.desverdizado.canastillasIngreso}`
                await InventariosService.modificarSumarInventarioFrutaSinProocesar(Number(newLote.desverdizado.canastillasIngreso), user, action, _id, 'lote', log, session, descripcion)

            })

            procesoEventEmitter.emit("server_event", {
                action: "inventario_frutaSinProcesar",
                data: {}
            });
            procesoEventEmitter.emit("server_event", {
                action: "inventario_desverdizado",
                data: {}
            });

        } catch (err) {
            if (err.status === 523) {
                throw err
            }
            throw new InventariosLogicError(470, `Error ${err.type}: ${err.message}`)
        }
    }



    static async post_inventarios_canastillas_registro(req) {
        try {
            const { user } = req
            const { data } = req.data

            const {
                destino,
                origen,
                observaciones,
                fecha,
                canastillas,
                canastillasPrestadas,
                accion,
                remitente,
                destinatario
            } = data

            InventariosValidations.post_inventarios_canastillas_registro().parse(data);

            //Se crean los datos del registro de canastillas
            const dataRegistro = await InventariosService.crearRegistroInventarioCanastillas({
                destino,
                origen,
                observaciones,
                fecha,
                canastillas,
                canastillasPrestadas,
                accion,
                remitente,
                destinatario,
                user: user._id
            })
            await CanastillasRepository.post_registro(dataRegistro)

            //se modifican las canastillas en los predios y en el inventario de prestadas
            await InventariosService.ajustarCanastillasProveedorCliente(origen, Number(-canastillas));
            await InventariosService.ajustarCanastillasProveedorCliente(destino, Number(canastillas));



            return true
        } catch (err) {
            console.error(err)
            if (err.status === 521 || err.status === 523) {
                throw err
            }
            if (err instanceof ZodError) {
                const mensajeLindo = err.errors[0]?.message || "Error desconocido en los datos del lote";
                throw new InventariosLogicError(470, mensajeLindo);
            }
            throw new InventariosLogicError(470, err.message)
        }
    }
    static async get_inventarios_frutaDesverdizando_lotes() {
        try {
            const inventario = await RedisRepository.get_inventario_desverdizado();
            return await InventariosService.procesarInventarioDesverdizado(inventario);
        } catch (err) {
            console.error(`[ERROR][${new Date().toISOString()}]`, err);
            if (err.status === 518 || err.status === 413) {
                throw err
            }
            throw new InventariosLogicError(470, `Error ${err.type}: ${err.message}`)
        }
    }

    static async put_inventarios_frutaSinProcesar_desverdizado(req) {
        const { user } = req;
        const { _id: loteId, desverdizado, action, __v } = req.data

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
            const { canastillas, _id: cuartoId } = desverdizado;

            InventariosValidations.put_inventarios_frutaSinProcesar_desverdizado().parse(req.data);

            const update = {
                '$inc': { 'desverdizado.canastillasIngreso': parseInt(canastillas) },
                '$set': { 'desverdizado.desverdizando': true },
                '$addToSet': { 'desverdizado.cuartoDesverdizado': cuartoId }
            }
            await InventariosService.modificarInventarioIngresoDesverdizado(canastillas, cuartoId, loteId)

            await session.withTransaction(async () => {

                await InventariosService.check_inventarioVersion(config.INVENTARIO_FRUTA_SIN_PROCESAR, __v)
                await InventariosService.item_in_ordenVaceo(loteId)

                const loteNew = await LotesRepository.actualizar_lote(
                    { _id: loteId },
                    update,
                    { user: user._id, action: action, session }
                )
                await registrarPasoLog(log._id, "LotesRepository.actualizar_lote", `Lote ${loteId} actualizado con desverdizado.canastillasIngreso: ${canastillas}`);

                const descripcion = `Desverdizado - Canastillas decrementadas: ${canastillas}`
                await InventariosService.modificarRestarInventarioFrutaSinProocesar(parseInt(canastillas), user, action, loteNew, session, descripcion);
            })

            procesoEventEmitter.emit("server_event", {
                action: "inventario_frutaSinProcesar",
                data: {}
            });
            procesoEventEmitter.emit("server_event", {
                action: "inventario_desverdizado",
                data: {}
            });

        } catch (error) {
            console.error(`[ERROR][${new Date().toISOString()}]`, error);
            await ErrorInventarioLogicHandlers(error, log)
        } finally {
            await session.endSession();
            await registrarPasoLog(log._id, "Finalizo la funcion", "Completado");
        }
    }
    static async put_inventarios_frutaDesverdizado_mover(req) {
        const { user } = req;
        const { _id, cuarto, action, data } = req.data;

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

            InventariosValidations.put_inventarios_frutaDesverdizado_mover().parse(req.data)
            const { destino, cantidad } = data;

            if (destino === "inventarioFrutaSinProcesar") {
                const update = {
                    '$inc': { 'desverdizado.canastillasIngreso': parseInt(-cantidad) },
                }
                await InventariosService.move_desverdizado_inventario_to_frutaSinProcesar(cuarto, _id, cantidad)
                await registrarPasoLog(
                    log._id,
                    "InventariosService.move_desverdizado_inventario_to_frutaSinProcesar",
                    `Se movieron ${cantidad} canastillas del lote ${_id} del cuarto ${cuarto} al inventario de fruta sin procesar`
                );

                await session.withTransaction(async () => {
                    const newLote = await LotesRepository.actualizar_lote(
                        { _id: _id },
                        update,
                        { user: user._id, action: action, session }
                    )
                    await registrarPasoLog(
                        log._id,
                        "LotesRepository.actualizar_lote",
                        `Lote ${_id} actualizado con desverdizado.canastillasIngreso: -${cantidad}`
                    );

                    const descripcion = `Desverdizado - Canastillas incrementadas: ${cantidad}`
                    await InventariosService.modificarSumarInventarioFrutaSinProocesar(Number(cantidad), user, action, _id, 'lote', log, session, descripcion)

                    if (newLote.desverdizado.canastillasIngreso <= 0) {
                        const update2 = {
                            $unset: { desverdizado: "" }
                        }
                        await LotesRepository.actualizar_lote(
                            { _id: _id },
                            update2,
                            { user: user._id, action: action, session }
                        )

                        await registrarPasoLog(
                            log._id,
                            "LotesRepository.actualizar_lote",
                            `Lote ${_id} actualizado, se eliminó el campo desverdizado`
                        );
                    }
                })

                procesoEventEmitter.emit("server_event", {
                    action: "inventario_frutaSinProcesar",
                    data: {}
                });
                procesoEventEmitter.emit("server_event", {
                    action: "inventario_desverdizado",
                    data: {}
                });
                return true

            } else {
                await InventariosService.move_entre_cuartos_desverdizados(cuarto, destino, _id, cantidad)
                procesoEventEmitter.emit("server_event", {
                    action: "inventario_desverdizado",
                    data: {}
                });
                return true
            }
        } catch (error) {
            console.error(`[ERROR][${new Date().toISOString()}]`, error);
            await ErrorInventarioLogicHandlers(error, log)
        } finally {
            await session.endSession();
            await registrarPasoLog(log._id, "Finalizo la funcion", "Completado");
        }
    }


    //? test
    static async sys_reiniciar_inventario_descarte() {
        try {
            await RedisRepository.sys_reiniciar_inventario_descarte()
        } catch (err) {
            console.error(`[ERROR][${new Date().toISOString()}]`, err);
            throw new InventariosLogicError(470, `Error ${err.type}: ${err.message}`)
        }
    }
    static async sys_add_inventarios_descarte(req) {
        try {
            const { inventario, tipoFruta } = req.data

            await InventariosService.set_inventario_descarte(inventario, tipoFruta)

        } catch (err) {
            console.error(`[ERROR][${new Date().toISOString()}]`, err);
            throw new InventariosLogicError(470, `Error ${err.type}: ${err.message}`)
        }
    }



    static async get_inventarios_ordenVaceo() {
        try {
            const { data, __v } = await InventariosHistorialRepository.get_ordenVaceo();
            const ids = data.map(item => item.toString());
            return { ids, __v }
        } catch (error) {
            console.error(`[ERROR][${new Date().toISOString()}]`, error);
            throw error;
        }
    }
    static async get_inventarios_descarteMaquila() {
        try {
            const inventario = await InventariosHistorialRepository.get_inventario_descarte_maquila({
                query: {
                    estado: 'ACTIVO',
                    loteType: "loteMaquila",
                },
                populate: [
                    { path: 'tipoFruta', select: "tipoFruta" },
                    { path: 'lote', select: "enf" },
                    { path: 'tipoDescarte', select: "nombre inventario" },
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
    static async put_inventarios_salida_descarteMaquila(req) {
        const { user } = req;
        const { data, _id, tipoSalidaSeleccionado, remision, action } = req.data
        let log;

        log = await LogsRepository.create({
            user: user,
            action: action,
            acciones: [{ paso: "Inicio de la función", status: "Iniciado", timestamp: new Date() }]
        });

        const session = await db.InventarioActualDescarte?.db.startSession();
        if (!session) {
            throw new Error("No se pudo iniciar la sesión en la base de datos de catálogos");
        }
        try {
            await session.withTransaction(async () => {
                const registros = await InventariosService.obtener_registros_inventario_descarteMaquila(_id, data, session);
                await InventariosService.eliminarKilos_inventario_descarte(registros, data, log, user, session);
                await InventariosService.modificar_lotes_inventario_descarteMaquila(data, _id, remision, tipoSalidaSeleccionado, log, user, session);
                if (tipoSalidaSeleccionado === 'Comprar') {
                    console.log(registros)
                    await InventariosService.ingresarFrutaDescarteMaquilaDescarteProceso(data, registros[0], _id, log, session);
                    const kilosTotales = Object.values(data).reduce((acc, curr) => acc + Number(curr || 0), 0);
                    await InventariosHistorialRepository.put_cardex_invetariosdescartes(
                        {},
                        {
                            $inc: {
                                [`kilos_ingreso.
                                    ${registros[0].tipoFruta.toString()}
                                    .${registros[0].area}
                                    .${registros[0].tipoDescarte.toString()}`]: kilosTotales,
                            },
                        },
                        {
                            sort: { fecha: -1 },
                            new: true,
                            session,
                        }
                    );

                }
            })

        } catch (err) {
            await registrarPasoLog(log._id, "Error", "Fallido", err.message);
            console.error(`[ERROR][${new Date().toISOString()}]`, err);
            throw new InventariosLogicError(470, `Error ${err.type}: ${err.message}`)
        } finally {
            await session.endSession();
            if (log) {
                await registrarPasoLog(log._id, "Finalizo la funcion", "Completado");
            }
        }
    }
    //#endregion
    //#region Historiales
    static async get_inventarios_historialProcesado_frutaProcesada(req) {
        try {
            InventariosValidations.get_inventarios_historialProcesado_frutaProcesada(req.data)

            const { fechaInicio, fechaFin, tipoFruta } = req.data.filtro
            const query = filtroFechaInicioFin(fechaInicio, fechaFin, {}, 'fechaProcesamiento')
            if (tipoFruta) {
                query.tipoFruta = tipoFruta
            }

            const resultados = await FrutaProcesada.get_frutaProcesada({ query: query })
            return resultados
        } catch (err) {
            console.error(err)
            if (err.status === 522) {
                throw err
            }
            throw new InventariosLogicError(470, `Error ${err.type}: ${err.message}`)
        }
    }
    static async get_inventarios_historiales_ingresoFruta_numeroElementos() {
        try {
            const filtro = {
                operacionRealizada: "crearLote"
            }
            const cantidad = await RecordLotesRepository.obtener_cantidad_recordLote(filtro)
            return cantidad
        } catch (err) {
            if (err.status === 522) {
                throw err
            }
            throw new InventariosLogicError(470, `Error ${err.type}: ${err.message}`)
        }
    }
    static async get_inventarios_historiales_ingresoFruta_registros(req) {
        try {
            const { data } = req
            const { filtro } = data;

            let EF1 = []
            let EF8 = []
            let EF10 = []

            if (filtro.EF1) {
                EF1 = await InventariosService.obtenerRecordLotesIngresoLote(filtro)
            }
            if (filtro.EF8) {
                EF8 = await InventariosService.obtenerRecordLotesIngresoLoteEF8(filtro)
            }
            if (filtro.EF10) {
                EF10 = await InventariosService.obtenerRecordLotesIngresoLoteMaquila(filtro)
            }
            const concatenado = EF1.concat(EF8).concat(EF10)
            const sortResult = concatenado.sort((a, b) => b.fecha_creacion - a.fecha_creacion);
            return sortResult;
        } catch (err) {
            console.error("Error en get_inventarios_historiales_ingresoFruta_registros", err);
            if (err.status === 522) {
                throw err
            }
            throw new InventariosLogicError(470, `Error ${err.type}: ${err.message}`)
        }
    }
    static async put_inventarios_historiales_ingresoFruta_modificar(req) {
        let log;
        const { user } = req;
        const { type } = req.data
        const session = await db.Lotes.db.startSession();

        log = await LogsRepository.create({
            user: user._id,
            action: "put_inventarios_historiales_ingresoFruta_modificar",
            acciones: [{ paso: "Inicio de la función", status: "Iniciado", timestamp: new Date() }]
        })
        try {

            await session.withTransaction(async () => {

                if (type === 'loteEF1') {
                    const { action, data, _id } = req.data

                    InventariosValidations.put_inventarios_historiales_ingresoFruta_modificar(req.data)
                    await registrarPasoLog(log._id, "InventariosValidations.put_inventarios_historiales_ingresoFruta_modificar", "Completado");

                    const newPromedio = Math.round((data.kilos / data.canastillas) * 100000000) / 100000000

                    const queryLote = {
                        ...data,
                        promedio: newPromedio,
                        fecha_ingreso_patio: data.fecha_ingreso_inventario,
                        fecha_salida_patio: data.fecha_ingreso_inventario,
                        fecha_estimada_llegada: data.fecha_ingreso_inventario,
                    }

                    await LotesHelper.actualizar_lotes_helper(
                        { _id: _id }, queryLote,
                        { user: user._id, action: action, session: session, softNotFound: true })
                    await registrarPasoLog(log._id, "LotesHelper.actualizar_lotes_helper", "Completado");

                    await InventarioSimpleHelper.set_inventario_fruta_sin_procesar(_id, data.canastillas, user, session);
                    await registrarPasoLog(log._id, "InventarioSimpleHelper.set_inventario_fruta_sin_procesar", "Completado");

                } else if (type === 'loteEF8') {

                    const { data, _id } = req.data

                    InventariosValidations.put_inventarios_historiales_ingresoFruta_modificar_EF8(data)
                    const oldLoteEf8 = await LotesRepository.getLotesEF8({ ids: [_id] })
                    await registrarPasoLog(log._id, "LotesRepository.getLotesEF8", "Completado");

                    const oldTipoFruta = await TiposFruta.get_tiposFruta({ ids: [oldLoteEf8[0].tipoFruta] })
                    await registrarPasoLog(log._id, "TiposFruta.get_tiposFruta", "Completado");

                    const loteEF8 = await LotesRepository.actualizar_lote_EF8({ _id: _id }, data, { user: user.user._id, action: data.action })
                    await registrarPasoLog(log._id, "LotesRepository.actualizar_lote_EF8", "Completado");

                    const newTipoFruta = await TiposFruta.get_tiposFruta({ ids: [loteEF8.tipoFruta] })
                    await registrarPasoLog(log._id, "TiposFruta.get_tiposFruta", "Completado");

                    const registroIngresoCanastillas = await CanastillasRepository.get_registros_canastillas({ ids: [loteEF8.registroCanastillas] })
                    await registrarPasoLog(log._id, "CanastillasRepository.get_registros_canastillas", "Completado");

                    if (
                        registroIngresoCanastillas[0].cantidad.propias != data.canastillas ||
                        registroIngresoCanastillas[0].cantidad.prestadas != data.canastillasPrestadas
                    ) {
                        await CanastillasRepository.actualizar_registro(
                            { _id: registroIngresoCanastillas[0]._id },
                            { cantidad: { propias: data.canastillas, prestadas: data.canastillasPrestadas } },
                        )

                        await InventariosService.ajustarCanastillasProveedorCliente("65c27f3870dd4b7f03ed9857", Number(-registroIngresoCanastillas[0].cantidad.propias))
                        await registrarPasoLog(log._id, "InventariosService.ajustarCanastillasProveedorCliente", "Completado");

                        await InventariosService.ajustarCanastillasProveedorCliente("65c27f3870dd4b7f03ed9857", Number(data.canastillas))
                        await registrarPasoLog(log._id, "InventariosService.ajustarCanastillasProveedorCliente", "Completado");

                    }

                    const oldKilos = {
                        descarteGeneral: -oldLoteEf8[0].descarteGeneral || 0,
                        pareja: -oldLoteEf8[0].pareja || 0,
                        balin: -oldLoteEf8[0].balin || 0,
                    }
                    const newKilos = {
                        descarteGeneral: loteEF8.descarteGeneral || 0,
                        pareja: loteEF8.pareja || 0,
                        balin: loteEF8.balin || 0,
                    }
                    //se restan los datos antiguos del lote y se suman los nuevos
                    await InventariosService.ingresarDescarteEf8(oldKilos, oldTipoFruta[0].tipoFruta)
                    await registrarPasoLog(log._id, "InventariosService.ingresarDescarteEf8", "Completado");

                    await InventariosService.ingresarDescarteEf8(newKilos, newTipoFruta[0].tipoFruta)
                    await registrarPasoLog(log._id, "InventariosService.ingresarDescarteEf8", "Completado");

                }
            });

            procesoEventEmitter.emit("server_event", {
                action: "descarte_change",
                data: {}
            });

        } catch (err) {
            console.error(`[ERROR][${new Date().toISOString()}]`, err);
            if (err.status === 523) {
                throw err
            }
            throw new InventariosLogicError(470, `Error ${err.type}: ${err.message}`)
        }

    }
    static async get_inventarios_historiales_numero_DespachoDescarte() {
        try {
            const registros = await DespachoDescartesRepository.get_numero_despachoDescartes()
            return registros
        } catch (err) {
            if (err.status === 522) {
                throw err
            }
            throw new InventariosLogicError(470, `Error ${err.type}: ${err.message}`)
        }
    }
    static async get_inventarios_historiales_despachoDescarte(req) {
        try {
            const { data } = req
            const { page } = data;
            const resultsPerPage = 50;

            const historial = await DespachoDescartesRepository.get_data({
                skip: (page - 1) * resultsPerPage,
                limit: resultsPerPage,
                sort: { fecha: -1 },
                populate: [
                    { path: 'cliente', select: 'cliente' },
                    { path: 'tipoFruta', select: 'tipoFruta' },
                    { path: "user", select: "usuario" }
                ]
            });
            return historial;
        } catch (err) {

            if (err.status === 523) {
                throw err
            }
            throw new InventariosLogicError(470, `Error ${err.type}: ${err.message}`)
        }
    }
    static async get_inventarios_historiales_listasDeEmpaque(req) {
        try {
            const { data } = req;
            const { page } = data
            const resultsPerPage = 25;
            const contenedores = await ContenedoresRepository.get_Contenedores_sin_lotes({
                skip: (page - 1) * resultsPerPage,
                limit: resultsPerPage,
                populate: [
                    {
                        path: 'infoContenedor.clienteInfo',
                        select: 'CLIENTE',
                    },
                    {
                        path: 'infoContenedor.calidad',
                        select: 'nombre descripcion',
                    },
                ],
                select: {
                    infoContenedor: 1,
                    __v: 1,
                    numeroContenedor: 1
                },
                query: {
                    "infoContenedor.fechaFinalizado": { $ne: null }
                }
            })
            return contenedores
        } catch (err) {
            if (err.status === 523) {
                throw err
            }
            throw new InventariosLogicError(470, `Error ${err.type}: ${err.message}`)
        }
    }
    static async get_inventarios_historiales_listasDeEmpaque_itemPallets(req) {
        try {
            const { contenedor } = req.data
            const pallets = await ContenedoresRepository.getItemsPallets({
                query: { contenedor: contenedor },
                populate:
                    [
                        { path: 'calidad', select: 'nombre descripcion' },
                        { path: 'pallet', select: 'numeroPallet' },
                        { path: 'contenedor', select: 'numeroContenedor infoContenedor' },
                        { path: 'tipoFruta', select: 'tipoFruta' },
                        {
                            path: 'lote',
                            select: 'enf predio finalizado GGN',
                            populate: {
                                path: 'predio',
                                select: 'PREDIO GGN ICA',

                            }
                        }
                    ]

            });

            const sortItemsPallet = pallets.sort((a, b) => {
                return a.pallet.numeroPallet - b.pallet.numeroPallet;
            });

            return sortItemsPallet
        } catch (err) {
            if (err.status === 523) {
                throw err
            }
            throw new InventariosLogicError(470, `Error ${err.type}: ${err.message}`)
        }
    }

    static async get_inventarios_historiales_listasDeEmpaque_numeroRegistros() {
        const cantidad = await ContenedoresRepository.obtener_cantidad_contenedores()
        return cantidad
    }
    static async get_inventarios_historiales_contenedores(req) {
        try {
            const { data } = req;
            const { contenedores, fechaInicio, fechaFin, clientes, tipoFruta, maquila, exportacion } = data
            let query = {}

            //por numero de contenedores
            if (contenedores.length > 0) {
                query.numeroContenedor = { $in: contenedores }
            }
            //por clientes
            if (clientes.length > 0) {
                query["infoContenedor.clienteInfo"] = { $in: clientes }
            }
            //por tipo de fruta
            if (tipoFruta !== '') {
                query["infoContenedor.tipoFruta"] = tipoFruta
            }
            if (maquila && !exportacion) {
                query["infoContenedor.maquila"] = true
            }
            else if (!maquila && exportacion) {
                query["infoContenedor.maquila"] = false
            }

            query = filtroFechaInicioFin(fechaInicio, fechaFin, query, 'infoContenedor.fechaCreacion')

            const cont = await ContenedoresRepository.get_Contenedores_sin_lotes({
                query: query
            });
            const contIds = cont.map(c => c._id)
            const itemPallets = await ContenedoresRepository.getItemsPallets({
                query: { contenedor: { $in: contIds } },
            })

            const [resumenContenedores, resumenPredios, numerosContenedores] = await Promise.all([
                ContenedoresService.obtenerResumen(itemPallets),
                ContenedoresService.obtenerResumenPredios(itemPallets),
                cont.map(contenedor => contenedor.numeroContenedor)
            ])

            return { ...resumenContenedores, resumenPredios: resumenPredios, contenedores: numerosContenedores }
        } catch (err) {
            console.error(err)
            if (err.status === 522) {
                throw err
            }
            throw new InventariosLogicError(470, `Error ${err.type}: ${err.message}`)
        }
    }
    static async get_inventarios_registros_fruta_descompuesta(req) {
        try {
            // const { data } = req;
            // const { page } = data
            const { page = 1, filtro } = req.data || {};
            const { fechaInicio, fechaFin, tipoFruta } = filtro || {}; //tipo fruta agregado. Jp

            const currentPage = Number(page);
            if (isNaN(currentPage) || currentPage < 1) {
                throw new InventariosLogicError(400, "Número de página inválido");
            }

            const resultsPerPage = 50;

            const skip = (currentPage - 1) * resultsPerPage;

            let query = {};

            if (filtro) {
                query = filtroFechaInicioFin(
                    fechaInicio,
                    fechaFin,
                    query,
                    "createdAt" // ⚠️ verifica que este sea el campo correcto en tu modelo
                );
            }

            //Filtro por tipo de fruta. jp
            if (tipoFruta && tipoFruta !== '') {
                query.tipoFruta = tipoFruta; //listo Jp
            }

            const registros = await FrutaDescompuestaRepository.get_fruta_descompuesta({
                query,
                skip,
                // (page - 1) * resultsPerPage,
                limit: resultsPerPage,
            })

            return registros

        } catch (err) {
            if (err.status === 522) {
                throw err
            }
            throw new InventariosLogicError(470, `Error ${err.type}: ${err.message}`)
        }
    }
    static async get_inventarios_numero_registros_fruta_descompuesta(req) {
        try {
            //nuevo JP
            const { filtro } = req.data || {};
            let query = {};

            if (filtro) {
                const { fechaInicio, fechaFin, tipoFruta } = filtro;
                query = filtroFechaInicioFin(fechaInicio, fechaFin, query, "createdAt");

            //nuevo filtro tipo fruta. Jp
            if (tipoFruta && tipoFruta !== ''){
                query.tipoFruta = tipoFruta; //listo Jp
                }
            }
            //---
            const registros = await FrutaDescompuestaRepository.get_numero_fruta_descompuesta(query);
            return registros

        } catch (err) {
            if (err.status === 522) {
                throw err
            }
            throw new InventariosLogicError(470, `Error ${err.type}: ${err.message}`)
        }
    }
    static async get_inventarios_historiales_numeroCanastillas_registros(req) {
        try {

            const { filtro } = req.data || {}
            let query = {}

            if (filtro) {
                const { fechaInicio, fechaFin } = filtro
                InventariosValidations.validarFiltroBusquedaFechaPaginacion(req.data)
                query = filtroFechaInicioFin(fechaInicio, fechaFin, query, "createdAt") // no pases `query` si no lo necesita
            }
            const registros = await CanastillasRepository.get_numero_registros(query)

            return registros

        } catch (err) {
            if (err.status === 522) {
                throw err
            }
            throw new InventariosLogicError(
                470,
                `Error ${err?.type || 'desconocido'}: ${err?.message || 'sin mensaje'}`
            )
        }
    }
    static async get_inventarios_historiales_canastillas_registros(req) {
        try {
            const { page = 1, filtro } = req.data || {}
            const { fechaInicio, fechaFin } = filtro || {}

            const currentPage = Number(page);
            if (isNaN(currentPage) || currentPage < 1) {
                throw new InventariosLogicError(400, "Número de página inválido");
            }

            const resultsPerPage = 50;
            let skip = (currentPage - 1) * resultsPerPage

            const query = filtro ? filtroFechaInicioFin(fechaInicio, fechaFin, {}, "createdAt") : {}

            const registros = await CanastillasRepository.get_registros_canastillas({ query: query, skip })

            const newRegistros = await InventariosService
                .encontrarDestinoOrigenRegistroCanastillas(registros)

            return newRegistros

        } catch (err) {
            if (err.status === 522) {
                throw err
            }

            const tipoError = err.type || err.name || "ErrorDesconocido";
            const mensaje = err.message || "Sin mensaje definido";

            throw new InventariosLogicError(470, `Error ${tipoError}: ${mensaje}`);
        }
    }
    static async get_inventarios_lotes_infoLotes(req) {
        try {
            const { data } = req
            InventariosValidations.get_inventarios_lotes_infoLotes().parse(data.filtro)
            const {
                _id,
                EF,
                GGN,
                all,
                fechaFin,
                fechaInicio,
                proveedor,
                tipoFecha,
                tipoFruta
            } = data.filtro;

            let query = {}
            let sort
            if (tipoFecha === 'fecha_creacion') {
                sort = { [`${tipoFecha}`]: -1 };
            }
            if (tipoFruta) query.tipoFruta = tipoFruta;
            if (proveedor) query.predio = proveedor;
            if (GGN) query.GGN = GGN;
            if (EF) query.enf = EF;
            if (_id) query._id = _id;
            else if (!EF) query.enf = { $regex: '^E', $options: 'i' }

            query = filtroFechaInicioFin(fechaInicio, fechaFin, query, tipoFecha)

            const lotes = await LotesRepository.getLotes({
                query: query,
                ...(all ? {} : { limit: 50 }),
                sort: sort,
                populate: [
                    { path: 'predio', select: 'PREDIO ICA GGN SISPAP' },
                    { path: 'tipoFruta' },
                    { path: 'salidaExportacion.contenedores', select: 'numeroContenedor' },

                ]
            });
            const lotesMaquila = await LotesRepository.getLotesMaquila({
                query: query,
                ...(all ? {} : { limit: 50 }),
                sort: sort,
                populate: [
                    { path: 'predio', select: 'PREDIO ICA GGN SISPAP' },
                    { path: 'tipoFruta' },
                    { path: 'salidaExportacion.contenedores', select: 'numeroContenedor' },

                ]
            })

            const result = [...lotes, ...lotesMaquila].sort((a, b) => {
                if (a.fecha_creacion < b.fecha_creacion) return 1;
                if (a.fecha_creacion > b.fecha_creacion) return -1;
                return 0;
            })

            return result

        } catch (err) {
            const erroresPermitidos = new Set([518, 523, 419]);

            if (erroresPermitidos.has(err.status)) {
                throw err;
            }
            if (err instanceof ZodError) {
                const mensajeLindo = err.errors[0]?.path + err.errors[0]?.message || "Error desconocido en los datos del lote";
                throw new InventariosLogicError(470, mensajeLindo);
            }
            throw new InventariosLogicError(470, `Error ${err.type}: ${err.message}`)
        }

    }
    static async get_inventarios_registros_cuartosFrios(req) {
        try {
            const { data } = req
            const { page } = data;
            const resultsPerPage = 50;

            const historial = await InventariosHistorialRepository.get_registrosCuartosFrios({
                skip: (page - 1) * resultsPerPage,
                limit: resultsPerPage,
            });

            const usersIds = historial.map(item => item.user);
            const arrUsers = [...new Set(usersIds)];
            const arrUsersFiltrado = arrUsers.filter(user => mongoose.isObjectIdOrHexString(user));

            const usuarios = await UsuariosRepository.get_users({
                ids: arrUsersFiltrado,
                limit: "all"
            });

            historial.forEach(item => {
                const user = usuarios.find(user => user._id.toString() === item.user.toString());
                item.user = user?.nombre || "" + " " + user?.apellido || ""
            })

            return historial;
        } catch (err) {

            if (err.status === 523) {
                throw err
            }
            throw new InventariosLogicError(470, `Error ${err.type}: ${err.message}`)
        }
    }
    static async get_inventarios_historiales_numeroRegistros_cuartosFrios() {
        try {
            const cantidad = await InventariosHistorialRepository.get_numero_registros_cuartosFrios();
            return cantidad;
        } catch (err) {
            if (err.status === 522) {
                throw err;
            }
            throw new InventariosLogicError(470, `Error ${err.type}: ${err.message}`);
        }
    }
    static async get_inventarios_historiales_registros_inventarioDescartes(req) {
        try {
            const { data } = req
            const { page } = data;
            const resultsPerPage = 50;

            const historial = await InventariosHistorialRepository.getInventariosDescarte({
                skip: (page - 1) * resultsPerPage,
                limit: resultsPerPage,
                lean: true
            });

            const out = []

            for (const item of historial) {
                const newObj = Object.create(null);
                for (const [kilosKeys, valueKilos] of Object.entries(item)) {
                    if (kilosKeys === "_id" || kilosKeys === "fecha") {
                        Reflect.set(newObj, kilosKeys, valueKilos);
                        continue;
                    }
                    Reflect.set(newObj, kilosKeys, Object.create(null));
                    const kilosObj = Reflect.get(newObj, kilosKeys);

                    for (const [frutasKeys, value] of Object.entries(valueKilos)) {
                        const fruta = tipoFrutaCache.getTipoFruta(frutasKeys) ? tipoFrutaCache.getTipoFruta(frutasKeys).tipoFruta : ""
                        if (!fruta) continue;
                        Reflect.set(kilosObj, fruta, Object.create(null));
                        const frutaObj = Reflect.get(kilosObj, fruta);


                        for (const [areaKey, valueArea] of Object.entries(value)) {
                            Reflect.set(frutaObj, areaKey, Object.create(null));
                            const areaObj = Reflect.get(frutaObj, areaKey);

                            for (const [keyDescarte, valueDescarte] of Object.entries(valueArea)) {
                                const nombreDescarte = descarteCache.getDescarte(keyDescarte) ? descarteCache.getDescarte(keyDescarte).nombre : ""

                                Reflect.set(areaObj, nombreDescarte, valueDescarte);
                            }
                        }


                    }
                }
                out.push(newObj)
            }

            return out;

        } catch (err) {
            const erroresPermitidos = new Set([518, 523, 419]);

            if (erroresPermitidos.has(err.status)) {
                throw err;
            }
            if (err instanceof ZodError) {
                const mensajeLindo = err.errors[0]?.path + err.errors[0]?.message || "Error desconocido en los datos del lote";
                throw new InventariosLogicError(470, mensajeLindo);
            }
            throw new InventariosLogicError(470, `Error ${err.type}: ${err.message}`)
        }
    }
    static async get_inventarios_historiales_numeroRegistros_inventarioDescartes() {
        try {
            const cantidad = await InventariosHistorialRepository.get_numero_registros_inventarioDescartes();
            return cantidad;
        } catch (err) {
            if (err.status === 522) {
                throw err;
            }
            throw new InventariosLogicError(470, `Error ${err.type}: ${err.message}`);
        }
    }

    static async put_inventarios_historialProcesado_modificarHistorial(req) {
        const { user } = req;
        const { _id, canastillas, action } = req.data;
        console.log("Modificar historial fruta procesada:", req);
        let log
        const session = await db.Lotes.db.startSession();

        log = await LogsRepository.create({
            user: user._id,
            action: action,
            acciones: [{ paso: "Inicio de la función", status: "Iniciado", timestamp: new Date() }]
        })
        try {

            InventariosValidations.put_inventarios_historialProcesado_modificarHistorial().parse(req.data)


            await session.withTransaction(async () => {
                //se modifica el record
                const frutaProcesada = await FrutaProcesada.actualizar_frutaProcesada(
                    { _id: _id },
                    { $inc: { canastillas: -canastillas } },
                    { new: true, user: user, action: action, session: session },
                )
                await registrarPasoLog(
                    log._id,
                    "RecordLotesRepository.modificarRecord",
                    "Completado", `RecordLote ${_id} modificado con kilosVaciados: ${canastillas}`);
                const newKilos = Math.round(frutaProcesada.promedio * canastillas);

                //se modifica el lote
                const lote = await LotesHelper.actualizar_lotes_helper(
                    { _id: frutaProcesada.loteId },
                    { $inc: { kilosVaciados: -newKilos } },
                    { new: true, user: user, action: action, session: session },
                )

                await registrarPasoLog(
                    log._id,
                    "InventariosService.modificarLote_regresoHistorialFrutaProcesada",
                    "Completado", `Lote ${_id} modificado con kilosVaciados: ${newKilos}`);

                const descripcion = `Modificación de historial de fruta procesada - Kilos vaciados ajustados en: ${newKilos}`
                await InventariosService.modificarSumarInventarioFrutaSinProocesar(
                    canastillas, user, action, lote._id, frutaProcesada.loteType, log, session, descripcion
                )

                await IndicadoresAPIRepository.put_indicadores_actualizar_indicador(
                    { $inc: { [`kilos_vaciados.${lote.tipoFruta._id.toString()}`]: -Number(newKilos) } }, session
                );
            })
            procesoEventEmitter.emit("server_event", {
                action: "modificar_historial_fruta_procesada",
                data: {}
            });

        } catch (err) {
            console.error(`[ERROR][${new Date().toISOString()}]`, err);
            await ErrorInventarioLogicHandlers(err, log)
        } finally {
            await session.endSession();
            await registrarPasoLog(log._id, "Finalizo la funcion", "Completado");
        }
    }

    static async put_inventarios_historialDirectoNacional_modificarHistorial(req) {
        const { user } = req;
        const { lote, action, canastillas } = req.data;

        let log
        const session = await db.Lotes.db.startSession();

        log = await LogsRepository.create({
            user: user._id,
            action: action,
            acciones: [{ paso: "Inicio de la función", status: "Iniciado", timestamp: new Date() }]
        })

        try {
            const directoNacional = parseFloat(lote.promedio) * parseInt(canastillas)
            if (typeof directoNacional !== 'number' || isNaN(directoNacional) || directoNacional <= 0) {
                throw new InventariosLogicError(400, `Error: El valor calculado de directoNacional es inválido.`);
            }

            const queryLote = {
                $inc: {
                    directoNacional: -directoNacional,
                    "infoSalidaDirectoNacional.canastillas": -canastillas,
                    "infoSalidaDirectoNacional.version": 1
                }
            }

            await session.withTransaction(async () => {
                const descripcion = `Modificación de historial de directo nacional - Canastillas ajustadas en: ${canastillas}, kilos ajustados en: ${directoNacional}`
                await InventariosService.modificarSumarInventarioFrutaSinProocesar(canastillas, user, action, lote._id, 'lote', log, session, descripcion)

                const loteChanged = await LotesRepository.actualizar_lote(
                    { _id: lote._id, },
                    queryLote,
                    { user: user._id, action: action, session: session }
                )
                if (!(loteChanged.infoSalidaDirectoNacional.version === lote.infoSalidaDirectoNacional.version + 1)) {
                    throw new InventariosLogicError(409, `Error: El lote ha sido modificado, por favor recargue la información e intente de nuevo.`);
                }
                await registrarPasoLog(log._id, "LotesRepository.actualizar_lote", "Completado")
            })

            procesoEventEmitter.emit("server_event", {
                action: "add_lote",
            });

            return { status: 200, message: 'Ok' }
        } catch (err) {
            console.error(`[ERROR][${new Date().toISOString()}]`, err);
            await ErrorInventarioLogicHandlers(err, log)
        } finally {
            await session.endSession();
            await registrarPasoLog(log._id, "Finalizo la funcion", "Completado");
        }
    }


    //#endregion

    //#region insumos
    static async get_inventarios_insumos() {
        try {
            const insumos = await InsumosRepository.get_insumos()
            return insumos
        } catch (err) {
            if (err.status === 522) {
                throw err
            }
            throw new InventariosLogicError(470, `Error ${err.type}: ${err.message}`)
        }
    }
    static async put_inventarios_insumos(req) {
        try {
            const { data: datos, user } = req

            const { data, action } = datos
            await InsumosRepository.modificar_insumo(
                data._id,
                data,
                action,
                user,
            )
        } catch (err) {
            if (err.status === 523) {
                throw err
            }
            throw new InventariosLogicError(470, `Error ${err.type}: ${err.message}`)
        }
    }
    static async post_inventarios_insumos_tipoInsumo(req) {
        try {
            const { data: datos, user } = req
            const { data } = datos;
            await InsumosRepository.add_tipo_insumo(data, user.user)
        } catch (err) {
            if (err.status === 521) {
                throw err
            }
            throw new InventariosLogicError(470, `Error ${err.type}: ${err.message}`)
        }
    }
    static async get_inventarios_insumos_contenedores() {
        try {
            const contenedores = await ContenedoresRepository.get_Contenedores_sin_lotes({
                select: { numeroContenedor: 1, infoContenedor: 1, insumosData: 1, __v: 1 },
                query: {
                    'infoContenedor.cerrado': true,
                    insumosData: { $exists: true },
                    $or: [
                        { 'insumosData.flagInsumos': false }, // Contenedores con flagInsumos en false
                        { 'insumosData.flagInsumos': { $exists: false } } // O contenedores donde no exista flagInsumos
                    ]
                }
            });
            return contenedores
        } catch (err) {
            if (err.status === 522) {
                throw err
            }
            throw new InventariosLogicError(470, `Error ${err.type}: ${err.message}`)
        }
    }
    static async put_inventarios_insumos_contenedores(req) {
        try {
            const { data: datos, user } = req
            const { action, data, _id, __v } = datos
            const query = {
                insumosData: data
            }
            await ContenedoresRepository.modificar_contenedor(
                _id, query, user.user, action, __v
            );
        } catch (err) {
            if (err.status === 523) {
                throw err
            }
            throw new InventariosLogicError(470, `Error ${err.type}: ${err.message}`)
        }
    }
    //endregion
    //#region inventarios historiales
    static async snapshot_inventario_descartes() {
        try {

            const itemsDescartes = await InventariosHistorialRepository.get_inventario_descarteMaquila_generico({
                query: {
                    estado: "ACTIVO",
                    loteType: "Lote"
                },
            })
            const inventario = Object.create(null);
            for (const item of itemsDescartes) {
                if (!inventario[item.tipoFruta.toString()]) {
                    inventario[item.tipoFruta.toString()] = {}
                }
                if (!inventario[item.tipoFruta.toString()][item.area]) {
                    inventario[item.tipoFruta.toString()][item.area] = {}
                }
                if (!inventario[item.tipoFruta.toString()][item.area][item.tipoDescarte.toString()]) {
                    inventario[item.tipoFruta.toString()][item.area][item.tipoDescarte.toString()] = 0
                }
                inventario[item.tipoFruta.toString()][item.area][item.tipoDescarte.toString()] += item.kilosActuales
            }

            await InventariosHistorialRepository.put_cardex_invetariosdescartes(
                {},
                {
                    $set: {
                        inventario: inventario,
                    },
                },
                {
                    sort: { fecha: -1 },
                    new: true,
                }
            );


        } catch (err) {
            if (err.status === 500) {
                throw err
            }
            throw new InventariosLogicError(500, `Error al crear el snapshot del inventario: ${err.message}`)
        }
    }
    static async crear_snapshot_inventario_descartes() {
        try {
            await InventariosHistorialRepository.crearInventarioDescarte()
        } catch (err) {
            if (err.status === 500) {
                throw err
            }
            throw new InventariosLogicError(500, `Error al crear el snapshot del inventario: ${err.message}`)
        }
    }

    //#endregion
}
