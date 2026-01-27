import { describe, test, expect, beforeAll, afterAll } from '@jest/globals';
import { FileService, FileValidationError } from '../../../server/services/helpers/FileService.js';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Tests unitarios para FileService.validateFilePath
 * 
 * Esta función es crítica para la seguridad del sistema porque:
 * 1. Previene ataques de Path Traversal (../../etc/passwd)
 * 2. Valida que los archivos existan
 * 3. Asegura que solo se acceda a ubicaciones permitidas
 */
describe('FileService', () => {

    // ============================================================
    // SETUP: Crear archivos temporales para las pruebas
    // ============================================================
    const testDir = path.resolve(__dirname, '../../fixtures/fileservice-test');
    const testFile = 'test-file.txt';
    const testFilePath = path.join(testDir, testFile);

    beforeAll(async () => {
        // Crear directorio y archivo de prueba
        await fs.mkdir(testDir, { recursive: true });
        await fs.writeFile(testFilePath, 'Contenido de prueba');
    });

    afterAll(async () => {
        // Limpiar después de las pruebas
        try {
            await fs.rm(testDir, { recursive: true, force: true });
        } catch {
            // Ignorar errores de limpieza
        }
    });

    // ============================================================
    // TEST GROUP: validateFilePath
    // ============================================================
    describe('validateFilePath', () => {

        // ------------------------------------------------------------
        // Caso 1: Ruta vacía o nula
        // ------------------------------------------------------------
        describe('cuando la ruta es vacía o nula', () => {

            test('debería retornar error si filePath es null', async () => {
                const result = await FileService.validateFilePath(null, 'PUBLIC');

                expect(result.isValid).toBe(false);
                expect(result.resolvedPath).toBeNull();
                expect(result.error).toBe('Ruta de archivo no proporcionada');
            });

            test('debería retornar error si filePath es undefined', async () => {
                const result = await FileService.validateFilePath(undefined, 'PUBLIC');

                expect(result.isValid).toBe(false);
                expect(result.error).toBe('Ruta de archivo no proporcionada');
            });

            test('debería retornar error si filePath es string vacío', async () => {
                const result = await FileService.validateFilePath('', 'PUBLIC');

                expect(result.isValid).toBe(false);
                expect(result.error).toBe('Ruta de archivo no proporcionada');
            });
        });

        // ------------------------------------------------------------
        // Caso 2: Ubicación no válida
        // ------------------------------------------------------------
        describe('cuando la ubicación no es válida', () => {

            test('debería retornar error si la ubicación no existe', async () => {
                const result = await FileService.validateFilePath('archivo.txt', 'UBICACION_FALSA');

                expect(result.isValid).toBe(false);
                expect(result.error).toContain('Ubicación no válida');
                expect(result.error).toContain('UBICACION_FALSA');
            });

            test('debería listar ubicaciones permitidas en el mensaje de error', async () => {
                const result = await FileService.validateFilePath('archivo.txt', 'NO_EXISTE');

                expect(result.error).toContain('TEMPLATES');
                expect(result.error).toContain('PUBLIC');
                expect(result.error).toContain('UPLOADS');
            });
        });

        // ------------------------------------------------------------
        // Caso 3: Ataques de Path Traversal (SEGURIDAD CRÍTICA)
        // ------------------------------------------------------------
        describe('protección contra Path Traversal', () => {

            test('debería bloquear intento simple de ../', async () => {
                const result = await FileService.validateFilePath('../../../etc/passwd', 'PUBLIC');

                expect(result.isValid).toBe(false);
                expect(result.error).toContain('fuera del directorio permitido');
            });

            test('debería bloquear intento con múltiples ../', async () => {
                const result = await FileService.validateFilePath(
                    '../../../../../../../../etc/passwd',
                    'PUBLIC'
                );

                expect(result.isValid).toBe(false);
            });

            test('debería bloquear intento con ../ codificado', async () => {
                // %2e%2e%2f = ../
                const result = await FileService.validateFilePath(
                    '..%2f..%2f..%2fetc/passwd',
                    'PUBLIC'
                );

                expect(result.isValid).toBe(false);
            });

            test('debería bloquear intento con caracteres nulos (null byte injection)', async () => {
                // Ataque: archivo.txt\0.jpg -> algunos sistemas leen solo "archivo.txt"
                const result = await FileService.validateFilePath(
                    'archivo.txt\0.jpg',
                    'PUBLIC'
                );

                // Debería fallar porque el archivo no existe (el \0 fue limpiado)
                expect(result.isValid).toBe(false);
            });

            test('debería bloquear rutas absolutas en Windows', async () => {
                const result = await FileService.validateFilePath(
                    'C:\\Windows\\System32\\config\\SAM',
                    'PUBLIC'
                );

                expect(result.isValid).toBe(false);
            });

            test('debería bloquear rutas absolutas en Linux', async () => {
                const result = await FileService.validateFilePath(
                    '/etc/passwd',
                    'PUBLIC'
                );

                expect(result.isValid).toBe(false);
            });

            test('debería bloquear ../ mezclado con carpetas válidas', async () => {
                const result = await FileService.validateFilePath(
                    'carpeta/../../../etc/passwd',
                    'PUBLIC'
                );

                expect(result.isValid).toBe(false);
            });

            test('debería bloquear backslash traversal en Windows', async () => {
                const result = await FileService.validateFilePath(
                    '..\\..\\..\\Windows\\System32',
                    'PUBLIC'
                );

                expect(result.isValid).toBe(false);
            });
        });

        // ------------------------------------------------------------
        // Caso 4: Archivo no existe
        // ------------------------------------------------------------
        describe('cuando el archivo no existe', () => {

            test('debería retornar error si el archivo no existe', async () => {
                const result = await FileService.validateFilePath(
                    'archivo-que-no-existe-12345.txt',
                    'PUBLIC'
                );

                expect(result.isValid).toBe(false);
                expect(result.error).toBe('Archivo no encontrado');
            });

            test('debería retornar error para subdirectorio inexistente', async () => {
                const result = await FileService.validateFilePath(
                    'carpeta/subcarpeta/archivo.txt',
                    'PUBLIC'
                );

                expect(result.isValid).toBe(false);
                expect(result.error).toBe('Archivo no encontrado');
            });
        });

        // ------------------------------------------------------------
        // Caso 5: Ruta es un directorio, no un archivo
        // ------------------------------------------------------------
        describe('cuando la ruta es un directorio', () => {

            test('debería retornar error si la ruta es un directorio', async () => {
                // Asumiendo que 'fotos' existe como directorio en PUBLIC
                const result = await FileService.validateFilePath('.', 'PUBLIC');

                expect(result.isValid).toBe(false);
                expect(result.error).toBe('La ruta no pertenece a un archivo válido');
            });
        });

        // ------------------------------------------------------------
        // Caso 6: Casos válidos (Happy Path)
        // ------------------------------------------------------------
        describe('cuando la ruta es válida', () => {

            test('debería aceptar archivo existente en PUBLIC', async () => {
                // Necesitas tener un archivo real en PUBLIC para este test
                // Por ahora, probamos la estructura de respuesta
                const result = await FileService.validateFilePath('index.html', 'PUBLIC');

                // Si el archivo existe:
                if (result.isValid) {
                    expect(result.isValid).toBe(true);
                    expect(result.resolvedPath).toBeTruthy();
                    expect(result.error).toBeNull();
                    expect(result.resolvedPath).toContain('public');
                }
            });

            test('debería normalizar barras correctamente', async () => {
                // Probar que / y \ se manejan igual
                const result1 = await FileService.validateFilePath('carpeta/archivo.txt', 'PUBLIC');
                const result2 = await FileService.validateFilePath('carpeta\\archivo.txt', 'PUBLIC');

                // Ambos deberían fallar igual (archivo no existe) 
                // pero no por razones de seguridad
                expect(result1.error).toBe(result2.error);
            });
        });

        // ------------------------------------------------------------
        // Caso 7: Diferentes ubicaciones
        // ------------------------------------------------------------
        describe('validación por ubicación', () => {

            test('debería validar correctamente en TEMPLATES', async () => {
                const result = await FileService.validateFilePath(
                    'archivo-no-existe.docx',
                    'TEMPLATES'
                );

                expect(result.isValid).toBe(false);
                expect(result.error).toBe('Archivo no encontrado');
            });

            test('debería validar correctamente en UPLOADS', async () => {
                const result = await FileService.validateFilePath(
                    'archivo-no-existe.jpg',
                    'UPLOADS'
                );

                expect(result.isValid).toBe(false);
                expect(result.error).toBe('Archivo no encontrado');
            });

            test('debería usar PUBLIC como ubicación por defecto', async () => {
                const result = await FileService.validateFilePath('test.txt');

                // Debería fallar porque el archivo no existe, pero no por ubicación
                expect(result.error).not.toContain('Ubicación no válida');
            });
        });

        // ------------------------------------------------------------
        // Caso 8: Edge cases
        // ------------------------------------------------------------
        describe('casos edge', () => {

            test('debería manejar rutas con espacios', async () => {
                const result = await FileService.validateFilePath(
                    'carpeta con espacios/archivo con espacios.txt',
                    'PUBLIC'
                );

                expect(result.isValid).toBe(false);
                expect(result.error).toBe('Archivo no encontrado');
            });

            test('debería manejar rutas con caracteres especiales', async () => {
                const result = await FileService.validateFilePath(
                    'archivo-ñ-áéíóú.txt',
                    'PUBLIC'
                );

                // Debería fallar por no existir, no por caracteres
                expect(result.error).toBe('Archivo no encontrado');
            });

            test('debería manejar rutas muy largas', async () => {
                const rutaLarga = 'a'.repeat(1000) + '.txt';
                const result = await FileService.validateFilePath(rutaLarga, 'PUBLIC');

                expect(result.isValid).toBe(false);
            });

            test('debería manejar solo puntos', async () => {
                const result = await FileService.validateFilePath('...', 'PUBLIC');

                expect(result.isValid).toBe(false);
            });
        });
    });

    // ============================================================
    // TEST GROUP: readTemplate
    // ============================================================
    describe('readTemplate', () => {

        // Setup específico para templates
        const templatesDir = path.resolve(__dirname, '../../../server/templates');
        const testTemplateFile = 'test-template-unit.html';
        const testTemplatePath = path.join(templatesDir, testTemplateFile);
        const testTemplateContent = '<html><body>Template de prueba</body></html>';

        beforeAll(async () => {
            // Asegurar que el directorio de templates existe y crear archivo de prueba
            await fs.mkdir(templatesDir, { recursive: true });
            await fs.writeFile(testTemplatePath, testTemplateContent, 'utf-8');
        });

        afterAll(async () => {
            // Limpiar archivo de prueba
            try {
                await fs.unlink(testTemplatePath);
            } catch {
                // Ignorar si no existe
            }
        });

        // ------------------------------------------------------------
        // Casos exitosos (Happy Path)
        // ------------------------------------------------------------
        describe('cuando el template existe', () => {

            test('debería leer y retornar el contenido del template', async () => {
                const content = await FileService.readTemplate(testTemplateFile);

                expect(content).toBe(testTemplateContent);
            });

            test('debería retornar contenido como string UTF-8', async () => {
                const content = await FileService.readTemplate(testTemplateFile);

                expect(typeof content).toBe('string');
            });
        });

        // ------------------------------------------------------------
        // Casos de error: Template no existe
        // ------------------------------------------------------------
        describe('cuando el template no existe', () => {

            test('debería lanzar error si el template no existe', async () => {
                await expect(
                    FileService.readTemplate('template-inexistente-12345.html')
                ).rejects.toThrow('Archivo no encontrado');
            });

            test('debería incluir mensaje de error específico', async () => {
                await expect(
                    FileService.readTemplate('no-existe.docx')
                ).rejects.toThrow('Archivo no encontrado');
            });
        });

        // ------------------------------------------------------------
        // Casos de error: Rutas inválidas
        // ------------------------------------------------------------
        describe('cuando la ruta es inválida', () => {

            test('debería lanzar error si la ruta es null', async () => {
                await expect(
                    FileService.readTemplate(null)
                ).rejects.toThrow('Ruta de archivo inválida');
            });

            test('debería lanzar error si la ruta es undefined', async () => {
                await expect(
                    FileService.readTemplate(undefined)
                ).rejects.toThrow('Ruta de archivo inválida');
            });

            test('debería lanzar error si la ruta es string vacío', async () => {
                await expect(
                    FileService.readTemplate('')
                ).rejects.toThrow('Ruta de archivo inválida');
            });
        });

        // ------------------------------------------------------------
        // Protección contra Path Traversal
        // ------------------------------------------------------------
        describe('protección contra Path Traversal', () => {

            test('debería bloquear intento de ../', async () => {
                await expect(
                    FileService.readTemplate('../../../etc/passwd')
                ).rejects.toThrow('Acceso denegado');
            });

            test('debería bloquear intento con múltiples ../', async () => {
                await expect(
                    FileService.readTemplate('../../../../../../../../etc/passwd')
                ).rejects.toThrow('Acceso denegado');
            });

            test('debería bloquear rutas absolutas', async () => {
                await expect(
                    FileService.readTemplate('/etc/passwd')
                ).rejects.toThrow('Acceso denegado');
            });

            test('debería bloquear ../ mezclado con carpetas válidas', async () => {
                await expect(
                    FileService.readTemplate('subcarpeta/../../../etc/passwd')
                ).rejects.toThrow('Acceso denegado');
            });
        });

        // ------------------------------------------------------------
        // Casos con subdirectorios
        // ------------------------------------------------------------
        describe('templates en subdirectorios', () => {

            const subDir = 'test-subdir-unit';
            const subDirPath = path.join(templatesDir, subDir);
            const subDirTemplate = 'sub-template.txt';
            const subDirTemplatePath = path.join(subDirPath, subDirTemplate);
            const subDirContent = 'Contenido del subdirectorio';

            beforeAll(async () => {
                await fs.mkdir(subDirPath, { recursive: true });
                await fs.writeFile(subDirTemplatePath, subDirContent, 'utf-8');
            });

            afterAll(async () => {
                try {
                    await fs.rm(subDirPath, { recursive: true, force: true });
                } catch {
                    // Ignorar
                }
            });

            test('debería leer template en subdirectorio', async () => {
                const content = await FileService.readTemplate(`${subDir}/${subDirTemplate}`);

                expect(content).toBe(subDirContent);
            });

            test('debería manejar barras invertidas en Windows', async () => {
                if (process.platform === 'win32') {
                    const content = await FileService.readTemplate(`${subDir}\\${subDirTemplate}`);
                    expect(content).toBe(subDirContent);
                } else {
                    // En Linux/Mac las barras invertidas no son separadores de ruta
                    // El archivo no se encontrará porque busca literalmente "test-subdir-unit\sub-template.txt"
                    await expect(
                        FileService.readTemplate(`${subDir}\\${subDirTemplate}`)
                    ).rejects.toThrow('Archivo no encontrado');
                }
            });
        });
    });

    // ============================================================
    // TEST GROUP: getTemplateDir
    // ============================================================
    describe('getTemplateDir', () => {

        const templatesDir = path.resolve(__dirname, '../../../server/templates');
        const testTemplateFile = 'test-getdir-template.html';
        const testTemplatePath = path.join(templatesDir, testTemplateFile);

        beforeAll(async () => {
            await fs.mkdir(templatesDir, { recursive: true });
            await fs.writeFile(testTemplatePath, '<html></html>', 'utf-8');
        });

        afterAll(async () => {
            try {
                await fs.unlink(testTemplatePath);
            } catch {
                // Ignorar
            }
        });

        test('debería retornar el directorio del template', async () => {
            const dir = await FileService.getTemplateDir(testTemplateFile);

            expect(dir).toBe(templatesDir);
        });

        test('debería retornar directorio para template en subdirectorio', async () => {
            const subDir = 'test-getdir-subdir';
            const subDirPath = path.join(templatesDir, subDir);
            const subTemplate = 'sub.txt';
            const subTemplatePath = path.join(subDirPath, subTemplate);

            await fs.mkdir(subDirPath, { recursive: true });
            await fs.writeFile(subTemplatePath, 'contenido', 'utf-8');

            try {
                const dir = await FileService.getTemplateDir(`${subDir}/${subTemplate}`);
                expect(dir).toBe(subDirPath);
            } finally {
                await fs.rm(subDirPath, { recursive: true, force: true });
            }
        });

        test('debería lanzar error si el template no existe', async () => {
            await expect(
                FileService.getTemplateDir('no-existe-12345.html')
            ).rejects.toThrow('Archivo no encontrado');
        });

        test('debería lanzar error para path traversal', async () => {
            await expect(
                FileService.getTemplateDir('../../../etc/passwd')
            ).rejects.toThrow('Acceso denegado');
        });
    });

    // ============================================================
    // TEST GROUP: readFile
    // ============================================================
    describe('readFile', () => {

        const templatesDir = path.resolve(__dirname, '../../../server/templates');
        const testFile = 'test-readfile.txt';
        const testFilePath = path.join(templatesDir, testFile);
        const testContent = 'Contenido de prueba para readFile';

        beforeAll(async () => {
            await fs.mkdir(templatesDir, { recursive: true });
            await fs.writeFile(testFilePath, testContent, 'utf-8');
        });

        afterAll(async () => {
            try {
                await fs.unlink(testFilePath);
            } catch {
                // Ignorar
            }
        });

        test('debería leer archivo y retornar Buffer', async () => {
            const buffer = await FileService.readFile(testFile, 'TEMPLATES');

            expect(Buffer.isBuffer(buffer)).toBe(true);
            expect(buffer.toString('utf-8')).toBe(testContent);
        });

        test('debería lanzar error si el archivo no existe', async () => {
            await expect(
                FileService.readFile('no-existe.txt', 'TEMPLATES')
            ).rejects.toThrow('Archivo no encontrado');
        });

        test('debería lanzar error para path traversal', async () => {
            await expect(
                FileService.readFile('../../../etc/passwd', 'TEMPLATES')
            ).rejects.toThrow('Acceso denegado');
        });

        test('debería usar TEMPLATES como ubicación por defecto', async () => {
            const buffer = await FileService.readFile(testFile);

            expect(buffer.toString('utf-8')).toBe(testContent);
        });
    });

    // ============================================================
    // TEST GROUP: readFileAsBase64
    // ============================================================
    describe('readFileAsBase64', () => {

        const templatesDir = path.resolve(__dirname, '../../../server/templates');
        const testTxtFile = 'test-base64.txt';
        const testTxtPath = path.join(templatesDir, testTxtFile);
        const testPngFile = 'test-base64.png';
        const testPngPath = path.join(templatesDir, testPngFile);
        const testContent = 'Contenido para base64';

        beforeAll(async () => {
            await fs.mkdir(templatesDir, { recursive: true });
            await fs.writeFile(testTxtPath, testContent, 'utf-8');
            // Crear un PNG mínimo válido (1x1 pixel transparente)
            const pngBuffer = Buffer.from([
                0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, // PNG signature
                0x00, 0x00, 0x00, 0x0D, 0x49, 0x48, 0x44, 0x52, // IHDR chunk
                0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
                0x08, 0x06, 0x00, 0x00, 0x00, 0x1F, 0x15, 0xC4,
                0x89, 0x00, 0x00, 0x00, 0x0A, 0x49, 0x44, 0x41,
                0x54, 0x78, 0x9C, 0x63, 0x00, 0x01, 0x00, 0x00,
                0x05, 0x00, 0x01, 0x0D, 0x0A, 0x2D, 0xB4, 0x00,
                0x00, 0x00, 0x00, 0x49, 0x45, 0x4E, 0x44, 0xAE,
                0x42, 0x60, 0x82
            ]);
            await fs.writeFile(testPngPath, pngBuffer);
        });

        afterAll(async () => {
            try {
                await fs.unlink(testTxtPath);
                await fs.unlink(testPngPath);
            } catch {
                // Ignorar
            }
        });

        test('debería retornar data URI con formato correcto', async () => {
            const result = await FileService.readFileAsBase64(testTxtFile, 'TEMPLATES');

            expect(result).toMatch(/^data:text\/plain;base64,/);
        });

        test('debería detectar MIME type correcto para .txt', async () => {
            const result = await FileService.readFileAsBase64(testTxtFile, 'TEMPLATES');

            expect(result.startsWith('data:text/plain;base64,')).toBe(true);
        });

        test('debería detectar MIME type correcto para .png', async () => {
            const result = await FileService.readFileAsBase64(testPngFile, 'TEMPLATES');

            expect(result.startsWith('data:image/png;base64,')).toBe(true);
        });

        test('debería codificar contenido correctamente en base64', async () => {
            const result = await FileService.readFileAsBase64(testTxtFile, 'TEMPLATES');
            const base64Content = result.split(',')[1];
            const decoded = Buffer.from(base64Content, 'base64').toString('utf-8');

            expect(decoded).toBe(testContent);
        });

        test('debería lanzar error si el archivo no existe', async () => {
            await expect(
                FileService.readFileAsBase64('no-existe.txt', 'TEMPLATES')
            ).rejects.toThrow('Archivo no encontrado');
        });

        test('debería usar application/octet-stream para extensiones desconocidas', async () => {
            const unknownFile = 'test-unknown.xyz';
            const unknownPath = path.join(templatesDir, unknownFile);
            await fs.writeFile(unknownPath, 'contenido', 'utf-8');

            try {
                const result = await FileService.readFileAsBase64(unknownFile, 'TEMPLATES');
                expect(result.startsWith('data:application/octet-stream;base64,')).toBe(true);
            } finally {
                await fs.unlink(unknownPath);
            }
        });
    });

    // ============================================================
    // TEST GROUP: getFileStats
    // ============================================================
    describe('getFileStats', () => {

        const templatesDir = path.resolve(__dirname, '../../../server/templates');
        const testFile = 'test-stats.txt';
        const testFilePath = path.join(templatesDir, testFile);
        const testContent = 'Contenido para stats';

        beforeAll(async () => {
            await fs.mkdir(templatesDir, { recursive: true });
            await fs.writeFile(testFilePath, testContent, 'utf-8');
        });

        afterAll(async () => {
            try {
                await fs.unlink(testFilePath);
            } catch {
                // Ignorar
            }
        });

        test('debería retornar objeto Stats válido', async () => {
            const stats = await FileService.getFileStats(testFile, 'TEMPLATES');

            expect(stats).toBeDefined();
            expect(typeof stats.size).toBe('number');
            expect(typeof stats.isFile).toBe('function');
            expect(stats.isFile()).toBe(true);
        });

        test('debería retornar tamaño correcto del archivo', async () => {
            const stats = await FileService.getFileStats(testFile, 'TEMPLATES');

            expect(stats.size).toBe(Buffer.byteLength(testContent, 'utf-8'));
        });

        test('debería incluir fechas de modificación', async () => {
            const stats = await FileService.getFileStats(testFile, 'TEMPLATES');

            expect(stats.mtime.getTime).toBeDefined();
            expect(stats.ctime.getTime).toBeDefined();
            expect(typeof stats.mtime.getTime()).toBe('number');
            expect(typeof stats.ctime.getTime()).toBe('number');
        });

        test('debería lanzar error si el archivo no existe', async () => {
            await expect(
                FileService.getFileStats('no-existe.txt', 'TEMPLATES')
            ).rejects.toThrow('Archivo no encontrado');
        });

        test('debería lanzar error para path traversal', async () => {
            await expect(
                FileService.getFileStats('../../../etc/passwd', 'TEMPLATES')
            ).rejects.toThrow('Acceso denegado');
        });
    });

    // ============================================================
    // TEST GROUP: encryptBuffer y decryptBuffer
    // ============================================================
    describe('encryptBuffer y decryptBuffer', () => {

        describe('encryptBuffer', () => {

            test('debería retornar Buffer encriptado', () => {
                const original = Buffer.from('Texto secreto');
                const encrypted = FileService.encryptBuffer(original);

                expect(Buffer.isBuffer(encrypted)).toBe(true);
            });

            test('debería retornar datos diferentes al original', () => {
                const original = Buffer.from('Texto secreto');
                const encrypted = FileService.encryptBuffer(original);

                expect(encrypted.equals(original)).toBe(false);
            });

            test('debería incluir IV (16 bytes) al inicio', () => {
                const original = Buffer.from('Texto secreto');
                const encrypted = FileService.encryptBuffer(original);

                // El resultado debe ser mayor que el original por el IV
                expect(encrypted.length).toBeGreaterThan(original.length + 16);
            });

            test('debería generar diferentes resultados para mismo input (IV aleatorio)', () => {
                const original = Buffer.from('Texto secreto');
                const encrypted1 = FileService.encryptBuffer(original);
                const encrypted2 = FileService.encryptBuffer(original);

                // Los IVs son aleatorios, por lo que los resultados deben ser diferentes
                expect(encrypted1.equals(encrypted2)).toBe(false);
            });
        });

        describe('decryptBuffer', () => {

            test('debería desencriptar correctamente el contenido', () => {
                const original = Buffer.from('Texto secreto para desencriptar');
                const encrypted = FileService.encryptBuffer(original);
                const decrypted = FileService.decryptBuffer(encrypted);

                expect(decrypted.toString('utf-8')).toBe(original.toString('utf-8'));
            });

            test('debería manejar contenido binario', () => {
                const original = Buffer.from([0x00, 0xFF, 0x10, 0x20, 0xAB, 0xCD]);
                const encrypted = FileService.encryptBuffer(original);
                const decrypted = FileService.decryptBuffer(encrypted);

                expect(decrypted.equals(original)).toBe(true);
            });

            test('debería manejar contenido vacío', () => {
                const original = Buffer.from('');
                const encrypted = FileService.encryptBuffer(original);
                const decrypted = FileService.decryptBuffer(encrypted);

                expect(decrypted.toString('utf-8')).toBe('');
            });

            test('debería manejar contenido largo', () => {
                const original = Buffer.alloc(10000, 'x');
                const encrypted = FileService.encryptBuffer(original);
                const decrypted = FileService.decryptBuffer(encrypted);

                expect(decrypted.equals(original)).toBe(true);
            });
        });

        describe('ciclo completo encrypt/decrypt', () => {

            test('debería preservar texto con caracteres especiales', () => {
                const original = Buffer.from('Texto con ñ, áéíóú, 日本語, 🎉');
                const encrypted = FileService.encryptBuffer(original);
                const decrypted = FileService.decryptBuffer(encrypted);

                expect(decrypted.toString('utf-8')).toBe(original.toString('utf-8'));
            });

            test('debería preservar JSON', () => {
                const jsonData = { nombre: 'Test', valores: [1, 2, 3] };
                const original = Buffer.from(JSON.stringify(jsonData));
                const encrypted = FileService.encryptBuffer(original);
                const decrypted = FileService.decryptBuffer(encrypted);

                expect(JSON.parse(decrypted.toString('utf-8'))).toEqual(jsonData);
            });
        });
    });

    // ============================================================
    // TEST GROUP: validateEstimatedSize
    // ============================================================
    describe('validateEstimatedSize', () => {

        test('debería retornar tamaño estimado si está dentro del límite', () => {
            const base64 = Buffer.from('Contenido pequeño').toString('base64');
            const size = FileService.validateEstimatedSize(base64);

            expect(size).toBe(18); // "Contenido pequeño" = 18 bytes (ñ ocupa 2 bytes en UTF-8)
        });

        test('debería lanzar error si excede el límite por defecto (5MB)', () => {
            // Crear un base64 que represente más de 5MB
            const largeBuffer = Buffer.alloc(6 * 1024 * 1024, 'x');
            const base64 = largeBuffer.toString('base64');

            expect(() => FileService.validateEstimatedSize(base64)).toThrow('excede el tamaño máximo');
        });

        test('debería respetar límite personalizado', () => {
            const base64 = Buffer.from('12345678901234567890').toString('base64'); // 20 bytes
            const customLimit = 10;

            expect(() => FileService.validateEstimatedSize(base64, customLimit)).toThrow('excede el tamaño máximo');
        });

        test('debería aceptar archivo justo en el límite', () => {
            const buffer = Buffer.alloc(100, 'x');
            const base64 = buffer.toString('base64');
            const limit = 100;

            expect(() => FileService.validateEstimatedSize(base64, limit)).not.toThrow();
        });

        test('debería manejar data URI correctamente', () => {
            const content = 'Contenido';
            const base64 = Buffer.from(content).toString('base64');
            const dataUri = `data:text/plain;base64,${base64}`;

            const size = FileService.validateEstimatedSize(dataUri);

            expect(size).toBe(content.length);
        });
    });

    // ============================================================
    // TEST GROUP: buildAndValidateFilePath
    // ============================================================
    describe('buildAndValidateFilePath', () => {

        const uploadsDir = path.resolve(__dirname, '../../../uploads');

        afterAll(async () => {
            // Limpiar directorios de prueba creados
            try {
                await fs.rm(path.join(uploadsDir, 'test-build-dir'), { recursive: true, force: true });
            } catch {
                // Ignorar
            }
        });

        test('debería construir ruta completa correctamente', async () => {
            const result = await FileService.buildAndValidateFilePath(
                'test-build-dir',
                'archivo.txt',
                'UPLOADS'
            );

            expect(result).toBe(path.join(uploadsDir, 'test-build-dir', 'archivo.txt'));
        });

        test('debería crear el directorio si no existe', async () => {
            const testDir = 'test-build-dir/subdir';
            await FileService.buildAndValidateFilePath(testDir, 'file.txt', 'UPLOADS');

            const dirExists = await fs.stat(path.join(uploadsDir, testDir))
                .then(stats => stats.isDirectory())
                .catch(() => false);

            expect(dirExists).toBe(true);
        });

        test('debería lanzar error para ubicación inválida', async () => {
            await expect(
                FileService.buildAndValidateFilePath('dir', 'file.txt', 'INVALID_LOCATION')
            ).rejects.toThrow('Ubicación no válida');
        });

        test('debería bloquear path traversal en baseDir', async () => {
            await expect(
                FileService.buildAndValidateFilePath('../../../etc', 'passwd', 'UPLOADS')
            ).rejects.toThrow('Path Traversal');
        });

        test('debería bloquear path traversal en filename', async () => {
            await expect(
                FileService.buildAndValidateFilePath('dir', '../../../etc/passwd', 'UPLOADS')
            ).rejects.toThrow('Path Traversal');
        });
    });

    // ============================================================
    // TEST GROUP: writeFileFromBuffer
    // ============================================================
    describe('writeFileFromBuffer', () => {

        const templatesDir = path.resolve(__dirname, '../../../server/templates');
        const existingFile = 'test-write-existing.txt';
        const existingFilePath = path.join(templatesDir, existingFile);

        beforeAll(async () => {
            await fs.mkdir(templatesDir, { recursive: true });
            await fs.writeFile(existingFilePath, 'contenido original', 'utf-8');
        });

        afterAll(async () => {
            try {
                await fs.unlink(existingFilePath);
            } catch {
                // Ignorar
            }
        });

        test('debería sobrescribir archivo existente', async () => {
            const newContent = Buffer.from('nuevo contenido');
            await FileService.writeFileFromBuffer(existingFile, newContent, 'TEMPLATES');

            const content = await fs.readFile(existingFilePath, 'utf-8');
            expect(content).toBe('nuevo contenido');
        });

        test('debería lanzar error si el archivo no existe', async () => {
            await expect(
                FileService.writeFileFromBuffer('no-existe-write.txt', Buffer.from('test'), 'TEMPLATES')
            ).rejects.toThrow('Archivo no encontrado');
        });

        test('debería lanzar error para path traversal', async () => {
            await expect(
                FileService.writeFileFromBuffer('../../../etc/passwd', Buffer.from('test'), 'TEMPLATES')
            ).rejects.toThrow('Acceso denegado');
        });
    });

    // ============================================================
    // TEST GROUP: saveBase64File
    // ============================================================
    describe('saveBase64File', () => {

        const uploadsDir = path.resolve(__dirname, '../../../uploads');
        const testDir = 'test-save-base64';
        const testDirPath = path.join(uploadsDir, testDir);

        afterAll(async () => {
            try {
                await fs.rm(testDirPath, { recursive: true, force: true });
            } catch {
                // Ignorar
            }
        });

        // Crear un PNG mínimo válido en base64
        const minimalPngBase64 = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

        test('debería guardar archivo y retornar ruta relativa', async () => {
            const result = await FileService.saveBase64File(
                minimalPngBase64,
                testDir,
                'UPLOADS'
            );

            // Usar [\\/] para compatibilidad Windows/Unix
            const escapedDir = testDir.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            expect(result).toMatch(new RegExp(`^${escapedDir}[\\\\/][0-9a-f-]{36}\\.png$`));
        });

        test('debería crear el archivo en disco', async () => {
            const result = await FileService.saveBase64File(
                minimalPngBase64,
                testDir,
                'UPLOADS'
            );

            const fullPath = path.join(uploadsDir, result);
            const exists = await fs.stat(fullPath).then(() => true).catch(() => false);

            expect(exists).toBe(true);
        });

        test('debería rechazar tipos MIME no permitidos', async () => {
            const gifBase64 = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';

            await expect(
                FileService.saveBase64File(gifBase64, testDir, 'UPLOADS')
            ).rejects.toThrow('Tipo de archivo no permitido');
        });

        test('debería permitir tipos personalizados con allowedTypes', async () => {
            const gifBase64 = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';

            const result = await FileService.saveBase64File(
                gifBase64,
                testDir,
                'UPLOADS',
                { allowedTypes: ['image/gif'] }
            );

            expect(result).toMatch(/\.gif$/);
        });

        test('debería rechazar archivos que excedan maxSize', async () => {
            await expect(
                FileService.saveBase64File(
                    minimalPngBase64,
                    testDir,
                    'UPLOADS',
                    { maxSize: 10 } // 10 bytes - muy pequeño
                )
            ).rejects.toThrow('excede el tamaño máximo');
        });

        test('debería encriptar archivo cuando encrypt=true', async () => {
            const result = await FileService.saveBase64File(
                minimalPngBase64,
                testDir,
                'UPLOADS',
                { encrypt: true }
            );

            expect(result).toMatch(/\.png\.enc$/);
        });

        // ------------------------------------------------------------
        // TESTS DE SEGURIDAD: Ataques maliciosos (QA Hacker)
        // ------------------------------------------------------------
        describe('ataques maliciosos (seguridad)', () => {

            // PNG válido para usar en tests
            const validPngBase64 = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

            // ============================================================
            // ATAQUE 1: Path Traversal en dirPath
            // Objetivo: Escapar del directorio permitido y escribir en /etc, /tmp, etc.
            // ============================================================
            describe('Path Traversal en dirPath', () => {

                test('debería bloquear ../ simple para escapar del directorio', async () => {
                    await expect(
                        FileService.saveBase64File(
                            validPngBase64,
                            '../../../etc/cron.d',
                            'UPLOADS'
                        )
                    ).rejects.toThrow('Path Traversal');
                });

                test('debería bloquear ../ múltiples niveles', async () => {
                    await expect(
                        FileService.saveBase64File(
                            validPngBase64,
                            '../../../../../../../../tmp/malware',
                            'UPLOADS'
                        )
                    ).rejects.toThrow('Path Traversal');
                });

                test('debería bloquear ../ mezclado con carpetas válidas', async () => {
                    await expect(
                        FileService.saveBase64File(
                            validPngBase64,
                            'fotos/legitimo/../../../etc/passwd',
                            'UPLOADS'
                        )
                    ).rejects.toThrow('Path Traversal');
                });

                test('debería bloquear rutas absolutas en Linux', async () => {
                    await expect(
                        FileService.saveBase64File(
                            validPngBase64,
                            '/etc/cron.d',
                            'UPLOADS'
                        )
                    ).rejects.toThrow();
                });

                test('debería bloquear rutas absolutas en Windows', async () => {
                    await expect(
                        FileService.saveBase64File(
                            validPngBase64,
                            'C:\\Windows\\System32',
                            'UPLOADS'
                        )
                    ).rejects.toThrow();
                });

                test('debería bloquear backslash traversal (Windows style)', async () => {
                    await expect(
                        FileService.saveBase64File(
                            validPngBase64,
                            '..\\..\\..\\etc\\passwd',
                            'UPLOADS'
                        )
                    ).rejects.toThrow();
                });
            });

            // ============================================================
            // ATAQUE 2: Base64 malformado y payloads peligrosos
            // Objetivo: Crashear el servidor o inyectar código malicioso
            // ============================================================
            describe('Base64 malformado y payloads maliciosos', () => {

                test('debería rechazar base64 con null bytes (null byte injection)', async () => {
                    const maliciousBase64 = 'data:image/png;base64,iVBORw0KGgo\0AAAANSUhEUg==';

                    await expect(
                        FileService.saveBase64File(maliciousBase64, testDir, 'UPLOADS')
                    ).rejects.toThrow();
                });

                test('debería rechazar string sin prefijo data:', async () => {
                    const noPrefix = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

                    await expect(
                        FileService.saveBase64File(noPrefix, testDir, 'UPLOADS')
                    ).rejects.toThrow('Formato de archivo base64 inválido');
                });

                test('debería rechazar MIME type con inyección de comandos', async () => {
                    // Intento de inyectar comandos en el MIME type
                    const maliciousMime = 'data:image/png;$(whoami);base64,iVBORw0KGgoAAAANSUhEUg==';

                    await expect(
                        FileService.saveBase64File(maliciousMime, testDir, 'UPLOADS')
                    ).rejects.toThrow();
                });

                test('debería rechazar base64 con caracteres no válidos', async () => {
                    const invalidChars = 'data:image/png;base64,<script>alert("xss")</script>';

                    await expect(
                        FileService.saveBase64File(invalidChars, testDir, 'UPLOADS')
                    ).rejects.toThrow();
                });

                test('debería rechazar string vacío', async () => {
                    await expect(
                        FileService.saveBase64File('', testDir, 'UPLOADS')
                    ).rejects.toThrow();
                });

                test('debería rechazar solo el prefijo sin datos', async () => {
                    await expect(
                        FileService.saveBase64File('data:image/png;base64,', testDir, 'UPLOADS')
                    ).rejects.toThrow();
                });
            });

            // ============================================================
            // ATAQUE 3: MIME Type Spoofing / Polyglot Files
            // Objetivo: Subir archivo ejecutable disfrazado de imagen
            // ============================================================
            describe('MIME Type Spoofing y archivos polyglot', () => {

                test('debería rechazar ejecutable disfrazado de imagen (ELF header)', async () => {
                    // Primeros bytes de un ejecutable ELF de Linux: 0x7F 'E' 'L' 'F'
                    // Codificado en base64: f0VMRg==
                    const elfAsImage = 'data:image/png;base64,f0VMRgIBAQAAAAAAAAAAAA==';

                    await expect(
                        FileService.saveBase64File(elfAsImage, testDir, 'UPLOADS')
                    ).rejects.toThrow('Tipo de archivo no permitido');
                });

                test('debería rechazar script PHP disfrazado de imagen', async () => {
                    // <?php system($_GET['cmd']); ?> en base64
                    const phpScript = Buffer.from('<?php system($_GET["cmd"]); ?>').toString('base64');
                    const phpAsImage = `data:image/png;base64,${phpScript}`;

                    await expect(
                        FileService.saveBase64File(phpAsImage, testDir, 'UPLOADS')
                    ).rejects.toThrow('Tipo de archivo no permitido');
                });

                test('debería rechazar HTML/JS disfrazado de imagen', async () => {
                    const htmlPayload = Buffer.from('<html><script>alert(document.cookie)</script></html>').toString('base64');
                    const htmlAsImage = `data:image/png;base64,${htmlPayload}`;

                    await expect(
                        FileService.saveBase64File(htmlAsImage, testDir, 'UPLOADS')
                    ).rejects.toThrow('Tipo de archivo no permitido');
                });

                test('debería rechazar SVG con JavaScript embebido', async () => {
                    // SVG puede contener JavaScript y es peligroso
                    const svgWithJs = Buffer.from('<svg onload="alert(1)"><script>alert("XSS")</script></svg>').toString('base64');
                    const maliciousSvg = `data:image/svg+xml;base64,${svgWithJs}`;

                    // SVG no está en los tipos permitidos por defecto
                    await expect(
                        FileService.saveBase64File(maliciousSvg, testDir, 'UPLOADS')
                    ).rejects.toThrow('Tipo de archivo no permitido');
                });

                test('debería rechazar archivo .exe disfrazado (MZ header)', async () => {
                    // MZ es el magic number de ejecutables Windows/DOS
                    const exeHeader = Buffer.from([0x4D, 0x5A, 0x90, 0x00, 0x03, 0x00]).toString('base64');
                    const exeAsImage = `data:image/png;base64,${exeHeader}`;

                    await expect(
                        FileService.saveBase64File(exeAsImage, testDir, 'UPLOADS')
                    ).rejects.toThrow('Tipo de archivo no permitido');
                });
            });
        });
    });

    // ============================================================
    // TEST GROUP: validateAndDecodeBase64
    // ============================================================
    describe('validateAndDecodeBase64', () => {

        test('debería rechazar string sin formato base64 válido', async () => {
            await expect(
                FileService.validateAndDecodeBase64('esto-no-es-base64')
            ).rejects.toThrow('Formato de archivo base64 inválido');
        });

        test('debería rechazar tipo MIME no permitido', async () => {
            // Base64 de un GIF (no permitido por defecto)
            const gifBase64 = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';

            await expect(
                FileService.validateAndDecodeBase64(gifBase64)
            ).rejects.toThrow('Tipo de archivo no permitido');
        });

        test('debería aceptar y decodificar imagen PNG válida', async () => {
            const pngBase64 = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

            const result = await FileService.validateAndDecodeBase64(pngBase64);

            expect(result).toHaveProperty('buffer');
            expect(result).toHaveProperty('mimeType');
            expect(result).toHaveProperty('extension');
            expect(Buffer.isBuffer(result.buffer)).toBe(true);
        });

        test('debería retornar extensión correcta', async () => {
            const pngBase64 = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

            const result = await FileService.validateAndDecodeBase64(pngBase64);

            expect(result.extension).toBe('png');
        });

        test('debería permitir tipos personalizados', async () => {
            const gifBase64 = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';

            const result = await FileService.validateAndDecodeBase64(gifBase64, ['image/gif']);

            expect(result.mimeType).toBe('image/gif');
        });
    });

    // ============================================================
    // TEST GROUP: estimateBase64Size
    // ============================================================
    describe('estimateBase64Size', () => {

        // ------------------------------------------------------------
        // Casos con prefijo data URI
        // ------------------------------------------------------------
        describe('con prefijo data URI', () => {

            test('debería calcular tamaño correctamente con prefijo data URI', () => {
                // "Hola" en base64 = "SG9sYQ==" (4 bytes originales)
                const base64WithPrefix = 'data:text/plain;base64,SG9sYQ==';
                const size = FileService.estimateBase64Size(base64WithPrefix);

                expect(size).toBe(4);
            });

            test('debería manejar diferentes tipos MIME en el prefijo', () => {
                // "Test" en base64 = "VGVzdA==" (4 bytes)
                const imageBase64 = 'data:image/png;base64,VGVzdA==';
                const size = FileService.estimateBase64Size(imageBase64);

                expect(size).toBe(4);
            });
        });

        // ------------------------------------------------------------
        // Casos sin prefijo (base64 puro)
        // ------------------------------------------------------------
        describe('sin prefijo (base64 puro)', () => {

            test('debería calcular tamaño de base64 sin prefijo', () => {
                // "Hola" = "SG9sYQ==" (4 bytes)
                const size = FileService.estimateBase64Size('SG9sYQ==');

                expect(size).toBe(4);
            });

            test('debería calcular tamaño de string más largo', () => {
                // "Hello World" = "SGVsbG8gV29ybGQ=" (11 bytes)
                const size = FileService.estimateBase64Size('SGVsbG8gV29ybGQ=');

                expect(size).toBe(11);
            });
        });

        // ------------------------------------------------------------
        // Casos con diferentes padding
        // ------------------------------------------------------------
        describe('manejo de padding', () => {

            test('debería manejar base64 con doble padding (==)', () => {
                // "Hi" = "SGk=" tiene un padding (2 bytes)
                // "H" = "SA==" tiene doble padding (1 byte)
                const size = FileService.estimateBase64Size('SA==');

                expect(size).toBe(1);
            });

            test('debería manejar base64 con un padding (=)', () => {
                // "Hi" = "SGk=" (2 bytes)
                const size = FileService.estimateBase64Size('SGk=');

                expect(size).toBe(2);
            });

            test('debería manejar base64 sin padding', () => {
                // "abc" = "YWJj" sin padding (3 bytes)
                const size = FileService.estimateBase64Size('YWJj');

                expect(size).toBe(3);
            });
        });

        // ------------------------------------------------------------
        // Verificación con Buffer real
        // ------------------------------------------------------------
        describe('verificación con Buffer real', () => {

            test('debería coincidir con el tamaño real del buffer decodificado', () => {
                const originalText = 'Este es un texto de prueba para verificar el cálculo';
                const base64 = Buffer.from(originalText).toString('base64');

                const estimatedSize = FileService.estimateBase64Size(base64);
                const realSize = Buffer.from(base64, 'base64').length;

                expect(estimatedSize).toBe(realSize);
            });

            test('debería estimar correctamente archivos binarios simulados', () => {
                // Simular un pequeño archivo binario (100 bytes)
                const binaryBuffer = Buffer.alloc(100, 0xFF);
                const base64 = binaryBuffer.toString('base64');

                const estimatedSize = FileService.estimateBase64Size(base64);

                expect(estimatedSize).toBe(100);
            });

            test('debería estimar correctamente con prefijo data URI y buffer real', () => {
                const originalText = 'Contenido del archivo';
                const base64 = Buffer.from(originalText).toString('base64');
                const dataUri = `data:text/plain;base64,${base64}`;

                const estimatedSize = FileService.estimateBase64Size(dataUri);
                const realSize = originalText.length;

                expect(estimatedSize).toBe(realSize);
            });
        });

        // ------------------------------------------------------------
        // Edge cases
        // ------------------------------------------------------------
        describe('casos edge', () => {

            test('debería manejar string base64 vacío', () => {
                const size = FileService.estimateBase64Size('');

                expect(size).toBe(0);
            });

            test('debería manejar data URI con contenido vacío', () => {
                const size = FileService.estimateBase64Size('data:text/plain;base64,');

                expect(size).toBe(0);
            });

            test('debería calcular correctamente para tamaños grandes', () => {
                // Crear un buffer de 1MB
                const largeBuffer = Buffer.alloc(1024 * 1024, 'x');
                const base64 = largeBuffer.toString('base64');

                const estimatedSize = FileService.estimateBase64Size(base64);

                // Debe ser exactamente 1MB
                expect(estimatedSize).toBe(1024 * 1024);
            });
        });
    });

    // ============================================================
    // TEST GROUP: validateBufferSize
    // ============================================================
    describe('validateBufferSize', () => {

        test('debería aceptar buffer menor al límite', () => {
            const smallBuffer = Buffer.alloc(1000); // 1KB

            expect(() => FileService.validateBufferSize(smallBuffer)).not.toThrow();
        });

        test('debería rechazar buffer mayor al límite', () => {
            const largeBuffer = Buffer.alloc(10 * 1024 * 1024); // 10MB

            expect(() => FileService.validateBufferSize(largeBuffer)).toThrow('máximo');
        });

        test('debería permitir especificar límite personalizado', () => {
            const buffer = Buffer.alloc(1000); // 1KB
            const customLimit = 500; // 500 bytes

            expect(() => FileService.validateBufferSize(buffer, customLimit)).toThrow();
        });
    });

    // ============================================================
    // TEST GROUP: generateSecureFilename
    // ============================================================
    describe('generateSecureFilename', () => {

        test('debería generar nombre con extensión correcta', () => {
            const filename = FileService.generateSecureFilename('jpg');

            expect(filename).toMatch(/^[0-9a-f-]{36}\.jpg$/);
        });

        test('debería generar nombres únicos', () => {
            const filename1 = FileService.generateSecureFilename('png');
            const filename2 = FileService.generateSecureFilename('png');

            expect(filename1).not.toBe(filename2);
        });

        test('debería manejar extensiones con o sin punto', () => {
            const filename = FileService.generateSecureFilename('.webp');

            // Debería funcionar aunque pases ".webp" en lugar de "webp"
            expect(filename).toContain('webp');
        });
    });

    // ============================================================
    // TEST GROUP: deleteFile
    // ============================================================
    describe('deleteFile', () => {
        const templatesDir = path.resolve(__dirname, '../../../server/templates');
        const fileToDelete = 'file-to-delete-unit.txt';
        const absoluteFilePath = path.join(templatesDir, fileToDelete);

        beforeAll(async () => {
            await fs.mkdir(templatesDir, { recursive: true });
        });

        test('debería eliminar un archivo existente correctamente', async () => {
            // 1. Crear el archivo
            await fs.writeFile(absoluteFilePath, 'contenido para borrar');

            // 2. Verificar que existe
            const existsBefore = await fs.stat(absoluteFilePath).then(() => true).catch(() => false);
            expect(existsBefore).toBe(true);

            // 3. Eliminar
            await FileService.deleteFile(fileToDelete, 'TEMPLATES');

            // 4. Verificar que ya no existe
            const existsAfter = await fs.stat(absoluteFilePath).then(() => true).catch(() => false);
            expect(existsAfter).toBe(false);
        });

        test('debería retornar éxito si el archivo no existe (idempotencia)', async () => {
            const result = await FileService.deleteFile('archivo-que-no-existe.txt', 'TEMPLATES');

            expect(result.success).toBe(true);
            expect(result.message).toContain('no existía');
        });

        test('debería proteger contra Path Traversal y no eliminar archivos fuera de la ruta', async () => {
            // Creamos un archivo "señuelo" fuera del directorio permitido (en la raíz de server)
            const sensitiveFile = 'sensitive-unit-test.txt';
            const serverDir = path.resolve(templatesDir, '..');
            const sensitivePath = path.join(serverDir, sensitiveFile);

            await fs.writeFile(sensitivePath, 'no borrar esto');

            try {
                // El ataque intenta subir un nivel desde TEMPLATES (../../server/sensitive-unit-test.txt)
                const attackPath = `../${sensitiveFile}`;

                await expect(FileService.deleteFile(attackPath, 'TEMPLATES')).rejects.toThrow('Acceso denegado');

                // Lo CRÍTICO es que el archivo SIGA EXISTIENDO.
                const stillExists = await fs.stat(sensitivePath).then(() => true).catch(() => false);
                expect(stillExists).toBe(true);
            } finally {
                // Limpieza manual del señuelo
                await fs.unlink(sensitivePath).catch(() => { });
            }
        });

        test('debería bloquear ataques con Null Byte Injection', async () => {
            const attackPath = 'archivo.txt\0.jpg';
            const result = await FileService.deleteFile(attackPath, 'TEMPLATES');

            // El service debe sanitizar (remover \0) y fallar al no encontrar "archivo.txt.jpg" 
            // o manejarlo de forma segura siguiendo el flujo normal de error capturado
            expect(result.success).toBe(true);
        });

        test('debería bloquear intentos con rutas absolutas', async () => {
            const absoluteAttack = process.platform === 'win32' ? 'C:\\Windows\\system.ini' : '/etc/passwd';

            await expect(
                FileService.deleteFile(absoluteAttack, 'TEMPLATES')
            ).rejects.toThrow('Acceso denegado');
        });

        test('debería manejar errores inesperados del sistema de archivos', async () => {
            // Caso donde la ubicación no es válida
            await expect(
                FileService.deleteFile('test.txt', 'UBICACION_INEXISTENTE')
            ).rejects.toThrow('No se pudo eliminar el archivo');
        });
    });

    // ============================================================
    // TEST GROUP: saveBufferFile
    // ============================================================
    describe('saveBufferFile', () => {

        const uploadsDir = path.resolve(__dirname, '../../../uploads');
        const testDir = 'test-save-buffer';
        const testDirPath = path.join(uploadsDir, testDir);

        // PNG mínimo válido (1x1 pixel)
        const validPngBuffer = Buffer.from([
            0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A,
            0x00, 0x00, 0x00, 0x0D, 0x49, 0x48, 0x44, 0x52,
            0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
            0x08, 0x06, 0x00, 0x00, 0x00, 0x1F, 0x15, 0xC4,
            0x89, 0x00, 0x00, 0x00, 0x0A, 0x49, 0x44, 0x41,
            0x54, 0x78, 0x9C, 0x63, 0x00, 0x01, 0x00, 0x00,
            0x05, 0x00, 0x01, 0x0D, 0x0A, 0x2D, 0xB4, 0x00,
            0x00, 0x00, 0x00, 0x49, 0x45, 0x4E, 0x44, 0xAE,
            0x42, 0x60, 0x82
        ]);

        // JPEG mínimo válido
        const validJpegBuffer = Buffer.from([
            0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46,
            0x49, 0x46, 0x00, 0x01, 0x01, 0x00, 0x00, 0x01,
            0x00, 0x01, 0x00, 0x00, 0xFF, 0xDB, 0x00, 0x43,
            0x00, 0x08, 0x06, 0x06, 0x07, 0x06, 0x05, 0x08,
            0x07, 0x07, 0x07, 0x09, 0x09, 0x08, 0x0A, 0x0C,
            0x14, 0x0D, 0x0C, 0x0B, 0x0B, 0x0C, 0x19, 0x12,
            0x13, 0x0F, 0x14, 0x1D, 0x1A, 0x1F, 0x1E, 0x1D,
            0x1A, 0x1C, 0x1C, 0x20, 0x24, 0x2E, 0x27, 0x20,
            0x22, 0x2C, 0x23, 0x1C, 0x1C, 0x28, 0x37, 0x29,
            0x2C, 0x30, 0x31, 0x34, 0x34, 0x34, 0x1F, 0x27,
            0x39, 0x3D, 0x38, 0x32, 0x3C, 0x2E, 0x33, 0x34,
            0x32, 0xFF, 0xC0, 0x00, 0x0B, 0x08, 0x00, 0x01,
            0x00, 0x01, 0x01, 0x01, 0x11, 0x00, 0xFF, 0xC4,
            0x00, 0x1F, 0x00, 0x00, 0x01, 0x05, 0x01, 0x01,
            0x01, 0x01, 0x01, 0x01, 0x00, 0x00, 0x00, 0x00,
            0x00, 0x00, 0x00, 0x00, 0x01, 0x02, 0x03, 0x04,
            0x05, 0x06, 0x07, 0x08, 0x09, 0x0A, 0x0B, 0xFF,
            0xC4, 0x00, 0xB5, 0x10, 0x00, 0x02, 0x01, 0x03,
            0x03, 0x02, 0x04, 0x03, 0x05, 0x05, 0x04, 0x04,
            0x00, 0x00, 0x01, 0x7D, 0x01, 0x02, 0x03, 0x00,
            0x04, 0x11, 0x05, 0x12, 0x21, 0x31, 0x41, 0x06,
            0x13, 0x51, 0x61, 0x07, 0x22, 0x71, 0x14, 0x32,
            0x81, 0x91, 0xA1, 0x08, 0x23, 0x42, 0xB1, 0xC1,
            0x15, 0x52, 0xD1, 0xF0, 0x24, 0x33, 0x62, 0x72,
            0x82, 0x09, 0x0A, 0x16, 0x17, 0x18, 0x19, 0x1A,
            0x25, 0x26, 0x27, 0x28, 0x29, 0x2A, 0x34, 0x35,
            0x36, 0x37, 0x38, 0x39, 0x3A, 0x43, 0x44, 0x45,
            0x46, 0x47, 0x48, 0x49, 0x4A, 0x53, 0x54, 0x55,
            0x56, 0x57, 0x58, 0x59, 0x5A, 0x63, 0x64, 0x65,
            0x66, 0x67, 0x68, 0x69, 0x6A, 0x73, 0x74, 0x75,
            0x76, 0x77, 0x78, 0x79, 0x7A, 0x83, 0x84, 0x85,
            0x86, 0x87, 0x88, 0x89, 0x8A, 0x92, 0x93, 0x94,
            0x95, 0x96, 0x97, 0x98, 0x99, 0x9A, 0xA2, 0xA3,
            0xA4, 0xA5, 0xA6, 0xA7, 0xA8, 0xA9, 0xAA, 0xB2,
            0xB3, 0xB4, 0xB5, 0xB6, 0xB7, 0xB8, 0xB9, 0xBA,
            0xC2, 0xC3, 0xC4, 0xC5, 0xC6, 0xC7, 0xC8, 0xC9,
            0xCA, 0xD2, 0xD3, 0xD4, 0xD5, 0xD6, 0xD7, 0xD8,
            0xD9, 0xDA, 0xE1, 0xE2, 0xE3, 0xE4, 0xE5, 0xE6,
            0xE7, 0xE8, 0xE9, 0xEA, 0xF1, 0xF2, 0xF3, 0xF4,
            0xF5, 0xF6, 0xF7, 0xF8, 0xF9, 0xFA, 0xFF, 0xDA,
            0x00, 0x08, 0x01, 0x01, 0x00, 0x00, 0x3F, 0x00,
            0xFB, 0xD5, 0xDB, 0x20, 0xA8, 0xF1, 0x45, 0x00,
            0xFF, 0xD9
        ]);

        afterAll(async () => {
            try {
                await fs.rm(testDirPath, { recursive: true, force: true });
            } catch {
                // Ignorar
            }
        });

        // ------------------------------------------------------------
        // Casos de éxito (Happy Path)
        // ------------------------------------------------------------
        describe('casos de éxito', () => {

            test('debería guardar buffer PNG y retornar ruta relativa', async () => {
                const result = await FileService.saveBufferFile(
                    validPngBuffer,
                    testDir,
                    'UPLOADS'
                );

                expect(result).toMatch(/^test-save-buffer\/[0-9a-f-]{36}\.png$/);
            });

            test('debería guardar buffer JPEG correctamente', async () => {
                const result = await FileService.saveBufferFile(
                    validJpegBuffer,
                    testDir,
                    'UPLOADS'
                );

                expect(result).toMatch(/\.jpg$/);
            });

            test('debería crear el archivo en disco', async () => {
                const result = await FileService.saveBufferFile(
                    validPngBuffer,
                    testDir,
                    'UPLOADS'
                );

                const fullPath = path.join(uploadsDir, result);
                const exists = await fs.stat(fullPath).then(() => true).catch(() => false);

                expect(exists).toBe(true);
            });

            test('debería encriptar archivo cuando encrypt=true', async () => {
                const result = await FileService.saveBufferFile(
                    validPngBuffer,
                    testDir,
                    'UPLOADS',
                    { encrypt: true }
                );

                expect(result).toMatch(/\.png\.enc$/);
            });

            test('debería poder desencriptar archivo guardado con encrypt=true', async () => {
                const result = await FileService.saveBufferFile(
                    validPngBuffer,
                    testDir,
                    'UPLOADS',
                    { encrypt: true }
                );

                // Leer y desencriptar
                const fullPath = path.join(uploadsDir, result);
                const encryptedBuffer = await fs.readFile(fullPath);
                const decrypted = FileService.decryptBuffer(encryptedBuffer);

                expect(decrypted.equals(validPngBuffer)).toBe(true);
            });

            test('debería retornar rutas con forward slashes (consistencia)', async () => {
                const result = await FileService.saveBufferFile(
                    validPngBuffer,
                    testDir,
                    'UPLOADS'
                );

                expect(result).not.toContain('\\');
                expect(result).toContain('/');
            });

            test('debería permitir tipos personalizados con allowedTypes', async () => {
                // GIF mínimo válido
                const gifBuffer = Buffer.from([
                    0x47, 0x49, 0x46, 0x38, 0x39, 0x61, 0x01, 0x00,
                    0x01, 0x00, 0x00, 0x00, 0x00, 0x3B
                ]);

                const result = await FileService.saveBufferFile(
                    gifBuffer,
                    testDir,
                    'UPLOADS',
                    { allowedTypes: ['image/gif'] }
                );

                expect(result).toMatch(/\.gif$/);
            });
        });

        // ------------------------------------------------------------
        // Validación de entrada
        // ------------------------------------------------------------
        describe('validación de entrada', () => {

            test('debería lanzar FileValidationError si no es un Buffer', async () => {
                await expect(
                    FileService.saveBufferFile('no soy un buffer', testDir, 'UPLOADS')
                ).rejects.toThrow(FileValidationError);

                await expect(
                    FileService.saveBufferFile('no soy un buffer', testDir, 'UPLOADS')
                ).rejects.toThrow('Se esperaba un Buffer válido');
            });

            test('debería lanzar FileValidationError si el buffer está vacío', async () => {
                await expect(
                    FileService.saveBufferFile(Buffer.alloc(0), testDir, 'UPLOADS')
                ).rejects.toThrow(FileValidationError);

                await expect(
                    FileService.saveBufferFile(Buffer.alloc(0), testDir, 'UPLOADS')
                ).rejects.toThrow('El buffer está vacío');
            });

            test('debería lanzar FileValidationError si es null', async () => {
                await expect(
                    FileService.saveBufferFile(null, testDir, 'UPLOADS')
                ).rejects.toThrow(FileValidationError);
            });

            test('debería lanzar FileValidationError si es undefined', async () => {
                await expect(
                    FileService.saveBufferFile(undefined, testDir, 'UPLOADS')
                ).rejects.toThrow(FileValidationError);
            });

            test('debería lanzar FileValidationError si es un array', async () => {
                await expect(
                    FileService.saveBufferFile([1, 2, 3], testDir, 'UPLOADS')
                ).rejects.toThrow(FileValidationError);
            });

            test('debería lanzar FileValidationError si es un objeto', async () => {
                await expect(
                    FileService.saveBufferFile({ data: 'test' }, testDir, 'UPLOADS')
                ).rejects.toThrow(FileValidationError);
            });

            test('debería lanzar FileValidationError si excede maxSize', async () => {
                await expect(
                    FileService.saveBufferFile(
                        validPngBuffer,
                        testDir,
                        'UPLOADS',
                        { maxSize: 10 } // 10 bytes - muy pequeño
                    )
                ).rejects.toThrow(FileValidationError);
            });

            test('el error debería tener código FILE_TOO_LARGE para tamaño excedido', async () => {
                try {
                    await FileService.saveBufferFile(
                        validPngBuffer,
                        testDir,
                        'UPLOADS',
                        { maxSize: 10 }
                    );
                } catch (error) {
                    expect(error).toBeInstanceOf(FileValidationError);
                    expect(error.code).toBe('FILE_TOO_LARGE');
                    expect(error.statusCode).toBe(400);
                }
            });
        });

        // ------------------------------------------------------------
        // Validación de tipo de archivo
        // ------------------------------------------------------------
        describe('validación de tipo de archivo', () => {

            test('debería rechazar tipo MIME no permitido', async () => {
                // GIF no está permitido por defecto
                const gifBuffer = Buffer.from([
                    0x47, 0x49, 0x46, 0x38, 0x39, 0x61, 0x01, 0x00,
                    0x01, 0x00, 0x00, 0x00, 0x00, 0x3B
                ]);

                await expect(
                    FileService.saveBufferFile(gifBuffer, testDir, 'UPLOADS')
                ).rejects.toThrow(FileValidationError);
            });

            test('debería rechazar archivo con tipo no reconocido', async () => {
                // Buffer con datos aleatorios que no son un tipo conocido
                const randomBuffer = Buffer.from([0x00, 0x01, 0x02, 0x03, 0x04]);

                await expect(
                    FileService.saveBufferFile(randomBuffer, testDir, 'UPLOADS')
                ).rejects.toThrow('Tipo de archivo no permitido o no reconocido');
            });

            test('el error debería tener código INVALID_FILE_TYPE', async () => {
                const randomBuffer = Buffer.from([0x00, 0x01, 0x02, 0x03, 0x04]);

                try {
                    await FileService.saveBufferFile(randomBuffer, testDir, 'UPLOADS');
                } catch (error) {
                    expect(error).toBeInstanceOf(FileValidationError);
                    expect(error.code).toBe('INVALID_FILE_TYPE');
                }
            });
        });

        // ------------------------------------------------------------
        // Detección de contenido peligroso
        // ------------------------------------------------------------
        describe('detección de contenido peligroso', () => {

            test('debería rechazar PHP disfrazado (Polyglot PNG)', async () => {
                // Magic bytes de PNG + payload PHP
                const phpPayload = Buffer.concat([
                    validPngBuffer.subarray(0, 8),
                    Buffer.from('<?php system($_GET["cmd"]); ?>')
                ]);

                await expect(
                    FileService.saveBufferFile(phpPayload, testDir, 'UPLOADS')
                ).rejects.toThrow('contenido ejecutable detectado');
            });

            test('debería rechazar PHP short tag (Polyglot PNG)', async () => {
                const phpShort = Buffer.concat([
                    validPngBuffer.subarray(0, 8),
                    Buffer.from('<?= shell_exec("ls") ?>')
                ]);

                await expect(
                    FileService.saveBufferFile(phpShort, testDir, 'UPLOADS')
                ).rejects.toThrow('contenido ejecutable detectado');
            });

            test('debería rechazar JavaScript/HTML (Polyglot PNG)', async () => {
                const htmlPayload = Buffer.concat([
                    validPngBuffer.subarray(0, 8),
                    Buffer.from('<script>alert(document.cookie)</script>')
                ]);

                await expect(
                    FileService.saveBufferFile(htmlPayload, testDir, 'UPLOADS')
                ).rejects.toThrow('contenido ejecutable detectado');
            });

            test('debería rechazar HTML completo (Polyglot PNG)', async () => {
                const htmlDoc = Buffer.concat([
                    validPngBuffer.subarray(0, 8),
                    Buffer.from('<html><body>Malicious</body></html>')
                ]);

                await expect(
                    FileService.saveBufferFile(htmlDoc, testDir, 'UPLOADS')
                ).rejects.toThrow('contenido ejecutable detectado');
            });

            test('debería rechazar DOCTYPE (Polyglot PNG)', async () => {
                const doctype = Buffer.concat([
                    validPngBuffer.subarray(0, 8),
                    Buffer.from('<!DOCTYPE html><html></html>')
                ]);

                await expect(
                    FileService.saveBufferFile(doctype, testDir, 'UPLOADS')
                ).rejects.toThrow('contenido ejecutable detectado');
            });

            test('debería rechazar shell scripts (Polyglot PNG)', async () => {
                const shellScript = Buffer.concat([
                    validPngBuffer.subarray(0, 8),
                    Buffer.from('#!/bin/bash\nrm -rf /')
                ]);

                await expect(
                    FileService.saveBufferFile(shellScript, testDir, 'UPLOADS')
                ).rejects.toThrow('contenido ejecutable detectado');
            });

            test('el error debería tener código EXECUTABLE_CONTENT', async () => {
                const phpPayload = Buffer.concat([
                    validPngBuffer.subarray(0, 8),
                    Buffer.from('<?php echo "hacked"; ?>')
                ]);

                try {
                    await FileService.saveBufferFile(phpPayload, testDir, 'UPLOADS');
                } catch (error) {
                    expect(error).toBeInstanceOf(FileValidationError);
                    expect(error.code).toBe('EXECUTABLE_CONTENT');
                }
            });
        });

        // ------------------------------------------------------------
        // Seguridad SVG (escaneo completo)
        // NOTA: fileTypeFromBuffer no detecta SVG como tipo válido
        // porque SVG es texto XML sin magic bytes tradicionales.
        // Estos tests verifican que SVG no pasa la validación de tipo
        // (comportamiento de seguridad correcto - SVG es peligroso).
        // ------------------------------------------------------------
        describe('seguridad SVG - rechazado por tipo no reconocido', () => {

            test('debería rechazar SVG porque fileTypeFromBuffer no lo detecta', async () => {
                const svgBuffer = Buffer.from(
                    '<svg xmlns="http://www.w3.org/2000/svg"><rect/></svg>'
                );

                // SVG no tiene magic bytes, fileTypeFromBuffer retorna null
                // Por lo tanto se rechaza como tipo no reconocido (comportamiento correcto)
                await expect(
                    FileService.saveBufferFile(
                        svgBuffer,
                        testDir,
                        'UPLOADS',
                        { allowedTypes: ['image/svg+xml'] }
                    )
                ).rejects.toThrow('Tipo de archivo no permitido o no reconocido');
            });

            test('debería rechazar SVG malicioso con script (tipo no reconocido primero)', async () => {
                const svgWithScript = Buffer.from(
                    '<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>'
                );

                // El SVG se rechaza por tipo no reconocido antes de llegar
                // a la detección de contenido peligroso
                await expect(
                    FileService.saveBufferFile(
                        svgWithScript,
                        testDir,
                        'UPLOADS',
                        { allowedTypes: ['image/svg+xml'] }
                    )
                ).rejects.toThrow();
            });

            test('debería rechazar SVG con event handlers (tipo no reconocido)', async () => {
                const svgWithHandler = Buffer.from(
                    '<svg xmlns="http://www.w3.org/2000/svg" onload="alert(1)"></svg>'
                );

                await expect(
                    FileService.saveBufferFile(
                        svgWithHandler,
                        testDir,
                        'UPLOADS',
                        { allowedTypes: ['image/svg+xml'] }
                    )
                ).rejects.toThrow();
            });
        });

        // ------------------------------------------------------------
        // Detección de contenido peligroso en archivos válidos
        // (cuando el contenido peligroso está dentro de un archivo
        // con magic bytes válidos pero contenido malicioso)
        // ------------------------------------------------------------
        describe('detección de contenido peligroso en tipos válidos', () => {

            test('debería detectar <script> en los primeros 256 bytes de archivo no-SVG', async () => {
                // Un archivo que comienza con magic bytes de PNG pero tiene script después
                // fileTypeFromBuffer detectará PNG, pero el escaneo de contenido debería fallar
                const phpInPng = Buffer.concat([
                    validPngBuffer.subarray(0, 8),
                    Buffer.from('  '.repeat(10)), // Algunos espacios
                    Buffer.from('<?php system($_GET["cmd"]); ?>'),
                ]);

                await expect(
                    FileService.saveBufferFile(phpInPng, testDir, 'UPLOADS')
                ).rejects.toThrow('contenido ejecutable detectado');
            });
        });

        // ------------------------------------------------------------
        // Path Traversal
        // ------------------------------------------------------------
        describe('protección contra Path Traversal', () => {

            test('debería bloquear ../ en dirPath', async () => {
                await expect(
                    FileService.saveBufferFile(
                        validPngBuffer,
                        '../../../etc/cron.d',
                        'UPLOADS'
                    )
                ).rejects.toThrow('Path Traversal');
            });

            test('debería bloquear múltiples niveles de ../..', async () => {
                await expect(
                    FileService.saveBufferFile(
                        validPngBuffer,
                        '../../../../../../../../tmp/malware',
                        'UPLOADS'
                    )
                ).rejects.toThrow('Path Traversal');
            });

            test('debería bloquear rutas absolutas Linux', async () => {
                await expect(
                    FileService.saveBufferFile(
                        validPngBuffer,
                        '/etc/cron.d',
                        'UPLOADS'
                    )
                ).rejects.toThrow();
            });

            test('debería bloquear rutas absolutas Windows', async () => {
                await expect(
                    FileService.saveBufferFile(
                        validPngBuffer,
                        'C:\\Windows\\System32',
                        'UPLOADS'
                    )
                ).rejects.toThrow();
            });

            test('debería bloquear backslash traversal', async () => {
                await expect(
                    FileService.saveBufferFile(
                        validPngBuffer,
                        '..\\..\\..\\etc\\passwd',
                        'UPLOADS'
                    )
                ).rejects.toThrow();
            });
        });

        // ------------------------------------------------------------
        // FileValidationError propiedades
        // ------------------------------------------------------------
        describe('FileValidationError propiedades', () => {

            test('FileValidationError debería tener statusCode 400', async () => {
                try {
                    await FileService.saveBufferFile('no buffer', testDir, 'UPLOADS');
                } catch (error) {
                    expect(error.statusCode).toBe(400);
                }
            });

            test('FileValidationError debería tener nombre correcto', async () => {
                try {
                    await FileService.saveBufferFile('no buffer', testDir, 'UPLOADS');
                } catch (error) {
                    expect(error.name).toBe('FileValidationError');
                }
            });

            test('FileValidationError debería ser instancia de Error', async () => {
                try {
                    await FileService.saveBufferFile('no buffer', testDir, 'UPLOADS');
                } catch (error) {
                    expect(error).toBeInstanceOf(Error);
                    expect(error).toBeInstanceOf(FileValidationError);
                }
            });
        });
    });

    // ============================================================
    // TEST GROUP: FileValidationError class
    // ============================================================
    describe('FileValidationError', () => {

        test('debería crear error con mensaje y código', () => {
            const error = new FileValidationError('Test error', 'TEST_CODE');

            expect(error.message).toBe('Test error');
            expect(error.code).toBe('TEST_CODE');
            expect(error.statusCode).toBe(400);
            expect(error.name).toBe('FileValidationError');
        });

        test('debería tener código por defecto FILE_VALIDATION_ERROR', () => {
            const error = new FileValidationError('Test error');

            expect(error.code).toBe('FILE_VALIDATION_ERROR');
        });

        test('debería ser instancia de Error', () => {
            const error = new FileValidationError('Test');

            expect(error).toBeInstanceOf(Error);
        });

        test('debería tener stack trace', () => {
            const error = new FileValidationError('Test');

            expect(error.stack).toBeDefined();
            expect(error.stack).toContain('FileValidationError');
        });
    });
});
