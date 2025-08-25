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

            const inventario = await VariablesDelSistema.getInventario();
            const inventarioKeys = Object.keys(inventario)

            const lotes = await LotesRepository.getLotes2({
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
                    GGN: 1,
                    calidad: 1,
                }
            });

            // se agrega las canastillas en inventario
            const resultado = inventarioKeys.map(id => {
                const lote = lotes.find(lote => lote._id.toString() === id.toString());

                if (lote) {
                    return {
                        ...lote,
                        inventario: inventario[id]
                    }
                }
                return null
            }).filter(item => item !== null);

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
            const { _id } = req.user

            InventariosValidations.put_inventarios_frutaDescarte_reprocesarFruta().parse(data)

            const { descarteLavado, descarteEncerado, total } = await InventariosService.procesar_formulario_inventario_descarte(data)
            const tipoFruta = await TiposFruta.get_tiposFruta({tipoFruta:data.tipoFruta});

            //se modifica el inventario
            const [, , loteCreado] = await Promise.all([
                RedisRepository.put_reprocesoDescarte(descarteLavado, 'descarteLavado:', data.tipoFruta),
                RedisRepository.put_reprocesoDescarte(descarteEncerado, 'descarteEncerado:', data.tipoFruta),
                InventariosService.crear_lote_celifrut(tipoFruta, total, _id),
                RedisRepository.salidas_inventario_descartes(data, data.tipoFruta),

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
    /**
     * Obtiene los datos completos de los lotes que están actualmente en proceso de desverdizado.
     * Esta función combina información del inventario de desverdizado en Redis con los datos
     * completos de los lotes desde la base de datos MongoDB.
     * 
     * @async
     * @static
     * @method get_inventarios_frutaDesverdizando_lotes
     * 
     * @description
     * Este método realiza las siguientes operaciones principales:
     * 1. **Obtención del inventario de desverdizado**: Recupera el estado actual del inventario
     *    de desverdizado desde Redis, que contiene la distribución de lotes por cuartos
     * 2. **Extracción de IDs**: Procesa la estructura del inventario para extraer todos los
     *    IDs únicos de lotes que están en proceso de desverdizado
     * 3. **Consulta paralela**: Realiza consultas simultáneas para obtener:
     *    - Datos completos de los lotes desde MongoDB
     *    - Información de los cuartos de desverdizado (aunque actualmente no se usan los cuartosIds)
     * 4. **Combinación de datos**: Retorna un objeto que combina toda la información necesaria
     *    para la gestión del inventario de desverdizado
     * 
     * @returns {Promise<Object>} Objeto con la información completa del inventario de desverdizado
     * @returns {Array<Object>} return.lotes - Array con los datos completos de los lotes en desverdizado
     * @returns {Array<Object>} return.cuartosDesverdizado - Array con información de los cuartos de desverdizado
     * @returns {Object} return.inventarioDesverdizado - Estructura del inventario organizada por cuartos y lotes
     * 
     * @throws {InventariosLogicError} 470 - Error general en el procesamiento
     * @throws {Error} 518 - Error específico de conexión o datos
     * @throws {Error} 413 - Error específico del proceso
     * 
     * @example
     * // Ejemplo de uso
     * const inventario = await InventariosRepository.get_inventarios_frutaDesverdizando_lotes();
     * 
     * // Estructura del resultado:
     * {
     *   lotes: [
     *     {
     *       _id: "507f1f77bcf86cd799439012",
     *       enf: "EF1001",
     *       tipoFruta: "Naranja",
     *       desverdizado: {
     *         desverdizando: true,
     *         canastillasIngreso: 25,
     *         cuartoDesverdizado: ["507f1f77bcf86cd799439013"]
     *       }
     *       // ... otros campos del lote
     *     }
     *   ],
     *   cuartosDesverdizado: [
     *     // ... datos de los cuartos
     *   ],
     *   inventarioDesverdizado: {
     *     "507f1f77bcf86cd799439013": {  // ID del cuarto
     *       "507f1f77bcf86cd799439012": 25  // ID del lote: canastillas
     *     }
     *   }
     * }
     * 
     * @example
     * // Uso típico en el frontend para mostrar lotes en desverdizado
     * try {
     *   const { lotes, inventarioDesverdizado } = await this.get_inventarios_frutaDesverdizando_lotes();
     *   
     *   // Procesar lotes para mostrar en la interfaz
     *   const lotesConInventario = lotes.map(lote => ({
     *     ...lote,
     *     canastillasEnDesverdizado: this.calcularCanastillasEnDesverdizado(lote._id, inventarioDesverdizado)
     *   }));
     * } catch (error) {
     *   console.error('Error al obtener inventario de desverdizado:', error);
     * }
     * 
     * @since 1.0.0
     * @see {@link RedisRepository.get_inventario_desverdizado} Para obtener el inventario desde Redis
     * @see {@link LotesRepository.getLotes} Para obtener los datos completos de los lotes
     * @see {@link CuartosDesverdizados.get_cuartosDesverdizados} Para obtener información de cuartos
     * 
     * @performance
     * - Usa consultas paralelas con Promise.all() para optimizar el rendimiento
     * - Estructura de datos eficiente usando Set para IDs únicos
     * - Tiempo típico de ejecución: 50-200ms dependiendo de la cantidad de lotes
     * 
     * @note
     * - El inventario de desverdizado se mantiene en Redis para acceso rápido
     * - La estructura del inventario es: cuartoId -> loteId -> canastillas
     * - Los cuartosIds se extraen pero actualmente no se utilizan en la consulta
     */
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

        //se obtiene los datos del inventario
        const inventario = await VariablesDelSistema.getInventario();
        const inventarioKeys = Object.keys(inventario)

        const setLotesKeys = new Set(inventarioKeys);
        const lotesKeys = [...setLotesKeys];

        const lotes = await LotesRepository.getLotes2({
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

            return {
                ...lote,
                inventario: inventario[id]
            }

        }).filter(item => item !== null);
        return resultado

    }
    /**
 * Procesa el ingreso de fruta sin procesar al proceso de desverdizado.
 * 
 * @async
 * @static
 * @method put_inventarios_frutaSinProcesar_desverdizado
 * 
 * @param {Object} req - Objeto de solicitud
 * @param {Object} req.user - Información del usuario que realiza la operación
 * @param {string} req.user.user - ID del usuario que ejecuta la acción
 * @param {Object} req.data - Datos de la operación de desverdizado
 * @param {string} req.data._id - ID del lote a procesar (loteId)
 * @param {Object} req.data.desverdizado - Información del proceso de desverdizado
 * @param {number} req.data.desverdizado.canastillas - Cantidad de canastillas a ingresar al desverdizado
 * @param {string} req.data.desverdizado._id - ID del cuarto de desverdizado (cuartoId)
 * @param {string} req.data.action - Acción que se está realizando para el historial
 * 
 * @description
 * Este método realiza las siguientes operaciones principales:
 * 1. **Validación**: Valida los datos de entrada usando el esquema de validación correspondiente
 * 2. **Actualización del lote**: Modifica el documento del lote con:
 *    - Incrementa las canastillas de ingreso al desverdizado
 *    - Marca el lote como "desverdizando"
 *    - Agrega el cuarto de desverdizado al array de cuartos
 * 3. **Modificación del inventario**: Actualiza el inventario de desverdizado en Redis
 * 4. **Emisión de eventos**: Notifica los cambios a través del sistema de eventos
 * 
 * @throws {InventariosLogicError} 470 - Error general en la validación o procesamiento
 * @throws {Error} 518 - Error específico de conexión o datos
 * @throws {Error} 413 - Error específico del proceso
 * 
 * @fires procesoEventEmitter#server_event - Emite evento "inventario_frutaSinProcesar" 
 * @fires procesoEventEmitter#server_event - Emite evento "inventario_desverdizado"
 * 
 * @example
 * // Ejemplo de uso
 * const req = {
 *   user: {
 *     user: "507f1f77bcf86cd799439011"
 *   },
 *   data: {
 *     _id: "507f1f77bcf86cd799439012", // ID del lote
 *     desverdizado: {
 *       canastillas: 25,
 *       _id: "507f1f77bcf86cd799439013" // ID del cuarto
 *     },
 *     action: "ingreso_desverdizado"
 *   }
 * };
 * 
 * await InventariosRepository.put_inventarios_frutaSinProcesar_desverdizado(req);
 * 
 * @since 1.0.0
 * @see {@link InventariosValidations.put_inventarios_frutaSinProcesar_desverdizado} Para validaciones
 * @see {@link InventariosService.modificarInventarioIngresoDesverdizado} Para modificación de inventario
 * @see {@link LotesRepository.actualizar_lote} Para actualización de lotes
 */
    static async put_inventarios_frutaSinProcesar_desverdizado(req) {
        try {

            const { user } = req.user;
            const { _id: loteId, desverdizado, action } = req.data
            const { canastillas, _id: cuartoId } = desverdizado;

            InventariosValidations.put_inventarios_frutaSinProcesar_desverdizado().parse(req.data);
            const updatePipeline = [
                {
                    $set: {
                        'desverdizado.canastillasIngreso': {
                            $add: ['$desverdizado.canastillasIngreso', parseInt(canastillas)]
                        },
                        'desverdizado.desverdizando': true,
                        'desverdizado.cuartoDesverdizado': {
                            $cond: [
                                {
                                    $in: [
                                        cuartoId,
                                        { $ifNull: ['$desverdizado.cuartoDesverdizado', []] }
                                    ]
                                },
                                { $ifNull: ['$desverdizado.cuartoDesverdizado', []] },
                                { $concatArrays: [{ $ifNull: ['$desverdizado.cuartoDesverdizado', []] }, [cuartoId]] }
                            ]
                        },
                        'desverdizado.fechaIngreso': {
                            $ifNull: ['$desverdizado.fechaIngreso', new Date()]
                        }
                    }
                }
            ];


            await Promise.all([
                InventariosService.modificarInventarioIngresoDesverdizado(canastillas, cuartoId, loteId),
                LotesRepository.actualizar_lote(
                    { _id: loteId },
                    updatePipeline,
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
    /**
     * Mueve fruta del inventario de desverdizado hacia diferentes destinos.
     * 
     * Este método gestiona el movimiento de fruta desde el inventario de desverdizado hacia
     * otros inventarios o entre cuartos de desverdizado. Soporta dos tipos principales de
     * operaciones: devolver fruta al inventario sin procesar o mover fruta entre cuartos
     * de desverdizado diferentes.
     * 
     * El método actualiza tanto los registros en Redis (inventario de desverdizado) como
     * en MongoDB (datos del lote), manteniendo la sincronización entre ambos sistemas
     * y emitiendo eventos para notificar los cambios a otros componentes del sistema.
     * 
     * @static
     * @async
     * @param {Object} req - Objeto de solicitud con los datos de la operación de movimiento
     * @param {Object} req.user - Información del usuario que realiza la operación
     * @param {string} req.user._id - ID del usuario que ejecuta la acción
     * @param {Object} req.data - Datos específicos de la operación de movimiento
     * @param {string} req.data._id - ID del lote que se está moviendo
     * @param {string} req.data.cuarto - ID del cuarto de desverdizado de origen
     * @param {string} req.data.action - Descripción de la acción realizada para el historial
     * @param {Object} req.data.data - Detalles específicos del movimiento
     * @param {string} req.data.data.destino - Destino del movimiento ("inventarioFrutaSinProcesar" o ID de cuarto destino)
     * @param {number} req.data.data.cantidad - Cantidad de canastillas a mover
     * @returns {Promise<void>} Promesa que se resuelve cuando el movimiento se completa exitosamente
     * @throws {InventariosLogicError} 470 - Error general en la validación o procesamiento
     * @throws {Error} 518 - Error específico de conexión o datos
     * @throws {Error} 413 - Error específico del proceso
     * 
 **/
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
        const { _id, kilosVaciados, inventario, __v } = data;
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
                    __v: 1,
                },
                finalizado: false,
                fechaProceso: new Date()
            }
            await LotesRepository.modificar_lote(_id, query, "vaciarLote", user._id, __v);
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
        try {
            console.log("put_inventarios_pallet_eviarCuartoFrio", req.data);
        } catch (err) {

            if (err.status === 470) {
                throw err;
            }
            console.error(`[ERROR][${new Date().toISOString()}]`, err);
            throw new Error(`Code ${err.code}: ${err.message}`);

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
            const arrLotes = [...new Set(lotesIds)];

            const [lotes, usuarios] = await Promise.all([
                LotesRepository.getLotes2({
                    ids: arrLotes,
                    limit: "all",
                    select: { enf: 1, promedio: 1, tipoFruta: 1, __v: 1, GGN: 1 }
                }),
                UsuariosRepository.get_users({
                    ids:  arrUsers,
                    limit: "all"
                })
            ]);

            const resultado = recordLotes.map(item => {
                const lote = lotes.find(lote => lote._id.toString() === item.documento._id);
                const user = usuarios.find(user => user._id.toString() === item.user.toString());

                if (lote) {
                    if (Object.prototype.hasOwnProperty.call(item.documento, "$inc")) {
                        item.documento = { ...lote, kilosVaciados: item.documento.$inc.kilosVaciados, }
                        return { ...item._doc, user: user.nombre + " " + user.apellido }
                    }
                    else {
                        return { ...item._doc, user: user.nombre + " " + user.apellido }
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
                const { action, data, _idLote, _idRecord, __v } = req.data

                InventariosValidations.put_inventarios_historiales_ingresoFruta_modificar(req.data)
                await registrarPasoLog(log._id, "InventariosValidations.put_inventarios_historiales_ingresoFruta_modificar", "Completado");

                const queryLote = {
                    ...data,
                    fecha_ingreso_patio: data.fecha_ingreso_inventario,
                    fecha_salida_patio: data.fecha_ingreso_inventario,
                    fecha_estimada_llegada: data.fecha_ingreso_inventario,
                }

                await InventariosService.modificarLote_regresoHistorialFrutaIngreso(
                    _idLote, queryLote, user, action
                )
                await registrarPasoLog(log._id, "InventariosService.modificarLote_regresoHistorialFrutaIngreso", "Completado");

                await InventariosService.modificarRecordLote_regresoHistorialFrutaIngreso(
                    _idRecord, __v, data
                )
                await registrarPasoLog(log._id, "InventariosService.modificarRecordLote_regresoHistorialFrutaIngreso", "Completado");

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
    static async put_inventarios_ordenVaceo_modificar(data) {

        await VariablesDelSistema.put_inventario_inventarios_orden_vaceo_modificar(data.data.data)
        procesoEventEmitter.emit("server_event", {
            action: "modificar_orden_vaceo",
            data: {}
        });
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
        let log

        try {
            log = await LogsRepository.create({
                user: user._id,
                action: "post_inventarios_ingreso_lote",
                acciones: [{ paso: "Inicio de la función", status: "Iniciado", timestamp: new Date() }]
            })
            const { data } = req;
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
            const lote = await LotesRepository.addLote(query, user);
            await registrarPasoLog(log._id, "LotesRepository.addLote", "Completado");

            await VariablesDelSistema.ingresarInventario(lote._id.toString(), Number(lote.canastillas));
            await registrarPasoLog(log._id, "VariablesDelSistema.ingresarInventario", "Completado");

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

            await InventariosService
                .ajustarCanastillasProveedorCliente(datos.predio, -Number(dataCanastillas.canastillasPropias))
            await registrarPasoLog(log._id, "InventariosService.ajustarCanastillasProveedorCliente", "Completado");

            await InventariosService
                .ajustarCanastillasProveedorCliente("65c27f3870dd4b7f03ed9857", Number(dataCanastillas.canastillasPropias))
            await registrarPasoLog(log._id, "InventariosService.ajustarCanastillasProveedorCliente", "Completado");

            await CanastillasRepository.post_registro(dataRegistro)
            await registrarPasoLog(log._id, "CanastillasRepository.post_registro", "Completado");

            await VariablesDelSistema
                .modificar_canastillas_inventario(dataCanastillas.canastillasPrestadas, "canastillasPrestadas")
            await registrarPasoLog(log._id, "VariablesDelSistema.modificar_canastillas_inventario", "Completado");

            await dataRepository.incrementar_ef1_serial()
            await registrarPasoLog(log._id, "dataService.incrementar_ef1_serial", "Completado");

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
