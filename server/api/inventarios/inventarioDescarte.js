import { db } from "../../../DB/mongoDB/config/init.js";
import { InventariosLogicError } from "../../../Error/logicLayerError.js";
import { procesoEventEmitter } from "../../../events/eventos.js";
import { DespachoDescartesRepository } from "../../Class/DespachoDescarte.js";
import { FrutaDescompuestaRepository } from "../../Class/FrutaDescompuesta.js";
import { InventarioDescartesRepository, InventariosHistorialRepository } from "../../Class/Inventarios.js";
import { LogsRepository } from "../../Class/LogsSistema.js";
import { LotesEF8Repository, LotesRepository } from "../../Class/Lotes.js";
import { LotesHelper } from "../../helper/lotes.js";
import { dataService } from "../../services/data.js";
import { InventariosService } from "../../services/inventarios.js";
import { InventariosValidations } from "../../validations/inventarios.js";
import { ConstantesDelSistema } from "../../Class/ConstantesDelSistema.js";
import { dataRepository } from "../data.js";
import { registrarPasoLog } from "../helper/logs.js";
import { ErrorInventarioLogicHandlers } from "../utils/errorsHandlers.js";
import { filtroFechaInicioFin } from "../utils/filtros.js";
import { executeQueryTask, executeTransactionalTask } from "../../utils/wrappers.js";
import mongoose from "mongoose";
import { tipoFrutaCache } from "../../cache/tipoFruta.js";
import { IndicadoresService } from "../../services/indicadores.js";
import { HistorialInventariosService } from "../../services/inventarios/historialInventarios.js";

