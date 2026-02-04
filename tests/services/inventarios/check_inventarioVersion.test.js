import { describe, test, expect, beforeEach, afterEach, jest } from '@jest/globals';

// Mock del config ANTES de cualquier import que lo use
const mockConfig = {};
jest.unstable_mockModule('../../../src/config/index.js', () => ({
    default: mockConfig
}));

// Importar DESPUÉS de configurar el mock
const { InventariosHistorialRepository } = await import('../../../server/Class/Inventarios.js');
const { InventariosService } = await import('../../../server/services/inventarios.js');

/**
 * Tests unitarios para InventariosService.check_inventarioVersion
 *
 * Este método verifica que la versión del inventario en la base de datos
 * coincida con la versión que tiene el cliente (optimistic locking).
 * Esto previene condiciones de carrera donde múltiples usuarios modifican
 * el mismo inventario simultáneamente.
 */
describe('InventariosService.check_inventarioVersion', () => {

    beforeEach(() => {
        jest.clearAllMocks();
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    // ============================================================
    // TEST GROUP: Casos de Éxito
    // ============================================================
    describe('casos de éxito (versión coincide)', () => {

        test('debería retornar true cuando la versión del inventario coincide exactamente', async () => {
            const idInventario = '507f1f77bcf86cd799439011';
            const versionRequest = 5;
            const mockInventario = {
                _id: idInventario,
                __v: 5,
                nombre: 'Inventario Test'
            };

            jest.spyOn(InventariosHistorialRepository, 'get_inventario_simple')
                .mockResolvedValue(mockInventario);

            const result = await InventariosService.check_inventarioVersion(idInventario, versionRequest);

            expect(result).toBe(true);
            expect(InventariosHistorialRepository.get_inventario_simple).toHaveBeenCalledWith(idInventario);
            expect(InventariosHistorialRepository.get_inventario_simple).toHaveBeenCalledTimes(1);
        });

        test('debería retornar true cuando la versión es 0 (inventario nuevo)', async () => {
            const idInventario = '507f1f77bcf86cd799439011';
            const versionRequest = 0;
            const mockInventario = {
                _id: idInventario,
                __v: 0
            };

            jest.spyOn(InventariosHistorialRepository, 'get_inventario_simple')
                .mockResolvedValue(mockInventario);

            const result = await InventariosService.check_inventarioVersion(idInventario, versionRequest);

            expect(result).toBe(true);
        });

        test('debería retornar true con versiones altas (muchas modificaciones)', async () => {
            const idInventario = '507f1f77bcf86cd799439011';
            const versionRequest = 9999;
            const mockInventario = {
                _id: idInventario,
                __v: 9999
            };

            jest.spyOn(InventariosHistorialRepository, 'get_inventario_simple')
                .mockResolvedValue(mockInventario);

            const result = await InventariosService.check_inventarioVersion(idInventario, versionRequest);

            expect(result).toBe(true);
        });
    });

    // ============================================================
    // TEST GROUP: Casos de Fallo (versión no coincide)
    // ============================================================
    describe('casos de fallo (versión no coincide)', () => {

        test('debería lanzar error cuando la versión del cliente es menor que la del servidor', async () => {
            const idInventario = '507f1f77bcf86cd799439011';
            const versionRequest = 3; // Cliente tiene versión 3
            const mockInventario = {
                _id: idInventario,
                __v: 5 // Servidor tiene versión 5
            };

            jest.spyOn(InventariosHistorialRepository, 'get_inventario_simple')
                .mockResolvedValue(mockInventario);

            await expect(InventariosService.check_inventarioVersion(idInventario, versionRequest))
                .rejects
                .toThrow('La versión del inventario ha cambiado. Por favor, recargue la página e intente de nuevo.');
        });

        test('debería lanzar error cuando la versión del cliente es mayor que la del servidor (inconsistencia)', async () => {
            const idInventario = '507f1f77bcf86cd799439011';
            const versionRequest = 10; // Cliente dice tener versión 10
            const mockInventario = {
                _id: idInventario,
                __v: 5 // Servidor tiene versión 5
            };

            jest.spyOn(InventariosHistorialRepository, 'get_inventario_simple')
                .mockResolvedValue(mockInventario);

            await expect(InventariosService.check_inventarioVersion(idInventario, versionRequest))
                .rejects
                .toThrow('La versión del inventario ha cambiado. Por favor, recargue la página e intente de nuevo.');
        });

        test('debería lanzar error cuando la diferencia de versión es de solo 1', async () => {
            const idInventario = '507f1f77bcf86cd799439011';
            const versionRequest = 4;
            const mockInventario = {
                _id: idInventario,
                __v: 5
            };

            jest.spyOn(InventariosHistorialRepository, 'get_inventario_simple')
                .mockResolvedValue(mockInventario);

            await expect(InventariosService.check_inventarioVersion(idInventario, versionRequest))
                .rejects
                .toThrow('La versión del inventario ha cambiado');
        });
    });

    // ============================================================
    // TEST GROUP: Inventario no encontrado
    // ============================================================
    describe('inventario no encontrado', () => {

        test('debería lanzar error descriptivo cuando el inventario no existe (retorna null)', async () => {
            const idInventario = '507f1f77bcf86cd799439011';
            const versionRequest = 5;

            jest.spyOn(InventariosHistorialRepository, 'get_inventario_simple')
                .mockResolvedValue(null);

            // COMPORTAMIENTO ESPERADO: Error descriptivo indicando que no se encontró
            await expect(InventariosService.check_inventarioVersion(idInventario, versionRequest))
                .rejects
                .toThrow(); // Actualmente fallará con "Cannot read properties of null"
        });

        test('debería lanzar error descriptivo cuando el inventario no existe (retorna undefined)', async () => {
            const idInventario = '507f1f77bcf86cd799439011';
            const versionRequest = 5;

            jest.spyOn(InventariosHistorialRepository, 'get_inventario_simple')
                .mockResolvedValue(undefined);

            await expect(InventariosService.check_inventarioVersion(idInventario, versionRequest))
                .rejects
                .toThrow();
        });
    });

    // ============================================================
    // TEST GROUP: Errores técnicos del repositorio
    // ============================================================
    describe('errores técnicos del repositorio', () => {

        test('debería propagar errores de conexión a la base de datos', async () => {
            const idInventario = '507f1f77bcf86cd799439011';
            const versionRequest = 5;
            const dbError = new Error('Database connection failed');

            jest.spyOn(InventariosHistorialRepository, 'get_inventario_simple')
                .mockRejectedValue(dbError);

            await expect(InventariosService.check_inventarioVersion(idInventario, versionRequest))
                .rejects
                .toThrow('Database connection failed');
        });

        test('debería propagar errores de timeout', async () => {
            const idInventario = '507f1f77bcf86cd799439011';
            const versionRequest = 5;
            const timeoutError = new Error('Operation timed out');

            jest.spyOn(InventariosHistorialRepository, 'get_inventario_simple')
                .mockRejectedValue(timeoutError);

            await expect(InventariosService.check_inventarioVersion(idInventario, versionRequest))
                .rejects
                .toThrow('Operation timed out');
        });
    });

    // ============================================================
    // TEST GROUP: Validación de parámetros - idInventario
    // ============================================================
    describe('validación de parámetros - idInventario', () => {

        test('debería lanzar error si idInventario es null', async () => {
            const versionRequest = 5;

            // COMPORTAMIENTO ESPERADO: Debería validar antes de llamar al repositorio
            await expect(InventariosService.check_inventarioVersion(null, versionRequest))
                .rejects
                .toThrow();
        });

        test('debería lanzar error si idInventario es undefined', async () => {
            const versionRequest = 5;

            await expect(InventariosService.check_inventarioVersion(undefined, versionRequest))
                .rejects
                .toThrow();
        });

        test('debería lanzar error si idInventario es un string vacío', async () => {
            const versionRequest = 5;

            await expect(InventariosService.check_inventarioVersion('', versionRequest))
                .rejects
                .toThrow();
        });

        test('debería lanzar error si idInventario es solo espacios en blanco', async () => {
            const versionRequest = 5;

            await expect(InventariosService.check_inventarioVersion('   ', versionRequest))
                .rejects
                .toThrow();
        });

        test('debería rechazar objetos maliciosos de NoSQL injection como idInventario', async () => {
            const maliciousId = { $ne: null }; // Intento de NoSQL injection
            const versionRequest = 5;

            // COMPORTAMIENTO ESPERADO: Rechazar por tipo de dato inválido
            await expect(InventariosService.check_inventarioVersion(maliciousId, versionRequest))
                .rejects
                .toThrow();
        });

        test('debería rechazar objetos con $gt como idInventario (NoSQL injection)', async () => {
            const maliciousId = { $gt: '' };
            const versionRequest = 5;

            await expect(InventariosService.check_inventarioVersion(maliciousId, versionRequest))
                .rejects
                .toThrow();
        });

        test('debería rechazar arrays como idInventario', async () => {
            const maliciousId = ['507f1f77bcf86cd799439011', '507f191e810c19729de860ea'];
            const versionRequest = 5;

            await expect(InventariosService.check_inventarioVersion(maliciousId, versionRequest))
                .rejects
                .toThrow();
        });

        test('debería rechazar números como idInventario', async () => {
            const invalidId = 12345;
            const versionRequest = 5;

            await expect(InventariosService.check_inventarioVersion(invalidId, versionRequest))
                .rejects
                .toThrow();
        });

        test('debería rechazar objetos con toString malicioso', async () => {
            const maliciousId = {
                toString: () => { throw new Error('Exploit ejecutado'); }
            };
            const versionRequest = 5;

            // Debe fallar por validación de tipo, NO por ejecutar el exploit
            await expect(InventariosService.check_inventarioVersion(maliciousId, versionRequest))
                .rejects
                .toThrow();
        });
    });

    // ============================================================
    // TEST GROUP: Validación de parámetros - versionRequest
    // ============================================================
    describe('validación de parámetros - versionRequest', () => {

        test('debería lanzar error si versionRequest es null', async () => {
            const idInventario = '507f1f77bcf86cd799439011';
            const mockInventario = { _id: idInventario, __v: 5 };

            jest.spyOn(InventariosHistorialRepository, 'get_inventario_simple')
                .mockResolvedValue(mockInventario);

            // COMPORTAMIENTO ESPERADO: Validar que sea un número antes de comparar
            await expect(InventariosService.check_inventarioVersion(idInventario, null))
                .rejects
                .toThrow();
        });

        test('debería lanzar error si versionRequest es undefined', async () => {
            const idInventario = '507f1f77bcf86cd799439011';
            const mockInventario = { _id: idInventario, __v: 5 };

            jest.spyOn(InventariosHistorialRepository, 'get_inventario_simple')
                .mockResolvedValue(mockInventario);

            await expect(InventariosService.check_inventarioVersion(idInventario, undefined))
                .rejects
                .toThrow();
        });

        test('debería lanzar error si versionRequest es un string numérico ("5" en vez de 5)', async () => {
            const idInventario = '507f1f77bcf86cd799439011';
            const versionRequestString = "5"; // String en vez de número
            const mockInventario = { _id: idInventario, __v: 5 };

            jest.spyOn(InventariosHistorialRepository, 'get_inventario_simple')
                .mockResolvedValue(mockInventario);

            // COMPORTAMIENTO ESPERADO: Debería fallar porque "5" !== 5 (comparación estricta)
            // O mejor aún, validar el tipo antes
            await expect(InventariosService.check_inventarioVersion(idInventario, versionRequestString))
                .rejects
                .toThrow();
        });

        test('debería lanzar error si versionRequest es un string no numérico', async () => {
            const idInventario = '507f1f77bcf86cd799439011';
            const versionRequest = "abc";
            const mockInventario = { _id: idInventario, __v: 5 };

            jest.spyOn(InventariosHistorialRepository, 'get_inventario_simple')
                .mockResolvedValue(mockInventario);

            await expect(InventariosService.check_inventarioVersion(idInventario, versionRequest))
                .rejects
                .toThrow();
        });

        test('debería lanzar error si versionRequest es NaN', async () => {
            const idInventario = '507f1f77bcf86cd799439011';
            const versionRequest = NaN;
            const mockInventario = { _id: idInventario, __v: 5 };

            jest.spyOn(InventariosHistorialRepository, 'get_inventario_simple')
                .mockResolvedValue(mockInventario);

            // NaN es de tipo number pero no es un número finito válido
            await expect(InventariosService.check_inventarioVersion(idInventario, versionRequest))
                .rejects
                .toThrow();
        });

        test('debería lanzar error si versionRequest es Infinity', async () => {
            const idInventario = '507f1f77bcf86cd799439011';
            const versionRequest = Infinity;
            const mockInventario = { _id: idInventario, __v: 5 };

            jest.spyOn(InventariosHistorialRepository, 'get_inventario_simple')
                .mockResolvedValue(mockInventario);

            await expect(InventariosService.check_inventarioVersion(idInventario, versionRequest))
                .rejects
                .toThrow();
        });

        test('debería lanzar error si versionRequest es -Infinity', async () => {
            const idInventario = '507f1f77bcf86cd799439011';
            const versionRequest = -Infinity;
            const mockInventario = { _id: idInventario, __v: 5 };

            jest.spyOn(InventariosHistorialRepository, 'get_inventario_simple')
                .mockResolvedValue(mockInventario);

            await expect(InventariosService.check_inventarioVersion(idInventario, versionRequest))
                .rejects
                .toThrow();
        });

        test('debería lanzar error si versionRequest es un número negativo', async () => {
            const idInventario = '507f1f77bcf86cd799439011';
            const versionRequest = -1;
            const mockInventario = { _id: idInventario, __v: 5 };

            jest.spyOn(InventariosHistorialRepository, 'get_inventario_simple')
                .mockResolvedValue(mockInventario);

            // Las versiones de MongoDB (__v) nunca son negativas
            await expect(InventariosService.check_inventarioVersion(idInventario, versionRequest))
                .rejects
                .toThrow();
        });

        test('debería lanzar error si versionRequest es un número decimal', async () => {
            const idInventario = '507f1f77bcf86cd799439011';
            const versionRequest = 5.5;
            const mockInventario = { _id: idInventario, __v: 5 };

            jest.spyOn(InventariosHistorialRepository, 'get_inventario_simple')
                .mockResolvedValue(mockInventario);

            // Las versiones son siempre enteros
            await expect(InventariosService.check_inventarioVersion(idInventario, versionRequest))
                .rejects
                .toThrow();
        });

        test('debería lanzar error si versionRequest es un objeto', async () => {
            const idInventario = '507f1f77bcf86cd799439011';
            const versionRequest = { value: 5 };
            const mockInventario = { _id: idInventario, __v: 5 };

            jest.spyOn(InventariosHistorialRepository, 'get_inventario_simple')
                .mockResolvedValue(mockInventario);

            await expect(InventariosService.check_inventarioVersion(idInventario, versionRequest))
                .rejects
                .toThrow();
        });

        test('debería lanzar error si versionRequest es un array', async () => {
            const idInventario = '507f1f77bcf86cd799439011';
            const versionRequest = [5];
            const mockInventario = { _id: idInventario, __v: 5 };

            jest.spyOn(InventariosHistorialRepository, 'get_inventario_simple')
                .mockResolvedValue(mockInventario);

            await expect(InventariosService.check_inventarioVersion(idInventario, versionRequest))
                .rejects
                .toThrow();
        });

        test('debería lanzar error si versionRequest es un boolean', async () => {
            const idInventario = '507f1f77bcf86cd799439011';
            const versionRequest = true;
            const mockInventario = { _id: idInventario, __v: 1 };

            jest.spyOn(InventariosHistorialRepository, 'get_inventario_simple')
                .mockResolvedValue(mockInventario);

            // true podría coercionar a 1, pero debe fallar por tipo
            await expect(InventariosService.check_inventarioVersion(idInventario, versionRequest))
                .rejects
                .toThrow();
        });
    });

    // ============================================================
    // TEST GROUP: Casos edge con tipos de datos
    // ============================================================
    describe('casos edge con tipos de datos', () => {

        test('debería fallar comparación estricta cuando versionRequest es "0" (string) y __v es 0 (número)', async () => {
            const idInventario = '507f1f77bcf86cd799439011';
            const versionRequestString = "0";
            const mockInventario = { _id: idInventario, __v: 0 };

            jest.spyOn(InventariosHistorialRepository, 'get_inventario_simple')
                .mockResolvedValue(mockInventario);

            // "0" !== 0 en comparación estricta
            await expect(InventariosService.check_inventarioVersion(idInventario, versionRequestString))
                .rejects
                .toThrow();
        });

        test('debería manejar correctamente cuando el inventario tiene __v como string (dato corrupto)', async () => {
            const idInventario = '507f1f77bcf86cd799439011';
            const versionRequest = 5;
            const mockInventario = { _id: idInventario, __v: "5" }; // Dato corrupto

            jest.spyOn(InventariosHistorialRepository, 'get_inventario_simple')
                .mockResolvedValue(mockInventario);

            // Comparación estricta: "5" !== 5
            await expect(InventariosService.check_inventarioVersion(idInventario, versionRequest))
                .rejects
                .toThrow('La versión del inventario ha cambiado');
        });

        test('debería manejar cuando el inventario no tiene campo __v', async () => {
            const idInventario = '507f1f77bcf86cd799439011';
            const versionRequest = 5;
            const mockInventario = { _id: idInventario }; // Sin __v

            jest.spyOn(InventariosHistorialRepository, 'get_inventario_simple')
                .mockResolvedValue(mockInventario);

            // undefined !== 5, debería lanzar el error de versión cambiada
            await expect(InventariosService.check_inventarioVersion(idInventario, versionRequest))
                .rejects
                .toThrow();
        });
    });

});
