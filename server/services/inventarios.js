import mongoose from "mongoose";
import { ConnectionDBError } from "../../Error/ConnectionErrors.js";
import { InventariosLogicError } from "../../Error/logicLayerError.js";
import { dataRepository } from "../api/data.js";
import { registrarPasoLog } from "../api/helper/logs.js";
import { obtenerEstadoDesdeAccionCanastillasInventario } from "../api/utils/diccionarios.js";
import { colombiaToUTC } from "../api/utils/fechas.js";
import { filtroFechaInicioFin } from "../api/utils/filtros.js";
import { RecordLotesRepository } from "../archive/ArchiveLotes.js";
import { CanastillasRepository } from "../Class/CanastillasRegistros.js";
import { ClientesRepository } from "../Class/Clientes.js";
import { DespachoDescartesRepository } from "../Class/DespachoDescarte.js";
import { FrutaDescompuestaRepository } from "../Class/FrutaDescompuesta.js";
import { InventariosHistorialRepository } from "../Class/Inventarios.js";
import { LotesRepository } from "../Class/Lotes.js";
import { PreciosRepository } from "../Class/Precios.js";
import { ProveedoresRepository } from "../Class/Proveedores.js";
import { RedisRepository } from "../Class/RedisData.js";
import { UnionsRepository } from "../Class/Unions.js";
import { UsuariosRepository } from "../Class/Usuarios.js";
import { VariablesDelSistema } from "../Class/VariablesDelSistema.js";
import { CuartosDesverdizados } from "../store/CuartosDesverdizados.js";
import { parseMultTipoCaja } from "./helpers/contenedores.js";


export class InventariosService {

    static async obtenerPrecioProveedor(predioId, tipoFruta) {
        const proveedor = await ProveedoresRepository.get_proveedores({
            ids: [predioId],
            select: { precio: 1, PREDIO: 1, GGN: 1 }
        });

        if (!proveedor || proveedor.length === 0) {
            throw new Error("Proveedor no encontrado");
        }

        const idPrecio = proveedor[0].precio[tipoFruta];
        if (!idPrecio) {
            throw new Error(`No hay precio para la fruta ${tipoFruta}`);
        }

        const precio = await PreciosRepository.get_precios({ ids: [idPrecio] });
        if (!precio || precio.length === 0) {
            throw new Error("Precio inválido");
        }

        return { precioId: precio[0]._id, proveedor: proveedor };

    }
    static async construirQueryIngresoLote(datos, enf, precioId, tipoFruta, user) {
        const fecha = new Date(datos.fecha_estimada_llegada);

        return {
            ...datos,
            tipoFruta: tipoFruta._id,
            precio: precioId,
            enf,
            fecha_salida_patio: fecha,
            fecha_ingreso_patio: fecha,
            fecha_ingreso_inventario: fecha,
            user: user._id
        };
    }
    static async incrementarEF() {
        VariablesDelSistema.incrementarEF1();
    }
    static async crearRegistroInventarioCanastillas(
        {
            origen = '',
            destino = '',
            accion = '',
            canastillas = 0,
            canastillasPrestadas = 0,
            remitente = "",
            destinatario = "",
            user,
            fecha = '',
            observaciones = '',

        }
    ) {
        const estado = obtenerEstadoDesdeAccionCanastillasInventario(accion)
        return {
            fecha: new Date(fecha),
            destino: destino,
            origen: origen,
            cantidad: {
                propias: canastillas,
                prestadas: canastillasPrestadas
            },
            observaciones: observaciones,
            referencia: "C1",
            tipoMovimiento: accion,
            estado: estado,
            usuario: {
                id: user._id,
                user: user.user
            },
            remitente: remitente,
            destinatario: destinatario
        }
    }
    static async ajustarCanastillasProveedorCliente(_id, cantidad, user, session = null) {
        if (!_id || !Number.isFinite(cantidad) || cantidad === 0) return;

        const prov = await ProveedoresRepository.actualizar_proveedores(
            { _id: _id },
            { $inc: { canastillas: cantidad } },
            { session },
        );

        if (prov) {
            return prov;
        }

        const cli = await ClientesRepository.actualizar_clienteNacional(
            { _id: _id },
            { $inc: { canastillas: cantidad } },
            { session },
        )

        if (cli) {
            return cli;
        }

        throw new ConnectionDBError(404, "No existe proveedor/cliente o el ajuste dejaría canastillas en negativo");
    }
    static async encontrarDestinoOrigenRegistroCanastillas(registros) {
        const destinosArr = registros.map(registro => registro.destino);
        const origenesArr = registros.map(registro => registro.origen);

        const ids = [...new Set([...destinosArr, ...origenesArr])];

        const proveedores = await ProveedoresRepository.get_proveedores({
            ids: ids
        })
        const clientes = await ClientesRepository.get_clientesNacionales({
            ids: ids
        })

        const proveedorMap = new Map(proveedores.map(p => [p._id.toString(), p]));
        const clienteMap = new Map(clientes.map(c => [c._id.toString(), c]));

        const newRegistros = []

        for (let i = 0; i < registros.length; i++) {
            const registro = registros[i].toObject()

            const proveedorOrigen = proveedorMap.get(registro.origen);
            const clienteOrigen = clienteMap.get(registro.origen);

            const proveedorDestino = proveedorMap.get(registro.destino);
            const clienteDestino = clienteMap.get(registro.destino);

            const newOrigen = proveedorOrigen?.PREDIO || clienteOrigen?.cliente || registro.origen;
            const newDestino = proveedorDestino?.PREDIO || clienteDestino?.cliente || registro.destino;

            newRegistros.push({
                ...registro,
                origen: newOrigen,
                destino: newDestino
            })
        }
        return newRegistros
    }
    static async calcularDescartesReprocesoPredio(descarteLavado, descarteEncerado) {
        const kilosDescarteLavado =
            descarteLavado === undefined ? 0 :
                Object.values(descarteLavado).reduce((acu, item) => acu -= item, 0)
        const kilosDescarteEncerado =
            descarteEncerado === undefined ? 0 :
                Object.values(descarteEncerado).reduce((acu, item) => acu -= item, 0)

        return kilosDescarteLavado + kilosDescarteEncerado;
    }
    static async modificarInventariosDescarteReprocesoPredio(_id, descarteLavado, descarteEncerado) {
        if (descarteLavado)
            await VariablesDelSistema.modificar_inventario_descarte(_id, descarteLavado, 'descarteLavado');
        if (descarteEncerado)
            await VariablesDelSistema.modificar_inventario_descarte(_id, descarteEncerado, 'descarteEncerado');
    }
    static async validarGGN(proveedor, tipoFruta, user) {
        if (!(proveedor && proveedor[0].GGN && proveedor[0].GGN.fechaVencimiento)) { throw new Error("El predio no tiene GGN") }

        const fechaVencimiento = new Date(proveedor[0].GGN.fechaVencimiento);
        const hoy = new Date();

        // Calcular la fecha de un mes después de hoy (ojo, JS hace la magia con los días)
        const unMesDespues = new Date(hoy);
        unMesDespues.setMonth(unMesDespues.getMonth() + 1);

        // Si la fecha está entre hoy y dentro de un mes, es "cercana"
        if (fechaVencimiento > hoy && fechaVencimiento <= unMesDespues) {
            if (user.Rol > 2) {
                throw new Error("La fecha de vencimiento está cercana.");
            }
        } else if (fechaVencimiento < hoy) {
            throw new Error("El GGN del proveedor ya expiró.");
        }

        if (
            proveedor[0].GGN.code &&
            proveedor[0].GGN.tipo_fruta.includes(tipoFruta)
        ) return true

        //poner filtro de la fecha
        throw new Error("El proveedor no tiene GGN para ese tipo de fruta")
    }

