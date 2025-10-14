import { registrarPasoLog } from "../api/helper/logs.js";
import { calcularTotalDescarte } from "./helpers/lotes.js";

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
    static async procesar_exportacion_hash(metrica, log) {
        if (Object.keys(metrica).length === 0) {
            await registrarPasoLog(log._id, "Advertencia", "Sin datos", "No hay datos en Redis para kilosExportacionHoy");
        }
        const result = {};
        Object.keys(metrica).forEach(k => {
            const [, fruta, calidad] = k.split(":");
            // Convierte a objeto normal si viene con null prototype:
            const valor = Object.fromEntries(Object.entries(metrica[k]));
            if (!result[fruta]) {
                result[fruta] = {};
            }
            if (!result[fruta][calidad]) {
                result[fruta][calidad] = valor;
            }
        });
        return result;
    }
    static async obtener_totales_lotes(lotes){
            let totalKilosIngreso = 0;
            let totalKilosProcesados = 0;
            let totalKilosExportacion = 0;
            let totalKilosDescarte = 0;

            for (const lote of lotes) {
                totalKilosIngreso += lote?.kilos || 0;
                totalKilosProcesados += lote?.kilosVaciados || 0;
                totalKilosExportacion += lote?.salidaExportacion?.totalKilos || 0;
                totalKilosDescarte += (lote?.descarteLavado ? calcularTotalDescarte(lote.descarteLavado) : 0);
                totalKilosDescarte += (lote?.descarteEncerado ? calcularTotalDescarte(lote.descarteEncerado) : 0);
                totalKilosDescarte += lote?.frutaNacioinal || 0;
            }
            return { totalKilosIngreso, totalKilosProcesados, totalKilosExportacion, totalKilosDescarte };
    }
    static async obtener_calibres_calidades(itemPallets){
        const calibres = new Set();
        const calidadesIds = new Set();
        for(const item of itemPallets){
            if(item._id){
                calibres.add(item._id);
                if(item.kilosPorCalidad){
                    const keys = Object.keys(item.kilosPorCalidad);
                    console.log(keys);
                    keys.forEach(k => calidadesIds.add(k));
                }
            }
        }
        return { calibres: Array.from(calibres), calidadesIds: Array.from(calidadesIds) };
    }
}