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
 * Tests unitarios para InventariosService.item_in_ordenVaceo
 * 
 * Este método verifica si un item (lote) ya se encuentra en la orden de vaceo actual.
 * Si el item ya está en la orden, lanza un error para evitar procesamientos duplicados/conflictivos.
 */
describe('InventariosService.item_in_ordenVaceo', () => {

    beforeEach(() => {
        jest.clearAllMocks();
    });

    afterEach(() => {
        // Restaurar mocks
        jest.restoreAllMocks();
    });

    // ============================================================
    // TEST GROUP: Casos de Éxito
    // ============================================================
    describe('casos de éxito (item no está en la orden)', () => {

        test('debería retornar true si el itemId NO está en la orden de vaceo', async () => {
            const itemId = 'item-789';
            const mockOrdenVaceo = {
                data: ['item-123', 'item-456']
            };

            jest.spyOn(InventariosHistorialRepository, 'get_ordenVaceo').mockResolvedValue(mockOrdenVaceo);

            const result = await InventariosService.item_in_ordenVaceo(itemId);

            expect(result).toBe(true);
            expect(InventariosHistorialRepository.get_ordenVaceo).toHaveBeenCalledTimes(1);
        });

        test('debería retornar true si la orden de vaceo está vacía', async () => {
            const itemId = 'item-123';
            const mockOrdenVaceo = {
                data: []
            };

            jest.spyOn(InventariosHistorialRepository, 'get_ordenVaceo').mockResolvedValue(mockOrdenVaceo);

            const result = await InventariosService.item_in_ordenVaceo(itemId);

            expect(result).toBe(true);
        });
    });

    // ============================================================
    // TEST GROUP: Casos de Error (Regla de Negocio)
    // ============================================================
    describe('validaciones de regla de negocio', () => {

        test('debería lanzar un error si el itemId ya está en la orden de vaceo', async () => {
            const itemId = 'item-123';
            const mockOrdenVaceo = {
                data: ['item-123', 'item-456']
            };

            jest.spyOn(InventariosHistorialRepository, 'get_ordenVaceo').mockResolvedValue(mockOrdenVaceo);

            await expect(InventariosService.item_in_ordenVaceo(itemId))
                .rejects
                .toThrow('EL lote ya está en la orden de vaceo, no se puede procesar como directo nacional.');
        });

        test('debería detectar el item incluso si en la orden viene como objeto que responde a toString()', async () => {
            // Esto simula cómo mongoose puede retornar ObjectIds
            const itemId = '507f1f77bcf86cd799439011';
            const mockOrdenVaceo = {
                data: [
                    { toString: () => '507f1f77bcf86cd799439011' },
                    { toString: () => '507f191e810c19729de860ea' }
                ]
            };

            jest.spyOn(InventariosHistorialRepository, 'get_ordenVaceo').mockResolvedValue(mockOrdenVaceo);

            await expect(InventariosService.item_in_ordenVaceo(itemId))
                .rejects
                .toThrow('EL lote ya está en la orden de vaceo, no se puede procesar como directo nacional.');
        });
    });

    // ============================================================
    // TEST GROUP: Manejo de Excepciones Técnicas
    // ============================================================
    describe('manejo de errores técnicos', () => {

        test('debería propagar errores si el repositorio falla (ej: error de DB)', async () => {
            const itemId = 'item-123';
            const dbError = new Error('Database connection failed');

            jest.spyOn(InventariosHistorialRepository, 'get_ordenVaceo').mockRejectedValue(dbError);

            await expect(InventariosService.item_in_ordenVaceo(itemId))
                .rejects
                .toThrow('Database connection failed');
        });

        test('debería fallar si ordenVaceo.data es undefined (error de estructura)', async () => {
            const itemId = 'item-123';
            const mockOrdenErronea = {}; // No tiene .data

            jest.spyOn(InventariosHistorialRepository, 'get_ordenVaceo').mockResolvedValue(mockOrdenErronea);

            await expect(InventariosService.item_in_ordenVaceo(itemId))
                .rejects
                .toThrow(); // Lanzará un TypeError: Cannot read properties of undefined (reading 'map')
        });
    });

    // ============================================================
    // TEST GROUP: Seguridad y Parámetros Inválidos
    // ============================================================
    describe('seguridad y parámetros inválidos', () => {

        test('debería lanzar error si itemId es null', async () => {
            const mockOrdenVaceo = { data: ['item-1', 'item-2'] };
            jest.spyOn(InventariosHistorialRepository, 'get_ordenVaceo').mockResolvedValue(mockOrdenVaceo);

            await expect(InventariosService.item_in_ordenVaceo(null))
                .rejects
                .toThrow(`No se proporcionó un item id válido`);
        });

        test('debería lanzar error si itemId es undefined', async () => {
            const mockOrdenVaceo = { data: ['item-1', 'item-2'] };
            jest.spyOn(InventariosHistorialRepository, 'get_ordenVaceo').mockResolvedValue(mockOrdenVaceo);

            await expect(InventariosService.item_in_ordenVaceo(undefined))
                .rejects
                .toThrow(`No se proporcionó un item id válido`);
        });

        test('debería rechazar intentos de NoSQL injection porque no son strings', async () => {
            const maliciousItemId = { $ne: null };
            const mockOrdenVaceo = { data: ['507f1f77bcf86cd799439011'] };

            jest.spyOn(InventariosHistorialRepository, 'get_ordenVaceo').mockResolvedValue(mockOrdenVaceo);

            // Ahora falla por tipo de dato, que es mucho más seguro
            await expect(InventariosService.item_in_ordenVaceo(maliciousItemId))
                .rejects
                .toThrow(`No se proporcionó un item id válido`);
        });

        test('debería rechazar objetos malformados antes de que puedan ejecutar código (prevención de exploits)', async () => {
            const maliciousItemId = { toString: () => { throw new Error('Exploit'); } };
            const mockOrdenVaceo = { data: ['item-1'] };

            jest.spyOn(InventariosHistorialRepository, 'get_ordenVaceo').mockResolvedValue(mockOrdenVaceo);

            // Se bloquea por ser un objeto, el código malicioso en toString() nunca llega a ejecutarse
            await expect(InventariosService.item_in_ordenVaceo(maliciousItemId))
                .rejects
                .toThrow(`No se proporcionó un item id válido`);
        });

        test('debería rechazar un itemId que solo tiene espacios en blanco', async () => {
            const itemId = "   ";
            await expect(InventariosService.item_in_ordenVaceo(itemId))
                .rejects
                .toThrow(`No se proporcionó un item id válido`);
        });

        test('debería lanzar error si el repositorio devuelve null (ordenVaceo no existe)', async () => {
            jest.spyOn(InventariosHistorialRepository, 'get_ordenVaceo').mockResolvedValue(null);

            await expect(InventariosService.item_in_ordenVaceo('id-123'))
                .rejects
                .toThrow(`Error al obtener la orden de vaceo`);
        });

        test('debería funcionar correctamente incluso si la orden de vaceo tiene tipos mezclados', async () => {
            const itemId = '507f1f77bcf86cd799439011';
            const mockOrdenVaceo = {
                data: [
                    null,
                    undefined,
                    123,
                    { toString: () => '507f1f77bcf86cd799439011' } // El que debe detectar
                ]
            };

            jest.spyOn(InventariosHistorialRepository, 'get_ordenVaceo').mockResolvedValue(mockOrdenVaceo);

            await expect(InventariosService.item_in_ordenVaceo(itemId))
                .rejects
                .toThrow('EL lote ya está en la orden de vaceo');
        });
    });

});
