
import { ConnectRedisError } from "../../Error/ConnectionErrors.js";
import { Descartes } from "../store/Descartes.js";

const descarteMap = {};

export class descarteCache {
    static async cargar(reintentos = 5, delayMs = 1000) {
        for (let intento = 1; intento <= reintentos; intento++) {
            try {
                const descartes = await Descartes.get_descartes();
                if (!descartes || descartes.length === 0) {
                    throw new Error("No se encontraron descartes para guardar en Redis");
                }

                descartes.forEach(item => {
                    const id = item._id;
                    descarteMap[id] = item;
                });

                console.log(`[CACHE] Descarte cache cargado exitosamente en intento ${intento}`);
                console.log(descarteMap);
                return;

            } catch (err) {
                console.error(`[CACHE] Error intento ${intento}/${reintentos}:`, err.message);

                if (intento === reintentos) {
                    throw new ConnectRedisError(502, `Error persistente cargando cache descartes: ${err.message}`);
                }

                // Esperar antes de intentar de nuevo
                await new Promise(res => setTimeout(res, delayMs * intento));
            }
        }
    }
    static getDescarte(id) {
        try {
            return descarteMap[id.toString()];
        } catch (err) {
            console.error(`[CACHE] Error al obtener descarte con ID ${id}:`, err.message);
            throw new ConnectRedisError(502, `Error al obtener descarte: ${err.message}`);
        }
    }

}
