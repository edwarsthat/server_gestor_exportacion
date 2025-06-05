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
import { ProveedoresRepository } from "../Class/Proveedores.js";
import { UsuariosRepository } from "../Class/Usuarios.js";
import { VariablesDelSistema } from "../Class/VariablesDelSistema.js";
import { InventariosValidations } from "../validations/inventarios.js";
import { generarCodigoEF } from "./helper/inventarios.js";
import { filtroFechaInicioFin } from "./utils/filtros.js";
import { transformObjectInventarioDescarte } from "./utils/objectsTransforms.js";
import { InventariosService } from "../services/inventarios.js";
import { RedisRepository } from "../Class/RedisData.js";

export class InventariosRepository {
    //#region inventarios
    static async put_inventarios_frutaDesverdizando_parametros(req) {
        try {
            const { __v, _id, data, action } = req.data;
            const user = req.user.user;
            const query = {
                $push: {
                    "desverdizado.parametros": data
                },
                $inc: {
                    __v: 1,
                }
            }
            await LotesRepository.modificar_lote(_id, query, action, user, __v);
        } catch (err) {
            if (err.status === 523) {
                throw err
            }
            throw new InventariosLogicError(470, `Error ${err.type}: ${err.message}`)
        }
    }
    static async put_inventarios_frutaDesverdizado_finalizar(req) {
        try {
            const { data, user } = req
            const { _id, __v, action } = data;
            const query = {
                "desverdizado.fechaFinalizar": new Date(),
                $inc: {
                    __v: 1,
                }
            }
            await LotesRepository.modificar_lote(_id, query, action, user.user, __v);
            procesoEventEmitter.emit("server_event", {
                action: "finalizar_desverdizado",
                data: {}
            });
        } catch (err) {
            if (err.status === 523) {
                throw err
            }
            throw new InventariosLogicError(470, `Error ${err.type}: ${err.message}`)
        }
    }
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
    /**
     * Maneja el despacho de fruta descartada del inventario.
     * Este método realiza las siguientes operaciones:
     * 1. Valida los datos del despacho
     * 2. Crea un nuevo registro de despacho
     * 3. Actualiza el inventario de descartes en Redis
     * 
     * @param {Object} req - Objeto de solicitud
     * @param {Object} req.user - Información del usuario que realiza la operación
     * @param {Object} req.user.user - Datos del usuario
     * @param {Object} req.data - Datos del despacho
     * @param {Object} req.data.data - Información específica del despacho
     * @param {Object} req.data.inventario - Estado actual del inventario
     * @param {string} req.data.inventario.tipoFruta - Tipo de fruta a despachar
     * 
     * @throws {InventariosLogicError} Si hay errores en la validación o el procesamiento
     * @throws {Error} Si hay errores en la conexión con Redis o en la creación del despacho
     * 
     * @emits {server_event} Emite un evento "descarte_change" cuando se completa el despacho
     */
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
                DespachoDescartesRepository.crear_nuevo_despacho(newDespacho, user._id)
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
    /**
     * Procesa la fruta descartada para su reproceso. Este método realiza tres operaciones principales:
     * 1. Procesa los datos del formulario de descarte
     * 2. Modifica el inventario de descarte en Redis
     * 3. Crea un nuevo lote para el reproceso
     * 
     * @param {Object} req - Objeto de solicitud
     * @param {Object} req.data - Datos de la solicitud
     * @param {Object} req.data.data - Datos del formulario de descarte
     * @param {string} req.data.data.tipoFruta - Tipo de fruta a reprocesar ('Naranja' o 'Limon')
     * @param {Object} req.data.data - Campos de descarte con formato 'tipo:subtipo'
     * @param {Object} req.user - Información del usuario que realiza la operación
     * @throws {InventariosLogicError} Si hay errores en la validación o el procesamiento
     * @throws {Error} Si hay errores en la conexión con Redis o en la creación del lote
     * @emits {server_event} Emite un evento "descarte_change" cuando se completa el despacho
     * 
     * @example
     * // Ejemplo de datos de entrada
     * {
     *   data: {
     *     data: {
     *       tipoFruta: 'Naranja',
     *       'descarteLavado:general': '10',
     *       'descarteEncerado:balin': '5'
     *     },
     *     user: {
     *       _id: '123',
     *       user: 'Juan'
     *     }
     *   }
     * }
     */
    static async put_inventarios_frutaDescarte_reprocesarFruta(req) {
        try {
            const { data } = req.data
            const { user } = req.user

            InventariosValidations.put_inventarios_frutaDescarte_reprocesarFruta().parse(data)

            const { descarteLavado, descarteEncerado, total } = await InventariosService.procesar_formulario_inventario_descarte(data)

            //se modifica el inventario
            const [, , loteCreado] = await Promise.all([
                RedisRepository.put_reprocesoDescarte(descarteLavado, 'descarteLavado:', data.tipoFruta),
                RedisRepository.put_reprocesoDescarte(descarteEncerado, 'descarteEncerado:', data.tipoFruta),
                InventariosService.crear_lote_celifrut(data.tipoFruta, total, user)
            ])


            // Ahora loteCreado tiene el lote REAL
            await VariablesDelSistema.reprocesar_predio_celifrut(loteCreado, total)

            procesoEventEmitter.emit("server_event", {
                action: "descarte_change",
                data: {}
            });

            return loteCreado._id

        } catch (err) {
            if (err.status === 518 || err.status === 413) {
                throw err
            }
            throw new InventariosLogicError(470, `Error ${err.type}: ${err.message}`)
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


            await LotesRepository.modificar_lote(newLote._id.toString(), query, "vaciarLote", user, newLote.__v);
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
    /**
     * Procesa y registra la fruta descartada que se ha descompuesto.
     * @param {Object} req - Objeto de solicitud con data (formulario e inventario) y user
     * @throws {Error} Si el usuario intenta sacar más de 50 kilos sin autorización
     * @throws {InventariosLogicError} Si hay errores en la validación o procesamiento
     * @emits {server_event} Evento "descarte_change" al completar el proceso
     */
    static async post_inventarios_frutaDescarte_frutaDescompuesta(req) {
        let descarteLavado, descarteEncerado, tipoFruta, total
        try {
            InventariosValidations.post_inventarios_frutaDescarte_frutaDescompuesta().parse(req.data)

            const { user } = req;
            const { data, inventario } = req.data;

            //se crea el registro
            tipoFruta = inventario.tipoFruta;

            ({ descarteLavado, descarteEncerado, total } = await InventariosService.procesar_formulario_inventario_descarte(inventario));

            if(total > 50 && user.Rol > 2) throw new Error("No puede crear un registro de fruta descompuesta de tantos kilos")

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
    static async get_inventarios_frutaSinProcesar_frutaEnInventario() {

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
                not_pass: 1,
                GGN: 1
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
    static async get_inventarios_frutaDesverdizando_lotes() {
        const InvDes = await VariablesDelSistema.getInventarioDesverdizado();
        const InvDesKeys = Object.keys(InvDes);
        const lotes = await LotesRepository.getLotes({
            ids: InvDesKeys,
            select: { promedio: 1, enf: 1, desverdizado: 1, kilosVaciados: 1, __v: 1, GGN: 1 },
            sort: { "desverdizado.fechaIngreso": -1 }
        });
        //se agrega las canastillas en inventario
        const resultado = InvDesKeys.map(id => {
            const lote = lotes.find(lote => lote._id.toString() === id.toString());
            if (lote) {
                return {
                    ...lote.toObject(),
                    inventarioDesverdizado: InvDes[id]
                }
            }
            return null
        }).filter(item => item !== null);
        return resultado
    }
    static async get_inventarios_ordenVaceo_inventario() {
        //JS
        //se obtiene los datos del inventario
        const inventario = await VariablesDelSistema.getInventario();
        const inventarioKeys = Object.keys(inventario)

        // se obtiene el inventario de desverdizado
        const InvDes = await VariablesDelSistema.getInventarioDesverdizado();
        const InvDesKeys = Object.keys(InvDes);

        const arrLotesKeys = inventarioKeys.concat(InvDesKeys);
        const setLotesKeys = new Set(arrLotesKeys);
        const lotesKeys = [...setLotesKeys];

        const lotes = await LotesRepository.getLotes({
            ids: lotesKeys,
            query: {
                $or: [
                    { not_pass: false },
                    { not_pass: { $exists: false } }
                ]
            },
            select: {
                __v: 1,
                clasificacionCalidad: 1,
                nombrePredio: 1,
                fechaIngreso: 1,
                observaciones: 1,
                tipoFruta: 1,
                promedio: 1,
                enf: 1,
                kilosVaciados: 1,
                directoNacional: 1,
                desverdizado: 1,
                fecha_ingreso_inventario: 1,
                "calidad.inspeccionIngreso": 1,
                GGN: 1
            }
        });

        const resultado = lotesKeys.map(id => {
            const lote = lotes.find(lote => lote._id.toString() === id.toString());

            if (lote && lote.desverdizado && lote.desverdizado.fechaFinalizar) {
                return {
                    ...lote.toObject(),
                    inventario: InvDes[id]
                }
            } else if (lote && lote.desverdizado && !lote.desverdizado.fechaFinalizar) {
                return null
            } else if (lote) {
                return {
                    ...lote.toObject(),
                    inventario: inventario[id]
                }
            }
            return null
        }).filter(item => item !== null);
        return resultado

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

            const lotes = await LotesRepository.getLotes({
                ids: lotesIds,
                limit: recordLotes.length,
                select: { enf: 1, promedio: 1, tipoFruta: 1, __v: 1, GGN: 1 }
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
            await RecordLotesRepository.modificarRecord(_idRecord, queryRecord, __vHistorial);
            await VariablesDelSistema.ingresar_kilos_vaciados(kilosVaciados);


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
            const { _id, directoNacional, inventario, __v, action, historialLote } = data.data;
            const { _idRecord, kilosHistorial, __vHistorial } = historialLote;
            const user = data.user.user;
            const queryLote = {
                $inc: {
                    directoNacional: directoNacional,
                    __v: 1
                }
            }
            const queryRecord = {
                $inc: {
                    "documento.$inc.directoNacional": kilosHistorial,
                    __v: 1
                }
            }
            //se modifica el lote y el inventario
            await VariablesDelSistema.modificarInventario(_id, -inventario);
            const lote = await LotesRepository.modificar_lote(_id, queryLote, action, user, __v);
            await LotesRepository.deshidratacion(lote);


            //se modifica el registro
            await RecordLotesRepository.modificarRecord(_idRecord, queryRecord, __vHistorial);
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
            const { page } = data;
            const query = {
                operacionRealizada: "crearLote"
            }
            const resultsPerPage = 50;
            const lotes = await RecordLotesRepository.getRecordLotes({
                query: query,
                skip: (page - 1) * resultsPerPage,
                limit: resultsPerPage,

            });

            const proveedoresids = [];
            const usersId = [];

            for (const lote of lotes) {
                proveedoresids.push(lote.documento.predio.toString());
                usersId.push(lote.user.toString());
            }

            const proveedoresSet = new Set(proveedoresids)
            const proveedoresArr = [...proveedoresSet]

            const proveedores = await ProveedoresRepository.get_proveedores({
                ids: proveedoresArr
            })

            const usersIdSet = new Set(usersId)
            const usersIdArr = [...usersIdSet]

            const user = await UsuariosRepository.get_users({
                ids: usersIdArr,
                getAll: true
            })

            const result = [];
            for (const lote of lotes) {
                const proveedor = proveedores.find(proveedor =>
                    proveedor._id.toString() === lote.documento.predio.toString()
                );

                const usuario = user.find(u => u._id.toString() === lote.user.toString());

                if (proveedor && usuario) {
                    delete lote.documento.predio0;
                    lote.documento.predio = {};
                    lote.documento.predio.PREDIO = proveedor.PREDIO;
                    lote.documento.predio.GGN = proveedor.GGN;
                    lote.documento.predio._id = proveedor._id;
                    lote.user = usuario.nombre + " " + usuario.apellido;
                }
                result.push(lote);
            }
            return result;
        } catch (err) {
            if (err.status === 522) {
                throw err
            }
            throw new InventariosLogicError(470, `Error ${err.type}: ${err.message}`)
        }
    }
    static async put_inventarios_historiales_ingresoFruta_modificar(req) {
        try {
            const { data: datos, user } = req
            const { action, data, _idLote, _idRecord, __v } = datos

            InventariosValidations.put_inventarios_historiales_ingresoFruta_modificar(datos)

            const queryLote = {
                ...data,
                fecha_ingreso_patio: data.fecha_ingreso_inventario,
                fecha_salida_patio: data.fecha_ingreso_inventario,
                fecha_estimada_llegada: data.fecha_ingreso_inventario,
            }

            await InventariosService.modificarLote_regresoHistorialFrutaIngreso(
                _idLote, queryLote, user, action
            )

            await InventariosService.modificarRecordLote_regresoHistorialFrutaIngreso(
                _idRecord, __v, data
            )

        } catch (err) {
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
            return cont
        } catch (err) {
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
                tipoFruta
            } = data;
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
            else query.enf = { $regex: '^E', $options: 'i' }

            query = filtroFechaInicioFin(fechaInicio, fechaFin, query, tipoFecha)

            const lotes = await LotesRepository.getLotes({
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
    static async put_inventarios_ordenVaceo_modificar(data) {

        await VariablesDelSistema.put_inventario_inventarios_orden_vaceo_modificar(data.data.data)
        procesoEventEmitter.emit("server_event", {
            action: "modificar_orden_vaceo",
            data: {}
        });
    }
    /**
 * Actualiza un registro de despacho de descarte en el inventario.
 * 
 * @param {Object} req - Objeto de solicitud
 * @param {Object} req.user - Información del usuario que realiza la acción
 * @param {Object} req.data - Datos de la actualización
 * @param {string} req.data.action - Acción que se está realizando
 * @param {Object} req.data.data - Datos del formulario de descarte
 * @param {string} req.data._id - ID del registro a actualizar
 * 
 * @throws {InventariosLogicError} 470 - Error general en la lógica del inventario
 * @throws {Error} 521 - Error específico del proceso
 * @throws {Error} 518 - Error específico del proceso
 * 
 * @fires procesoEventEmitter#descarte_change
 * 
 * @description
 * Este método realiza las siguientes operaciones:
 * 1. Valida los datos del formulario de descarte
 * 2. Separa los datos entre inventario y registro nuevo
 * 3. Procesa el formulario para calcular descartes y total
 * 4. Revisa cambios en fruta e inventario
 * 5. Modifica el inventario si hay cambios
 * 6. Actualiza el registro con los nuevos datos
 * 7. Emite un evento de cambio de descarte
 */
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
            const enf8 = await VariablesDelSistema.generarEF8();
            return { ef1: enf1, ef8: enf8 }
        }
        catch (err) {
            if (err.status === 506) {
                throw err
            }
            throw new InventariosLogicError(470, `Error ${err.type}: ${err.message}`)
        }
    }
    static async post_inventarios_ingreso_lote(req) {
        try {
            const { data, user } = req;
            const { dataLote: datos, dataCanastillas } = data

            const datosValidados = InventariosValidations.post_inventarios_ingreso_lote().parse(datos)

            const enf = await generarCodigoEF(datos.ef, datos.fecha_estimada_llegada)
            const { precioId, proveedor } = await InventariosService.obtenerPrecioProveedor(datos.predio, datos.tipoFruta)

            if (datos.GGN)
                await InventariosService.validarGGN(proveedor, datos.tipoFruta, user)

            const query = await InventariosService.construirQueryIngresoLote(datosValidados, enf, precioId);
            const lote = await LotesRepository.addLote(query, user);

            await VariablesDelSistema.ingresarInventario(lote._id.toString(), Number(lote.canastillas));

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

            await InventariosService
                .ajustarCanastillasProveedorCliente(datos.predio, -Number(dataCanastillas.canastillasPropias))

            await InventariosService
                .ajustarCanastillasProveedorCliente(
                    "65c27f3870dd4b7f03ed9857", Number(dataCanastillas.canastillasPropias)
                )

            await CanastillasRepository.post_registro(dataRegistro)

            await VariablesDelSistema
                .modificar_canastillas_inventario(dataCanastillas.canastillasPrestadas, "canastillasPrestadas")

            await InventariosService.incrementarEF(datos.ef)

            procesoEventEmitter.emit("server_event", {
                action: "add_lote",
                data: {
                    ...lote._doc,
                    predio: lote.PREDIO
                }
            });

        } catch (err) {
            if (err.status === 521) {
                throw err
            }
            if (err instanceof ZodError) {
                const mensajeLindo = err.errors[0]?.message || "Error desconocido en los datos del lote";
                throw new InventariosLogicError(470, mensajeLindo);
            }
            throw new InventariosLogicError(470, err.message)

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
}
