import { ConnectRedisError } from "../../Error/ConnectionErrors.js";
import { CargosPersonalRepository } from "../Class/talentoHumano/CargosPersonal.js";

const cargosPersonalOperariosMap = Object.create(null);

export class cargosPersonalCache {
    static async cargarOperarios(reintentos = 5, delayMs = 1000) {
        for (let intento = 1; intento <= reintentos; intento++) {
            try {
                const cargosPersonalOperarios = await CargosPersonalRepository.get_data(
                    { query: { nombre: { $regex: "^Personal Operativo" } } }
                );

                if (!cargosPersonalOperarios || cargosPersonalOperarios.length === 0) {
                    throw new Error("No se encontraron cargos personal operarios para guardar en Redis");
                }

                cargosPersonalOperarios.forEach(item => {
                    const id = item._id;
                    Reflect.set(cargosPersonalOperariosMap, id, item);
                });

                return;

            } catch (err) {
                console.error(`[CACHE] Error intento ${intento}/${reintentos}:`, err.message);

                if (intento === reintentos) {
                    throw new ConnectRedisError(
                        502,
                        `Error persistente cargando cache cargos personal operarios: ${err.message}`
                    );
                }

                // Esperar antes de intentar de nuevo
                await new Promise(res => setTimeout(res, delayMs * intento));
            }
        }
    }
    static getCargoPersonalOperario(id) {
        try {
            return cargosPersonalOperariosMap[id.toString()];
        } catch (err) {
            console.error(`[CACHE] Error al obtener cargo personal operario con ID ${id}:`, err.message);
            throw new ConnectRedisError(502, `Error al obtener cargo personal operario: ${err.message}`);
        }
    }
    static getCargosPersonalOperarios() {
        try {
            return cargosPersonalOperariosMap;
        } catch (err) {
            console.error(`[CACHE] Error al obtener cargos personal operarios`);
            throw new ConnectRedisError(502, `Error al obtener cargos personal operarios: ${err.message}`);
        }
    }
}