export class InventarioDescarteController {
    static async get_inventarios_historiales_registros_ingresosDescartes(req) {
        return await executeQueryTask(async () => {
            const parseData = InventariosValidations.get_inventarios_historiales_registros_ingresosDescartes().parse(req.data)
            const { fechaInicio, fechaFin, tipoFruta, buscar, areaSeleccion, descarte, enInventario } = parseData.filtro
            let lote
            let query = {
                estado: enInventario ? 'AGOTADO' : 'ACTIVO',
                loteType: { $in: ["Lote", "Loteef8"] },
            }
            if (tipoFruta) query.tipoFruta = tipoFruta;
            if (areaSeleccion) query.area = areaSeleccion
            if (descarte) query.tipoDescarte = descarte

            query = filtroFechaInicioFin(fechaInicio, fechaFin, query, 'fechaIngreso')

            if (buscar && buscar !== "") {
                lote = await LotesRepository.get_data({
                    query: {
                        enf: buscar,
                    },
                    select: { enf: 1 }
                })

                if (lote.length === 0) {
                    throw new InventariosLogicError(470, `No se encontró el lote ${buscar}`)
                } else {
                    query.lote = lote[0]._id
                }
            }

            const inventario = await InventarioDescartesRepository.get_data({
                query,
                sort: { createdAt: -1 },
                limit: 500,
                populate: [
                    { path: 'tipoFruta', select: "tipoFruta" },
                    { path: 'lote', select: "enf" },
                    { path: 'tipoDescarte', select: "nombre inventario descripcion" },
                ]
            })

            return inventario
        });
    }
    static async get_inventarios_frutaDescarte_fruta() {
        return await executeQueryTask(async () => {
            const inventario = await InventarioDescartesRepository.get_data({
                query: {
                    estado: 'ACTIVO',
                    loteType: { $in: ["Lote", "Loteef8"] },
                },
                sort: { fecha: -1 },
                populate: [
                    { path: 'tipoFruta', select: "tipoFruta" },
                    { path: 'lote', select: "enf" },
                    { path: 'tipoDescarte', select: "nombre inventario" },
                ]
            })
            const result = InventariosService.respuesta_invetario_descartes(inventario);
            return result
        });
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
        if (!user || !user._id) throw new Error("No se proporciono un usuario valido");

        const parsedData = InventariosValidations.put_inventarios_frutaDescarte_despachoDescarte().parse(req.data)
        const { data, inventario } = parsedData;

        await executeTransactionalTask(req, async (session, log) => {

            const tipoFruta = inventario.tipoFruta;
            delete inventario.tipoFruta;

            const { totalKilos, totalCanastillas } = await InventariosService.procesar_formulario_inventario_descarte(inventario, tipoFruta, session, user)
            await registrarPasoLog(log._id, "InventariosService.procesar_formulario_inventario_descarte", "Completado");
            const newDespacho = {
                ...data,
                tipoFruta: tipoFruta,
                descartes: inventario,
                canastillas: totalCanastillas,
                kilos: totalKilos
            }
            await DespachoDescartesRepository.post_data(newDespacho, { user: user._id, session })
            await registrarPasoLog(log._id, "DespachoDescartesRepository.post_data", "Completado");
        })
    }
    static async put_inventarios_frutaDescarte_reprocesarFruta(req) {
        const { user } = req;
        if (!user || !user._id) throw new Error("No se proporciono un usuario valido");
        const parsedData = InventariosValidations.put_inventarios_frutaDescarte_reprocesarFruta().parse(req.data)
        const { data } = parsedData;

        await executeTransactionalTask(req, async (session, log) => {

            const tipoFrutaId = parsedData.tipoFruta;
            delete data.tipoFruta;
            //se borra del inventario
            const { totalKilos, totalCanastillas } = await InventariosService.procesar_formulario_inventario_descarte(data, tipoFrutaId, session, user)
            await registrarPasoLog(log._id, "InventariosService.procesar_formulario_inventario_descarte", "Completado");
            //se obtiene el tipodefruta
            const tipoFruta = tipoFrutaCache.getTipoFruta(tipoFrutaId);
            if (!tipoFruta) throw new Error("No se encontro el tipo de fruta");
            //se crea el lote celifrut
            await InventariosService.crear_lote_celifrut(tipoFruta, totalKilos, totalCanastillas, user, session);
            await registrarPasoLog(log._id, "InventariosService.crear_lote_celifrut", "Completado");
            await IndicadoresService.put_indicadores_actualizar_indicador(
                { $inc: { [`kilos_vaciados.${tipoFruta._id}`]: Number(totalKilos) } }, session
            );
            await registrarPasoLog(log._id,
                "IndicadoresAPIRepository.put_indicadores_actualizar_indicador",
                "Completado", `Se actualizó el indicador kilos_vaciados con ${totalKilos} kilos del tipo de fruta ${tipoFruta._id}`);

        })
        procesoEventEmitter.emit("server_event", {
            action: "descarte_change",
            data: {}
        });
        return true
    }
    static async put_inventarios_registros_fruta_descompuesta(req) {
        try {
            const { user } = req
            if (!user || !user._id) throw new Error("No se proporcionó un usuario válido");

            InventariosValidations.put_inventarios_registros_fruta_descompuesta().parse(req.data)
            // Aquí falta la lógica real, pero al menos quitamos el error de opción no soportada
            // y corregimos la validación.

        } catch (err) {
            if (err.status === 523) {
                throw err
            }
            throw new InventariosLogicError(470, `Error ${err.type}: ${err.message}`)
        }
    }
    static async put_inventarios_historiales_despachoDescarte(req) {
        const { user } = req;
        if (!user || !user._id) throw new Error("No se proporciono un usuario valido");
        const parsedData = InventariosValidations.put_inventarios_historiales_despachoDescarte().parse(req.data)
        const { data, _id } = parsedData

        await executeTransactionalTask(req, async (session, log) => {
            //calcular modificaciones
            const { changesData, changesDescartes, cambioFruta } = await HistorialInventariosService.calcular_modificaciones(data, _id, session);
            // si se debe modificar el inventario, se calcula si el cambio se peude realizar
            console.log(changesDescartes.size)
            if (changesDescartes.size > 0 || cambioFruta) {
                await HistorialInventariosService.verificar_modificacion_del_inventario_descartes(changesDescartes, cambioFruta, session)
            }
            throw new Error("Error de prueba")
            //se suma o se resta del inventario descartes segun corresponda
            const oldRegistro = await HistorialInventariosService.modificar_inventario_descartes_modificar_salida(_id, inventario, data.tipoFruta, user, session)
            await registrarPasoLog(log._id, "HistorialInventariosService.modificar_inventario_descartes_modificar_salida", "Completado");
            //se modifica el registro del despacho descarte
            await HistorialInventariosService.modificar_registro_despacho_en_inventario_descarte(_id, inventario, newRegistro, user, session)
            await registrarPasoLog(log._id, "HistorialInventariosService.modificar_registro_despacho_en_inventario_descarte", "Completado");
            //actualizar salida del cardex inventario descarte
            await HistorialInventariosService.modificar_cardex_modificar_registro_despacho(oldRegistro[0], data.tipoFruta, inventario, user, session)
            await registrarPasoLog(log._id, "HistorialInventariosService.modificar_cardex_modificar_registro_despacho", "Completado");

        });

        procesoEventEmitter.emit("server_event", {
            action: "descarte_change",
            data: {}
        });
    }

