import { iniciarRedisDB } from "../../DB/redis/init.js";
import { ConnectRedisError } from "../../Error/ConnectionErrors.js";
import { cargarDescartes, cargarTipoFrutas } from "../../constants/constants.js";


const clientePromise = iniciarRedisDB();

export class RedisRepository {
    /**
 * Acumula los valores de descarte en el inventario general y en el inventario diario ("hoy") usando Redis.
 * 
 * Por cada campo recibido en `data`, suma el valor al hash de Redis correspondiente
 * tanto para el inventario acumulado como para el del día actual.
 * 
 * La validación de los datos debe realizarse antes de invocar este método.
 *
 * @static
 * @async
 * @param {Object} data - Objeto donde cada clave es el nombre del campo de descarte (por ejemplo: balin, descarteGeneral) y el valor es la cantidad a sumar.
 * @param {string} tipoDescarte - Tipo de descarte (por ejemplo, 'descarteLavado', 'descarteEncerado'), que define la parte variable de la clave en Redis.
 * @throws {ConnectRedisError} Lanza un error personalizado si ocurre un fallo en la comunicación con Redis.
 * @example
 * // Suma los valores recibidos al inventario de descarteLavado y al inventario de hoy
 * await put_inventarioDescarte(
 *   { balin: 2, descarteGeneral: 10, hojas: 0 },
 *   'descarteLavado'
 * );
 */
    static async put_inventarioDescarte(data, tipoDescarte, tipoFruta) {
        let cliente
        try {
            cliente = await clientePromise;

            const inventario = tipoDescarte === 'descarteLavado' ?
                ["descarteGeneral", "pareja", "balin"] :
                ["descarteGeneral", "pareja", "balin", "extra", "suelo", "frutaNacional"]

            const tareas = Object.entries(data)
                .map(([campo, valor]) => {
                    if (inventario.includes(campo))
                        cliente.hIncrBy(`inventarioDescarte:${tipoFruta}:${tipoDescarte}`, campo, valor)
                    cliente.hIncrBy(`inventarioDescarteHoy:${tipoFruta}:${tipoDescarte}`, campo, valor)
                });

            await Promise.all(tareas);

        } catch (err) {
            throw new ConnectRedisError(502, `Error ingresando descarte ${err}`)
        }

    }
    /**
     * Resta los valores de descarte del inventario general cuando se realiza un reproceso.
     * A diferencia de put_inventarioDescarte, este método solo afecta al inventario acumulado
     * y resta los valores en lugar de sumarlos.
     * 
     * @static
     * @async
     * @param {Object} data - Objeto donde cada clave es el nombre del campo de descarte y el valor es la cantidad a restar
     * @param {string} tipoDescarte - Tipo de descarte ('descarteLavado' o 'descarteEncerado')
     * @param {string} tipoFruta - Tipo de fruta asociada al descarte ('Naranja' o 'Limon')
     * @throws {ConnectRedisError} Si hay un error en la comunicación con Redis
     * 
     * @example
     * // Resta cantidades del inventario de descarteLavado para Naranja
     * await put_reprocesoDescarte(
     *   { balin: 5, descarteGeneral: 10 },
     *   'descarteLavado',
     *   'Naranja'
     * );
     */
    static async put_reprocesoDescarte(data, tipoDescarte, tipoFruta, multi = null) {
        const key = `inventarioDescarte:${tipoFruta}:${tipoDescarte}`;
        let cliente;
        try {
            cliente = await clientePromise;
            if (multi) {
                // Solo agregas los comandos a la transacción, NO ejecutas nada aquí
                for (const [campo, valor] of Object.entries(data)) {
                    multi.hIncrBy(key, campo, -valor);
                }
            } else {
                // Ejecutas los comandos inmediatamente
                const tareas = Object.entries(data)
                    .map(([campo, valor]) => cliente.hIncrBy(key, campo, -valor));
                await Promise.all(tareas);
            }
        } catch (err) {
            throw new ConnectRedisError(502, `Error ingresando descarte ${err}`)
        }
    }
    /**
     * Suma los valores de descarte del inventario general cuando se realiza un reproceso.
     * A diferencia de put_inventarioDescarte, este método solo afecta al inventario acumulado
     * y resta los valores en lugar de sumarlos.
     * 
     * @static
     * @async
     * @param {Object} data - Objeto donde cada clave es el nombre del campo de descarte y el valor es la cantidad a restar
     * @param {string} tipoDescarte - Tipo de descarte ('descarteLavado' o 'descarteEncerado')
     * @param {string} tipoFruta - Tipo de fruta asociada al descarte ('Naranja' o 'Limon')
     * @throws {ConnectRedisError} Si hay un error en la comunicación con Redis
     * 
     * @example
     * // Resta cantidades del inventario de descarteLavado para Naranja
     * await put_reprocesoDescarte(
     *   { balin: 5, descarteGeneral: 10 },
     *   'descarteLavado',
     *   'Naranja'
     * );
     */
    static async put_reprocesoDescarte_sumar(data, tipoDescarte, tipoFruta, multi = null) {

        const key = `inventarioDescarte:${tipoFruta}:${tipoDescarte}`;
        let cliente;
        try {
            cliente = await clientePromise;
            if (multi) {
                // Solo agregas los comandos a la transacción, NO ejecutas nada aquí
                for (const [campo, valor] of Object.entries(data)) {
                    multi.hIncrBy(key, campo, valor);
                }
            } else {
                const tareas = Object.entries(data)
                    .map(([campo, valor]) => {
                        cliente.hIncrBy(`inventarioDescarte:${tipoFruta}:${tipoDescarte}`, campo, valor)
                    });
                await Promise.all(tareas);
            }
        } catch (err) {
            throw new ConnectRedisError(502, `Error ingresando descarte ${err}`)
        }
    }
    /**
     * Ingresa los valores de descarte del inventario general cuando se realiza un reproceso.
     * A diferencia de put_reprocesoDescarte_set, este método solo afecta al inventario acumulado
     * 
     * 
     * @static
     * @async
     * @param {Object} data - Objeto donde cada clave es el nombre del campo de descarte y el valor es la cantidad a restar
     * @param {string} tipoDescarte - Tipo de descarte ('descarteLavado' o 'descarteEncerado')
     * @param {string} tipoFruta - Tipo de fruta asociada al descarte ('Naranja' o 'Limon')
     * @throws {ConnectRedisError} Si hay un error en la comunicación con Redis
     * 
     * @example
     * // Resta cantidades del inventario de descarteLavado para Naranja
     * await put_reprocesoDescarte(
     *   { balin: 5, descarteGeneral: 10 },
     *   'descarteLavado',
     *   'Naranja'
     * );
     */
static async put_reprocesoDescarte_set(data, tipoDescarte, tipoFruta, multi = null) {
    const key = `inventarioDescarte:${tipoFruta}:${tipoDescarte}`;
    let cliente;
    try {
        cliente = await clientePromise;
        if (multi) {
            // Solo agregas los comandos a la transacción, NO ejecutas nada aquí
            for (const [campo, valor] of Object.entries(data)) {
                multi.hIncrBy(key, campo, valor);
            }
        } else {
            const tareas = Object.entries(data)
                .map(([campo, valor]) =>
                    cliente.hSet(key, campo, valor) // CORREGIDO: hSet en vez de hSetBy
                );
            await Promise.all(tareas);
        }
    } catch (err) {
        throw new ConnectRedisError(502, `Error ingresando descarte ${err}`)
    }
}

