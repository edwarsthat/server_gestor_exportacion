import { describe, test, expect, beforeEach, afterEach, jest } from '@jest/globals';

// Mock de db y config antes de importar la clase
// El código real hace `await db.InventariosSimples.findOne(...).lean()`
// sin llamar a `.exec()`, así que `.lean()` debe resolver directamente el documento.
const mockLean = jest.fn();
const mockFindOne = jest.fn(() => ({ lean: mockLean }));

jest.unstable_mockModule('../../DB/mongoDB/config/init.js', () => ({
    db: {
        InventariosSimples: {
            findOne: mockFindOne
        }
    }
}));

jest.unstable_mockModule('../../src/config/index.js', () => ({
    default: {
        INVENTARIO_FRUTA_SIN_PROCESAR: 'test-inventario-id-123'
    }
}));

// Importar después de los mocks
const { InventariosHistorialRepository } = await import('../../server/Class/Inventarios.js');
const { ConnectionDBError } = await import('../../Error/ConnectionErrors.js');

/**
 * Tests unitarios para InventariosHistorialRepository.get_item_frutaSinProcesar
 *
 * Este método busca un ítem de lote en el inventario de fruta sin procesar,
 * verificando tanto inventario propio como maquila.
 *
 * Responsabilidades:
 * 1. Validar parámetro id
 * 2. Buscar en inventario propio y maquila
 * 3. Detectar conflictos de integridad (lote duplicado)
 * 4. Manejar errores de BD vs errores de lógica de negocio
 */
