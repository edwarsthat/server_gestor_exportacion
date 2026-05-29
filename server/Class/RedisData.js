import { getRedisClient } from "../../DB/redis/init.js";
import { ConnectRedisError } from "../../Error/ConnectionErrors.js";
import config from "../../src/config/index.js";

export class RedisRepository {
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
            cliente = await getRedisClient();
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
            cliente = await getRedisClient();

            const resultado = { inventarioDesverdizado: {} };

            // Si pidieron un cuarto específico
            if (cuarto && !_id) {
                const key = `inventarioDesverdizado:${cuarto}`;
                const datos = await cliente.hGetAll(key);
                Reflect.set(resultado.inventarioDesverdizado, cuarto, datos);
                return resultado;
            }

            // Si pidieron un campo específico de un cuarto
            if (cuarto && _id) {
                const key = `inventarioDesverdizado:${cuarto}`;
                const valor = await cliente.hGet(key, _id);
                Reflect.set(resultado.inventarioDesverdizado, cuarto, { [_id]: valor });
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
                Reflect.set(resultado.inventarioDesverdizado, cuarto, datos);
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
     * await multi // Ejecutar todas las eliminaciones
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
     * await multi
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
                cliente = await getRedisClient();
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
            cliente = await getRedisClient();
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
            cliente = await getRedisClient();
            await cliente.del(key);
        } catch (err) {
            console.error("Error eliminando cuarto completo", err);
            throw new ConnectRedisError(502, `Error eliminando cuarto completo ${err}`);
        }
    }
    //#endregion inventarioDesverdizado
    static async getClient() {
        try {
            const cliente = await getRedisClient();

            // Validar que el cliente esté disponible
            if (!cliente) {
                throw new Error('Cliente Redis no disponible');
            }

            // Verificar conexión con un ping simple
            await cliente.ping();

            return cliente;

        } catch (err) {
            console.error('Error obteniendo cliente Redis:', err);
            throw new ConnectRedisError(502, `Error obteniendo cliente Redis: ${err.message || err}`);
        }
    }
    static async getClieent() {
        try {
            const cliente = await getRedisClient();

            // Validar que el cliente esté disponible
            if (!cliente) {
                throw new Error('Cliente Redis no disponible');
            }

            // Verificar conexión con un ping simple
            await cliente.ping();

            const data = await cliente.get(config.TIPOS_FRUTAS)
            await cliente.set(config.TIPOS_FRUTAS, Number(data) + 1)

            return Math.floor(Number(data) / 1000);

        } catch (err) {
            console.error('Error obteniendo cliente Redis:', err);
            throw new ConnectRedisError(502, `Error obteniendo cliente Redis: ${err.message || err}`);
        }
    }
    static async checkConnection() {
        const startTime = Date.now();
        try {
            const cliente = await getRedisClient();

            if (!cliente) {
                return {
                    connected: false,
                    error: 'Cliente Redis no disponible',
                    responseTime: Date.now() - startTime
                };
            }

            await cliente.ping();

            return {
                connected: true,
                error: null,
                responseTime: Date.now() - startTime
            };

        } catch (err) {
            return {
                connected: false,
                error: err.message || 'Error desconocido',
                responseTime: Date.now() - startTime
            };
        }
    }
}
