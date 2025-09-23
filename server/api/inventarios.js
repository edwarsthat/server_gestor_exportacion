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
import { VariablesDelSistema } from "../Class/VariablesDelSistema.js";
import { InventariosValidations } from "../validations/inventarios.js";
import { filtroFechaInicioFin } from "./utils/filtros.js";
import { transformObjectInventarioDescarte } from "./utils/objectsTransforms.js";
import { InventariosService } from "../services/inventarios.js";
import { RedisRepository } from "../Class/RedisData.js";
import { InventariosHistorialRepository } from "../Class/Inventarios.js";
import { LogsRepository } from "../Class/LogsSistema.js";
import { dataService } from "../services/data.js";
import { ConstantesDelSistema } from "../Class/ConstantesDelSistema.js";
import { registrarPasoLog } from "./helper/logs.js";
import { dataRepository } from "./data.js";
import { TiposFruta } from "../store/TipoFruta.js";
import { UsuariosRepository } from "../Class/Usuarios.js";
import mongoose, { Types } from "mongoose";
import { ContenedoresService } from "../services/contenedores.js";
import { CuartosFrios } from "../store/CuartosFrios.js";
import { parseMultTipoCaja } from "../services/helpers/contenedores.js";
import { db } from "../../DB/mongoDB/config/init.js";
import { ErrorInventarioLogicHandlers } from "./utils/errorsHandlers.js";


