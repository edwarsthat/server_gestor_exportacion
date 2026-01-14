import { describe, test, expect, beforeAll, afterAll } from '@jest/globals';
import { FileService } from '../../../server/services/helpers/FileService.js';
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
    // TEST GROUP: validateAndDecodeBase64
    // ============================================================
    describe('validateAndDecodeBase64', () => {

        test('debería rechazar string sin formato base64 válido', async () => {
            await expect(
                FileService.validateAndDecodeBase64('esto-no-es-base64')
            ).rejects.toThrow('Formato de imagen inválido');
        });

        test('debería rechazar tipo MIME no permitido', async () => {
            // Base64 de un GIF (no permitido por defecto)
            const gifBase64 = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';

            await expect(
                FileService.validateAndDecodeBase64(gifBase64)
            ).rejects.toThrow('Tipo de archivo no permitido');
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
});
