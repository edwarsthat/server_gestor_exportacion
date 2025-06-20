import { registrarPasoLog } from "../api/helper/logs.js";

export class IndicadoresService {
    static async procesar_metrica_hash(metrica, log) {

        if (Object.keys(metrica).length === 0) {
            await registrarPasoLog(log._id, "Advertencia", "Sin datos", "No hay datos en Redis para kilosProcesadosHoy");
        }
        const result = Object.fromEntries(
            Object.entries(metrica)
                .map(([k, v]) => [k, Number(v)])
                .filter(([, v]) => !isNaN(v))
        );

        return result
    }
}