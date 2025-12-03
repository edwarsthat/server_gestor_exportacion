import fs from 'fs';
import { fileTypeFromBuffer } from 'file-type'; // ✅ Así es como lo debes hacer
import { registrarPasoLog } from '../api/helper/logs.js';
import { CalidadServiceError } from '../../Error/ServiceError.js';


const MAX_FILE_SIZE_MB = 10; // 10 megas
const MAX_FILE_SIZE = MAX_FILE_SIZE_MB * 1024 * 1024;

export class CalidadService {
    static async obtenerArchivoReclamacionCliente(url) {
        if (!url || typeof url !== 'string') {
            throw new Error('Ruta inválida');
        }

        const stats = fs.statSync(url);
        if (stats.size > MAX_FILE_SIZE) {
            throw new Error(`Archivo demasiado grande (${(stats.size / 1024 / 1024).toFixed(2)} MB), máximo permitido: ${MAX_FILE_SIZE_MB} MB`);
        }

        const data = fs.readFileSync(url);

        // Detecta el tipo de archivo real, no solo la extensión
        const fileTypeResult = await fileTypeFromBuffer(data);

        const mimeType = fileTypeResult ? fileTypeResult.mime : 'application/octet-stream';
        return {
            mimeType,
            base64: data.toString('base64'),
            fileName: url.split('/').pop(),
        };
    }
    static async crear_query_calidad_interna(data, user) {
        return {
            "calidad.calidadInterna.zumo": Number(data.zumo),
            "calidad.calidadInterna.peso": Number(data.peso),
            "calidad.calidadInterna.brix": (Number(data.brix1) + Number(data.brix2) + Number(data.brix3)) / 3,
            "calidad.calidadInterna.acidez": (Number(data.acidez1) + Number(data.acidez2) + Number(data.acidez3)) / 3,
            "calidad.calidadInterna.semillas": Boolean(data.semillas),
            "calidad.calidadInterna.ratio":
                (Number(data.brix1) / Number(data.acidez1) +
                    Number(data.brix2) / Number(data.acidez2) +
                    Number(data.brix3) / Number(data.acidez3)) / 3,
            "calidad.calidadInterna.fecha": new Date().toUTCString(),
            "calidad.calidadInterna.calidad": data.calidad,
            "calidad.calidadInterna.user": user._id
        }
    }
    static async obtenerExportacionContenedores(itemPallets, _id) {
        let exportacion = 0;
        let kilosGGN = 0;

        const numeroCont = itemPallets.length;

        for (let i = 0; i < numeroCont; i++) {
            const item = itemPallets[i]
            if (item.lote._id.toString() === _id) {
                exportacion += item.kilos;
                if (item.GGN) {
                    kilosGGN += item.kilos;
                }
            }


        }
        return { exportacion, kilosGGN };

    }
    static async verificarDescarteMaquila(loteMaquila) {

        try {
            const descarteProceso = [...loteMaquila.get("descartes").values()].reduce((a, b) => a + b, 0);

            const descarteRegistrado =
                [...loteMaquila.get("descartesDevueltos").values()].reduce((a, b) => a + b, 0) +
                [...loteMaquila.get("descartesComprados").values()].reduce((a, b) => a + b, 0)

            if (descarteProceso !== descarteRegistrado) {
                throw new CalidadServiceError("Aprobación no permitida: existe fruta pendientes de salida en el inventario de maquila.")
            }

            return true
        } catch (err) {
            throw new CalidadServiceError(err.message)
        }
    }
}