    /**
     * Obtiene el inventario completo de descartes para todos los tipos de fruta.
     * Recupera tanto los descartes de lavado como los de encerado para cada tipo de fruta
     * definido en el sistema, consolidando toda la información en un único objeto.
     * 
     * @static
     * @async
     * @returns {Promise<Object>} Un objeto donde cada clave es un tipo de fruta y su valor contiene los descartes
     * @returns {Object.<string, {descarteLavado: Object, descarteEncerado: Object}>} 
     * @throws {ConnectRedisError} Si hay un error en la comunicación con Redis
     * 
     * @example
     * // Retorna un objeto con esta estructura:
     * {
     *   "Naranja": {
     *     descarteLavado: { balin: "10", descarteGeneral: "20", pareja: "5" },
     *     descarteEncerado: { balin: "8", descarteGeneral: "15", extra: "3" }
     *   },
     *   "Limon": {
     *     descarteLavado: { ... },
     *     descarteEncerado: { ... }
     *   }
     * }
     */
    static async get_inventarioDescarte() {
        let cliente
        try {
            cliente = await clientePromise;
            // Prepara todas las promesas para ejecutarlas en paralelo
            const tipoFrutas = await cargarTipoFrutas();
            const promesas = tipoFrutas.map(fruta => (
                Promise.all([
                    cliente.hGetAll(`inventarioDescarte:${fruta}:descarteLavado:`),
                    cliente.hGetAll(`inventarioDescarte:${fruta}:descarteEncerado:`)
                ]).then(([descarteLavado, descarteEncerado]) => ({
                    fruta,
                    descarteLavado,
                    descarteEncerado
                }))
            ));

            const resultados = await Promise.all(promesas);

            // Transforma el array de resultados en un objeto con cada fruta como key
            const inventario = {};
            resultados.forEach(({ fruta, descarteLavado, descarteEncerado }) => {
                inventario[fruta] = { descarteLavado, descarteEncerado };
            });

            return inventario

        } catch (err) {
            throw new ConnectRedisError(502, `Error ingresando descarte ${err}`)
        }
    }
    /**
     * Obtiene el inventario de descartes para un tipo de fruta específico.
     * 
     * @static
     * @async
     * @param {string} tipoFruta - El tipo de fruta del cual obtener los descartes ('Naranja' o 'Limon')
     * @returns {Promise<Object>} Un objeto con los descartes de lavado y encerado para el tipo de fruta especificado
     * @returns {Object} return.descarteLavado - Objeto con los valores de descarte de lavado
     * @returns {Object} return.descarteEncerado - Objeto con los valores de descarte de encerado
     * @throws {ConnectRedisError} Si hay un error en la comunicación con Redis
     */
    static async get_inventarioDescarte_porTipoFruta(tipoFruta) {
        let cliente;
        try {
            cliente = await clientePromise;

            // Obtener datos de descarte lavado y encerado en paralelo
            const [descarteLavado, descarteEncerado] = await Promise.all([
                cliente.hGetAll(`inventarioDescarte:${tipoFruta}:descarteLavado:`),
                cliente.hGetAll(`inventarioDescarte:${tipoFruta}:descarteEncerado:`)
            ]);

            return {
                descarteLavado,
                descarteEncerado
            };

        } catch (err) {
            throw new ConnectRedisError(502, `Error obteniendo descarte para ${tipoFruta}: ${err}`);
        }
    }
    /**
     * Reinicia completamente el inventario de descartes estableciendo todos los valores a cero.
     * Este método es utilizado para el mantenimiento del sistema y resetea todos los contadores
     * de descarte para todos los tipos de fruta y tipos de descarte definidos en el sistema.
     * 
     * El método ejecuta operaciones de reinicio en paralelo para optimizar el rendimiento,
     * estableciendo cada campo de descarte a 0 para todas las combinaciones de:
     * - Tipos de fruta (obtenidos de cargarTipoFrutas())
     * - Tipos de descarte (obtenidos de cargarDescartes())
     * - Items de descarte específicos para cada tipo
     * 
     * @static
     * @async
     * @returns {Promise<void>} Promesa que se resuelve cuando todos los contadores han sido reiniciados
     * @throws {ConnectRedisError} Lanza un error personalizado si ocurre un fallo en la comunicación con Redis
     * 
     * @example
     * // Reinicia todo el inventario de descartes a cero
     * await RedisRepository.sys_reiniciar_inventario_descarte();
     * 
     * @description
     * Este método:
     * 1. Obtiene todos los tipos de fruta del sistema
     * 2. Obtiene todos los tipos de descarte configurados
     * 3. Para cada combinación fruta-descarte-item, establece el valor a 0 en Redis
     * 4. Ejecuta todas las operaciones en paralelo para mejor rendimiento
     * 5. Registra un mensaje informativo cuando la operación se completa exitosamente
     * 
     * @warning Este método resetea TODOS los contadores de descarte. Úselo con precaución.
     */
    static async sys_reiniciar_inventario_descarte() {
        let cliente;
        try {
            cliente = await clientePromise;
            const tareas = [];
            const tipoFrutas = await cargarTipoFrutas();
            const tipoDescartes = await cargarDescartes();
            tipoFrutas.forEach(fruta => {
                Object.keys(tipoDescartes).forEach(descarte => {
                    tipoDescartes[descarte].forEach(item => {
                        // Empuja la promesa a tareas
                        tareas.push(
                            cliente.hSet(`inventarioDescarte:${fruta}:${descarte}:`, item, 0)
                        );
                    });
                });
            });

            await Promise.all(tareas);

            console.info('[INVENTARIO DESCARTES] Inventario de descartes reiniciado a cero.');
        } catch (err) {
            throw new ConnectRedisError(502, `Error reiniciando el inventario descartes: ${err}`);
        }
    }
    //#region inventarioDesverdizado
    /**
     * Registra un ingreso de fruta al proceso de desverdizado utilizando Redis Hash.
     * 
     * Este método almacena la información de fruta que ingresa a un cuarto de desverdizado específico,
     * utilizando un hash de Redis donde la clave principal identifica el cuarto y el campo del hash
     * corresponde al ID único del registro. Los datos se almacenan como un campo dentro del hash.
     * 
     * El método soporta tanto ejecución inmediata como operaciones transaccionales a través
     * del parámetro `multi`, permitiendo agrupar múltiples operaciones en una sola transacción.
     * 
     * @static
     * @async
     * @param {*} data - Datos del ingreso de desverdizado a almacenar. Puede ser cualquier tipo de dato serializable (string, JSON, etc.)
     * @param {string} cuarto - Identificador del cuarto de desverdizado donde se almacena la fruta
     * @param {string} _id - Identificador único del registro de ingreso que será usado como campo en el hash
     * @param {Object|null} [multi=null] - Objeto de transacción Redis para operaciones en lote. Si se proporciona, la operación se agrega a la transacción sin ejecutarse inmediatamente
     * @returns {Promise<void>} Promesa que se resuelve cuando los datos han sido almacenados (solo si multi es null)
     * @throws {Error} Lanza el error original de Redis si ocurre un fallo en la comunicación
     * 
   
     * 
 
     * @description
     * La estructura en Redis es la siguiente:
     * - Clave: `inventarioDesverdizado:{cuarto}`
     * - Campo: `{_id}` 
     * - Valor: `{data}`
     * 
     * Esto permite:
     * - Agrupar todos los ingresos de un cuarto en un solo hash
     * - Acceso eficiente a registros individuales por ID
     * - Operaciones en lote sobre todos los ingresos de un cuarto
     * - Consultas rápidas usando comandos de hash de Redis
     * 
     * Casos de uso típicos:
     * - Registrar fruta que ingresa al proceso de desverdizado
     * - Mantener historial organizado por cuarto
     * - Realizar operaciones transaccionales para consistencia de datos
     * - Facilitar consultas y reportes por cuarto de desverdizado
     */
    static async put_ingreso_desverdizado(data, cuarto, _id, multi = null) {
        const key = `inventarioDesverdizado:${cuarto}`;
        let cliente;
        try {
            cliente = await clientePromise;
            const value = JSON.stringify(data);
            if (multi) {
                multi.hSet(key, _id, value);
            } else {
                await cliente.hSet(key, _id, value);
            }
        } catch (err) {
            console.error("Error guardando en Redis", err);
            throw new ConnectRedisError(502, `Error modificando desverdizado ${err}`)
        }
    }
    /**
     * Obtiene el inventario de desverdizado con diferentes niveles de granularidad.
     * 
     * Este método flexible permite consultar el inventario de desverdizado de tres maneras:
     * 1. Todo el inventario (sin parámetros)
     * 2. Todos los registros de un cuarto específico (solo cuarto)
     * 3. Un registro específico de un cuarto (cuarto + _id)
     * 
     * Para consultas completas utiliza Redis SCAN para manejar eficientemente
     * grandes volúmenes de datos sin bloquear el servidor.
     * 
     * @static
     * @async
     * @param {string|null} [cuarto=null] - Identificador del cuarto de desverdizado. Si es null, obtiene todos los cuartos
     * @param {string|null} [_id=null] - Identificador específico del registro dentro del cuarto. Solo válido si se especifica cuarto
     * @returns {Promise<Object>} Objeto con la estructura del inventario de desverdizado
     * @returns {Object} return.inventarioDesverdizado - Objeto principal que contiene los datos organizados por cuarto
     * @throws {Error} Lanza el error original de Redis si ocurre un fallo en la comunicación
     * 
     * @example
     * // Obtener todo el inventario de desverdizado
     * const inventarioCompleto = await RedisRepository.get_inventario_desverdizado();
     * // Retorna: { 
     * //   inventarioDesverdizado: {
     * //     "cuarto1": { "id1": "datos1", "id2": "datos2" },
     * //     "cuarto2": { "id3": "datos3", "id4": "datos4" }
     * //   }
     * // }
     * 
     * @example
     * // Obtener todos los registros de un cuarto específico
     * const cuarto1 = await RedisRepository.get_inventario_desverdizado("cuarto1");
     * // Retorna: { 
     * //   inventarioDesverdizado: {
     * //     "cuarto1": { "id1": "datos1", "id2": "datos2" }
     * //   }
     * // }
     * 
     * @example
     * // Obtener un registro específico
     * const registroEspecifico = await RedisRepository.get_inventario_desverdizado("cuarto1", "id1");
     * // Retorna: { 
     * //   inventarioDesverdizado: {
     * //     "cuarto1": { "id1": "datos1" }
     * //   }
     * // }
     * 
     * @description
     * **Comportamiento según parámetros:**
     * 
     * - **Sin parámetros**: Escanea todas las claves que coincidan con `inventarioDesverdizado:*`
     *   y retorna todos los cuartos con sus respectivos registros
     * 
     * - **Solo cuarto**: Usa `hGetAll` para obtener todos los campos del hash del cuarto especificado
     * 
     * - **Cuarto + _id**: Usa `hGet` para obtener un campo específico del hash del cuarto
     * 
     * **Optimizaciones:**
     * - Utiliza Redis SCAN con batch size de 100 para consultas completas
     * - Procesa los datos de manera asíncrona usando streams
     * - Mantiene la estructura consistente en todas las variantes de consulta
     * 
     * **Estructura de Redis:**
     * - Clave: `inventarioDesverdizado:{cuarto}`
     * - Campos: IDs de registros individuales
     * - Valores: Datos de cada registro
     * 
     * @performance
     * - Consultas específicas (cuarto/cuarto+id): O(1) - O(n) donde n es el número de campos
     * - Consulta completa: O(N) donde N es el número total de claves, pero procesada en batches
     */
    static async get_inventario_desverdizado(cuarto = null, _id = null) {
        let cliente;
        try {
            cliente = await clientePromise;

            const resultado = { inventarioDesverdizado: {} };

            // Si pidieron un cuarto específico
            if (cuarto && !_id) {
                const key = `inventarioDesverdizado:${cuarto}`;
                const datos = await cliente.hGetAll(key);
                resultado.inventarioDesverdizado[cuarto] = datos;
                return resultado;
            }

            // Si pidieron un campo específico de un cuarto
            if (cuarto && _id) {
                const key = `inventarioDesverdizado:${cuarto}`;
                const valor = await cliente.hGet(key, _id);
                resultado.inventarioDesverdizado[cuarto] = { [_id]: valor };
                return resultado;
            }

            // Si no pasaron nada: obtener TODO el inventarioDesverdizado
            let cursor = '0';
            // do {

            const { keys } = await cliente.scan(cursor, {
                MATCH: 'inventarioDesverdizado:*',
                COUNT: 100
            });

            // Paralelizar todas las consultas hGetAll
            const resultados = await Promise.all(
                keys.map(async (key) => {
                    const cuarto = key.split(':')[1];
                    const datosCrudos = await cliente.hGetAll(key);
                    const datos = Object.fromEntries(Object.entries(datosCrudos));
                    return { cuarto, datos };
                })
            );

            // Consolidar resultados
            for (const { cuarto, datos } of resultados) {
                resultado.inventarioDesverdizado[cuarto] = datos;
            }

            return resultado;

        } catch (err) {
            console.error("Error leyendo inventario desverdizado", err);
            throw new ConnectRedisError(502, `Error obteniendo desverdizado: ${err.message}`);
        }
    }
    /**
     * Elimina un registro específico del inventario de desverdizado.
     * 
     * Este método remove un campo específico de un hash de Redis que representa
     * un registro de ingreso de fruta en un cuarto de desverdizado. La operación
     * elimina únicamente el registro especificado sin afectar otros datos del mismo cuarto.
     * 
     * El método soporta tanto ejecución inmediata como operaciones transaccionales,
     * permitiendo incluir la eliminación como parte de una transacción más amplia
     * para mantener la consistencia de datos.
     * 
     * @static
     * @async
     * @param {string} cuarto - Identificador del cuarto de desverdizado del cual eliminar el registro
     * @param {string} _id - Identificador único del registro específico a eliminar
     * @param {Object|null} [multi=null] - Objeto de transacción Redis para operaciones en lote. Si se proporciona, la operación se agrega a la transacción sin ejecutarse inmediatamente
     * @returns {Promise<void>} Promesa que se resuelve cuando el registro ha sido eliminado (solo si multi es null)
     * @throws {ConnectRedisError} Lanza un error personalizado con código 502 si ocurre un fallo en la comunicación con Redis
     * 
     * @example
     * // Eliminar un registro específico inmediatamente
     * await RedisRepository.delete_inventarioDesverdizado_registro("cuarto1", "ingreso_20250609_001");
     * 
     * @example
     * // Eliminar múltiples registros en una transacción
     * const cliente = await RedisRepository.getClient();
     * const multi = cliente.multi();
     * 
     * await RedisRepository.delete_inventarioDesverdizado_registro("cuarto1", "id1", multi);
     * await RedisRepository.delete_inventarioDesverdizado_registro("cuarto1", "id2", multi);
     * await RedisRepository.delete_inventarioDesverdizado_registro("cuarto2", "id3", multi);
     * 
     * await multi.exec(); // Ejecutar todas las eliminaciones
     * 
     * @example
     * // Operación transaccional compleja: eliminar registro obsoleto y agregar nuevo
     * const cliente = await RedisRepository.getClient();
     * const multi = cliente.multi();
     * 
     * // Eliminar registro anterior
     * await RedisRepository.delete_inventarioDesverdizado_registro("cuarto1", "registro_antiguo", multi);
     * 
     * // Agregar nuevo registro
     * await RedisRepository.put_ingreso_desverdizado(
     *   JSON.stringify(nuevosDatos), "cuarto1", "registro_nuevo", multi
     * );
     * 
     * await multi.exec();
     * 
     * @description
     * **Funcionamiento interno:**
     * - Construye la clave Redis: `inventarioDesverdizado:cuarto{cuarto}`
     * - Utiliza el comando `HDEL` de Redis para eliminar el campo específico
     * - Mantiene intactos otros registros del mismo cuarto
     * - Si es el último campo del hash, Redis eliminará automáticamente la clave completa
     * 
     * **Casos de uso típicos:**
     * - Corrección de registros erróneos
     * - Limpieza de datos obsoletos
     * - Procesamiento de salidas de fruta del desverdizado
     * - Operaciones de mantenimiento del inventario
     * - Reorganización de registros por cuarto
     * 
     * **Consideraciones importantes:**
     * - La operación es irreversible una vez ejecutada
     * - No valida la existencia previa del registro (Redis devuelve 0 si no existe)
     * - Usar transacciones para operaciones que requieren consistencia
     * - Los errores se manejan con doble try-catch para robustez
     * 
     * @performance
     * - Complejidad: O(1) - Operación constante independiente del tamaño del hash
     * - Muy eficiente para eliminaciones selectivas
     * - No requiere cargar datos en memoria para la eliminación
     * 
     * @safety
     * - Operación atómica a nivel de Redis
     * - Segura para uso concurrente
     * - Registra errores detallados para debugging
     */
    static async delete_inventarioDesverdizado_registro(cuarto, _id, multi = null) {
        try {
            const key = `inventarioDesverdizado:${cuarto}`;
            let cliente;
            try {
                cliente = await clientePromise;
                if (multi) {
                    multi.hDel(key, _id);
                } else {
                    await cliente.hDel(key, _id);
                }
            } catch (err) {
                console.error("Error eliminando en Redis", err);
                throw new ConnectRedisError(502, `Error eliminando desverdizado ${err}`);
            }
        } catch (err) {
            console.error("Error eliminando inventario desverdizado", err);
            throw new ConnectRedisError(502, `Error eliminando desverdizado ${err}`);
        }
    }
    static async update_inventarioDesverdizado(cuarto, _id, cantidad, multi = null) {
        const key = `inventarioDesverdizado:${cuarto}`;
        let cliente;
        try {
            cliente = await clientePromise;
            if (multi) {
                multi.hIncrBy(key, _id, cantidad);
            } else {
                await cliente.hIncrBy(key, _id, cantidad);
            }
        } catch (err) {
            console.error("Error actualizando inventario", err);
            throw new ConnectRedisError(502, `Error actualizando desverdizado ${err}`);
        }
    }
    /**
     * Elimina completamente un cuarto de desverdizado y todos sus registros asociados.
     * 
     * Este método elimina de forma permanente una clave completa de Redis que representa
     * un cuarto de desverdizado, incluyendo todos los registros de inventario almacenados
     * en ese cuarto. La operación es irreversible y afecta a todos los datos del cuarto
     * especificado, utilizando el comando `DEL` de Redis para una eliminación atómica.
     * 
     * A diferencia de `delete_inventarioDesverdizado_registro` que elimina registros
     * individuales, este método elimina la estructura completa del cuarto, siendo útil
     * para operaciones de limpieza masiva, cierre de cuartos o reorganización del sistema.
     * 
     * @static
     * @async
     * @param {string} cuarto - Identificador del cuarto de desverdizado a eliminar completamente
     * @returns {Promise<void>} Promesa que se resuelve cuando el cuarto y todos sus registros han sido eliminados
     * @throws {ConnectRedisError} Lanza un error personalizado con código 502 si ocurre un fallo en la comunicación con Redis
     * 
     * @example
     * // Eliminar un cuarto completo con todos sus registros
     * await RedisRepository.delete_inventarioDesverdizado_cuarto("cuarto1");
     * // Esto elimina la clave 'inventarioDesverdizado:cuarto1' y todos sus campos
     * 
     * @example
     * // Operación de limpieza de múltiples cuartos (sin transacción)
     * const cuartosAEliminar = ["cuarto1", "cuarto2", "cuarto3"];
     * 
     * for (const cuarto of cuartosAEliminar) {
     *   try {
     *     await RedisRepository.delete_inventarioDesverdizado_cuarto(cuarto);
     *     console.log(`Cuarto ${cuarto} eliminado exitosamente`);
     *   } catch (error) {
     *     console.error(`Error eliminando cuarto ${cuarto}:`, error);
     *   }
     * }
     * 
     * @example
     * // Reorganización de cuartos: respaldar y limpiar
     * async function reorganizarCuarto(cuarto) {
     *   // Primero obtener los datos para respaldo
     *   const backup = await RedisRepository.get_inventario_desverdizado(cuarto);
     *   
     *   // Guardar respaldo en otro sistema/archivo
     *   await guardarRespaldo(cuarto, backup);
     *   
     *   // Eliminar el cuarto completo
     *   await RedisRepository.delete_inventarioDesverdizado_cuarto(cuarto);
     *   
     *   console.log(`Cuarto ${cuarto} reorganizado exitosamente`);
     * }
     * 
     * @example
     * // Verificación antes de eliminar (patrón recomendado)
     * async function eliminarCuartoSeguro(cuarto) {
     *   // Verificar si el cuarto existe y obtener estadísticas
     *   const inventario = await RedisRepository.get_inventario_desverdizado(cuarto);
     *   
     *   if (inventario.inventarioDesverdizado[cuarto]) {
     *     const numRegistros = Object.keys(inventario.inventarioDesverdizado[cuarto]).length;
     *     console.log(`Eliminando cuarto ${cuarto} con ${numRegistros} registros`);
     *     
     *     await RedisRepository.delete_inventarioDesverdizado_cuarto(cuarto);
     *     console.log(`Cuarto ${cuarto} eliminado exitosamente`);
     *   } else {
     *     console.log(`Cuarto ${cuarto} no existe o ya está vacío`);
     *   }
     * }
     * 
     * @description
     * **Funcionamiento interno:**
     * - Construye la clave Redis: `inventarioDesverdizado:{cuarto}`
     * - Utiliza el comando `DEL` de Redis para eliminar la clave completa
     * - La operación es atómica: o se elimina todo o no se elimina nada
     * - Si la clave no existe, Redis retorna 0 sin generar error
     * - Todos los campos del hash son eliminados simultáneamente
     * 
     * **Casos de uso típicos:**
     * - **Cierre de cuartos**: Cuando un cuarto termina su ciclo de desverdizado
     * - **Limpieza masiva**: Eliminar datos obsoletos o de prueba
     * - **Reorganización**: Cambiar la estructura de numeración de cuartos
     * - **Mantenimiento**: Limpiar cuartos con datos corruptos o inconsistentes
     * - **Migración**: Mover datos a nuevas estructuras o sistemas
     * - **Testing**: Limpiar datos de prueba en entornos de desarrollo
     * 
     * **Diferencias con otros métodos de eliminación:**
     * - `delete_inventarioDesverdizado_registro`: Elimina UN registro específico
     * - `delete_inventarioDesverdizado_cuarto`: Elimina TODO el cuarto
     * - Scope: Registro individual vs. cuarto completo
     * - Impacto: Selectivo vs. masivo
     * 
     * **Consideraciones de seguridad:**
     * - **Irreversible**: Una vez ejecutado, no hay forma de recuperar los datos
     * - **Sin confirmación**: No solicita confirmación antes de eliminar
     * - **Validación recomendada**: Verificar existencia y contenido antes de eliminar
     * - **Respaldos**: Considerar crear respaldos antes de operaciones masivas
     * - **Logs**: Registrar eliminaciones para auditoría
     * 
     * **Patrón recomendado de uso:**
     * ```javascript
     * // 1. Verificar existencia
     * // 2. Crear respaldo si es necesario
     * // 3. Registrar la operación
     * // 4. Ejecutar eliminación
     * // 5. Confirmar resultado
     * ```
     * 
     * @performance
     * - Complejidad: O(1) - Operación constante independiente del número de registros
     * - Muy eficiente para eliminaciones masivas vs. eliminar registros individualmente
     * - Una sola operación de red vs. múltiples operaciones para registros individuales
     * - Redis libera memoria inmediatamente después de la eliminación
     * 
     * @safety
     * - Operación atómica garantizada por Redis
     * - No deja el cuarto en estado inconsistente
     * - Segura para uso concurrente (otros clientes verán el cuarto como inexistente)
     * - Manejo robusto de errores con logging detallado
     * 
     * @warning
     * ⚠️ **OPERACIÓN DESTRUCTIVA**: Este método elimina permanentemente todos los datos
     * del cuarto especificado. Asegúrese de:
     * - Tener respaldos si los datos son importantes
     * - Verificar que es el cuarto correcto
     * - Confirmar que no hay procesos dependientes ejecutándose
     * - Registrar la operación para auditoría
     * 
     * @since 1.0.0
     */
    static async delete_inventarioDesverdizado_cuarto(cuarto) {
        const key = `inventarioDesverdizado:${cuarto}`;
        let cliente;
        try {
            cliente = await clientePromise;
            await cliente.del(key);
        } catch (err) {
            console.error("Error eliminando cuarto completo", err);
            throw new ConnectRedisError(502, `Error eliminando cuarto completo ${err}`);
        }
    }
    //#endregion inventarioDesverdizado

    static async getClient() {
        return await clientePromise;
    }
}
