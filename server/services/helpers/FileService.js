import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { fileTypeFromBuffer } from 'file-type';
import { v4 as uuidv4 } from 'uuid';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const MAX_SIZE = 5 * 1024 * 1024; // 5 MB

const STORAGE_LOCATIONS = {
    // Desde: server/services/helpers/ → server/templates
    TEMPLATES: path.resolve(__dirname, '..', '..', 'templates'),
    // Desde: server/services/helpers/ → public (raíz del proyecto)
    PUBLIC: path.resolve(__dirname, '..', '..', '..', 'public'),
    // Desde: server/services/helpers/ → public (raíz del proyecto)
    UPLOADS: path.resolve(__dirname, '..', '..', '..', 'uploads'),
    // Desde: 
    SHARED: path.resolve(__dirname, '..', '..', '..', '..', 'shared'),
};

export class FileService {

    //Read
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
    static async readFile(filePath, location = 'TEMPLATES') {
        const validation = await this.validateFilePath(filePath, location);

        if (!validation.isValid) {
            throw new Error(`Archivo no encontrado o inválido: ${validation.error}`);
        }

        // eslint-disable-next-line security/detect-non-literal-fs-filename
        return await fs.readFile(validation.resolvedPath);
    }
    static async getFileStats(filePath, location = 'TEMPLATES') {
        const validation = await this.validateFilePath(filePath, location);

        if (!validation.isValid) {
            throw new Error(`Archivo no encontrado o inválido: ${validation.error}`);
        }

        // eslint-disable-next-line security/detect-non-literal-fs-filename
        return await fs.stat(validation.resolvedPath);
    }


    //Write
    static async makeDir(dirPath, location = 'TEMPLATES') {
        const validation = await this.validateFilePath(dirPath, location);
        if (!validation.isValid) {
            throw new Error(`Directorio no encontrado o inválido: ${validation.error}`);
        }
        // eslint-disable-next-line security/detect-non-literal-fs-filename
        return await fs.mkdir(validation.resolvedPath, { recursive: true });
    }
    static async validateAndDecodeBase64(base64String, allowedMimeTypes = ['image/jpeg', 'image/png', 'image/webp']) {

        const matches = base64String.match(/^data:(image\/\w+);base64,(.+)$/);
        if (!matches) {
            throw new Error('Formato de imagen inválido');
        }

        const buffer = Buffer.from(matches[2], 'base64');

        const type = await fileTypeFromBuffer(buffer);
        if (!type || !allowedMimeTypes.includes(type.mime)) {
            throw new Error('Tipo de archivo no permitido');
        }

        return {
            buffer,
            mimeType: type.mime,
            extension: type.ext
        };
    }
    static validateBufferSize(buffer, maxSize = MAX_SIZE) {
        if (buffer.length > maxSize) {
            throw new Error(`El archivo debe pesar máximo ${maxSize / (1024 * 1024)} MB.`);
        }
        return true;
    }

    static generateSecureFilename(extension) {
        return `${uuidv4()}.${extension}`;
    }
    static async buildAndValidateFilePath(baseDir, filename, location = 'TEMPLATES') {

        // 1. Obtener la ubicación raíz configurada (ej: D:\trabajo\Celifrut\uploads)
        const storageRoot = STORAGE_LOCATIONS[location];
        if (!storageRoot) {
            throw new Error(`Ubicación no válida: ${location}`);
        }

        // 2. Construir la ruta completa del archivo
        // baseDir es relativo a la ubicación raíz (ej: "fotos/entrega_precinto_contenedor")
        const fullPath = path.resolve(storageRoot, baseDir, filename);

        // 3. Validación contra path traversal
        // Asegura que la ruta final comience con la ruta raíz configurada
        if (!fullPath.startsWith(storageRoot)) {
            throw new Error('Ruta de archivo no permitida (Path Traversal detectado)');
        }

        // 4. Asegurar que el directorio destino existe
        // Usamos path.dirname(fullPath) para obtener el directorio padre del archivo final
        const dirToCreate = path.dirname(fullPath);

        // Validamos que el directorio a crear también esté dentro de la raíz permitida (doble check)
        if (!dirToCreate.startsWith(storageRoot)) {
            throw new Error('Directorio de destino no permitido');
        }

        // Crea el directorio recursivamente
        // eslint-disable-next-line security/detect-non-literal-fs-filename
        await fs.mkdir(dirToCreate, { recursive: true });

        return fullPath;
    }
    static async writeFileFromBuffer(filePath, buffer, location = 'TEMPLATES') {
        const validation = await this.validateFilePath(filePath, location);
        if (!validation.isValid) {
            throw new Error(`Archivo no encontrado o inválido: ${validation.error}`);
        }
        // eslint-disable-next-line security/detect-non-literal-fs-filename
        return await fs.writeFile(validation.resolvedPath, buffer);
    }

    static async saveBase64Image(base64String, dirPath, location = 'TEMPLATES', maxSize = MAX_SIZE) {
        // 1. Valida y decodifica
        const { buffer, extension } = await this.validateAndDecodeBase64(base64String);

        // 2. Valida tamaño
        this.validateBufferSize(buffer, maxSize);

        // 3. Genera nombre seguro
        const filename = this.generateSecureFilename(extension);

        // 4. Construye y valida ruta
        // dirPath se trata como relativo a 'location'
        const fullFilePath = await this.buildAndValidateFilePath(dirPath, filename, location);

        // 5. Guarda el archivo
        // Usamos fs.writeFile directamente sobre fullFilePath porque ya fue validado por buildAndValidateFilePath
        // eslint-disable-next-line security/detect-non-literal-fs-filename
        await fs.writeFile(fullFilePath, buffer);

        // 6. Retorna la ruta relativa para guardar en DB o responder al cliente
        // Ejemplo: "fotos/entrega/archivo.jpg"
        return path.join(dirPath, filename);
    }
}