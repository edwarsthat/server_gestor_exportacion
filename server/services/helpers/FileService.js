import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { fileTypeFromBuffer } from 'file-type';
import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';
import config from '../../../src/config/index.js';

const ENCRYPTION_KEY = Buffer.from(config.ENCRYPTION_KEY, 'hex');
const IV_LENGTH = 16;
const ALGORITHM = 'aes-256-cbc';

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
    STORAGE: path.resolve(__dirname, '..', '..', '..', '..', 'storage'),
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
    static async sanitizeAndValidatePath(filePath, location = 'TEMPLATES') {
        if (!filePath || typeof filePath !== 'string') {
            throw new Error('Ruta de archivo inválida');
        }
        const sanitizedPath = filePath.replace(/\0/g, '').trim();
        const validation = await this.validateFilePath(sanitizedPath, location);
        if (!validation.isValid) {
            throw new Error('Archivo no encontrado o acceso denegado');
        }
        return validation.resolvedPath;
    }
    static async readTemplate(templateSubPath) {
        const resolvedPath = await this.sanitizeAndValidatePath(templateSubPath, 'TEMPLATES');
        // eslint-disable-next-line security/detect-non-literal-fs-filename
        return await fs.readFile(resolvedPath, 'utf-8');
    }
    static async getTemplateDir(templateSubPath) {
        const resolvedPath = await this.sanitizeAndValidatePath(templateSubPath, 'TEMPLATES');
        return path.dirname(resolvedPath);
    }
    static async readFileAsBase64(filePath, location = 'TEMPLATES', options = {}) {
        const {
            decrypt = false,
        } = options;

        const resolvedPath = await this.sanitizeAndValidatePath(filePath, location);

        // eslint-disable-next-line security/detect-non-literal-fs-filename
        let buffer = await fs.readFile(resolvedPath);

        if (decrypt) {
            buffer = this.decryptBuffer(buffer);
        }

        // Mapa de extensiones a MIME types
        const mimeTypes = {
            // Imágenes
            '.png': 'image/png',
            '.jpg': 'image/jpeg',
            '.jpeg': 'image/jpeg',
            '.gif': 'image/gif',
            '.webp': 'image/webp',
            '.svg': 'image/svg+xml',
            '.ico': 'image/x-icon',
            '.bmp': 'image/bmp',
            // Documentos
            '.pdf': 'application/pdf',
            '.doc': 'application/msword',
            '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            '.xls': 'application/vnd.ms-excel',
            '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            '.ppt': 'application/vnd.ms-powerpoint',
            '.pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
            // Texto
            '.txt': 'text/plain',
            '.csv': 'text/csv',
            '.json': 'application/json',
            '.xml': 'application/xml',
            '.html': 'text/html',
            // Otros
            '.zip': 'application/zip',
            '.rar': 'application/x-rar-compressed',
        };

        // Obtener extensión, manejando archivos encriptados (.pdf.enc → .pdf)
        let ext = path.extname(resolvedPath).toLowerCase();
        if (ext === '.enc') {
            // Remover .enc y obtener la extensión real
            const nameWithoutEnc = resolvedPath.slice(0, -4);
            ext = path.extname(nameWithoutEnc).toLowerCase();
        }

        const mime = mimeTypes[ext] || 'application/octet-stream';

        return `data:${mime};base64,${buffer.toString('base64')}`;
    }
    static async readFile(filePath, location = 'TEMPLATES', options = {}) {
        const {
            decrypt = false,
        } = options;

        const resolvedPath = await this.sanitizeAndValidatePath(filePath, location);

        // eslint-disable-next-line security/detect-non-literal-fs-filename
        const buffer = await fs.readFile(resolvedPath);

        if (decrypt) {
            return this.decryptBuffer(buffer);
        }
        return buffer;
    }
    static async getFileStats(filePath, location = 'TEMPLATES') {
        const resolvedPath = await this.sanitizeAndValidatePath(filePath, location);
        // eslint-disable-next-line security/detect-non-literal-fs-filename
        return await fs.stat(resolvedPath);
    }

    //encriptaciones
    static encryptBuffer(buffer) {
        const iv = crypto.randomBytes(IV_LENGTH);
        const cipher = crypto.createCipheriv(ALGORITHM, ENCRYPTION_KEY, iv);

        const encrypted = Buffer.concat([
            cipher.update(buffer),
            cipher.final()
        ]);

        // Retorna IV + datos encriptados
        return Buffer.concat([iv, encrypted]);
    }
    static decryptBuffer(encryptedBuffer) {
        // Extraer el IV (primeros 16 bytes)
        const iv = encryptedBuffer.subarray(0, IV_LENGTH);
        // Extraer el contenido encriptado
        const encryptedContent = encryptedBuffer.subarray(IV_LENGTH);

        const decipher = crypto.createDecipheriv(ALGORITHM, ENCRYPTION_KEY, iv);

        const decrypted = Buffer.concat([
            decipher.update(encryptedContent),
            decipher.final()
        ]);

        return decrypted;
    }

    //Write
    static async makeDir(dirPath, location = 'TEMPLATES') {
        const resolvedPath = await this.sanitizeAndValidatePath(dirPath, location);
        // eslint-disable-next-line security/detect-non-literal-fs-filename
        return await fs.mkdir(resolvedPath, { recursive: true });
    }
    static async validateAndDecodeBase64(
        base64String,
        allowedMimeTypes = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
    ) {
        try {
            //validar formato basico
            const matches = base64String.match(/^data:([^;]+);base64,(.+)$/);
            if (!matches) {
                throw new Error('Formato de archivo base64 inválido');
            }

            const mimeType = matches[1];
            const base64Data = matches[2];

            // Rechazar null bytes en el base64 (null byte injection)
            if (base64Data.includes('\0')) {
                throw new Error('Contenido base64 inválido: caracteres nulos detectados');
            }

            // Validar que sea base64 válido(solo caracteres permitidos)
            const base64Regex = /^[A-Za-z0-9+/]*={0,2}$/;
            if (!base64Regex.test(base64Data)) {
                throw new Error('Contenido base64 inválido: caracteres no permitidos');
            }

            const buffer = Buffer.from(base64Data, 'base64');

            // Detectar contenido de texto peligroso (PHP, HTML, JS)
            // Revisar los primeros bytes del archivo
            const textPreview = buffer.slice(0, 256).toString('utf-8').toLowerCase();
            const dangerousPatterns = [
                '<?php',           // PHP
                '<?=',             // PHP short tag
                '<script',         // JavaScript
                '<html',           // HTML
                '<!doctype',       // HTML
                '<svg',            // SVG (puede contener JS)
                '#!/',             // Shebang (scripts Unix)
            ];

            for (const pattern of dangerousPatterns) {
                if (textPreview.includes(pattern)) {
                    throw new Error('Tipo de archivo no permitido: contenido ejecutable detectado');
                }
            }

            // Usar file-type para detectar el tipo real
            const type = await fileTypeFromBuffer(buffer);
            const finalMime = type ? type.mime : mimeType;
            const finalExt = type ? type.ext : (mimeType === 'application/pdf' ? 'pdf' : 'bin');

            // Si file-type no detecta el tipo, es probablemente texto plano
            // Solo permitir si explícitamente está en allowedMimeTypes
            if (!type && !allowedMimeTypes.includes(mimeType)) {
                throw new Error('Tipo de archivo no permitido: formato no reconocido');
            }

            if (!allowedMimeTypes.includes(finalMime)) {
                throw new Error(`Tipo de archivo no permitido: ${finalMime}`);
            }

            return {
                buffer,
                mimeType: finalMime,
                extension: finalExt
            };
        } catch (error) {
            throw new Error(`Error al validar archivo: ${error.message}`);
        }
    }
    static validateBufferSize(buffer, maxSize = MAX_SIZE) {
        if (buffer.length > maxSize) {
            throw new Error(`El archivo debe pesar máximo ${maxSize / (1024 * 1024)} MB.`);
        }
        return true;
    }
    static estimateBase64Size(base64String) {
        // Remover el prefijo data:...;base64, si existe
        const base64Data = base64String.includes(',')
            ? base64String.split(',')[1]
            : base64String;

        // El tamaño real es aproximadamente 75% del tamaño del string base64
        // Fórmula: (length * 3) / 4 - padding
        const padding = (base64Data.match(/=+$/) || [''])[0].length;
        return Math.floor((base64Data.length * 3) / 4) - padding;
    }
    static validateEstimatedSize(base64String, maxSize = MAX_SIZE) {
        const estimatedSize = this.estimateBase64Size(base64String);
        if (estimatedSize > maxSize) {
            throw new Error(`El archivo excede el tamaño máximo permitido de ${maxSize / (1024 * 1024)} MB.`);
        }
        return estimatedSize;
    }
    static generateSecureFilename(extension) {
        return `${uuidv4()}.${extension}`;
    }
    static async buildAndValidateFilePath(baseDir, filename, location = 'TEMPLATES') {

        // Obtener la ubicación raíz configurada (ej: D:\trabajo\Celifrut\uploads)
        const storageRoot = STORAGE_LOCATIONS[location];
        if (!storageRoot) {
            throw new Error(`Ubicación no válida: ${location}`);
        }

        // Normalizar: convertir backslashes a forward slashes (compatibilidad Windows/Linux)                                                        
        const normalizedBaseDir = baseDir.replace(/\\/g, '/');
        const normalizedFilename = filename.replace(/\\/g, '/');

        // Detectar path traversal ANTES de resolver                                                                                                 
        //    Bloquea: "../", "/..", "..\", "\.."                                                                                                       
        const traversalPattern = /(?:^|[\\/])\.\.(?:[\\/]|$)/;
        if (traversalPattern.test(normalizedBaseDir) || traversalPattern.test(normalizedFilename)) {
            throw new Error('Ruta de archivo no permitida (Path Traversal detectado)');
        }

        // Detectar rutas absolutas de AMBOS sistemas operativos                                                                                     
        //    Linux: /etc/passwd                                                                                                                        
        //    Windows: C:\Windows, D:\, \\server\share                                                                                                  
        const absolutePattern = /^(?:\/|[A-Za-z]:|\\\\)/;
        if (absolutePattern.test(normalizedBaseDir) || absolutePattern.test(normalizedFilename)) {
            throw new Error('Ruta de archivo no permitida (Path Traversal detectado)');
        }

        // Construir la ruta completa del archivo
        // baseDir es relativo a la ubicación raíz (ej: "fotos/entrega_precinto_contenedor")
        const fullPath = path.resolve(storageRoot, normalizedBaseDir, normalizedFilename);

        // Validación contra path traversal
        // Asegura que la ruta final comience con la ruta raíz configurada
        if (!fullPath.startsWith(storageRoot + path.sep) && fullPath !== storageRoot) {
            throw new Error('Ruta de archivo no permitida (Path Traversal detectado)');
        }

        // Asegurar que el directorio destino existe
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
        const resolvedPath = await this.sanitizeAndValidatePath(filePath, location);
        // eslint-disable-next-line security/detect-non-literal-fs-filename
        return await fs.writeFile(resolvedPath, buffer);
    }
    static async saveBase64File(
        base64String,
        dirPath,
        location = 'TEMPLATES',
        options = {}
    ) {
        const {
            maxSize = MAX_SIZE,
            encrypt = false,
            allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
        } = options;

        // Valida tamaño estimado antes de decodificar (ahorra memoria)
        this.validateEstimatedSize(base64String, maxSize);

        // Valida y decodifica
        const { buffer, extension } = await this.validateAndDecodeBase64(base64String, allowedTypes);

        // Valida tamaño real del buffer
        this.validateBufferSize(buffer, maxSize);

        // Variables para encriptación
        let finalBuffer = buffer;
        let finalExtension = extension;

        // Si se debe encriptar
        if (encrypt) {
            finalBuffer = this.encryptBuffer(buffer);
            finalExtension = `${extension}.enc`;
        }

        // Genera nombre seguro
        const filename = this.generateSecureFilename(finalExtension);

        // Construye y valida ruta
        // dirPath se trata como relativo a 'location'
        const fullFilePath = await this.buildAndValidateFilePath(dirPath, filename, location);

        // Guarda el archivo
        // Usamos fs.writeFile directamente sobre fullFilePath porque ya fue validado por buildAndValidateFilePath
        // eslint-disable-next-line security/detect-non-literal-fs-filename
        await fs.writeFile(fullFilePath, finalBuffer);

        // Retorna la ruta relativa para guardar en DB o responder al cliente
        // Ejemplo: "fotos/entrega/archivo.jpg"
        return path.join(dirPath, filename);
    }
}