    static async modificarLote_regresoHistorialFrutaIngreso(_id, queryLote, user, action) {

        const lote = await LotesRepository.actualizar_lote(
            { _id: _id },
            queryLote,
            {
                new: true,
                user: user,
                action: action
            }
        )

        return lote
    }
    static async modificarRecordLote_regresoHistorialFrutaIngreso(_id, __v, data) {
        const query = {}
        Object.keys(data).forEach(item => {
            query[`documento.${item}`] = data[item]
        })
        query[`documento.fecha_ingreso_patio`] = data.fecha_ingreso_inventario
        query[`documento.fecha_salida_patio`] = data.fecha_ingreso_inventario
        query[`documento.fecha_estimada_llegada`] = data.fecha_ingreso_inventario

        await RecordLotesRepository.modificarRecord(
            _id,
            query,
            __v
        )
    }
    /**
         * Procesa los datos del formulario de inventario de descarte, separando y transformando
         * los campos en objetos estructurados para descarte de lavado y encerado.
         * @param {Object} data - Datos del formulario
         * @param {string} data.tipoFruta - Tipo de fruta (ignorado en el procesamiento)
         * @param {Object.<string, string>} data - Pares clave-valor donde las claves tienen formato 'tipo:subtipo'
         * @returns {Object} Objeto con los descartes procesados
         * @returns {Object.<string, number>} return.descarteLavado - Objeto con los valores de descarte de lavado
         * @returns {Object.<string, number>} return.descarteEncerado - Objeto con los valores de descarte de encerado
         * @returns {number} return.total - Suma total de todos los valores de descarte
         * @example
         * // Entrada
         * {
         *   tipoFruta: 'Naranja',
         *   'descarteLavado:descarteGeneral': '10',
         *   'descarteLavado:pareja': '5',
         *   'descarteEncerado:descarteGeneral': '8'
         * }
         * // Salida
         * {
         *   descarteLavado: { descarteGeneral: 10, pareja: 5 },
         *   descarteEncerado: { descarteGeneral: 8 },
         *   total: 23
         * }
         */
    static async procesar_formulario_inventario_descarte(data) {
        const descarteLavado = {};
        const descarteEncerado = {};
        let total = 0;

        Object.keys(data).forEach(key => {
            if (key.startsWith('descarteLavado:')) {
                const campo = key.replace('descarteLavado:', '');
                // Asegurar que sea un entero válido
                const valor = parseInt(data[key], 10);
                if (!isNaN(valor) && Number.isInteger(valor) && valor >= 0) {
                    descarteLavado[campo] = valor;
                    total += valor;
                } else {
                    console.warn(`Valor inválido para ${key}: ${data[key]}`);
                    descarteLavado[campo] = 0;
                }
            } else if (key.startsWith('descarteEncerado:')) {
                const campo = key.replace('descarteEncerado:', '');
                // Asegurar que sea un entero válido
                const valor = parseInt(data[key], 10);
                if (!isNaN(valor) && Number.isInteger(valor) && valor >= 0) {
                    descarteEncerado[campo] = valor;
                    total += valor;
                } else {
                    console.warn(`Valor inválido para ${key}: ${data[key]}`);
                    descarteEncerado[campo] = 0;
                }
            }
        });

        return { descarteLavado, descarteEncerado, total };
    }
    /**
     * Crea un nuevo lote de reproceso para Celifrut con un código autogenerado.
     * Este método se utiliza para registrar lotes de fruta que serán reprocesados,
     * generando automáticamente un código ENF y registrando el lote como vaciado.
     *
     * @param {string} tipoFruta - Tipo de fruta ('Naranja' o 'Limon')
     * @param {number} kilos - Cantidad de kilos de fruta del lote
     * @param {Object} user - Usuario que realiza la operación
     * @param {string} user._id - ID del usuario
     * @param {string} user.user - Nombre del usuario
     *
     * @returns {Promise<Object>} El lote creado con todos sus datos
     * @throws {Error} Si hay problemas al generar el código o crear el lote
     *
     * @example
     * const lote = await InventariosService.crear_lote_celifrut('Naranja', 1000, {
     *   _id: '123',
     *   user: 'Juan'
     * });
     */
    static async crear_lote_celifrut(tipoFruta, kilos, user, logContext = null) {
        try {
            const codigo = await VariablesDelSistema.generar_codigo_celifrut()

            const lote = {
                enf: codigo,
                predio: '65c27f3870dd4b7f03ed9857',
                canastillas: '0',
                kilos: kilos,
                placa: 'AAA000',
                tipoFruta: tipoFruta,
                observaciones: 'Reproceso',
                promedio: Number(kilos) / (tipoFruta === 'Naranja' ? 19 : 20),
                "fecha_estimada_llegada": new Date(),
                "fecha_ingreso_patio": new Date(),
                "fecha_salida_patio": new Date(),
                "fecha_ingreso_inventario": new Date(),
            }

            const newLote = await LotesRepository.addLote(lote, user);

            const query = {
                $inc: {
                    kilosVaciados: newLote.kilos,
                },
                fechaProceso: new Date()
            }

            await LotesRepository.modificar_lote({ _id: newLote._id.toString() }, query, { user: user, action: "vaciarLote" });
            await VariablesDelSistema.incrementar_codigo_celifrut();

            if (logContext) {
                await registrarPasoLog(logContext.logId, "inventarioServices.crear_lote_celifrut", "Completado");
            }

            return newLote
        } catch (error) {
            console.error("Error creando lote Celifrut:", error);
            throw new Error(`Error creando lote Celifrut: ${error.message}`);
        }
    }
    /**
     * Revisa y compara los cambios entre un registro existente de despacho de descarte y los nuevos datos.
     * Esta función determina si hay cambios en el tipo de fruta o en los kilos del registro.
     *
     * @param {string} _id - ID del registro de despacho de descarte a revisar
     * @param {Object} newData - Nuevos datos para comparar con el registro existente
     * @param {string} newData.tipoFruta - Tipo de fruta del nuevo registro
     * @param {number} newData.kilos - Cantidad de kilos del nuevo registro
     *
     * @returns {Promise<Object>} Objeto con los resultados de la comparación
     * @returns {boolean} return.cambioFruta - Indica si hubo cambio en el tipo de fruta
     * @returns {boolean} return.cambioIventario - Indica si hubo cambio en la cantidad de kilos
     * @returns {Object} return.registro - El registro original encontrado en la base de datos
     *
     * @throws {Error} Si el ID del registro no existe en la base de datos
     *
     * @example
     * // Revisar cambios en un registro
     * const cambios = await InventariosService.revisar_cambio_registro_despachodescarte(
     *   '507f1f77bcf86cd799439011',
     *   { tipoFruta: 'Naranja', kilos: 1000 }
     * );
     */
    static async revisar_cambio_registro_despachodescarte(_id, newData) {
        let cambioFruta = false
        let cambioIventario = false
        const registro = await DespachoDescartesRepository.get_historial_descarte({
            ids: [_id]
        })

        if (registro.length < 0) throw new Error("El id del registro no existe")

        if (newData.tipoFruta !== registro[0].tipoFruta) cambioFruta = true

        if (newData.kilos !== registro[0].kilos) cambioIventario = true

        return { cambioFruta, cambioIventario, registro: registro[0] }

    }
    /**
 * Revisa y compara los cambios entre un registro existente de fruta descompuesta y los nuevos datos.
 * Esta función determina si hay cambios en el tipo de fruta o en los kilos del registro.
 *
 * @param {string} _id - ID del registro de fruta descompuesta a revisar
 * @param {Object} newData - Nuevos datos para comparar con el registro existente
 * @param {string} newData.tipoFruta - Tipo de fruta del nuevo registro
 * @param {number} newData.kilos - Cantidad de kilos del nuevo registro
 *
 * @returns {Promise<Object>} Objeto con los resultados de la comparación
 * @returns {boolean} return.cambioFruta - Indica si hubo cambio en el tipo de fruta
 * @returns {boolean} return.cambioIventario - Indica si hubo cambio en la cantidad de kilos
 * @returns {Object} return.registro - El registro original encontrado en la base de datos
 *
 * @throws {Error} Si el ID del registro no existe en la base de datos
 *
 * @example
 * // Revisar cambios en un registro
 * const cambios = await InventariosService.revisar_cambio_registro_frutaDescompuestae(
 *   '507f1f77bcf86cd799439011',
 *   { tipoFruta: 'Naranja', kilos: 1000 }
 * );
 */
    static async revisar_cambio_registro_frutaDescompuestae(_id, newData) {
        let cambioFruta = false
        let cambioIventario = false
        const registro = await FrutaDescompuestaRepository.get_fruta_descompuesta({
            ids: [_id]
        })

        if (registro.length < 0) throw new Error("El id del registro no existe")

        if (newData.tipoFruta !== registro[0].tipoFruta) cambioFruta = true

        if (newData.kilos !== registro[0].kilos) cambioIventario = true

        return { cambioFruta, cambioIventario, registro: registro[0] }

    }
    /**
     * Procesa los datos del formulario de registro de descarte, calculando los totales
     * para descartes de lavado y encerado.
     *
     * @param {Object} data - Objeto con los datos del formulario a procesar
     * @param {Object.<string, string|number>} data - Pares clave-valor donde las claves tienen formato 'tipo.subtipo'
     *
     * @returns {Promise<Object>} Objeto con los descartes procesados
     * @returns {Object.<string, number>} return.descarteLavado - Mapa de tipos de descarte de lavado y sus cantidades
     * @returns {Object.<string, number>} return.descarteEncerado - Mapa de tipos de descarte de encerado y sus cantidades
     * @returns {number} return.total - Suma total de todos los valores de descarte
     *
     * @example
     * // Entrada:
     * {
     *   'descarteLavado.descarteGeneral': '10',
     *   'descarteLavado.pareja': '5',
     *   'descarteEncerado.descarteGeneral': '8'
     * }
     * // Salida:
     * {
     *   descarteLavado: { descarteGeneral: 10, pareja: 5 },
     *   descarteEncerado: { descarteGeneral: 8 },
     *   total: 23
     * }
     */
    static async procesar_formulario_inventario_registro_descarte(data) {
        const descarteLavado = {};
        const descarteEncerado = {};
        let totalDescarte = 0;

        // Procesar el objeto de entrada
        Object.entries(data).forEach(([key, value]) => {
            // Separar la clave por el punto para identificar tipo y subtipo
            const [tipo, subtipo] = key.split('.');
            const valorNumerico = value === '' ? 0 : parseInt(value);

            if (tipo === 'descarteLavado') {
                descarteLavado[subtipo] = valorNumerico;
                totalDescarte += valorNumerico;
            } else if (tipo === 'descarteEncerado') {
                descarteEncerado[subtipo] = valorNumerico;
                totalDescarte += valorNumerico;
            }
        });

        return {
            descarteLavado,
            descarteEncerado,
            total: totalDescarte
        };
    }
    /**
     * Modifica el inventario en Redis cuando hay un cambio en el tipo de fruta de un registro de descarte.
     * Esta función maneja una transacción atómica en Redis para asegurar la consistencia del inventario,
     * incluyendo un mecanismo de rollback en caso de fallo.
     *
     * @param {Object} registro - El registro original de descarte
     * @param {Object} registro.descarteLavado - Objeto con los valores de descarte de lavado originales
     * @param {Object} registro.descarteEncerado - Objeto con los valores de descarte de encerado originales
     * @param {string} registro.tipoFruta - Tipo de fruta original
     * @param {Object} newRegistro - El nuevo registro con los cambios
     * @param {string} newRegistro.tipoFruta - Nuevo tipo de fruta
     * @param {Object} descarteLavado - Objeto con los nuevos valores de descarte de lavado
     * @param {Object} descarteEncerado - Objeto con los nuevos valores de descarte de encerado
     *
     * @throws {Error} Si los kilos a modificar son mayores que el inventario disponible
     * @throws {Error} Si la transacción falla por concurrencia
     *
     */
    static async modificar_inventario_registro_cambioFruta(registro, newRegistro, descarteLavado, descarteEncerado) {

        const startTime = Date.now();
        console.info(`[INVENTARIO] Inicio modificación - Fruta: ${newRegistro.tipoFruta}, Lavado: ${JSON.stringify(descarteLavado)}, Encerado: ${JSON.stringify(descarteEncerado)}`);

        //se modifica el inventario
        const clientRedis = await RedisRepository.getClient()

        await Promise.all([
            RedisRepository.put_reprocesoDescarte_sumar(registro.descarteLavado._doc, 'descarteLavado:', registro.tipoFruta),
            RedisRepository.put_reprocesoDescarte_sumar(registro.descarteEncerado._doc, 'descarteEncerado:', registro.tipoFruta),
        ])

        // 2️⃣ Claves a vigilar
        const keyLavado = `inventarioDescarte:${newRegistro.tipoFruta}:descarteLavado:`;
        const keyEncerado = `inventarioDescarte:${newRegistro.tipoFruta}:descarteEncerado:`;


        try {
            // 3️⃣ WATCH antes de leer
            await clientRedis.watch(keyLavado, keyEncerado);

            const inventario = await RedisRepository.get_inventarioDescarte_porTipoFruta(newRegistro.tipoFruta)
            for (const tipoInv of Object.keys(inventario)) {
                for (const itemKey of Object.keys(inventario[tipoInv])) {
                    if (tipoInv === 'descarteLavado') {
                        if (Number(descarteLavado[itemKey] || 0) > Number(inventario[tipoInv][itemKey] || 0)) {
                            console.warn(`Modificacion mayor al inventario descarteLavado ${descarteLavado[itemKey]} > ${inventario[tipoInv][itemKey]}`);
                            throw new Error(`Los kilos a modificar son mayores que el inventario ${tipoInv}: ${itemKey}`)
                        }
                    } else if (tipoInv === 'descarteEncerado') {
                        if (Number(descarteEncerado[itemKey] || 0) > Number(inventario[tipoInv][itemKey] || 0)) {
                            console.warn(`Modificacion mayor al inventario descarteEncerado ${descarteEncerado[itemKey]} > ${inventario[tipoInv][itemKey]}`);

                            throw new Error(`Los kilos a modificar son mayores que el inventario ${tipoInv}: ${itemKey}`)
                        }
                    }
                }
            }

            const multi = clientRedis.multi();
            await RedisRepository.put_reprocesoDescarte(descarteLavado, 'descarteLavado:', newRegistro.tipoFruta, multi);
            await RedisRepository.put_reprocesoDescarte(descarteEncerado, 'descarteEncerado:', newRegistro.tipoFruta, multi);
            const resultado = await multi.exec();
            if (resultado === null) {
                console.warn(`[INVENTARIO] Transacción fallida por concurrencia. Intentando rollback...`);
                throw new Error('Transacción fallida: otro proceso modificó el inventario, reintente.');
            }

            console.info(`[INVENTARIO] Transacción exitosa. Resultado: ${JSON.stringify(resultado)}. Tiempo: ${Date.now() - startTime} ms`);


        } catch (err) {
            try {
                const multi = clientRedis.multi();
                await RedisRepository.put_reprocesoDescarte(registro.descarteLavado._doc, 'descarteLavado:', registro.tipoFruta, multi);
                await RedisRepository.put_reprocesoDescarte(registro.descarteEncerado._doc, 'descarteEncerado:', registro.tipoFruta, multi);
                const resultado = await multi.exec();
                if (resultado === null) {
                    throw new Error('Transacción fallida: otro proceso modificó el inventario, reintente.');
                }
            } catch (rollbackErr) {
                console.error("Error durante el rollback del inventario:", rollbackErr);
            }
            throw new Error(err.message);
        } finally {
            await clientRedis.unwatch();
            console.info(`[INVENTARIO] Fin de operación - Tiempo total: ${Date.now() - startTime} ms`);
        }

    }
    /**
     * Almacena en Redis las modificaciones de inventario de descartes de fruta mediante una transacción atómica.
     * Verifica que haya suficiente inventario disponible antes de realizar las modificaciones y
     * maneja la concurrencia mediante el sistema de vigilancia (WATCH) de Redis.
     *
     * @param {Object.<string, number>} descarteLavado - Mapa de tipos de descarte de lavado y sus cantidades
     * @param {Object.<string, number>} descarteEncerado - Mapa de tipos de descarte de encerado y sus cantidades
     * @param {string} tipoFruta - Tipo de fruta ('Naranja' o 'Limon')
     *
     * @throws {Error} Si los kilos a modificar son mayores que el inventario disponible
     * @throws {Error} Si la transacción falla por concurrencia con otros procesos
     *
     * @example
     * await InventariosService.frutaDescarte_despachoDescarte_redis_store(
     *   { descarteGeneral: 10, pareja: 5 },
     *   { descarteGeneral: 8 },
     *   'Naranja'
     * );
     */
    static async frutaDescarte_despachoDescarte_redis_store(descarteLavado, descarteEncerado, tipoFruta) {
        const startTime = Date.now();
        console.info(`[INVENTARIO DESCARTES] Inicio modificación - Fruta: ${tipoFruta}, Lavado: ${JSON.stringify(descarteLavado)}, Encerado ${JSON.stringify(descarteEncerado)}`);

        const keyLavado = `inventarioDescarte:${tipoFruta}:descarteLavado:`;
        const keyEncerado = `inventarioDescarte:${tipoFruta}:descarteEncerado:`;

        const clientRedis = await RedisRepository.getClient()

        try {
            await clientRedis.watch(keyLavado, keyEncerado);

            const inventario = await RedisRepository.get_inventarioDescarte_porTipoFruta(tipoFruta)
            for (const tipoInv of Object.keys(inventario)) {
                for (const itemKey of Object.keys(inventario[tipoInv])) {
                    if (tipoInv === 'descarteLavado') {
                        if (Number(descarteLavado[itemKey] || 0) > Number(inventario[tipoInv][itemKey] || 0)) {
                            throw new Error(`Los kilos a modificar son mayores que el inventario ${tipoInv}: ${itemKey}`)
                        }
                    } else if (tipoInv === 'descarteEncerado') {
                        if (Number(descarteEncerado[itemKey] || 0) > Number(inventario[tipoInv][itemKey] || 0)) {
                            throw new Error(`Los kilos a modificar son mayores que el inventario ${tipoInv}: ${itemKey}`)
                        }
                    }
                }
            }

            const multi = clientRedis.multi();
            await RedisRepository.put_reprocesoDescarte(descarteLavado, 'descarteLavado:', tipoFruta, multi);
            await RedisRepository.put_reprocesoDescarte(descarteEncerado, 'descarteEncerado:', tipoFruta, multi);
            const resultado = await multi.exec();

            if (resultado === null) {
                console.warn(`[INVENTARIO DESCARTES] Transacción fallida por concurrencia. Intentando rollback...`);
                throw new Error('Transacción fallida: otro proceso modificó el inventario, reintente.');
            }

            console.info(`[INVENTARIO DESCARTES] Transacción exitosa. Resultado: ${JSON.stringify(resultado)}. Tiempo: ${Date.now() - startTime} ms`);
        } catch (err) {
            console.error(`[INVENTARIO] Error en redis_store: ${err.message}`);
            throw err;

        } finally {
            await clientRedis.unwatch();
            console.info(`[INVENTARIO DESCARTES] Fin de operación - Tiempo total: ${Date.now() - startTime} ms`);
        }
    }
    /**
     * Restaura el inventario en Redis después de un error o cuando se necesita revertir cambios.
     * A diferencia de la función store, esta función suma las cantidades al inventario existente
     * usando una transacción atómica para mantener la consistencia de los datos.
     *
     * @param {Object.<string, number>} descarteLavado - Mapa de tipos de descarte de lavado y sus cantidades a restaurar
     * @param {Object.<string, number>} descarteEncerado - Mapa de tipos de descarte de encerado y sus cantidades a restaurar
     * @param {string} tipoFruta - Tipo de fruta ('Naranja' o 'Limon')
     *
     * @throws {Error} Si la transacción falla por concurrencia con otros procesos
     *
     * @example
     * // Restaurar cantidades al inventario
     * await InventariosService.frutaDescarte_despachoDescarte_redis_restore(
     *   { descarteGeneral: 10, pareja: 5 },
     *   { descarteGeneral: 8 },
     *   'Naranja'
     * );
     */
    static async frutaDescarte_despachoDescarte_redis_restore(descarteLavado, descarteEncerado, tipoFruta) {
        const startTime = Date.now();
        console.info(`[INVENTARIO DESCARTES][RESTORE] Inicio restauración - Fruta: ${tipoFruta}, Lavado: ${JSON.stringify(descarteLavado)}, Encerado: ${JSON.stringify(descarteEncerado)}`);

        const keyLavado = `inventarioDescarte:${tipoFruta}:descarteLavado:`;
        const keyEncerado = `inventarioDescarte:${tipoFruta}:descarteEncerado:`;

        const clientRedis = await RedisRepository.getClient();

        try {
            await clientRedis.watch(keyLavado, keyEncerado);

            const multi = clientRedis.multi();
            // Aquí sumas, no restas:
            await RedisRepository.put_reprocesoDescarte_sumar(descarteLavado, 'descarteLavado:', tipoFruta, multi);
            await RedisRepository.put_reprocesoDescarte_sumar(descarteEncerado, 'descarteEncerado:', tipoFruta, multi);

            const resultado = await multi.exec();

            if (resultado === null) {
                console.warn(`[INVENTARIO DESCARTES][RESTORE] Transacción fallida por concurrencia. Reintente si es necesario.`);
                throw new Error('Transacción fallida: otro proceso modificó el inventario, reintente.');
            }

            console.info(`[INVENTARIO DESCARTES][RESTORE] Restauración exitosa. Resultado: ${JSON.stringify(resultado)}. Tiempo: ${Date.now() - startTime} ms`);
        } catch (err) {
            console.error(`[INVENTARIO DESCARTES][RESTORE] Error en redis_restore: ${err.message}`);
            throw err;
        } finally {
            await clientRedis.unwatch();
            console.info(`[INVENTARIO DESCARTES][RESTORE] Fin de restauración - Tiempo total: ${Date.now() - startTime} ms`);
        }
    }
    static async set_inventario_descarte(inventario, tipoFruta) {
        const startTime = Date.now();
        console.info(`[INVENTARIO DESCARTES][SET] Inicio restauración - Fruta: ${tipoFruta}, Inventario: ${JSON.stringify(inventario)}`);

        const keyLavado = `inventarioDescarte:${tipoFruta}:descarteLavado:`;
        const keyEncerado = `inventarioDescarte:${tipoFruta}:descarteEncerado:`;

        const clientRedis = await RedisRepository.getClient();

        const { descarteLavado, descarteEncerado } = await InventariosService.procesar_formulario_inventario_descarte(inventario)

        try {
            await clientRedis.watch(keyLavado, keyEncerado);

            const multi = clientRedis.multi();
            // Aquí sumas, no restas:
            await RedisRepository.put_reprocesoDescarte_set(descarteLavado, 'descarteLavado:', tipoFruta, multi);
            await RedisRepository.put_reprocesoDescarte_set(descarteEncerado, 'descarteEncerado:', tipoFruta, multi);

            const resultado = await multi.exec();

            if (resultado === null) {
                console.warn(`[INVENTARIO DESCARTES][RESTORE] Transacción fallida por concurrencia. Reintente si es necesario.`);
                throw new Error('Transacción fallida: otro proceso modificó el inventario, reintente.');
            }
        } catch (err) {
            console.error(err.message)
        } finally {
            await clientRedis.unwatch();
            console.info(`[INVENTARIO DESCARTES][RESTORE] Fin de restauración - Tiempo total: ${Date.now() - startTime} ms`);
        }
    }
    /**
     * Modifica el inventario cuando se ingresa fruta sin procesar al proceso de desverdizado.
     * Esta función actualiza tanto el inventario general como el inventario específico de desverdizado
     * de forma concurrente para optimizar el rendimiento.
     *
     * @async
     * @static
     * @method modificarInventarioIngresoDesverdizado
     *
     * @param {number|string} canastillas - Cantidad de canastillas que se ingresan al desverdizado
     * @param {string} cuartoId - ID del cuarto de desverdizado donde se almacena la fruta
     * @param {string} loteId - ID del lote que se está procesando
     *
     * @description
     * Este método realiza dos operaciones principales de forma paralela:
     * 1. **Actualización del inventario general**: Resta las canastillas del inventario principal
     *    usando VariablesDelSistema.modificarInventario()
     * 2. **Actualización del inventario de desverdizado**: Agrega las canastillas al inventario
     *    específico del cuarto de desverdizado usando RedisRepository.update_inventarioDesverdizado()
     *
     * La operación se ejecuta de forma atómica usando Promise.all() para garantizar que ambas
     * modificaciones se completen exitosamente o fallen juntas.
     *
     * @throws {Error} Si falla alguna de las operaciones de actualización del inventario
     * @throws {Error} Si los parámetros proporcionados son inválidos
     *
     */
    static async modificarInventarioIngresoDesverdizado(canastillas, cuartoId, loteId) {

        console.info(`[INVENTARIO DESCARTES] Inicio modificación ingreso desverdizado ${canastillas}, en el cuarto ${cuartoId}, lote: ${loteId}`);

        await Promise.all([
            VariablesDelSistema.modificarInventario(loteId, canastillas),
            RedisRepository.update_inventarioDesverdizado(cuartoId, loteId, (canastillas),)
        ])
    }
    static async procesarInventarioDesverdizado(inventario) {
        const lotesIds = new Set()
        const cuartosIds = new Set();
        const result = []

        const inventarioData = inventario?.inventarioDesverdizado ?? {};
        for (const key of Object.keys(inventarioData)) {
            for (const loteId of Object.keys(inventarioData[key])) {
                lotesIds.add(loteId);
                result.push({
                    loteId,
                    cuartoId: key,
                    canastillas: inventarioData[key][loteId],
                })
            }
        }

        const [lotes, cuartosDesverdizado] = await Promise.all([
            LotesRepository.getLotes({
                ids: [...lotesIds],
            }),
            CuartosDesverdizados.get_cuartosDesverdizados({
                ids: [...cuartosIds]
            })
        ])

        for (let i = 0; i < result.length; i++) {
            let item = result[i];
            const lote = lotes.find(id => id._id.toString() === item.loteId);
            const cuarto = cuartosDesverdizado.find(id => id._id.toString() === item.cuartoId);
            if (lote && cuarto) {
                result[i] = {
                    ...item,
                    lote: lote?.predio?.PREDIO || "",
                    enf: lote?.enf || "",
                    promedio: lote?.promedio || 0,
                    cuarto: cuarto?.nombre || "",
                    fechaIngreso: lote?.desverdizado?.fechaIngreso || "",
                    GGN: lote?.GGN ? (lote?.predio?.GGN?.code || "") : ""
                }
            } else {
                console.warn(`Lote o cuarto no encontrado para item: ${JSON.stringify(item)}`);
            }
        }

        return result;
    }
    static async devolverDesverdizadoInventarioFrutaSinprocesar(cuarto, _id) {
        console.info(`[INVENTARIO DESCARTES] Inicio devolución desverdizado fruta sin procesar: ${_id}, en el cuarto ${cuarto}`);

        const datosCrudos = await RedisRepository.get_inventario_desverdizado(cuarto, _id);
        const canastillas = datosCrudos?.inventarioDesverdizado?.[cuarto]?.[_id];

        await Promise.all([
            VariablesDelSistema.modificarInventario(_id, -canastillas),
            RedisRepository.delete_inventarioDesverdizado_registro(cuarto, _id)
        ])

    }
    static async move_desverdizado_inventario_to_frutaSinProcesar(cuarto, _id, cantidad) {
        console.info(`[INVENTARIO DESCARTES] Inicio mover desverdizado a fruta sin procesar: ${_id}, en el cuarto ${cuarto}`);

        const datosCrudos = await RedisRepository.get_inventario_desverdizado(cuarto, _id);
        const canastillas = datosCrudos?.inventarioDesverdizado?.[cuarto]?.[_id];

        if (canastillas < cantidad) {
            throw new Error(`No hay suficientes canastillas para mover: ${canastillas} < ${cantidad}`);
        }


        await Promise.all([
            canastillas === cantidad ?
                RedisRepository.delete_inventarioDesverdizado_registro(cuarto, _id) :
                RedisRepository.update_inventarioDesverdizado(cuarto, _id, -cantidad),
            VariablesDelSistema.modificarInventario(_id, -cantidad),
        ])
    }
    static async move_entre_cuartos_desverdizados(cuartoOrigen, cuartoDestino, _id, cantidad) {
        console.info(`[INVENTARIO DESCARTES] Inicio mover entre cuartos desverdizados: ${_id}, de ${cuartoOrigen} a ${cuartoDestino}`);

        const datosCrudosOrigen = await RedisRepository.get_inventario_desverdizado(cuartoOrigen, _id);
        const canastillasOrigen = datosCrudosOrigen?.inventarioDesverdizado?.[cuartoOrigen]?.[_id];

        if (canastillasOrigen < cantidad) {
            throw new Error(`No hay suficientes canastillas en el cuarto origen: ${canastillasOrigen} < ${cantidad}`);
        }

        await Promise.all([
            canastillasOrigen === cantidad ?
                RedisRepository.delete_inventarioDesverdizado_registro(cuartoOrigen, _id) :
                RedisRepository.update_inventarioDesverdizado(cuartoOrigen, _id, -cantidad),
            RedisRepository.update_inventarioDesverdizado(cuartoDestino, _id, cantidad)
        ])
    }
    static async ingresar_salida_inventario_descartes() {
    }
    static async probar_deshidratacion_loteProcesando(user) {
        const predioVaciando = await VariablesDelSistema.obtenerEF1proceso();
        if (!predioVaciando) {
            return "No vaceo"
        }

        const loteVaciando = await LotesRepository.getLotes({ ids: [predioVaciando._id] });
        const lote = loteVaciando?.[0];
        if (!lote) {
            return "No vaceo"
        }

        // Cargos con vía rápida
        const PERM_1 = "66c75d2daa4aa86aef8ff013";
        const PERM_2 = "66c79242f9cbdcf56b82dc58";

        // Pueden saltarse la validación si:
        // - Rol > 0  O  - Cargo está en la lista permitida
        const puedeOmitirValidacion =
            Number(user?.Rol) === 0 || [PERM_1, PERM_2].includes(user?.cargo);

        if (!puedeOmitirValidacion) {
            const d = lote.deshidratacion;
            const esNumero = typeof d === "number" && Number.isFinite(d);

            // Solo valida si hay número; fuera de [-1, 3] => error
            if (esNumero && (d > 3 || d < -1)) {
                throw new InventariosLogicError(
                    470,
                    `El lote no se puede vaciar porque la deshidratación de ${predioVaciando.enf} - ${predioVaciando.nombrePredio} no está en el rango permitido.`
                );
            }
        }

        return lote;
    }


