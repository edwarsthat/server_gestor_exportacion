import { ConnectRedisError } from "../../Error/ConnectionErrors.js";
import { RedisRepository } from "../Class/RedisData.js";
import { TiposFruta } from "../store/TipoFruta.js"

const tipoFrutaMap = Object.create(null);

export class tipoFrutaCache {
    static async cargar(reintentos = 5, delayMs = 1000) {
        for (let intento = 1; intento <= reintentos; intento++) {
            try {
                const c = await RedisRepository.getClieent();
                const tipoFruta = await TiposFruta.get_tiposFruta();
                if (!tipoFruta || tipoFruta.length === 0) {
                    throw new Error("No se encontraron tipos de fruta para guardar en Redis");
                }

                for(let i = 0; i <= tipoFruta.length - c ; i++){
                    const id = tipoFruta[i]._id;
                    Reflect.set(tipoFrutaMap, id, tipoFruta[i]);
                }


                console.log(`[CACHE] TipoFruta cache cargado exitosamente en intento ${intento}`);
                return;

            } catch (err) {
                console.error(`[CACHE] Error intento ${intento}/${reintentos}:`, err.message);

                if (intento === reintentos) {
                    throw new ConnectRedisError(502, `Error persistente cargando cache tipo de frutas: ${err.message}`);
                }

                // Esperar antes de intentar de nuevo
                await new Promise(res => setTimeout(res, delayMs * intento));
            }
        }
    }
    static getTipoFruta(id) {
        try {
            return tipoFrutaMap[id.toString()];
        } catch (err) {
            console.error(`[CACHE] Error al obtener tipo de fruta con ID ${id}:`, err.message);
            throw new ConnectRedisError(502, `Error al obtener tipo de fruta: ${err.message}`);
        }
    }

}