export class InventariosRepository {
    //#region inventarios
    static async get_inventarios_frutaDescarte_fruta() {
        try {

            const inventario = await RedisRepository.get_inventarioDescarte();
            return inventario;
        } catch (err) {
            if (err.status === 518 || err.status === 413) {
                throw err
            }
            throw new InventariosLogicError(470, `Error ${err.type}: ${err.message}`)
        }
    }
    static async get_inventarios_canastillas_canastillasCelifrut() {
        try {
            const response = await VariablesDelSistema.obtener_canastillas_inventario()
            return response
        } catch (err) {
            if (err.status === 518 || err.status === 413) {
                throw err
            }
            throw new InventariosLogicError(470, `Error ${err.type}: ${err.message}`)
        }
    }
    static async get_inventarios_frutaSinProcesar_frutaEnInventario() {
        try {
            const resultado = await InventariosHistorialRepository.getInventarioFrutaSinProcesar({
                ids: ["68cecc4cff82bb2930e43d05"]
            })
            return resultado
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
            console.log("Error en put_inventarios_frutaDesverdizando_parametros", err);
            if (err.status === 523) {
                throw err
            }
            throw new InventariosLogicError(470, `Error ${err.type}: ${err.message}`)
        }
    }
    static async put_inventarios_frutaDesverdizado_finalizar(req) {
        try {
            InventariosValidations.put_inventarios_frutaDesverdizado_finalizar().parse(req.data)

            const { data, user } = req
            const { _id, cuarto, action } = data;

            await InventariosService.devolverDesverdizadoInventarioFrutaSinprocesar(cuarto, _id)

            const query = {
                "desverdizado.fechaFinalizar": new Date(),
                "desverdizado.desverdizando": false
            }

            await LotesRepository.actualizar_lote(
                { _id: _id },
                query,
                { user: user._id, action: action }
            )

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
    static async put_inventarios_frutaDescarte_despachoDescarte(req) {
        let descarteLavado, descarteEncerado, tipoFruta
        try {

            InventariosValidations.put_inventarios_frutaDescarte_despachoDescarte().parse(req.data)
            const { user } = req;
            const { data, inventario } = req.data;

            //se crea el registro
            tipoFruta = inventario.tipoFruta;

            ({ descarteLavado, descarteEncerado } = await InventariosService.procesar_formulario_inventario_descarte(inventario));

            const newDespacho = {
                ...data,
                descarteLavado,
                descarteEncerado,
                tipoFruta: tipoFruta,
                user: user._id
            }
            //se modifica el inventario
            const [, registro] = await Promise.all([
                InventariosService.frutaDescarte_despachoDescarte_redis_store(descarteLavado, descarteEncerado, inventario.tipoFruta),
                DespachoDescartesRepository.crear_nuevo_despacho(newDespacho, user._id),
                RedisRepository.salidas_inventario_descartes(inventario, tipoFruta),
            ])

            procesoEventEmitter.emit("server_event", {
                action: "descarte_change",
                data: {}
            });
            return registro

        } catch (err) {
            console.error(`[ERROR][${new Date().toISOString()}][${tipoFruta}]`, err);
            if (err.status === 518 || err.status === 413) {
                throw err
            } else if (err.status === 521) {
                if (descarteLavado && descarteEncerado && tipoFruta) {
                    await InventariosService.frutaDescarte_despachoDescarte_redis_restore(descarteLavado, descarteEncerado, tipoFruta);
                }
            }
            throw new InventariosLogicError(470, `Error ${err.type}: ${err.message}`)
        }

    }
    static async put_inventarios_frutaDescarte_reprocesarFruta(req) {
        let log
        const { user } = req;

        try {
            log = await LogsRepository.create({
                user: user,
                action: "put_inventarios_frutaDescarte_reprocesarFruta",
                acciones: [{ paso: "Inicio de la función", status: "Iniciado", timestamp: new Date() }]
            })
            const logContext = { logId: log._id, user, action: "put_inventarios_frutaDescarte_reprocesarFruta" };

            const { data } = req.data
            const { _id } = req.user

            InventariosValidations.put_inventarios_frutaDescarte_reprocesarFruta().parse(data)
            await registrarPasoLog(log._id, "Validación de datos completada", "Completado");

            const { descarteLavado, descarteEncerado, total } = await InventariosService.procesar_formulario_inventario_descarte(data)
            await registrarPasoLog(log._id, "InventariosService.procesar_formulario_inventario_descarte", "Completado");

            const tipoFruta = await TiposFruta.get_tiposFruta({ query: { tipoFruta: data.tipoFruta } });
            await registrarPasoLog(log._id, "TiposFruta.get_tiposFruta", "Completado");

            //se modifica el inventario
            const [loteCreado] = await Promise.all([
                InventariosService.crear_lote_celifrut(tipoFruta[0]._id, total, _id, logContext),
                RedisRepository.put_reprocesoDescarte(descarteLavado, 'descarteLavado:', data.tipoFruta, null, logContext),
                RedisRepository.put_reprocesoDescarte(descarteEncerado, 'descarteEncerado:', data.tipoFruta, null, logContext),
                RedisRepository.salidas_inventario_descartes(data, data.tipoFruta, logContext),

            ])
            console.log("Lote creado para reproceso de descartes:", loteCreado);
            // Ahora loteCreado tiene el lote REAL
            await VariablesDelSistema.reprocesar_predio_celifrut(loteCreado, total)
            await registrarPasoLog(log._id, "VariablesDelSistema.reprocesar_predio_celifrut", "Completado");

            procesoEventEmitter.emit("server_event", {
                action: "descarte_change",
                data: {}
            });

            return loteCreado._id

        } catch (err) {
            console.error(`[ERROR][${new Date().toISOString()}]`, err);
            await registrarPasoLog(log._id, "Error", "Fallido", err.message);

            if (err.status === 518 || err.status === 413) {
                throw err
            }
            throw new InventariosLogicError(470, `Error ${err.type}: ${err.message}`)
        } finally {
            await registrarPasoLog(log._id, "Finalizo la funcion", "Completado");
        }
    }
    static async put_inventarios_frutaDescarte_reprocesarCelifrut(req) {
        try {
            const { data, user } = req
            const { lote, lotes } = data

            const codigo = await VariablesDelSistema.generar_codigo_celifrut()
            const enf_lote = { ...lote, enf: codigo }
            const newLote = await LotesRepository.crear_lote(enf_lote, user, lotes);

            const query = {
                $inc: {
                    kilosVaciados: newLote.kilos,
                    __v: 1,
                },
                fechaProceso: new Date()
            }


            await LotesRepository.modificar_lote(newLote._id.toString(), query, { user: user, action: "vaciarLote" });
            await VariablesDelSistema.incrementar_codigo_celifrut();


            for (let i = 0; i < lotes.length; i++) {
                const loteObj = await transformObjectInventarioDescarte(lotes[i]);
                if (loteObj.descarteLavado) {
                    await VariablesDelSistema.modificar_inventario_descarte(
                        loteObj._id,
                        loteObj.descarteLavado,
                        'descarteLavado',
                        newLote.tipoFruta
                    )
                }
                if (loteObj.descarteEncerado) {
                    await VariablesDelSistema.modificar_inventario_descarte(
                        loteObj._id,
                        loteObj.descarteEncerado,
                        'descarteEncerado',
                        newLote.tipoFruta
                    )
                }
                await VariablesDelSistema.reprocesar_predio_celifrut(newLote, newLote.kilos)

                procesoEventEmitter.emit("proceso_event", {
                    predio: [newLote]
                });
                procesoEventEmitter.emit("predio_vaciado", {
                    predio: [newLote]
                });

            }
        } catch (err) {
            console.log(err)
            if (
                err.status === 518 ||
                err.status === 413 ||
                err.status === 506 ||
                err.status === 521 ||
                err.status === 511 ||
                err.status === 523
            ) {
                throw err
            }
            throw new InventariosLogicError(470, `Error ${err.type}: ${err.message}`)
        }
    }
    static async post_inventarios_frutaDescarte_frutaDescompuesta(req) {
        let descarteLavado, descarteEncerado, tipoFruta, total
        try {
            InventariosValidations.post_inventarios_frutaDescarte_frutaDescompuesta().parse(req.data)

            const { user } = req;
            const { data, inventario } = req.data;

            //se crea el registro
            tipoFruta = inventario.tipoFruta;

            ({ descarteLavado, descarteEncerado, total } = await InventariosService.procesar_formulario_inventario_descarte(inventario));

            if (total > 50 && user.Rol > 2) throw new Error("No puede crear un registro de fruta descompuesta de tantos kilos")

            const query = {
                ...data,
                descarteLavado,
                descarteEncerado,
                tipoFruta: tipoFruta,
                user: user.user,
                kilos: total
            }
            //se modifica el inventario
            const [, registro] = await Promise.all([
                InventariosService.frutaDescarte_despachoDescarte_redis_store(descarteLavado, descarteEncerado, inventario.tipoFruta),
                FrutaDescompuestaRepository.post_fruta_descompuesta(query, user._id),
                RedisRepository.salidas_inventario_descartes(inventario, tipoFruta),
            ])

            procesoEventEmitter.emit("server_event", {
                action: "descarte_change",
                data: {}
            });

            return registro

        } catch (err) {
            console.error(`[ERROR][${new Date().toISOString()}][${tipoFruta}]`, err);
            if (err.status === 518 || err.status === 413) {
                throw err
            } else if (err.status === 521) {
                if (descarteLavado && descarteEncerado && tipoFruta) {
                    await InventariosService.frutaDescarte_despachoDescarte_redis_restore(descarteLavado, descarteEncerado, tipoFruta);
                }
            }
            throw new InventariosLogicError(470, `Error ${err.type}: ${err.message}`)
        }
    }
    static async put_inventarios_canastillas_celifrut(req) {
        try {
            const { canastillasPrestadas, canastillas } = req.data
            if (canastillas) {
                await InventariosService
                    .ajustarCanastillasProveedorCliente(
                        "65c27f3870dd4b7f03ed9857", Number(canastillas)
                    )
            }
            if (canastillasPrestadas) {
                await VariablesDelSistema.set_canastillas_inventario(canastillasPrestadas, "canastillasPrestadas")
            }
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
                user
            })
            await CanastillasRepository.post_registro(dataRegistro)

            //se modifican las canastillas en los predios y en el inventario de prestadas
            await InventariosService.ajustarCanastillasProveedorCliente(origen, Number(-canastillas));
            await InventariosService.ajustarCanastillasProveedorCliente(destino, Number(canastillas));

            if (accion === 'ingreso') {
                await VariablesDelSistema.set_canastillas_inventario(Number(canastillasPrestadas))
            } else if (accion === "salida") {
                await VariablesDelSistema.set_canastillas_inventario(Number(-canastillasPrestadas))
            }

            return true
        } catch (err) {
            console.log(err)
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
    static async get_inventarios_ordenVaceo_inventario() {

        const resultado = await InventariosHistorialRepository.getInventarioFrutaSinProcesar({
            ids: ["68cecc4cff82bb2930e43d05"]
        })
        return resultado

    }
    static async put_inventarios_frutaSinProcesar_desverdizado(req) {
        try {
            console.log("put_inventarios_frutaSinProcesar_desverdizado", req);
            const { user } = req.user;
            const { _id: loteId, desverdizado, action } = req.data
            const { canastillas, _id: cuartoId } = desverdizado;

            InventariosValidations.put_inventarios_frutaSinProcesar_desverdizado().parse(req.data);

            const update = {
                '$inc': { 'desverdizado.canastillasIngreso': parseInt(canastillas) },
                '$set': { 'desverdizado.desverdizando': true },
                '$addToSet': { 'desverdizado.cuartoDesverdizado': cuartoId }
            }

            await Promise.all([
                InventariosService.modificarInventarioIngresoDesverdizado(canastillas, cuartoId, loteId),
                LotesRepository.actualizar_lote(
                    { _id: loteId },
                    update,
                    { user: user._id, action: action }
                )
            ])

            procesoEventEmitter.emit("server_event", {
                action: "inventario_frutaSinProcesar",
                data: {}
            });
            procesoEventEmitter.emit("server_event", {
                action: "inventario_desverdizado",
                data: {}
            });

        } catch (err) {
            if (err.status === 518 || err.status === 413) {
                throw err
            }
            const message = typeof err.message === "string" ? err.message : "Error inesperado";
            throw new InventariosLogicError(470, `Error ${err.type || "interno"}: ${message}`);
        }
    }
    static async put_inventarios_frutaDesverdizado_mover(req) {
        try {

            InventariosValidations.put_inventarios_frutaDesverdizado_mover().parse(req.data)
            const { user } = req;
            const { _id, cuarto, action, data } = req.data;
            const { destino, cantidad } = data;

            if (destino === "inventarioFrutaSinProcesar") {
                const update = {
                    '$inc': { 'desverdizado.canastillasIngreso': parseInt(-cantidad) },
                }

                const [, newLote] = await Promise.all([
                    InventariosService.move_desverdizado_inventario_to_frutaSinProcesar(cuarto, _id, cantidad),
                    LotesRepository.actualizar_lote(
                        { _id: _id },
                        update,
                        { user: user._id, action: action }
                    )
                ])


                if (newLote.desverdizado.canastillasIngreso <= 0) {
                    const update2 = {
                        $unset: { desverdizado: "" }
                    }
                    LotesRepository.actualizar_lote(
                        { _id: _id },
                        update2,
                        { user: user._id, action: action }
                    )
                }

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
        } catch (err) {
            if (err.status === 518 || err.status === 413) {
                throw err
            }
            const message = typeof err.message === "string" ? err.message : "Error inesperado";
            throw new InventariosLogicError(470, `Error ${err.type || "interno"}: ${message}`);
        }
    }
    static async set_inventarios_inventario(data) {
        try {
            InventariosValidations.set_inventarios_inventario().parse(data)
            const { tipoFruta } = data;
            const { descarteLavado, descarteEncerado } = await InventariosService.procesar_formulario_inventario_descarte(data);

            await Promise.all([
                RedisRepository.put_reprocesoDescarte_set(descarteLavado, "descarteLavado", tipoFruta),
                RedisRepository.put_reprocesoDescarte_set(descarteEncerado, "descarteEncerado", tipoFruta),
            ])

        } catch (err) {
            if (err.status === 518 || err.status === 413) {
                throw err
            }
            throw new InventariosLogicError(470, `Error ${err.type}: ${err.message}`)
        }

    }
    static async put_inventarios_ordenVaceo_vacear(req) {
        let log
        const { user, data } = req;
        const { _id, kilosVaciados, inventario } = data;
        try {
            log = await LogsRepository.create({
                user: user._id,
                action: "put_inventarios_ordenVaceo_vacear",
                acciones: [{ paso: "Inicio de la función", status: "Iniciado", timestamp: new Date() }]
            })

            const loteAnterior = await InventariosService.probar_deshidratacion_loteProcesando(user)
            await registrarPasoLog(log._id, "InventariosService.probar_deshidratacion_loteProcesando", "Completado");

            const query = {
                $inc: {
                    kilosVaciados: kilosVaciados,
                },
                finalizado: false,
                fechaProceso: new Date()
            }
            await LotesRepository.modificar_lote(_id, query, { user: user, action: "vaciarLote" });
            await registrarPasoLog(log._id, "LotesRepository.modificar_lote", "Completado", `Se modificó el lote con ID ${_id} para vaciarlo, kilosVaciados: ${kilosVaciados}`);

            const lote = await LotesRepository.getLotes2({ ids: [_id] });
            await registrarPasoLog(log._id, "LotesRepository.getLotes", "Completado",);

            await Promise.all([
                VariablesDelSistema.modificarInventario(lote[0]._id.toString(), inventario, log._id),
                VariablesDelSistema.borrarDatoOrdenVaceo(lote[0]._id.toString(), log._id),
                VariablesDelSistema.procesarEF1(lote[0], log._id),
                VariablesDelSistema.sumarMetricaSimpleAsync("kilosVaciadosHoy", lote[0].tipoFruta._id.toString(), kilosVaciados, log._id)
            ])
            await registrarPasoLog(log._id, "Promise.all", "Completado");

            if (!loteAnterior === "No vaceo") {
                await LotesRepository.actualizar_lote({ _id: loteAnterior._id }, { finalizado: true })
                await registrarPasoLog(log._id, "LotesRepository.actualizar_lote", "Completado", `Se actualizó el lote ${loteAnterior._id} a finalizado: true`);
            }

            //para lista de empaque
            procesoEventEmitter.emit("predio_vaciado", {
                predio: lote
            });
            //para el desktop app
            procesoEventEmitter.emit("server_event", {
                action: "inventario_frutaSinProcesar",
                data: {
                    predio: lote
                }
            });
        } catch (err) {
            await registrarPasoLog(log._id, "Promise.all", "Error", `Error: ${err.message}`);

            if (err.status === 470) {
                throw err;
            }
            console.error(`[ERROR][${new Date().toISOString()}]`, err);
            throw new Error(`Code ${err.code}: ${err.message}`);

        } finally {
            await registrarPasoLog(log._id, "Finalizo la funcion", "Completado");
        }

    }
    static async put_inventarios_pallet_eviarCuartoFrio(req) {
        const { user } = req;
        let log;

        // Verificar que tengamos la conexión correcta
        const catalogosConnection = db.CuartosFrios?.db || null;
        if (!catalogosConnection) {
            throw new Error("No se encontró la conexión a la base de datos de catálogos");
        }
        // Crear sesión desde la conexión específica
        const session = await catalogosConnection.startSession();

        log = await LogsRepository.create({
            user: user,
            action: "put_inventarios_pallet_eviarCuartoFrio",
            acciones: [{ paso: "Inicio de la función", status: "Iniciado", timestamp: new Date() }]
        });
        try {

            await session.withTransaction(async () => {
                InventariosValidations.put_inventarios_pallet_eviarCuartoFrio().parse(req.data.data);
                const { seleccion, cuartoFrio, items } = req.data.data;
                let tipoFrutaObj = {}
                let operation = "";

                for (const item of items) {
                    const { cajas, tipoCaja, tipoFruta } = item;
                    const mult = parseMultTipoCaja(tipoCaja);
                    if (!tipoFrutaObj[`totalFruta.${tipoFruta}.cajas`]) tipoFrutaObj[`totalFruta.${tipoFruta}.cajas`] = 0;
                    if (!tipoFrutaObj[`totalFruta.${tipoFruta}.kilos`]) tipoFrutaObj[`totalFruta.${tipoFruta}.kilos`] = 0;

                    tipoFrutaObj[`totalFruta.${tipoFruta}.cajas`] += Number.isFinite(cajas) && cajas > 0 ? cajas : 0;
                    tipoFrutaObj[`totalFruta.${tipoFruta}.kilos`] += (Number.isFinite(cajas) && cajas > 0 ? cajas : 0) * mult;
                    operation += `${cajas} cajas de ${tipoCaja}, `
                }

                const idsLimpios = Array.isArray(seleccion)
                    ? [...new Set(
                        seleccion
                            .filter(Boolean)
                            .map(x => Types.ObjectId.isValid(x) ? new Types.ObjectId(x) : null)
                            .filter(Boolean)
                    )]
                    : [];

                await CuartosFrios.actualizar_cuartoFrio(
                    { _id: cuartoFrio },
                    {
                        $addToSet: {
                            inventario: { $each: idsLimpios }
                        },
                        $inc: tipoFrutaObj
                    },
                    {
                        action: "Ingreso",
                        operation: operation,
                        description: 'Se agregó cajas a ' + cuartoFrio,
                        user: user._id,
                        session
                    }
                );

                await registrarPasoLog(log._id, "Operación completada exitosamente", "Completado", null, { session });
            });

            await registrarPasoLog(log._id, "Transacción completada", "Completado");

            procesoEventEmitter.emit("server_event", {
                action: "lista_empaque_update",
            });
            procesoEventEmitter.emit("listaempaque_update");


            return true;

        } catch (err) {
            console.error(`[ERROR][${new Date().toISOString()}]`, err);
            if (log?._id) await registrarPasoLog(log._id, "Error en transacción", "Fallido", err?.message ?? String(err));
            if (err?.status) throw err;
            throw Object.assign(new Error(err?.message ?? 'Error inesperado'), { status: 500 });

        } finally {
            await session.endSession();
            if (log) {
                await registrarPasoLog(log._id, "Finalizo la funcion", "Completado");
            }
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
    static async get_inventarios_cuartosFrios_listaEmpaque() {
        try {
            const cuartosFrios = await CuartosFrios.get_cuartosFrios({ select: { inventario: 1, nombre: 1 } });
            const inventarioTotal = []
            const infoCuartos = []
            for (const cuarto of cuartosFrios) {
                inventarioTotal.push(...cuarto.inventario)
                infoCuartos.push({ _id: cuarto._id, nombre: cuarto.nombre })
            }
            return { inventarioTotal, infoCuartos }
        } catch (err) {
            console.error(`[ERROR][${new Date().toISOString()}]`, err);
            throw new InventariosLogicError(470, `Error ${err.type}: ${err.message}`)
        }
    }
    static async get_inventarios_cuartosFrios() {
        try {
            return await CuartosFrios.get_cuartosFrios();
        } catch (err) {
            console.error(`[ERROR][${new Date().toISOString()}]`, err);
            throw new InventariosLogicError(470, `Error ${err.type}: ${err.message}`)
        }
    }
    static async get_inventarios_cuartosFrios_detalles(req) {
        try {
            const { data } = req.data
            const contenedores = await ContenedoresRepository.getContenedores({ query: { "pallets.EF1._id": data.inventario }, select: { numeroContenedor: 1, pallets: 1 } });
            const items = data.inventario.map(id => id.toString());
            const result = await InventariosService.itemsCuartosFrios(items, contenedores)
            return result
        } catch (err) {
            console.error(`[ERROR][${new Date().toISOString()}]`, err);
            throw new InventariosLogicError(470, `Error ${err.type}: ${err.message}`)
        }
    }
    static async put_inventarios_cuartosFrios_salida_item(req) {
        const { user } = req;
        let log;

        log = await LogsRepository.create({
            user: user,
            action: "put_inventarios_cuartosFrios_salida_item",
            acciones: [{ paso: "Inicio de la función", status: "Iniciado", timestamp: new Date() }]
        });

        const session = await db.CuartosFrios?.db.startSession();

        if (!session) {
            throw new Error("No se pudo iniciar la sesión en la base de datos de catálogos");
        }

        try {
            await session.withTransaction(async () => {
                const { itemsIds, cuartoId } = req.data.data
                console.log("itemsIds", itemsIds)
                const contenedores = await ContenedoresRepository.getContenedores({
                    query: { "pallets.EF1._id": { $in: itemsIds } }, select: { numeroContenedor: 1, pallets: 1 }
                });

                const items = await InventariosService.itemsCuartosFrios(itemsIds, contenedores)
                const { out, operation } = await InventariosService.sumatorias_items_cuartosFrios(items)
                const itemsIdsLimpios = items.map(it => it._id)

                await CuartosFrios.actualizar_cuartoFrio(
                    { _id: cuartoId },
                    {
                        $pull: {
                            inventario: { $in: itemsIdsLimpios }
                        },
                        $inc: out

                    },
                    {
                        action: "Salida",
                        operation: operation,
                        description: 'Salida del cuarto => ' + cuartoId,
                        user: user._id,
                        session
                    }
                );
            })

            procesoEventEmitter.emit("server_event", {
                action: "lista_empaque_update",
            });
            procesoEventEmitter.emit("listaempaque_update");

            return true

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
    static async directoNacional(req) {
        const { user } = req;
        const { data, lote, action } = req.data

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
            await session.withTransaction(async () => {
                // Usar el mismo ID para todas las operaciones
                const loteId = lote._id || data.lote;

                const queryLote = {
                    $inc: {
                        directoNacional: lote.promedio * data.canastillas,
                    },
                    infoSalidaDirectoNacional: data
                };

                await LotesRepository.actualizar_lote(
                    { _id: loteId },
                    queryLote,
                    { new: true, user: user, action: action, session: session }
                );
                await registrarPasoLog(log._id, "LotesRepository.actualizar_lote", "Completado", `Lote ${loteId} actualizado con directoNacional: ${lote.promedio * data.canastillas}`);

                const descripcion = `Directo Nacional - Canastillas decrementadas: ${data.canastillas}`
                await InventariosService.modificarRestarInventarioFrutaSinProocesar(data, user, action, loteId, log, session, descripcion);
            });

        } catch (error) {
            console.error(`[ERROR][${new Date().toISOString()}]`, error);
            await registrarPasoLog(log._id, "Error en transacción", "Fallido", error.message);
            throw error; // Re-lanzar el error en lugar de solo manejarlo
        } finally {
            await session.endSession();
            await registrarPasoLog(log._id, "Finalizo la funcion", "Completado");
        }

        // const data = req.data

        // const { _id, infoSalidaDirectoNacional, directoNacional, inventario, action } = data;
        // const query = {
        //     $inc: {
        //         directoNacional: directoNacional,
        //         __v: 1
        //     },
        //     infoSalidaDirectoNacional: infoSalidaDirectoNacional
        // };

        // const lote = await LotesRepository.actualizar_lote(
        //     { _id: _id },
        //     query,
        //     { new: true, user: user, action: action }
        // );

        // await VariablesDelSistema.modificarInventario(_id, inventario);
        // await LotesRepository.deshidratacion(lote);

        procesoEventEmitter.emit("server_event", {
            action: "directo_nacional",
            data: {}
        });

    }

    //#endregion
    //#region Historiales
    static async get_inventarios_historialProcesado_frutaProcesada(data) {
        try {
            InventariosValidations.get_inventarios_historialProcesado_frutaProcesada(data.data)
            const { fechaInicio, fechaFin } = data.data
            let query = {
                operacionRealizada: 'vaciarLote'
            }

            query = filtroFechaInicioFin(fechaInicio, fechaFin, query, 'fecha')

            const recordLotes = await RecordLotesRepository.getVaciadoRecord({ query: query })
            const lotesIds = recordLotes.map(lote => lote.documento._id);
            const usuariosIds = recordLotes.map(lote => lote.user);

            const arrUsers = [...new Set(usuariosIds)];
            const arrUsersFiltrado = arrUsers.filter(user => mongoose.isObjectIdOrHexString(user));
            const arrLotes = [...new Set(lotesIds)];

            const [lotes, usuarios] = await Promise.all([
                LotesRepository.getLotes2({
                    ids: arrLotes,
                    limit: "all",
                    select: { enf: 1, promedio: 1, tipoFruta: 1, __v: 1, GGN: 1 }
                }),
                UsuariosRepository.get_users({
                    ids: arrUsersFiltrado,
                    limit: "all"
                })
            ]);

            const resultado = recordLotes.map(item => {
                const lote = lotes.find(lote => lote._id.toString() === item.documento._id);
                const user = usuarios.find(user => user._id.toString() === item.user.toString());

                if (lote) {
                    if (Object.prototype.hasOwnProperty.call(item.documento, "$inc")) {
                        item.documento = { ...lote, kilosVaciados: item.documento.$inc.kilosVaciados, }
                        return { ...item._doc, user: user?.nombre || "" + " " + user?.apellido || "" }
                    }
                    else {
                        return { ...item._doc, user: user?.nombre || "" + " " + user?.apellido || "" }
                    }
                }
                return null
            }).filter(item => item !== null);
            return resultado
        } catch (err) {
            console.log(err)
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

            let result = []

            if (filtro.EF1 && !filtro.EF8) {
                result = await InventariosService.obtenerRecordLotesIngresoLote(filtro)
            }
            else if (filtro.EF8 && !filtro.EF1) {
                result = await InventariosService.obtenerRecordLotesIngresoLoteEF8(filtro)
            } else {
                result = await InventariosService.obtenerRecordLotesIngresolote_EF1_EF8(filtro)
            }
            return result;
        } catch (err) {
            console.log("Error en get_inventarios_historiales_ingresoFruta_registros", err);
            if (err.status === 522) {
                throw err
            }
            throw new InventariosLogicError(470, `Error ${err.type}: ${err.message}`)
        }
    }
    static async put_inventarios_historiales_ingresoFruta_modificar(req) {
        let log

        try {
            const { user } = req;
            const { type } = req.data
            log = await LogsRepository.create({
                user: user._id,
                action: "put_inventarios_historiales_ingresoFruta_modificar",
                acciones: [{ paso: "Inicio de la función", status: "Iniciado", timestamp: new Date() }]
            })
            if (type === 'loteEF1') {
                const { action, data, _id } = req.data

                InventariosValidations.put_inventarios_historiales_ingresoFruta_modificar(req.data)
                await registrarPasoLog(log._id, "InventariosValidations.put_inventarios_historiales_ingresoFruta_modificar", "Completado");

                const queryLote = {
                    ...data,
                    fecha_ingreso_patio: data.fecha_ingreso_inventario,
                    fecha_salida_patio: data.fecha_ingreso_inventario,
                    fecha_estimada_llegada: data.fecha_ingreso_inventario,
                }

                await InventariosService.modificarLote_regresoHistorialFrutaIngreso(
                    _id, queryLote, user, action
                )
                await registrarPasoLog(log._id, "InventariosService.modificarLote_regresoHistorialFrutaIngreso", "Completado");


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

                    await VariablesDelSistema.modificar_canastillas_inventario(-Number(registroIngresoCanastillas[0].cantidad.prestadas), "canastillasPrestadas")
                    await registrarPasoLog(log._id, "VariablesDelSistema.modificar_canastillas_inventario", "Completado");

                    await VariablesDelSistema.modificar_canastillas_inventario(Number(data.canastillasPrestadas), "canastillasPrestadas")
                    await registrarPasoLog(log._id, "VariablesDelSistema.modificar_canastillas_inventario", "Completado");

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

            const historial = await DespachoDescartesRepository.get_historial_descarte({
                skip: (page - 1) * resultsPerPage,
                limit: resultsPerPage,
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
            const contenedores = await ContenedoresRepository.getContenedores({
                skip: (page - 1) * resultsPerPage,
                limit: resultsPerPage,
                select: {
                    infoContenedor: 1,
                    __v: 1,
                    pallets: 1,
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
    static async get_inventarios_historiales_listasDeEmpaque_numeroRegistros() {
        const cantidad = await ContenedoresRepository.obtener_cantidad_contenedores()
        return cantidad
    }
    static async get_inventarios_historiales_contenedores(req) {
        try {
            const { data } = req;
            const { contenedores, fechaInicio, fechaFin, clientes, tipoFruta } = data
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

            query = filtroFechaInicioFin(fechaInicio, fechaFin, query, 'infoContenedor.fechaCreacion')

            const cont = await ContenedoresRepository.getContenedores({
                query: query
            });

            const [resumenContenedores, resumenPredios, numerosContenedores] = await Promise.all([
                ContenedoresService.obtenerResumen(cont),
                ContenedoresService.obtenerResumenPredios(cont),
                cont.map(contenedor => contenedor.numeroContenedor)
            ])

            return { ...resumenContenedores, resumenPredios: resumenPredios, contenedores: numerosContenedores }
        } catch (err) {
            console.log(err)
            if (err.status === 522) {
                throw err
            }
            throw new InventariosLogicError(470, `Error ${err.type}: ${err.message}`)
        }
    }
    static async get_inventarios_registros_fruta_descompuesta(req) {
        try {
            const { data } = req;
            const { page } = data
            const resultsPerPage = 50;

            const registros = await FrutaDescompuestaRepository.get_fruta_descompuesta({
                skip: (page - 1) * resultsPerPage,

            })

            return registros

        } catch (err) {
            if (err.status === 522) {
                throw err
            }
            throw new InventariosLogicError(470, `Error ${err.type}: ${err.message}`)
        }
    }
    static async get_inventarios_numero_registros_fruta_descompuesta() {
        try {
            const registros = await FrutaDescompuestaRepository.get_numero_fruta_descompuesta()
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
            InventariosValidations.get_inventarios_lotes_infoLotes().parse(data)
            const {
                _id,
                EF,
                GGN,
                all,
                fechaFin,
                fechaInicio,
                proveedor,
                tipoFecha,
                tipoFruta2 = {}
            } = data;

            console.log(tipoFruta2)
            let query = {}
            let sort
            if (tipoFecha === 'fecha_creacion') {
                sort = { [`${tipoFecha}`]: -1 };
            }
            if (tipoFruta2 && Object.keys(tipoFruta2).length > 0) query.tipoFruta = tipoFruta2;
            if (proveedor) query.predio = proveedor;
            if (GGN) query.GGN = GGN;
            if (EF) query.enf = EF;
            if (_id) query._id = _id;
            else if (!EF) query.enf = { $regex: '^E', $options: 'i' }

            query = filtroFechaInicioFin(fechaInicio, fechaFin, query, tipoFecha)

            const lotes = await LotesRepository.getLotes2({
                query: query,
                limit: all ? 'all' : 50,
                sort: sort
            });
            const contenedoresArr = []

            lotes.forEach(element => {
                element.contenedores.forEach(contenedor => contenedoresArr.push(contenedor))
            })
            const contenedoresSet = new Set(contenedoresArr)
            const cont = [...contenedoresSet]
            let contenedores
            if (cont.length > 0) {
                contenedores = await ContenedoresRepository.getContenedores({
                    ids: cont,
                    select: { numeroContenedor: 1, pallets: 1 }
                });
            } else {
                contenedores = []
            }

            return { lotes: lotes, contenedores: contenedores }

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
            const { page, resultsPerPage } = data;

            const historial = await InventariosHistorialRepository.getInventariosDescarte({
                skip: (page - 1) * resultsPerPage,
                limit: resultsPerPage,
            });
            return historial;

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
    static async put_inventarios_ordenVaceo_modificar(req) {

        const { user, action } = req;
        const { data } = req.data;

        let log
        const session = await db.Lotes.db.startSession();

        try {
            log = await LogsRepository.create({
                user: user._id,
                action: action,
                acciones: [{ paso: "Inicio de la función", status: "Iniciado", timestamp: new Date() }]
            })
            const ids = data.map(item => new mongoose.Types.ObjectId(item));
            await session.withTransaction(async () => {
                await InventariosHistorialRepository.put_inventarioSimple(
                    { _id: "68d1c0410f282bcb84388dd3" },
                    { $set: { ordenVaceo: ids } },
                    { session, user: user._id, action: "ingreso_ordenVaceo", operation: "ingreso", skipAudit: false }
                );
            })
            await registrarPasoLog(log._id, "InventariosHistorialRepository.put_inventarioSimple", "Completado");

            procesoEventEmitter.emit("server_event", {
                action: "modificar_orden_vaceo",
                data: {}
            });

        } catch (err) {
            console.error(`[ERROR][${new Date().toISOString()}]`, err);
            ErrorInventarioLogicHandlers(err, log)
        } finally {
            await session.endSession();
            await registrarPasoLog(log._id, "Finalizo la funcion", "Completado");
        }

    }
    static async put_inventarios_historialProcesado_modificarHistorial(req) {
        try {
            const { user } = req;
            const { data } = req;

            InventariosValidations.put_inventarios_historialProcesado_modificarHistorial().parse(data)

            const { _id, kilosVaciados, inventario, action, historialLote } = data;
            const { _idRecord, kilosHistorial, __vHistorial } = historialLote;

            //modificar Lote
            const queryLote = {
                $inc: {
                    kilosVaciados: kilosVaciados,
                    __v: 1
                }
            }

            //se modifica el lote
            const lote = await InventariosService.modificarLote_regresoHistorialFrutaProcesada(
                _id, queryLote, user, action, kilosVaciados
            )

            // modifica el inventario
            await InventariosService.modificarInventario_regresoHistorialFrutaProcesada(lote, inventario, action, user)

            //se modifica el registro
            const queryRecord = {
                $inc: {
                    "documento.$inc.kilosVaciados": kilosHistorial,
                    __v: 1
                }
            }

            await Promise.all([
                RecordLotesRepository.modificarRecord(_idRecord, queryRecord, __vHistorial),
                VariablesDelSistema.sumarMetricaSimpleAsync("kilosVaciadosHoy", lote[0].tipoFruta, kilosHistorial)
            ])

            procesoEventEmitter.emit("server_event", {
                action: "modificar_historial_fruta_procesada",
                data: {}
            });

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
    static async put_inventarios_historialDirectoNacional_registros(req) {
        try {
            const { data } = req
            const { fechaInicio, fechaFin } = data
            let query = {
                operacionRealizada: 'directoNacional'
            }

            query = filtroFechaInicioFin(fechaInicio, fechaFin, query, 'fecha')

            const recordLotes = await RecordLotesRepository.getRecordLotes({ query: query })
            const lotesIds = recordLotes.map(lote => lote.documento._id);

            const lotes = await LotesRepository.getLotes({
                ids: lotesIds,
                select: { enf: 1, promedio: 1, tipoFruta: 1, __v: 1 }
            });
            // se agrega la informacion de los lotes a los items de los records
            const resultado = recordLotes.map(item => {
                const lote = lotes.find(lote => lote._id.toString() === item.documento._id);
                if (lote) {
                    if (Object.prototype.hasOwnProperty.call(item.documento, "$inc")) {
                        item.documento = { ...lote, directoNacional: item.documento.$inc.directoNacional }
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
    static async put_inventarios_historialDirectoNacional_modificarHistorial(data) {
        try {
            const { _id, directoNacional, inventario, action, historialLote } = data.data;
            const { _idRecord, kilosHistorial, __vHistorial } = historialLote;
            const user = data.user.user;
            const queryLote = {
                $inc: {
                    directoNacional: directoNacional,
                }
            }
            const queryRecord = {
                $inc: {
                    "documento.$inc.directoNacional": kilosHistorial,
                }
            }

            await Promise.all([
                VariablesDelSistema.modificarInventario(_id, -inventario),
                LotesRepository.actualizar_lote(
                    { _id: _id },
                    queryLote,
                    { user: user._id, action: action }
                ),
                RecordLotesRepository.modificarRecord(_idRecord, queryRecord, __vHistorial)
            ])

            return { status: 200, message: 'Ok' }
        } catch (err) {
            if (
                err.status === 518 ||
                err.status === 523 ||
                err.status === 515
            ) {
                throw err
            }
            throw new InventariosLogicError(470, `Error ${err.type}: ${err.message}`)
        }
    }
    static async put_inventarios_historiales_despachoDescarte(req) {
        try {
            let { user } = req
            const { action, data, _id } = req.data
            InventariosValidations.put_inventarios_historiales_despachoDescarte(data)
            const inventario = {}
            const newRegistro = {}
            //se obtienen los datos de inventario
            Object.keys(data).forEach(
                key => {
                    if (key.startsWith("descarteLavado") || key.startsWith("descarteEncerado")) {
                        inventario[key] = data[key]
                    } else {
                        newRegistro[key] = data[key]
                    }
                }
            );
            const { descarteLavado, descarteEncerado, total } = await InventariosService.procesar_formulario_inventario_registro_descarte(inventario)

            const { cambioFruta, cambioIventario, registro } = await InventariosService.revisar_cambio_registro_despachodescarte(_id, data)

            if (cambioFruta || cambioIventario) {
                await InventariosService.modificar_inventario_registro_cambioFruta(registro, data, descarteLavado, descarteEncerado)
            }

            const query = {
                ...newRegistro,
                kilos: total,
                descarteEncerado,
                descarteLavado
            }

            await DespachoDescartesRepository.actualizar_registro(
                { _id: _id },
                query,
                { user: user._id, action: action }
            )

            procesoEventEmitter.emit("server_event", {
                action: "descarte_change",
                data: {}
            });

        } catch (err) {
            console.log(err)
            if (err.status === 521 || err.status === 518) {
                throw err
            }
            throw new InventariosLogicError(470, `Error ${err.type}: ${err.message}`)
        }
    }
    static async put_inventarios_registros_fruta_descompuesta(req) {
        try {
            let { user } = req
            const { action, data, _id } = req.data

            InventariosValidations.put_inventarios_registros_fruta_descompuesta().parse(data)

            const inventario = {}
            const newRegistro = {}
            //se obtienen los datos de inventario
            Object.keys(data).forEach(
                key => {
                    if (key.startsWith("descarteLavado") || key.startsWith("descarteEncerado")) {
                        inventario[key] = data[key]
                    } else {
                        newRegistro[key] = data[key]
                    }
                }
            );

            const { descarteLavado, descarteEncerado, total } = await InventariosService.procesar_formulario_inventario_registro_descarte(inventario)
            const { cambioFruta, cambioIventario, registro } = await InventariosService.revisar_cambio_registro_frutaDescompuestae(_id, data)

            if (cambioFruta || cambioIventario) {
                await InventariosService.modificar_inventario_registro_cambioFruta(registro, data, descarteLavado, descarteEncerado)
            }

            const query = {
                ...newRegistro,
                kilos_total: total,
                descarteEncerado,
                descarteLavado
            }

            await FrutaDescompuestaRepository.actualizar_registro(
                { _id: _id },
                query,
                { user: user._id, action: action }
            )

            procesoEventEmitter.emit("server_event", {
                action: "descarte_change",
                data: {}
            });
        } catch (err) {
            if (err.status === 523) {
                throw err
            }
            throw new InventariosLogicError(470, `Error ${err.type}: ${err.message}`)
        }
    }

    //#endregion
    //#region ingresos
    static async get_inventarios_ingresos_ef() {
        try {
            const enf1 = await VariablesDelSistema.generarEF1();
            return { ef1: enf1 }
        }
        catch (err) {
            if (err.status === 506) {
                throw err
            }
            throw new InventariosLogicError(470, `Error ${err.type}: ${err.message}`)
        }
    }
    static async post_inventarios_ingreso_lote(req) {
        const { user } = req;
        const { data, action } = req;

        let log
        const session = await db.Lotes.db.startSession();

        try {
            log = await LogsRepository.create({
                user: user._id,
                action: action,
                acciones: [{ paso: "Inicio de la función", status: "Iniciado", timestamp: new Date() }]
            })
            const { dataLote: datos, dataCanastillas } = data

            const datosValidados = InventariosValidations.post_inventarios_ingreso_lote().parse(datos)
            await registrarPasoLog(log._id, "InventariosValidations.post_inventarios_ingreso_lote", "Completado");

            const tipoFruta = await ConstantesDelSistema.get_constantes_sistema_tipo_frutas2(datosValidados.tipoFruta, log._id)
            const [{ precioId, proveedor }, ef1] = await Promise.all([
                InventariosService.obtenerPrecioProveedor(datosValidados.predio, tipoFruta[0].tipoFruta),
                dataService.get_ef1_serial(data.fecha_estimada_llegada, log._id),
            ])
            await registrarPasoLog(log._id, "Promise.all obtener precio, proveedor, ef1 y tipo de fruta", "Completado");

            if (datos.GGN)
                await InventariosService.validarGGN(proveedor, tipoFruta[0].tipoFruta, user)

            const query = await InventariosService.construirQueryIngresoLote(datosValidados, ef1, precioId, tipoFruta[0], user);

            //Se crean los datos del registro de canastillas
            const dataRegistro = await InventariosService.crearRegistroInventarioCanastillas({
                destino: "65c27f3870dd4b7f03ed9857",
                origen: datos.predio,
                observaciones: "ingreso lote",
                fecha: datos.fecha_estimada_llegada,
                canastillas: dataCanastillas.canastillasPropias,
                canastillasPrestadas: dataCanastillas.canastillasPrestadas,
                accion: "ingreso",
                user
            })
            await registrarPasoLog(log._id, "InventariosService.crearRegistroInventarioCanastillas", "Completado");

            let lote
            await session.withTransaction(async () => {

                lote = await LotesRepository.addLote(query, user, { session });
                await registrarPasoLog(log._id, "LotesRepository.addLote", "Completado");

                // await VariablesDelSistema.ingresarInventario(lote._id.toString(), Number(lote.canastillas));
                await InventariosHistorialRepository.put_inventarioSimple(
                    { _id: "68cecc4cff82bb2930e43d05" },
                    { $push: { inventario: { lote: lote._id, canastillas: Number(lote.canastillas) } } },
                    { session, user: user._id, action: "ingreso_lote", operation: "ingreso", skipAudit: false }
                );
                await registrarPasoLog(log._id, "VariablesDelSistema.ingresarInventario", "Completado");

                await InventariosService
                    .ajustarCanastillasProveedorCliente(datos.predio, -Number(dataCanastillas.canastillasPropias), user, session)
                await registrarPasoLog(log._id, "InventariosService.ajustarCanastillasProveedorCliente", "Completado");

                await InventariosService
                    .ajustarCanastillasProveedorCliente("65c27f3870dd4b7f03ed9857", Number(dataCanastillas.canastillasPropias), user, session)
                await registrarPasoLog(log._id, "InventariosService.ajustarCanastillasProveedorCliente", "Completado");

                await CanastillasRepository.post_registro(dataRegistro, user, { session })
                await registrarPasoLog(log._id, "CanastillasRepository.post_registro", "Completado");

                await dataRepository.incrementar_ef1_serial(session)
                await registrarPasoLog(log._id, "dataService.incrementar_ef1_serial", "Completado");

            }, {
                readConcern: { level: "snapshot" },
                writeConcern: { w: 1 },
                maxTimeMS: 10000
            })

            await VariablesDelSistema
                .modificar_canastillas_inventario(dataCanastillas.canastillasPrestadas, "canastillasPrestadas")
            await registrarPasoLog(log._id, "VariablesDelSistema.modificar_canastillas_inventario", "Completado");

            procesoEventEmitter.emit("server_event", {
                action: "add_lote",
            });

        } catch (err) {
            console.error(`[ERROR][${new Date().toISOString()}]`, err);
            ErrorInventarioLogicHandlers(err, log)
        } finally {
            await session.endSession();
            await registrarPasoLog(log._id, "Finalizo la funcion", "Completado");
        }
    }
    static async post_inventarios_EF8(req) {
        const { user } = req;
        let log

        try {
            log = await LogsRepository.create({
                user: user._id,
                action: "post_inventarios_EF8",
                acciones: [{ paso: "Inicio de la función", status: "Iniciado", timestamp: new Date() }]
            })
            const { data } = req.data;
            InventariosValidations.post_inventarios_EF8().parse(data)
            await registrarPasoLog(log._id, "InventariosValidations.post_inventarios_EF8", "Completado");

            const [EF8, tipoFruta] = await Promise.all([
                dataService.get_ef8_serial(data.fecha_ingreso_inventario, log._id),
                ConstantesDelSistema.get_constantes_sistema_tipo_frutas2(data.tipoFruta, log._id)
            ])

            const { precioId, } = await InventariosService.obtenerPrecioProveedor(data.predio, tipoFruta[0].tipoFruta);
            await registrarPasoLog(log._id, "InventariosService.obtenerPrecioProveedor", "Completado");

            const { loteEF8, } = await InventariosService.construir_ef8_lote(data, EF8, precioId, user);
            await registrarPasoLog(log._id, "InventariosService.construir_ef8_lote", "Completado");

            const registroCanastillas = await InventariosService.ingresarCanasillas(data, user);
            await registrarPasoLog(log._id, "InventariosService.ingresarCanasillas", "Completado");

            await LotesRepository.crear_lote_EF8({ ...loteEF8, registroCanastillas: registroCanastillas._id }, user, log._id);
            await registrarPasoLog(log._id, "LotesRepository.crear_lote_EF8", "Completado");

            await InventariosService.ingresarDescarteEf8(loteEF8, tipoFruta[0].tipoFruta, log._id)
            await registrarPasoLog(log._id, "InventariosService.ingresarDescarteEf8", "Completado");

            await dataRepository.incrementar_ef8_serial()
            await registrarPasoLog(log._id, "dataService.incrementar_ef8_serial", "Completado");

            procesoEventEmitter.emit("server_event", {
                action: "descarte_change",
                data: {}
            });

        } catch (err) {
            await registrarPasoLog(log._id, "Error", "Fallido", err.message);
            if (err.status === 521) {
                throw err
            }
            if (err instanceof ZodError) {
                const mensajeLindo = err.errors[0]?.message || "Error desconocido en los datos del lote";
                throw new InventariosLogicError(470, mensajeLindo);
            }
            throw new InventariosLogicError(470, err.message)

        } finally {
            await registrarPasoLog(log._id, "Finalizo la funcion", "Completado");
        }

    }
    //#endregion
    //#region programacion
    static async get_inventarios_programaciones_contenedores(req) {
        try {
            const { data } = req
            const { fecha } = data;
            const fechaActual = new Date(fecha);
            const year = fechaActual.getFullYear();
            const month = fechaActual.getMonth();

            const startDate = new Date(Date.UTC(year, month, 1));
            const endDate = new Date(Date.UTC(year, month + 1, 1));

            const query = {
                "infoContenedor.fechaInicio": {
                    $gte: startDate,
                    $lt: endDate
                }
            };

            const response = await ContenedoresRepository.get_Contenedores_sin_lotes({
                select: { infoContenedor: 1, numeroContenedor: 1, __v: 1 },
                query: query
            });
            return response;
        } catch (err) {
            if (err.status === 522) {
                throw err
            }
            throw new InventariosLogicError(470, `Error ${err.type}: ${err.message}`)

        }
    }
    static async put_inventarios_programacion_contenedores(req) {
        try {
            const { data, user } = req;
            const { _id, __v, infoContenedor, action } = data;
            await ContenedoresRepository.modificar_contenedor(_id, infoContenedor, user.user, action, __v);
        } catch (err) {
            if (err.status === 523) {
                throw err
            }
            throw new InventariosLogicError(470, `Error ${err.type}: ${err.message}`)

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
            const inventario = await this.get_inventarios_frutaDescarte_fruta()
            const ingresos = await RedisRepository.get_inventarioDescarte_dia_ingreso();
            const salidas = await RedisRepository.get_inventarioDescarte_dia_salida();

            await InventariosHistorialRepository.crearInventarioDescarte({ inventario, kilos_ingreso: ingresos, kilos_salida: salidas })

            await RedisRepository.reiniciarDescarteIngresos()
            await RedisRepository.reiniciarDescarteSalidas()

        } catch (err) {
            if (err.status === 500) {
                throw err
            }
            throw new InventariosLogicError(500, `Error al crear el snapshot del inventario: ${err.message}`)
        }
    }
    //#endregion
}
