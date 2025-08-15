import fs from 'fs';
import { fileTypeFromBuffer } from 'file-type'; // ✅ Así es como lo debes hacer
import { registrarPasoLog } from '../api/helper/logs.js';
import { isDeepStrictEqual } from 'util';


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
    static async borrarContenedoresCalidadesCero(lote, logData) {
        for (const cont of Object.keys(lote.exportacion)) {
            for (const [key, value] of Object.entries(lote.exportacion[cont])) {
                if (value.calidad === 0) {
                    delete lote.exportacion[cont][key];
                }
            }
            if (Object.keys(lote.exportacion[cont]).length === 0) {
                delete lote.exportacion[cont];
            }
        }
        await registrarPasoLog(logData.logId, "CalidadService.borrarContenedoresCalidadesCero", "Completado");

    }
    static async obtenerExportacionContenedores(contenedoresData, _id, logData) {
        const exportacion = {}

        const numeroCont = contenedoresData.length;
        for (let nCont = 0; nCont < numeroCont; nCont++) {
            const contActual = contenedoresData[nCont].toObject();
            const numeroPallets = contActual.pallets.length;

            // return
            for (let nPallets = 0; nPallets < numeroPallets; nPallets++) {
                const palletActual = contActual.pallets[nPallets].get('EF1')
                const numeroItems = palletActual.length
                if (numeroItems <= 0) continue

                for (let nItems = 0; nItems < numeroItems; nItems++) {
                    const itemActual = palletActual[nItems]
                    if (itemActual.lote === _id) {
                        if (!Object.prototype.hasOwnProperty.call(exportacion, contActual._id)) {
                            exportacion[contActual._id] = {}
                        }
                        if (!Object.prototype.hasOwnProperty.call(exportacion[contActual._id], itemActual.calidad)) {
                            exportacion[contActual._id][itemActual.calidad] = 0
                        }
                        const mult = Number(itemActual.tipoCaja.split('-')[1].replace(",", "."))
                        const kilos = mult * itemActual.cajas

                        exportacion[contActual._id][itemActual.calidad] += kilos
                    }
                }
            }
        }
        await registrarPasoLog(logData.logId, "CalidadService.obtenerExportacionContenedores", "Completado");
        return exportacion;

    }
    static async compararExportacionLoteVsListaEmpaque(exportacion, lote, query, logData) {
        if (!isDeepStrictEqual(exportacion, lote.exportacion)) {
            let setCont = new Set()
            Object.keys(exportacion).forEach(cont => {
                Object.keys(exportacion[cont]).forEach(calidad => {
                    let llave = calidad
                    query[`exportacion.${cont}.${llave}`] = exportacion[cont][calidad]
                    setCont.add(cont)
                })
            })
            const contArr = [...setCont]

            const arrayDelete = contArr.filter(cont => lote.contenedores.includes(cont))
            query.contenedores = arrayDelete
        }
        await registrarPasoLog(logData.logId, "CalidadService.compararExportacionLoteVsListaEmpaque", "Completado");

    }
}