describe('InventariosHistorialRepository.get_item_frutaSinProcesar', () => {

    // ============================================================
    // SETUP: Datos de prueba
    // ============================================================
    let mockItemPropio;
    let mockItemMaquila;
    let mockDocumento;

    beforeEach(() => {
        jest.clearAllMocks();

        mockItemPropio = {
            lote: '507f1f77bcf86cd799439011',
            kilos: 100,
            tipoFruta: 'Naranja'
        };

        mockItemMaquila = {
            lote: '507f1f77bcf86cd799439012',
            kilos: 200,
            tipoFruta: 'Limón'
        };

        mockDocumento = {
            _id: 'test-inventario-id-123',
            inventario: [mockItemPropio],
            inventarioMaquila: [mockItemMaquila]
        };

        // Default: documento existe con ambos inventarios
        mockLean.mockResolvedValue(mockDocumento);
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    // ============================================================
    // TEST GROUP: Casos básicos de funcionamiento
    // ============================================================
    describe('casos básicos', () => {

        test('debería retornar item de inventario propio cuando existe', async () => {
            const result = await InventariosHistorialRepository.get_item_frutaSinProcesar('507f1f77bcf86cd799439011');

            expect(result).toEqual(mockItemPropio);
        });

        test('debería retornar item de inventarioMaquila cuando existe', async () => {
            const result = await InventariosHistorialRepository.get_item_frutaSinProcesar('507f1f77bcf86cd799439012');

            expect(result).toEqual(mockItemMaquila);
        });

        test('debería lanzar error cuando lote no existe en ningún inventario', async () => {
            await expect(InventariosHistorialRepository.get_item_frutaSinProcesar('id-inexistente'))
                .rejects
                .toThrow('El lote id-inexistente no existe en el inventario de fruta sin procesar');
        });
    });

    // ============================================================
    // TEST GROUP: Validación de parámetros
    // ============================================================
    describe('validación de parámetros', () => {

        test('debería lanzar error con id null', async () => {
            await expect(InventariosHistorialRepository.get_item_frutaSinProcesar(null))
                .rejects
                .toThrow('El parámetro id es requerido');
        });

        test('debería lanzar error con id undefined', async () => {
            await expect(InventariosHistorialRepository.get_item_frutaSinProcesar(undefined))
                .rejects
                .toThrow('El parámetro id es requerido');
        });

        test('debería lanzar error con id string vacío', async () => {
            await expect(InventariosHistorialRepository.get_item_frutaSinProcesar(''))
                .rejects
                .toThrow('El parámetro id es requerido');
        });
    });

    // ============================================================
    // TEST GROUP: Validación de documento
    // ============================================================
    describe('validación de documento', () => {

        test('debería lanzar ConnectionDBError cuando documento no existe', async () => {
            mockLean.mockResolvedValue(null);

            await expect(InventariosHistorialRepository.get_item_frutaSinProcesar('123'))
                .rejects
                .toThrow(ConnectionDBError);

            await expect(InventariosHistorialRepository.get_item_frutaSinProcesar('123'))
                .rejects
                .toThrow('No se encontró el documento de inventario de fruta sin procesar');
        });
    });

    // ============================================================
    // TEST GROUP: Validación de arrays
    // ============================================================
    describe('validación de arrays', () => {

        test('debería manejar inventario null', async () => {
            mockDocumento.inventario = null;
            mockLean.mockResolvedValue(mockDocumento);

            const result = await InventariosHistorialRepository.get_item_frutaSinProcesar('507f1f77bcf86cd799439012');

            expect(result).toEqual(mockItemMaquila);
        });

        test('debería manejar inventarioMaquila undefined', async () => {
            mockDocumento.inventarioMaquila = undefined;
            mockLean.mockResolvedValue(mockDocumento);

            const result = await InventariosHistorialRepository.get_item_frutaSinProcesar('507f1f77bcf86cd799439011');

            expect(result).toEqual(mockItemPropio);
        });

        test('debería manejar inventario como objeto {}', async () => {
            mockDocumento.inventario = {};
            mockLean.mockResolvedValue(mockDocumento);

            const result = await InventariosHistorialRepository.get_item_frutaSinProcesar('507f1f77bcf86cd799439012');

            expect(result).toEqual(mockItemMaquila);
        });

        test('debería manejar inventario como string', async () => {
            mockDocumento.inventario = 'invalid';
            mockLean.mockResolvedValue(mockDocumento);

            const result = await InventariosHistorialRepository.get_item_frutaSinProcesar('507f1f77bcf86cd799439012');

            expect(result).toEqual(mockItemMaquila);
        });

        test('debería lanzar error cuando ambos inventarios son inválidos y lote no existe', async () => {
            mockDocumento.inventario = null;
            mockDocumento.inventarioMaquila = {};
            mockLean.mockResolvedValue(mockDocumento);

            await expect(InventariosHistorialRepository.get_item_frutaSinProcesar('123'))
                .rejects
                .toThrow('El lote 123 no existe en el inventario de fruta sin procesar');
        });
    });

    // ============================================================
    // TEST GROUP: Detección de conflictos
    // ============================================================
    describe('detección de conflictos', () => {

        test('debería lanzar error cuando lote existe en ambos inventarios', async () => {
            // Mismo lote en ambos inventarios
            const loteCompartido = '507f1f77bcf86cd799439099';
            mockDocumento.inventario = [{ lote: loteCompartido, kilos: 100 }];
            mockDocumento.inventarioMaquila = [{ lote: loteCompartido, kilos: 200 }];
            mockLean.mockResolvedValue(mockDocumento);

            await expect(InventariosHistorialRepository.get_item_frutaSinProcesar(loteCompartido))
                .rejects
                .toThrow(`Conflicto de integridad: El lote ${loteCompartido} aparece en inventario propio y maquila simultáneamente`);
        });

        test('error de conflicto NO debería ser ConnectionDBError', async () => {
            const loteCompartido = '507f1f77bcf86cd799439099';
            mockDocumento.inventario = [{ lote: loteCompartido, kilos: 100 }];
            mockDocumento.inventarioMaquila = [{ lote: loteCompartido, kilos: 200 }];
            mockLean.mockResolvedValue(mockDocumento);

            try {
                await InventariosHistorialRepository.get_item_frutaSinProcesar(loteCompartido);
                expect(true).toBe(false); // No debería llegar aquí
            } catch (err) {
                expect(err).not.toBeInstanceOf(ConnectionDBError);
                expect(err.message).toContain('Conflicto de integridad');
            }
        });
    });

    // ============================================================
    // TEST GROUP: Edge cases / Seguridad
    // ============================================================
    describe('edge cases y seguridad', () => {

        test('debería manejar items con lote null en array', async () => {
            mockDocumento.inventario = [
                { lote: null, kilos: 50 },
                mockItemPropio
            ];
            mockLean.mockResolvedValue(mockDocumento);

            const result = await InventariosHistorialRepository.get_item_frutaSinProcesar('507f1f77bcf86cd799439011');

            expect(result).toEqual(mockItemPropio);
        });

        test('debería manejar items con lote undefined en array', async () => {
            mockDocumento.inventario = [
                { kilos: 50 }, // lote undefined
                mockItemPropio
            ];
            mockLean.mockResolvedValue(mockDocumento);

            const result = await InventariosHistorialRepository.get_item_frutaSinProcesar('507f1f77bcf86cd799439011');

            expect(result).toEqual(mockItemPropio);
        });

        test('debería funcionar con ObjectId-like objeto como id', async () => {
            // Simular un ObjectId con método toString()
            const objectIdLike = {
                toString: () => '507f1f77bcf86cd799439011'
            };

            const result = await InventariosHistorialRepository.get_item_frutaSinProcesar(objectIdLike);

            expect(result).toEqual(mockItemPropio);
        });

        test('debería funcionar con string como id', async () => {
            const result = await InventariosHistorialRepository.get_item_frutaSinProcesar('507f1f77bcf86cd799439011');

            expect(result).toEqual(mockItemPropio);
        });

        test('debería funcionar con número como id', async () => {
            mockDocumento.inventario = [{ lote: 12345, kilos: 100 }];
            mockLean.mockResolvedValue(mockDocumento);

            const result = await InventariosHistorialRepository.get_item_frutaSinProcesar(12345);

            expect(result).toEqual({ lote: 12345, kilos: 100 });
        });

        test('error de lote no encontrado NO debería ser ConnectionDBError', async () => {
            try {
                await InventariosHistorialRepository.get_item_frutaSinProcesar('id-inexistente');
                expect(true).toBe(false); // No debería llegar aquí
            } catch (err) {
                expect(err).not.toBeInstanceOf(ConnectionDBError);
                expect(err.message).toContain('no existe en el inventario');
            }
        });
    });

    // ============================================================
    // TEST GROUP: Manejo de errores de BD
    // ============================================================
    describe('manejo de errores de BD', () => {

        test('debería envolver errores de BD en ConnectionDBError', async () => {
            mockLean.mockRejectedValue(new Error('MongoDB connection failed'));

            await expect(InventariosHistorialRepository.get_item_frutaSinProcesar('123'))
                .rejects
                .toThrow(ConnectionDBError);

            await expect(InventariosHistorialRepository.get_item_frutaSinProcesar('123'))
                .rejects
                .toThrow('Error obteniendo el lote del inventario: MongoDB connection failed');
        });

        test('debería manejar error de BD sin mensaje', async () => {
            mockLean.mockRejectedValue({ code: 'ECONNREFUSED' });

            await expect(InventariosHistorialRepository.get_item_frutaSinProcesar('123'))
                .rejects
                .toThrow(ConnectionDBError);
        });

        test('debería manejar error de BD null', async () => {
            mockLean.mockRejectedValue(null);

            await expect(InventariosHistorialRepository.get_item_frutaSinProcesar('123'))
                .rejects
                .toThrow(ConnectionDBError);
        });
    });

    // ============================================================
    // TEST GROUP: Contrato de API
    // ============================================================
    describe('contrato de API', () => {

        test('debería usar config.INVENTARIO_FRUTA_SIN_PROCESAR como ID', async () => {
            await InventariosHistorialRepository.get_item_frutaSinProcesar('507f1f77bcf86cd799439011');

            expect(mockFindOne).toHaveBeenCalledWith({ _id: 'test-inventario-id-123' });
        });

        test('debería usar lean() para mejor performance', async () => {
            await InventariosHistorialRepository.get_item_frutaSinProcesar('507f1f77bcf86cd799439011');

            expect(mockLean).toHaveBeenCalled();
        });

        test('debería llamar lean() sin argumentos para obtener un objeto plano', async () => {
            await InventariosHistorialRepository.get_item_frutaSinProcesar('507f1f77bcf86cd799439011');

            expect(mockLean).toHaveBeenCalledWith();
        });
    });
});
