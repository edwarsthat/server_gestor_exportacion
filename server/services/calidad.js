import fs from 'fs';
import { fileTypeFromBuffer } from 'file-type'; // ✅ Así es como lo debes hacer


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
}