    static async post_inventarios_frutaDescarte_frutaDescompuesta(req) {
        const startTime = Date.now();
        const { user } = req;
        if (!user || !user._id) throw new Error("No se proporciono un usuario valido");
        const parsedData = InventariosValidations.post_inventarios_frutaDescarte_frutaDescompuesta().parse(req.data)
        const { data, inventario } = parsedData;

        await executeTransactionalTask(req, async (session, log) => {

            const tipoFruta = inventario.tipoFruta;
            if (!mongoose.isValidObjectId(tipoFruta)) throw new Error("No se proporciono un tipo de fruta");
            delete inventario.tipoFruta;
            //se borra del inventario
            const { totalKilos, totalCanastillas } = await InventariosService.procesar_formulario_inventario_descarte(inventario, tipoFruta, session, user)
            await registrarPasoLog(log._id, "InventariosService.procesar_formulario_inventario_descarte", "Completado");

            if (totalKilos > 50 && user.Rol > 2) throw new Error("No puede crear un registro de fruta descompuesta de tantos kilos")
            //se crea el registro de fruta descompuesta
            const query = {
                ...data,
                descartes: inventario,
                tipoFruta: tipoFruta,
                user: user._id,
                kilos: totalKilos,
                canastillas: totalCanastillas
            }
            await FrutaDescompuestaRepository.post_data(query, { user: user._id, session });
            await registrarPasoLog(log._id, "FrutaDescompuestaRepository.post_data", "Completado");

        })
        console.info(`[post_frutaDescompuesta] Tiempo total: ${Date.now() - startTime} ms`);
        procesoEventEmitter.emit("server_event", {
            action: "descarte_change",
            data: {}
        });

        return true

    }
    static async post_inventarios_EF8(req) {
        const { user } = req;
        if (!user || !user._id) throw new Error("No se encontro el usuario");

        const validatedData = InventariosValidations.post_inventarios_EF8().parse(req.data)
        const { data } = validatedData;
        const registroEF8_final = await executeTransactionalTask(req, async (session, log) => {
            const [EF8, { precioId }, tipoFrutas] = await Promise.all([
                dataService.get_ef8_serial(data.fecha_ingreso_inventario, log._id, session),
                InventariosService.obtenerPrecioProveedor(data.predio, data.tipoFruta, session),
                ConstantesDelSistema.get_constantes_sistema_tipo_frutas2(data.tipoFruta, session)
            ])

            if (tipoFrutas.length === 0) throw new Error("No se encontró el tipo de fruta");
            const tipoFrutaObj = tipoFrutas[0];

            await registrarPasoLog(log._id, "precio, EF8 y tipoFruta obtenidos", "Completado");

            const { loteEF8, } = InventariosService.construir_ef8_lote(data, EF8, precioId, user);
            await registrarPasoLog(log._id, "EF8 construido", "Completado");

            const registroCanastillas = await InventariosService.ingresarCanastillas(data, user, session);
            await registrarPasoLog(log._id, "InventariosService.ingresarCanastillas", "Completado");

            const registroEF8 = await LotesEF8Repository.post_data(
                { ...loteEF8, registroCanastillas: registroCanastillas._id },
                { session, user: user._id }
            );
            await registrarPasoLog(log._id, "LotesEF8Repository.post_data", "Completado");

            console.log(tipoFrutaObj)
            console.log(data)
            console.log(registroEF8)
            await InventariosService.ingresarDescarteEf8(registroEF8, data, tipoFrutaObj, user._id, session)
            await registrarPasoLog(log._id, "InventariosService.ingresarDescarteEf8", "Completado");

            await dataRepository.incrementar_ef8_serial(session)
            await registrarPasoLog(log._id, "dataRepository.incrementar_ef8_serial", "Completado");

            return registroEF8;
        })

        procesoEventEmitter.emit("server_event", {
            action: "descarte_change",
            data: {}
        });

        return registroEF8_final;
    }
}