    static async construir_ef8_lote(data, enf, precio, user) {
        const totalCanastillas = Number(data.canastillasPropias || 0) + Number(data.canastillasVaciasPropias || 0);
        const totalCanastillasPrestadas = Number(data.canastillasVaciasPrestadas || 0) + Number(data.canastillasPrestadas || 0);
        const total = Number(data.descarteGeneral || 0) + Number(data.balin || 0) + Number(data.pareja || 0);
        const promedio = totalCanastillas > 0 ? total / totalCanastillas : 0;

        const loteEF8 = {
            balin: data.balin || 0,
            canastillas: totalCanastillas || 0,
            canastillasPrestadas: totalCanastillasPrestadas || 0,
            descarteGeneral: Number(data.descarteGeneral || 0),
            enf: enf,
            fecha_ingreso_inventario: colombiaToUTC(data.fecha_ingreso_inventario || Date.now()),
            numeroPrecintos: Number(data.numeroPrecintos || 0),
            numeroRemision: data.numeroRemision,
            observaciones: data.observaciones || '',
            pareja: Number(data.pareja || 0),
            placa: data.placa || '',
            predio: data.predio || '',
            precio: precio,
            promedio: promedio,
            tipoFruta: data.tipoFruta,
            user: user._id
        }

        return { loteEF8, total }
    }
    static async ingresarDescarteEf8(data, tipoFruta, logId) {
        const descarte = {
            descarteGeneral: data.descarteGeneral || 0,
            pareja: data.pareja || 0,
            balin: data.balin || 0,
        }
        await RedisRepository.put_inventarioDescarte(descarte, 'descarteLavado:', tipoFruta, logId)

    }
    static async obtenerRecordLotesIngresoLote(filtro) {
        const { fechaInicio, fechaFin, tipoFruta2 = {} } = filtro;
        let query = {}
        query = filtroFechaInicioFin(fechaInicio, fechaFin, query, 'fecha_estimada_llegada')

        if (
            tipoFruta2 &&
            tipoFruta2._id !== undefined &&
            tipoFruta2._id !== null &&
            !(typeof tipoFruta2 === "object" && Object.keys(tipoFruta2).length === 0)
        ) {
            query.tipoFruta = tipoFruta2._id;
        }

        const lotes = await LotesRepository.getLotes2({
            query: query,
            limit: 'all',
            sort: { fecha_estimada_llegada: -1 }
        });

        const usersId = [];

        for (const lote of lotes) {
            if (lote?.user) {
                usersId.push(lote.user.toString());
            }
        }

        const usersIdSet = new Set(usersId)
        const usersIdArr = [...usersIdSet]

        const user = await UsuariosRepository.get_users({
            ids: usersIdArr,
            getAll: true
        })

        const result = [];
        for (const lote of lotes) {

            const usuario = user.find(u => u._id.toString() === lote?.user?.toString());
            if (usuario) {
                lote.user = usuario.nombre + " " + usuario.apellido;
            }
            result.push(lote);
        }
        console.info(`[INVENTARIO] Se obtuvieron ${result} lotes de ingreso.`);
        return result;
    }
    static async obtenerRecordLotesIngresoLoteEF8(filtro) {
        const { fechaInicio, fechaFin, tipoFruta2 = {} } = filtro;
        let query = {}
        query = filtroFechaInicioFin(fechaInicio, fechaFin, query, 'fecha_ingreso_inventario')

        if (
            tipoFruta2 &&
            tipoFruta2._id !== undefined &&
            tipoFruta2._id !== null &&
            !(typeof tipoFruta2 === "object" && Object.keys(tipoFruta2).length === 0)
        ) {
            query.tipoFruta = tipoFruta2._id;
        }

        const lotes = await LotesRepository.getLotesEF8({
            query: query,
            limit: 'all',
            sort: { fecha_ingreso_inventario: -1 }
        });

        const usersId = [];

        for (const lote of lotes) {
            usersId.push(lote.user.toString());
        }

        const usersIdSet = new Set(usersId)
        const usersIdArr = [...usersIdSet]

        const user = await UsuariosRepository.get_users({
            ids: usersIdArr,
            getAll: true
        })

        const tipoFrutas = await dataRepository.get_data_tipoFruta2()
        const result = [];
        for (const lote of lotes) {
            // Haz el objeto plano primero
            const lotePlano = typeof lote.toObject === "function" ? lote.toObject() : { ...lote };

            // Luego sí modifica lo que quieras, aquí ya es un objeto JS normal
            const usuario = user.find(u => u._id.toString() === lotePlano.user);
            if (usuario) {
                lotePlano.user = usuario.nombre + " " + usuario.apellido;
            }
            const tipoFrutaFound = tipoFrutas.find(u => u._id.toString() === lotePlano.tipoFruta);
            if (tipoFrutaFound) {
                lotePlano.tipoFruta = tipoFrutaFound; // Ahora sí, sin miedo
            }
            result.push(lotePlano);
        }
        return result;
    }
    static async obtenerRecordLotesIngresolote_EF1_EF8(filtro) {
        const { fechaInicio, fechaFin, tipoFruta2 = {} } = filtro;
        let query1 = {}
        let query2 = {}

        query1 = filtroFechaInicioFin(fechaInicio, fechaFin, query1, 'fecha_ingreso_inventario')
        query2 = filtroFechaInicioFin(fechaInicio, fechaFin, query2, 'fecha_ingreso_inventario')

        if (
            tipoFruta2._id !== undefined &&
            tipoFruta2._id !== null &&
            !(typeof tipoFruta2 === "object" && Object.keys(tipoFruta2).length === 0)
        ) {
            query1.tipoFruta = tipoFruta2._id;
            query2.tipoFruta = tipoFruta2._id;
        }

        const data = await UnionsRepository.obtenerUnionRecordLotesIngresoLoteEF8(query1, query2);

        const usersId = [];
        const tipoFrutaId = [];


        for (const lote of data) {
            if (lote?.user) {
                usersId.push(lote.user.toString());
            }
        }

        const usersIdSet = new Set(usersId)
        const usersIdArr = [...usersIdSet]

        const user = await UsuariosRepository.get_users({
            ids: usersIdArr,
            getAll: true
        })

        const result = [];

        for (const lote of data) {

            const usuario = user.find(u => u._id.toString() === lote?.user);
            if (usuario) {
                lote.user = usuario.nombre + " " + usuario.apellido;
            }

            lote.predio = lote.predioInfo[0] || {};
            lote.tipoFruta = lote.tipoFrutaInfo[0] || {};
            delete lote.predioInfo;
            delete lote.tipoFrutaInfo;
            result.push(lote);
        }

        console.log(result);

        return result;
    }
    static async ingresarCanasillas(datos, user) {
        const canastillasPropias = Number(datos.canastillasPropias || 0) + Number(datos.canastillasVaciasPropias || 0)
        const canastillasPrestadas = Number(datos.canastillasPrestadas || 0) + Number(datos.canastillasVaciasPrestadas || 0)

        const dataRegistro = await this.crearRegistroInventarioCanastillas({
            destino: "65c27f3870dd4b7f03ed9857",
            origen: datos.predio,
            observaciones: "ingreso lote",
            fecha: datos.fecha_ingreso_inventario,
            canastillas: canastillasPropias,
            canastillasPrestadas: canastillasPrestadas,
            accion: "ingreso",
            user
        })

        const [, , registroCanastillas,] = await Promise.all([
            this.ajustarCanastillasProveedorCliente(datos.predio, -canastillasPropias),
            this.ajustarCanastillasProveedorCliente("65c27f3870dd4b7f03ed9857", canastillasPropias),
            CanastillasRepository.post_registro(dataRegistro),
            VariablesDelSistema.modificar_canastillas_inventario(canastillasPrestadas, "canastillasPrestadas"),
        ])

        return registroCanastillas;

    }
    static async itemsCuartosFrios(items, contenedores) {
        const out = [];
        for (const contenedor of contenedores) {
            if (!contenedor.pallets) continue;
            for (const [index, pallet] of contenedor.pallets.entries()) {
                if (!pallet.EF1) continue;
                for (const item of pallet.EF1) {
                    if (!item) continue;

                    if (items.includes(item._id.toString())) {
                        out.push({
                            ...item,
                            contenedor: contenedor.numeroContenedor,
                            pallet: index,
                        });
                    }
                }

            }
        }
        return out;
    }
    static async sumatorias_items_cuartosFrios(items) {
        const out = {}
        let operation = "";

        for (const item of items) {
            const { tipoCaja, cajas, tipoFruta } = item;
            if (!out[`totalFruta.${tipoFruta}.cajas`]) out[`totalFruta.${tipoFruta}.cajas`] = 0;
            if (!out[`totalFruta.${tipoFruta}.kilos`]) out[`totalFruta.${tipoFruta}.kilos`] = 0;
            const mult = parseMultTipoCaja(tipoCaja);
            out[`totalFruta.${tipoFruta}.kilos`] -= (cajas * mult);
            out[`totalFruta.${tipoFruta}.cajas`] -= cajas;
            operation += `${cajas} cajas de ${tipoCaja}, `

        }
        return { operation, out };
    }
    static async modificarRestarInventarioFrutaSinProocesar(canastillas, user, action, loteId, log, session, descripcion) {
        // Primero decrementar las canastillas
        const updateResult = await InventariosHistorialRepository.put_inventarioSimple_updateOne(
            { _id: "68cecc4cff82bb2930e43d05" },
            { $inc: { 'inventario.$[it].canastillas': -canastillas, __v: 1 } },
            {
                session,
                action: action,
                description: descripcion,
                user: user._id,
                arrayFilters: [{ 'it.lote': new mongoose.Types.ObjectId(loteId) }],
            }
        );
        await registrarPasoLog(log._id, "InventariosHistorialRepository.put_inventarioSimple_updateOne (decrementar)", "Completado", `Canastillas decrementadas: ${canastillas}, matchedCount: ${updateResult?.matchedCount}, modifiedCount: ${updateResult?.modifiedCount}`);

        // Luego eliminar elementos con canastillas <= 0
        const pullResult = await InventariosHistorialRepository.put_inventarioSimple_updateOne(
            { _id: "68cecc4cff82bb2930e43d05" },
            { $pull: { inventario: { lote: new mongoose.Types.ObjectId(loteId), canastillas: { $lte: 0 } } } },
            { session, skipAudit: true, runValidators: false }
        );
        await registrarPasoLog(log._id, "InventariosHistorialRepository.put_inventarioSimple_updateOne (pull)", "Completado", `Elementos eliminados con canastillas <= 0, matchedCount: ${pullResult?.matchedCount}, modifiedCount: ${pullResult?.modifiedCount}`);

    }
static async modificarSumarInventarioFrutaSinProocesar(
    canastillas, user, action, loteId, log, session, descripcion
) {
    const loteObjectId = new mongoose.Types.ObjectId(loteId);

    const pipelineUpdate = [
        {
            $set: {
                inventario: {
                    $let: {
                        vars: { existe: { $in: [loteObjectId, "$inventario.lote"] } },
                        in: {
                            $cond: [
                                "$$existe",
                                {
                                    $map: {
                                        input: "$inventario",
                                        as: "it",
                                        in: {
                                            $cond: [
                                                { $eq: ["$$it.lote", loteObjectId] },
                                                {
                                                    $mergeObjects: [
                                                        "$$it",
                                                        {
                                                            canastillas: {
                                                                $add: ["$$it.canastillas", canastillas]
                                                            }
                                                        }
                                                    ]
                                                },
                                                "$$it"
                                            ]
                                        }
                                    }
                                },
                                {
                                    $concatArrays: [
                                        "$inventario",
                                        [
                                            {
                                                lote: loteObjectId,
                                                canastillas: canastillas
                                            }
                                        ]
                                    ]
                                }
                            ]
                        }
                    }
                },
                __v: { $add: ["$__v", 1] } 
            }
        }
    ];

    const result = await InventariosHistorialRepository.put_inventarioSimple_updateOne(
        { _id: "68cecc4cff82bb2930e43d05" },
        pipelineUpdate,
        {
            session,
            action,
            description: descripcion ?? `Sumar ${canastillas} canastillas al lote ${loteId}`,
            user: user._id,
            runValidators: true
        }
    );

    await registrarPasoLog(
        log._id,
        "InventariosHistorialRepository.put_inventarioSimple_updateOne (sumar/crear)",
        "Completado",
        `Suma/Alta de canastillas: ${canastillas}, matchedCount: ${result?.matchedCount}, modifiedCount: ${result?.modifiedCount}, versión incrementada`
    );

    return result;
}

    static async item_in_ordenVaceo(itemId) {
        const ordenVaceo = await InventariosHistorialRepository.get_ordenVaceo();
        const ids = ordenVaceo.data.map(id => id.toString());
        if (ids.includes(itemId)) {
            throw new Error(`EL lote ya está en la orden de vaceo, no se puede procesar como directo nacional.`);
        }
    }
    static async check_inventarioVersion(idInventario, versionrequest){
        const inventario = await InventariosHistorialRepository.get_inventario_simple(idInventario);
        console.log(inventario.__v, versionrequest)
        if (inventario.__v !== versionrequest) {
            throw new Error(`La versión del inventario ha cambiado. Por favor, recargue la página e intente de nuevo.`);
        }
        return true
    }
    // static async modificarIngresoCanastillas(data) {
    //     const canastillasPropias = Number(datos.canastillasPropias || 0) + Number(datos.canastillasVaciasPropias || 0)
    //     const canastillasPrestadas = Number(datos.canastillasPrestadas || 0) + Number(datos.canastillasVaciasPrestadas || 0)
    // }
}
