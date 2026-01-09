import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const STORAGE_LOCATIONS = {
    // Desde: server/services/helpers/ → server/templates
    TEMPLATES: path.resolve(__dirname, '..', '..', 'templates'),
    // Desde: server/services/helpers/ → public (raíz del proyecto)
    PUBLIC: path.resolve(__dirname, '..', '..', '..', 'public'),
};

export class FileService {

    static async validateFilePath(filePath, allowedLocation = 'PUBLIC') {
        try {
            if (!filePath) {
                return { isValid: false, resolvedPath: null, error: 'Ruta de archivo no proporcionada' };
            }

            // Verificar que la ubicación permitida existe
            const baseDir = STORAGE_LOCATIONS[allowedLocation];
            if (!baseDir) {
                return {
                    isValid: false,
                    resolvedPath: null,
                    error: `Ubicación no válida: ${allowedLocation}. Ubicaciones permitidas: ${Object.keys(STORAGE_LOCATIONS).join(', ')}`
                };
            }

            // Limpiar la ruta de caracteres nulos y normalizar
            const sanitizedPath = filePath.replace(/\0/g, '');

            // Resolver la ruta usando path.normalize para prevenir secuencias ../ anidadas
            const normalizedPath = path.normalize(sanitizedPath);
            const resolvedPath = path.resolve(baseDir, normalizedPath);

            // Seguridad contra Path Traversal usando path.relative
            const relative = path.relative(baseDir, resolvedPath);
            const isOutside = relative.startsWith('..') || path.isAbsolute(relative);

            if (isOutside) {
                return {
                    isValid: false,
                    resolvedPath: null,
                    error: 'Acceso denegado: fuera del directorio permitido'
                };
            }

            // Validación adicional con startsWith (defensa en profundidad)
            if (!resolvedPath.startsWith(baseDir + path.sep) && resolvedPath !== baseDir) {
                return {
                    isValid: false,
                    resolvedPath: null,
                    error: 'Ruta de archivo fuera del directorio permitido'
                };
            }

            // Verificar existencia y que sea un ARCHIVO
            // eslint-disable-next-line security/detect-non-literal-fs-filename
            const stats = await fs.stat(resolvedPath);

            if (!stats.isFile()) {
                return {
                    isValid: false,
                    resolvedPath: null,
                    error: 'La ruta no pertenece a un archivo válido'
                };
            }

            return { isValid: true, resolvedPath, error: null };
        } catch (error) {
            return {
                isValid: false,
                resolvedPath: null,
                error: error.code === 'ENOENT' ? 'Archivo no encontrado' : `Error de acceso: ${error.message}`
            };
        }
    }

    static async readTemplate(templateSubPath) {
        const validation = await this.validateFilePath(templateSubPath, 'TEMPLATES');

        if (!validation.isValid) {
            throw new Error(`Template no encontrado o inválido: ${validation.error}`);
        }

        // eslint-disable-next-line security/detect-non-literal-fs-filename
        return await fs.readFile(validation.resolvedPath, 'utf-8');
    }

    static async getTemplateDir(templateSubPath) {
        const validation = await this.validateFilePath(templateSubPath, 'TEMPLATES');
        if (!validation.isValid) {
            throw new Error(`Directorio de template no encontrado: ${validation.error}`);
        }
        return path.dirname(validation.resolvedPath);
    }

    static async readFileAsBase64(filePath, location = 'TEMPLATES') {
        const validation = await this.validateFilePath(filePath, location);
        if (!validation.isValid) {
            throw new Error(`Archivo no encontrado para base64: ${validation.error}`);
        }
        // eslint-disable-next-line security/detect-non-literal-fs-filename
        const buffer = await fs.readFile(validation.resolvedPath);
        const ext = path.extname(validation.resolvedPath).toLowerCase();
        const mime = ext === '.png' ? 'image/png' : (ext === '.jpg' || ext === '.jpeg' ? 'image/jpeg' : 'application/octet-stream');
        return `data:${mime};base64,${buffer.toString('base64')}`;
    }
}