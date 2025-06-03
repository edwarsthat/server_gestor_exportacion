const { iniciarRedisDB } = require("../../DB/redis/init");
const { ConnectRedisError } = require("../../Error/ConnectionErrors");
const tipoFrutas = require("../../constants/tipo_fruta.json")
const clientePromise = iniciarRedisDB();


class RedisRepository {
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

    static async getClient() {
        return await clientePromise;
    }
}

module.exports.RedisRepository = RedisRepository