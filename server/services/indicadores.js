import { registrarPasoLog } from "../api/helper/logs.js";
import { ContenedoresRepository } from "../Class/Contenedores.js";

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
    static async obtener_calibres_lotes_contenedores(lotes) {
        const contenedoresSet = new Set();
        const calibres = new Set();
        const lotesDict = {};
        const calibresTotal = {};

        for (const lote of lotes) {
            if (Array.isArray(lote.contenedores) && lote.contenedores.length) {
                lote.contenedores.forEach(c => contenedoresSet.add(c));
                if (!lotesDict[lote._id]) lotesDict[lote._id] = {};
            }
        }
        const contenedoresIds = Array.from(contenedoresSet);

        const contenedores = await ContenedoresRepository.get_Contenedores_sin_lotes_strict({ ids: contenedoresIds, select: { pallets: 1 }, limit: 'all' });

        for (const contenedor of contenedores) {
            if (!Array.isArray(contenedor.pallets)) continue;
            for (const pallet of contenedor.pallets) {
                if (!pallet?.EF1) continue;
                for (const item of pallet.EF1) {
                    const { lote, calibre, tipoCaja, cajas } = item;
                    const calibreLimpio = String(calibre).trim();

                    if (!lotesDict[lote]) continue;
                    if (!lotesDict[lote][calibreLimpio]) {
                        lotesDict[lote][calibreLimpio] = { kilos: 0, cajas: 0 };
                    }
                    if(!calibresTotal[calibreLimpio]) {
                        calibresTotal[calibreLimpio] = { kilos: 0};
                    }

                    // Calcular kilos (split seguro)
                    let kilos = 0;
                    if (typeof tipoCaja === "string" && tipoCaja.includes("-")) {
                        const [, pesoCaja] = tipoCaja.split("-");
                        kilos = Number(pesoCaja) * Number(cajas);
                    }
                    
                    lotesDict[lote][calibreLimpio].kilos += kilos;
                    lotesDict[lote][calibreLimpio].cajas += Number(cajas);
                    calibresTotal[calibreLimpio].kilos += kilos;
                    calibres.add(String(calibre).trim());
                }
            }

        }
        console.log("Calibres totales:", calibresTotal);
        return { lotesDict, calibres: Array.from(calibres), calibresTotal }
    }

}