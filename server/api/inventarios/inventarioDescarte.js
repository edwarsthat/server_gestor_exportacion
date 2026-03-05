import { db } from "../../../DB/mongoDB/config/init.js";
import { InventariosLogicError } from "../../../Error/logicLayerError.js";
import { procesoEventEmitter } from "../../../events/eventos.js";
import { CanastillasRepository } from "../../Class/CanastillasRegistros.js";
import { DespachoDescartesRepository } from "../../Class/DespachoDescarte.js";
import { FrutaDescompuestaRepository } from "../../Class/FrutaDescompuesta.js";
import { InventarioDescartesRepository } from "../../Class/Inventarios.js";
import { LotesEF8Repository, LotesRepository } from "../../Class/Lotes.js";
import { LotesHelper } from "../../helper/lotes.js";
import { dataService } from "../../services/data.js";
import { InventariosService } from "../../services/inventarios.js";
import { InventariosValidations } from "../../validations/inventarios.js";
import { ConstantesDelSistema } from "../../Class/ConstantesDelSistema.js";
import { dataRepository } from "../data.js";
import { registrarPasoLog } from "../helper/logs.js";
import { filtroFechaInicioFin } from "../utils/filtros.js";
import { executeQueryTask, executeTransactionalTask } from "../../utils/wrappers.js";
import mongoose from "mongoose";
import { tipoFrutaCache } from "../../cache/tipoFruta.js";
import { IndicadoresService } from "../../services/indicadores.js";
import { HistorialInventariosService } from "../../services/inventarios/historialInventarios.js";
import { ServiceError } from "../../models/ErrorModels.js";
import { CanastillasService } from "../../services/inventarios/canastillas.js";
import config from "../../../src/config/index.js";

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
        if (!user || !user._id) throw new ServiceError(470, `No se encontró el usuario`)

        await executeTransactionalTask(req, async (session, log) => {

            const parseData = InventariosValidations.put_inventarios_inventarioDescarte_modificar_ingreso().parse(req.data)
            const { _id, kilosIniciales } = parseData

            const oldValueDocs = await InventarioDescartesRepository.get_data({
                query: { _id: _id },
                select: "kilosIniciales kilosActuales tipoFruta"
            })
            if (oldValueDocs.length === 0) throw new Error(`No se encontró el registro`)
            const oldValue = oldValueDocs[0]

            const tipoFruta = await tipoFrutaCache.getTipoFruta(oldValue.tipoFruta)
            if (!tipoFruta) throw new Error(`No se encontró el tipo de fruta`)
            if (!tipoFruta.valorPromedio || tipoFruta.valorPromedio <= 0) throw new Error(`El valor promedio del tipo de fruta no es válido`)

            const diffKilosIniciales = kilosIniciales - oldValue.kilosIniciales
            const newCanastillas = Math.ceil(kilosIniciales / tipoFruta.valorPromedio)

            const newKilosActuales = oldValue.kilosActuales + diffKilosIniciales
            if (newKilosActuales < 0) throw new Error(`Los kilos actuales no pueden ser negativos después de la modificación`)
            const newCanastillasActuales = Math.ceil(newKilosActuales / tipoFruta.valorPromedio)

            const itemModificado = await InventarioDescartesRepository.actualizar_data(
                { _id: _id },
                {
                    $set:
                    {
                        kilosIniciales: kilosIniciales,
                        kilosActuales: newKilosActuales,
                        canastillasIniciales: newCanastillas,
                        canastillasActuales: newCanastillasActuales
                    }
                },
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
                user: user._id,
                destino: `INVENTARIO_${itemModificado.area}`
            }], { session });
            await registrarPasoLog(log?._id, "db.InventarioMovimientoDescarte.create", `completado`);

            await LotesHelper.actualizar_lotes_helper(
                { _id: itemModificado.lote },
                {
                    $inc: {
                        [`descartes.${itemModificado.tipoDescarte}`]: diffKilosIniciales,
                        kilosProcesados: diffKilosIniciales,
                    }

                },
                session
            )
            await registrarPasoLog(log?._id, "LotesHelper.actualizar_lotes_helper", `completado`);
        })


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
            if (data.enCanastillas) {
                if((data.canastillasPropias + data.canastillasPrestadas )> totalCanastillas){
                    throw new Error("La cantidad de canastillas vacías no puede ser mayor a la cantidad total de canastillas")
                }
                if (data.canastillasPropias > 0) {
                    await InventariosService
                        .ajustarCanastillasProveedorCliente(config.ID_CELIFRUT, Number(-data.canastillasPropias || 0), user, session);
                    await registrarPasoLog(log._id, "InventariosService.ajustarCanastillasProveedorCliente", "Completado");
                    await InventariosService
                        .ajustarCanastillasProveedorCliente(data.cliente, Number(data.canastillasPropias || 0), user, session);
                    await registrarPasoLog(log._id, "InventariosService.ajustarCanastillasProveedorCliente", "Completado");
                }
                if (data.canastillasPrestadas > 0) {
                    await CanastillasService
                        .modificar_inventario_canastillas({
                            canastillasPrestadas: Number(- data.canastillasPrestadas || 0),
                            prestamistaId: data.cliente,
                        }, session);
                    await registrarPasoLog(log._id, "CanastillasService.modificar_inventario_canastillas", "Completado");
                }

                const dataRegistroCanastillas = InventariosService.crearRegistroInventarioCanastillas({
                    origen: config.ID_CELIFRUT,
                    destino: data.cliente,
                    accion: "salida",
                    canastillas: Number(data.canastillasPropias || 0),
                    canastillasPrestadas: Number(data.canastillasPrestadas || 0),
                    remitente: config.ID_CELIFRUT,
                    destinatario: data.cliente,
                    observaciones: `Despacho descarte - remisión: ${data.remision}`,
                    fecha: new Date(),
                    user: user._id
                });
                await CanastillasRepository.post_data(dataRegistroCanastillas, { session, user: user._id });
                await registrarPasoLog(log._id, "CanastillasRepository.post_data despacho descarte", "Completado");

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
            const { totalKilos, totalCanastillas } = await InventariosService.procesar_formulario_inventario_descarte(
                data, tipoFrutaId, session, user
            )
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

        const { user } = req
        if (!user || !user._id) throw new Error("No se proporcionó un usuario válido");
        const parsedData = InventariosValidations.put_inventarios_registros_fruta_descompuesta().parse(req.data)
        const { data, _id } = parsedData
        await executeTransactionalTask(req, async (session, log) => {
            //se obtiene el registro original 
            const registroDocs = await FrutaDescompuestaRepository.get_data({ ids: [_id] }, session);
            if (registroDocs.length === 0) {
                throw new ServiceError(404, `No se encontró el registro de fruta descompuesta con ID: ${_id}`)
            }
            const registro = registroDocs[0];
            //calcular modificaciones
            const { changesData, changesDescartes, cambioFruta } = await HistorialInventariosService.calcular_modificaciones(registro, data);
            // si se debe modificar el inventario, se calcula si el cambio se peude realizar
            if (changesDescartes.size > 0) {
                await HistorialInventariosService.verificar_modificacion_del_inventario_descartes(changesDescartes, cambioFruta, user, session)
            }
            //se modifica el registro de fruta descompuesta
            await HistorialInventariosService.modificar_registro_fruta_descompuesta_en_inventario_descarte(_id, changesData, changesDescartes, user, session)
            await registrarPasoLog(log._id, "HistorialInventariosService.modificar_registro_fruta_descompuesta_en_inventario_descarte", "Completado");

            //actualizar salida del cardex inventario descarte
            await HistorialInventariosService.modificar_cardex_modificar_registro_despacho(changesDescartes, cambioFruta, session)
            await registrarPasoLog(log._id, "HistorialInventariosService.modificar_cardex_modificar_registro_despacho", "Completado");
        })

        procesoEventEmitter.emit("server_event", {
            action: "descarte_change",
            data: {}
        });
    }
    static async put_inventarios_historiales_despachoDescarte(req) {
        const { user } = req;
        if (!user || !user._id) throw new Error("No se proporciono un usuario valido");
        const parsedData = InventariosValidations.put_inventarios_historiales_despachoDescarte().parse(req.data)
        const { data, _id } = parsedData

        await executeTransactionalTask(req, async (session, log) => {
            //se obtiene el registro original 
            const registroDocs = await DespachoDescartesRepository.get_data({ ids: [_id] }, session);
            if (registroDocs.length === 0) {
                throw new ServiceError(404, `No se encontró el registro de despacho descarte con ID: ${_id}`)
            }
            const registro = registroDocs[0];
            //calcular modificaciones
            const { changesData, changesDescartes, cambioFruta } = await HistorialInventariosService.calcular_modificaciones(registro, data);
            // si se debe modificar el inventario, se calcula si el cambio se peude realizar
            if (changesDescartes.size > 0) {
                await HistorialInventariosService.verificar_modificacion_del_inventario_descartes(changesDescartes, cambioFruta, user, session)
            }
            //se modifica el registro del despacho descarte
            await HistorialInventariosService.modificar_registro_despacho_en_inventario_descarte(_id, changesData, changesDescartes, user, session)
            await registrarPasoLog(log._id, "HistorialInventariosService.modificar_registro_despacho_en_inventario_descarte", "Completado");

            //actualizar salida del cardex inventario descarte
            await HistorialInventariosService.modificar_cardex_modificar_registro_despacho(changesDescartes, cambioFruta, session)
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
            const { totalKilos, totalCanastillas } = await InventariosService.procesar_formulario_inventario_descarte(
                inventario, tipoFruta, session, user, { descompuesta: true }
            )
            await registrarPasoLog(log._id, "InventariosService.procesar_formulario_inventario_descarte", "Completado");

            if (totalKilos > 200 && user.Rol > 2) throw new Error("No puede crear un registro de fruta descompuesta de tantos kilos")
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

            await CanastillasService.modificar_inventario_canastillas({
                canastillas_propias: Number(data.canastillasPropias || 0) + Number(data.canastillasVaciasPropias || 0),
                canastillasPrestadas: Number(data.canastillasPrestadas || 0) + Number(data.canastillasVaciasPrestadas || 0),
                prestamistaId: data.predio,
            }, session);

            const registroEF8 = await LotesEF8Repository.post_data(
                { ...loteEF8, registroCanastillas: registroCanastillas._id },
                { session, user: user._id }
            );
            await registrarPasoLog(log._id, "LotesEF8Repository.post_data", "Completado");

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