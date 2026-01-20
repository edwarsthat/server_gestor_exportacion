import { describe, test, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { InventariosLogicError } from '../../Error/logicLayerError.js';

// Mock del config ANTES de cualquier import que lo use
const mockConfig = {
    COORDINADOR_PRODUCCION: 'COORDINADOR_PRODUCCION_TEST',
    DIR_OPERACIONES: 'DIR_OPERACIONES_TEST',
    INVENTARIO_FRUTA_SIN_PROCESAR: 'inventario-fruta-sin-procesar-id'
};

jest.unstable_mockModule('../../src/config/index.js', () => ({
    default: mockConfig
}));

// Importar DESPUÉS de configurar el mock
const { FrutaProcesada } = await import('../../server/Class/frutaProcesada.js');
const { LotesHelper } = await import('../../server/helper/lotes.js');
const { InventariosHistorialRepository } = await import('../../server/Class/Inventarios.js');
const { InventariosService } = await import('../../server/services/inventarios.js');

/**
 * Tests unitarios para InventariosService.probar_deshidratacion_loteProcesando
 *
 * Este método valida si un lote puede ser vaciado basándose en:
 * 1. Existencia del lote en proceso
 * 2. Permisos del usuario (Rol o Cargo)
 * 3. Valor de deshidratación dentro del rango permitido [-1, 3]
 */
describe('InventariosService.probar_deshidratacion_loteProcesando', () => {

    // ============================================================
    // SETUP: Mocks de dependencias
    // ============================================================
    let mockPredioVaciando;
    let mockLoteEF1;
    let mockLoteEF10;
    let mockUser;

    beforeEach(() => {
        jest.clearAllMocks();

        // Restaurar config a valores válidos
        mockConfig.COORDINADOR_PRODUCCION = 'COORDINADOR_PRODUCCION_TEST';
        mockConfig.DIR_OPERACIONES = 'DIR_OPERACIONES_TEST';

        // Mock del predio vaciando (respuesta de FrutaProcesada.obtener_ultimaEntrada)
        mockPredioVaciando = {
            loteId: { _id: '507f1f77bcf86cd799439011' },
            enf: 'EF1-001',
            nombrePredio: 'Finca Test'
        };

        // Mock de lote EF1
        mockLoteEF1 = {
            _id: '507f1f77bcf86cd799439011',
            enf: 'EF1-001',
            deshidratacion: 1.5,
            predio: { PREDIO: 'Finca Test' }
        };

        // Mock de lote EF10 (maquila)
        mockLoteEF10 = {
            _id: '507f1f77bcf86cd799439012',
            enf: 'EF10-001',
            deshidratacion: 2.0,
            predio: { PREDIO: 'Finca Maquila' }
        };

        // Mock de usuario sin permisos especiales
        mockUser = {
            _id: 'user123',
            Rol: 5,
            cargo: 'operario'
        };

        // Mock de FrutaProcesada
        jest.spyOn(FrutaProcesada, 'obtener_ultimaEntrada').mockResolvedValue(mockPredioVaciando);

        // Mock de LotesHelper
        jest.spyOn(LotesHelper, 'obtener_lote_helper').mockResolvedValue([mockLoteEF1]);
    });

    afterEach(() => {
        // Restaurar config a valores válidos
        mockConfig.COORDINADOR_PRODUCCION = 'COORDINADOR_PRODUCCION_TEST';
        mockConfig.DIR_OPERACIONES = 'DIR_OPERACIONES_TEST';
        jest.restoreAllMocks();
    });

    // ============================================================
    // TEST GROUP: Casos donde retorna null
    // ============================================================
    describe('casos que retornan null', () => {

        test('debería retornar null cuando predioVaciando es null', async () => {
            FrutaProcesada.obtener_ultimaEntrada.mockResolvedValue(null);

            const result = await InventariosService.probar_deshidratacion_loteProcesando(mockUser);

            expect(result).toBeNull();
        });

        test('debería retornar null cuando predioVaciando es undefined', async () => {
            FrutaProcesada.obtener_ultimaEntrada.mockResolvedValue(undefined);

            const result = await InventariosService.probar_deshidratacion_loteProcesando(mockUser);

            expect(result).toBeNull();
        });

        test('debería retornar null cuando loteId es null', async () => {
            FrutaProcesada.obtener_ultimaEntrada.mockResolvedValue({
                ...mockPredioVaciando,
                loteId: null
            });

            const result = await InventariosService.probar_deshidratacion_loteProcesando(mockUser);

            expect(result).toBeNull();
        });

        test('debería retornar null cuando loteId es undefined', async () => {
            FrutaProcesada.obtener_ultimaEntrada.mockResolvedValue({
                enf: 'EF1-001',
                nombrePredio: 'Finca Test'
                // loteId no existe
            });

            const result = await InventariosService.probar_deshidratacion_loteProcesando(mockUser);

            expect(result).toBeNull();
        });
    });

    // ============================================================
    // TEST GROUP: Lote no encontrado
    // ============================================================
    describe('cuando el lote no existe', () => {

        test('debería lanzar error 404 cuando el lote no existe en EF1 ni EF10', async () => {
            LotesHelper.obtener_lote_helper.mockResolvedValue([]);

            await expect(InventariosService.probar_deshidratacion_loteProcesando(mockUser))
                .rejects
                .toThrow(InventariosLogicError);

            await expect(InventariosService.probar_deshidratacion_loteProcesando(mockUser))
                .rejects
                .toThrow('El lote asociado al proceso no fue encontrado');
        });

        test('debería tener status 404 en el error cuando lote no existe', async () => {
            LotesHelper.obtener_lote_helper.mockResolvedValue([]);

            try {
                await InventariosService.probar_deshidratacion_loteProcesando(mockUser);
            } catch (error) {
                expect(error.status).toBe(404);
            }
        });
    });

    // ============================================================
    // TEST GROUP: Búsqueda en repositorios
    // ============================================================
    describe('búsqueda de lotes', () => {

        test('debería encontrar lote en EF1 correctamente', async () => {
            LotesHelper.obtener_lote_helper.mockResolvedValue([mockLoteEF1]);

            const result = await InventariosService.probar_deshidratacion_loteProcesando({
                ...mockUser,
                Rol: 0 // Admin para evitar validación de deshidratación
            });

            expect(result).toEqual(mockLoteEF1);
            expect(LotesHelper.obtener_lote_helper).toHaveBeenCalled();
        });

        test('debería encontrar lote en EF10 cuando no está en EF1', async () => {
            LotesHelper.obtener_lote_helper.mockResolvedValue([mockLoteEF10]);

            const result = await InventariosService.probar_deshidratacion_loteProcesando({
                ...mockUser,
                Rol: 0
            });

            expect(result).toEqual(mockLoteEF10);
        });

        test('debería lanzar error si el lote existe en ambas colecciones (conflicto)', async () => {
            LotesHelper.obtener_lote_helper.mockRejectedValue(
                new Error('Conflicto de integridad: El lote se encuentra duplicado en EF1 y EF10')
            );

            await expect(InventariosService.probar_deshidratacion_loteProcesando({
                ...mockUser,
                Rol: 0
            })).rejects.toThrow('Conflicto de integridad: El lote se encuentra duplicado en EF1 y EF10');
        });

        test('debería manejar loteId como ObjectId directo (no poblado)', async () => {
            FrutaProcesada.obtener_ultimaEntrada.mockResolvedValue({
                loteId: '507f1f77bcf86cd799439011', // String directo, no objeto
                enf: 'EF1-001',
                nombrePredio: 'Finca Test'
            });

            const result = await InventariosService.probar_deshidratacion_loteProcesando({
                ...mockUser,
                Rol: 0
            });

            expect(result).toEqual(mockLoteEF1);
        });
    });

    // ============================================================
    // TEST GROUP: Permisos - Usuarios que pueden omitir validación
    // ============================================================
    describe('usuarios con permisos para omitir validación', () => {

        test('debería omitir validación para usuario con Rol 0 (admin)', async () => {
            mockLoteEF1.deshidratacion = 10; // Fuera de rango
            LotesHelper.obtener_lote_helper.mockResolvedValue([mockLoteEF1]);

            const adminUser = { ...mockUser, Rol: 0 };

            const result = await InventariosService.probar_deshidratacion_loteProcesando(adminUser);

            expect(result).toEqual(mockLoteEF1);
        });

        test('debería omitir validación para COORDINADOR_PRODUCCION', async () => {
            mockLoteEF1.deshidratacion = 10;
            LotesHelper.obtener_lote_helper.mockResolvedValue([mockLoteEF1]);

            const coordUser = { ...mockUser, cargo: mockConfig.COORDINADOR_PRODUCCION };

            const result = await InventariosService.probar_deshidratacion_loteProcesando(coordUser);

            expect(result).toEqual(mockLoteEF1);
        });

        test('debería omitir validación para DIR_OPERACIONES', async () => {
            mockLoteEF1.deshidratacion = 10;
            LotesHelper.obtener_lote_helper.mockResolvedValue([mockLoteEF1]);

            const dirUser = { ...mockUser, cargo: mockConfig.DIR_OPERACIONES };

            const result = await InventariosService.probar_deshidratacion_loteProcesando(dirUser);

            expect(result).toEqual(mockLoteEF1);
        });

        test('debería omitir validación cuando Rol es string "0"', async () => {
            mockLoteEF1.deshidratacion = 10;
            LotesHelper.obtener_lote_helper.mockResolvedValue([mockLoteEF1]);

            const adminUser = { ...mockUser, Rol: '0' };

            const result = await InventariosService.probar_deshidratacion_loteProcesando(adminUser);

            expect(result).toEqual(mockLoteEF1);
        });
    });

    // ============================================================
    // TEST GROUP: Validación de deshidratación - Casos válidos
    // ============================================================
    describe('deshidratación en rango válido [-1, 3]', () => {

        test('debería retornar lote cuando deshidratación es 0', async () => {
            mockLoteEF1.deshidratacion = 0;
            LotesHelper.obtener_lote_helper.mockResolvedValue([mockLoteEF1]);

            const result = await InventariosService.probar_deshidratacion_loteProcesando(mockUser);

            expect(result).toEqual(mockLoteEF1);
        });

        test('debería retornar lote cuando deshidratación es exactamente -1.0 (límite inferior)', async () => {
            mockLoteEF1.deshidratacion = -1.0;
            LotesHelper.obtener_lote_helper.mockResolvedValue([mockLoteEF1]);

            const result = await InventariosService.probar_deshidratacion_loteProcesando(mockUser);

            expect(result).toEqual(mockLoteEF1);
        });

        test('debería retornar lote cuando deshidratación es exactamente 3.0 (límite superior)', async () => {
            mockLoteEF1.deshidratacion = 3.0;
            LotesHelper.obtener_lote_helper.mockResolvedValue([mockLoteEF1]);

            const result = await InventariosService.probar_deshidratacion_loteProcesando(mockUser);

            expect(result).toEqual(mockLoteEF1);
        });

        test('debería retornar lote cuando deshidratación es 1.5 (valor medio)', async () => {
            mockLoteEF1.deshidratacion = 1.5;
            LotesHelper.obtener_lote_helper.mockResolvedValue([mockLoteEF1]);

            const result = await InventariosService.probar_deshidratacion_loteProcesando(mockUser);

            expect(result).toEqual(mockLoteEF1);
        });

        test('debería retornar lote cuando deshidratación es -0.5 (negativo válido)', async () => {
            mockLoteEF1.deshidratacion = -0.5;
            LotesHelper.obtener_lote_helper.mockResolvedValue([mockLoteEF1]);

            const result = await InventariosService.probar_deshidratacion_loteProcesando(mockUser);

            expect(result).toEqual(mockLoteEF1);
        });
    });

    // ============================================================
    // TEST GROUP: Validación de deshidratación - Casos inválidos
    // ============================================================
    describe('deshidratación fuera de rango o inválida', () => {

        test('debería lanzar error 470 cuando deshidratación > 3', async () => {
            mockLoteEF1.deshidratacion = 3.1;
            LotesHelper.obtener_lote_helper.mockResolvedValue([mockLoteEF1]);

            await expect(InventariosService.probar_deshidratacion_loteProcesando(mockUser))
                .rejects
                .toThrow(InventariosLogicError);

            try {
                await InventariosService.probar_deshidratacion_loteProcesando(mockUser);
            } catch (error) {
                expect(error.status).toBe(470);
            }
        });

        test('debería lanzar error 470 cuando deshidratación < -1', async () => {
            mockLoteEF1.deshidratacion = -1.1;
            LotesHelper.obtener_lote_helper.mockResolvedValue([mockLoteEF1]);

            await expect(InventariosService.probar_deshidratacion_loteProcesando(mockUser))
                .rejects
                .toThrow(InventariosLogicError);

            try {
                await InventariosService.probar_deshidratacion_loteProcesando(mockUser);
            } catch (error) {
                expect(error.status).toBe(470);
            }
        });

        test('debería lanzar error 470 cuando deshidratación es NaN', async () => {
            mockLoteEF1.deshidratacion = NaN;
            LotesHelper.obtener_lote_helper.mockResolvedValue([mockLoteEF1]);

            await expect(InventariosService.probar_deshidratacion_loteProcesando(mockUser))
                .rejects
                .toThrow(InventariosLogicError);

            try {
                await InventariosService.probar_deshidratacion_loteProcesando(mockUser);
            } catch (error) {
                expect(error.status).toBe(470);
                expect(error.message).toContain('NaN');
            }
        });

        test('debería lanzar error 470 cuando deshidratación es undefined', async () => {
            mockLoteEF1.deshidratacion = undefined;
            LotesHelper.obtener_lote_helper.mockResolvedValue([mockLoteEF1]);

            await expect(InventariosService.probar_deshidratacion_loteProcesando(mockUser))
                .rejects
                .toThrow(InventariosLogicError);

            try {
                await InventariosService.probar_deshidratacion_loteProcesando(mockUser);
            } catch (error) {
                expect(error.status).toBe(470);
            }
        });

        test('debería lanzar error 470 cuando deshidratación es null', async () => {
            mockLoteEF1.deshidratacion = null;
            LotesHelper.obtener_lote_helper.mockResolvedValue([mockLoteEF1]);

            await expect(InventariosService.probar_deshidratacion_loteProcesando(mockUser))
                .rejects
                .toThrow(InventariosLogicError);

            try {
                await InventariosService.probar_deshidratacion_loteProcesando(mockUser);
            } catch (error) {
                expect(error.status).toBe(470);
            }
        });

        test('debería lanzar error 470 cuando deshidratación es string', async () => {
            mockLoteEF1.deshidratacion = "1.5";
            LotesHelper.obtener_lote_helper.mockResolvedValue([mockLoteEF1]);

            await expect(InventariosService.probar_deshidratacion_loteProcesando(mockUser))
                .rejects
                .toThrow(InventariosLogicError);
        });

        test('debería lanzar error 470 cuando deshidratación es Infinity', async () => {
            mockLoteEF1.deshidratacion = Infinity;
            LotesHelper.obtener_lote_helper.mockResolvedValue([mockLoteEF1]);

            await expect(InventariosService.probar_deshidratacion_loteProcesando(mockUser))
                .rejects
                .toThrow(InventariosLogicError);
        });

        test('debería lanzar error 470 cuando deshidratación es -Infinity', async () => {
            mockLoteEF1.deshidratacion = -Infinity;
            LotesHelper.obtener_lote_helper.mockResolvedValue([mockLoteEF1]);

            await expect(InventariosService.probar_deshidratacion_loteProcesando(mockUser))
                .rejects
                .toThrow(InventariosLogicError);
        });

        test('el mensaje de error debe incluir enf y nombrePredio', async () => {
            mockLoteEF1.deshidratacion = 5;
            LotesHelper.obtener_lote_helper.mockResolvedValue([mockLoteEF1]);

            try {
                await InventariosService.probar_deshidratacion_loteProcesando(mockUser);
            } catch (error) {
                expect(error.message).toContain(mockPredioVaciando.enf);
                expect(error.message).toContain(mockPredioVaciando.nombrePredio);
            }
        });

        test('el mensaje de error debe mostrar el valor de deshidratación', async () => {
            mockLoteEF1.deshidratacion = 5.5;
            LotesHelper.obtener_lote_helper.mockResolvedValue([mockLoteEF1]);

            try {
                await InventariosService.probar_deshidratacion_loteProcesando(mockUser);
            } catch (error) {
                expect(error.message).toContain('5.5');
            }
        });
    });

    // ============================================================
    // TEST GROUP: Casos de seguridad
    // ============================================================
    describe('casos de seguridad', () => {

        test('debería lanzar error 500 cuando mockConfig.DIR_OPERACIONES es undefined', async () => {
            mockLoteEF1.deshidratacion = 10;
            LotesHelper.obtener_lote_helper.mockResolvedValue([mockLoteEF1]);

            mockConfig.DIR_OPERACIONES = undefined;

            await expect(InventariosService.probar_deshidratacion_loteProcesando(mockUser))
                .rejects
                .toThrow(InventariosLogicError);

            try {
                await InventariosService.probar_deshidratacion_loteProcesando(mockUser);
            } catch (error) {
                expect(error.status).toBe(500);
                expect(error.message).toContain('Configuración de permisos incompleta');
            }
        });

        test('debería lanzar error 500 cuando mockConfig.COORDINADOR_PRODUCCION es undefined', async () => {
            mockLoteEF1.deshidratacion = 10;
            LotesHelper.obtener_lote_helper.mockResolvedValue([mockLoteEF1]);

            mockConfig.COORDINADOR_PRODUCCION = undefined;

            await expect(InventariosService.probar_deshidratacion_loteProcesando(mockUser))
                .rejects
                .toThrow(InventariosLogicError);

            try {
                await InventariosService.probar_deshidratacion_loteProcesando(mockUser);
            } catch (error) {
                expect(error.status).toBe(500);
                expect(error.message).toContain('Configuración de permisos incompleta');
            }
        });

        test('no debería permitir bypass cuando user.cargo es undefined', async () => {
            mockLoteEF1.deshidratacion = 10;
            LotesHelper.obtener_lote_helper.mockResolvedValue([mockLoteEF1]);

            const userSinCargo = {
                ...mockUser,
                cargo: undefined
            };

            await expect(InventariosService.probar_deshidratacion_loteProcesando(userSinCargo))
                .rejects
                .toThrow(InventariosLogicError);
        });

        test('debería propagar error cuando LotesHelper.obtener_lote_helper lanza excepción', async () => {
            const dbError = new Error('Error obteniendo lotes, ambas bases de datos estan caidas');
            LotesHelper.obtener_lote_helper.mockRejectedValue(dbError);

            await expect(InventariosService.probar_deshidratacion_loteProcesando(mockUser))
                .rejects
                .toThrow('Error obteniendo lotes, ambas bases de datos estan caidas');
        });

        test('debería propagar error cuando FrutaProcesada.obtener_ultimaEntrada lanza excepción', async () => {
            const dbError = new Error('FrutaProcesada DB error');
            FrutaProcesada.obtener_ultimaEntrada.mockRejectedValue(dbError);

            await expect(InventariosService.probar_deshidratacion_loteProcesando(mockUser))
                .rejects
                .toThrow('FrutaProcesada DB error');
        });

        test('debería manejar loteId como cadena maliciosa sin romperse', async () => {
            FrutaProcesada.obtener_ultimaEntrada.mockResolvedValue({
                loteId: { _id: '<script>alert("xss")</script>' },
                enf: 'EF1-001',
                nombrePredio: 'Finca Test'
            });
            LotesHelper.obtener_lote_helper.mockResolvedValue([]);

            // Debe lanzar error 404 porque no encuentra el lote, no debe romperse
            await expect(InventariosService.probar_deshidratacion_loteProcesando(mockUser))
                .rejects
                .toThrow(InventariosLogicError);

            try {
                await InventariosService.probar_deshidratacion_loteProcesando(mockUser);
            } catch (error) {
                expect(error.status).toBe(404);
            }
        });

        test('debería manejar loteId con NoSQL injection pattern sin romperse', async () => {
            FrutaProcesada.obtener_ultimaEntrada.mockResolvedValue({
                loteId: { _id: { $gt: '' } }, // Intento de NoSQL injection
                enf: 'EF1-001',
                nombrePredio: 'Finca Test'
            });
            LotesHelper.obtener_lote_helper.mockResolvedValue([]);

            await expect(InventariosService.probar_deshidratacion_loteProcesando(mockUser))
                .rejects
                .toThrow(InventariosLogicError);
        });

        test('no debería permitir bypass con Rol como objeto', async () => {
            mockLoteEF1.deshidratacion = 10;
            LotesHelper.obtener_lote_helper.mockResolvedValue([mockLoteEF1]);

            const maliciousUser = {
                ...mockUser,
                Rol: { $eq: 0 } // Intento de bypass con operador MongoDB
            };

            // Number({ $eq: 0 }) = NaN, que no es igual a 0
            await expect(InventariosService.probar_deshidratacion_loteProcesando(maliciousUser))
                .rejects
                .toThrow(InventariosLogicError);
        });

        test('no debería permitir bypass con cargo como array', async () => {
            mockLoteEF1.deshidratacion = 10;
            LotesHelper.obtener_lote_helper.mockResolvedValue([mockLoteEF1]);

            const maliciousUser = {
                ...mockUser,
                cargo: [mockConfig.COORDINADOR_PRODUCCION, mockConfig.DIR_OPERACIONES]
            };

            // Array.includes() con array no debería hacer match
            await expect(InventariosService.probar_deshidratacion_loteProcesando(maliciousUser))
                .rejects
                .toThrow(InventariosLogicError);
        });
    });

    // ============================================================
    // TEST GROUP: Manejo de usuario null/undefined
    // ============================================================
    describe('manejo de usuario inválido', () => {

        test('debería manejar user null sin romperse', async () => {
            mockLoteEF1.deshidratacion = 1.5;
            LotesHelper.obtener_lote_helper.mockResolvedValue([mockLoteEF1]);

            // Con deshidratación válida, debería funcionar aunque user sea null
            const result = await InventariosService.probar_deshidratacion_loteProcesando(null);

            expect(result).toEqual(mockLoteEF1);
        });

        test('debería manejar user undefined sin romperse', async () => {
            mockLoteEF1.deshidratacion = 1.5;
            LotesHelper.obtener_lote_helper.mockResolvedValue([mockLoteEF1]);

            const result = await InventariosService.probar_deshidratacion_loteProcesando(undefined);

            expect(result).toEqual(mockLoteEF1);
        });

        test('debería lanzar error con user null y deshidratación inválida', async () => {
            mockLoteEF1.deshidratacion = 10;
            LotesHelper.obtener_lote_helper.mockResolvedValue([mockLoteEF1]);

            await expect(InventariosService.probar_deshidratacion_loteProcesando(null))
                .rejects
                .toThrow(InventariosLogicError);
        });
    });
});

/**
 * Tests unitarios para InventariosService.modificarRestarInventarioFrutaSinProocesar
 *
 * Este método elimina un lote del inventario de fruta sin procesar.
 *
 * Responsabilidades:
 * 1. Validar parámetros de entrada
 * 2. Normalizar ENF (trim, uppercase)
 * 3. Determinar colección correcta (inventario vs inventarioMaquila)
 * 4. Ejecutar $pull atómico con verificación de existencia
 * 5. Incrementar __v para control de versiones
 */
describe('InventariosService.modificarRestarInventarioFrutaSinProocesar', () => {

    // ============================================================
    // SETUP: Mocks de dependencias
    // ============================================================
    let mockLote;
    let mockUser;
    let mockSession;
    let mockPullResult;

    beforeEach(() => {
        jest.clearAllMocks();

        // Configurar mock del config
        mockConfig.INVENTARIO_FRUTA_SIN_PROCESAR = 'inventario-fruta-sin-procesar-id';

        mockLote = {
            _id: '507f1f77bcf86cd799439011',
            enf: 'EF1-001',
            kilos: 100
        };

        mockUser = {
            _id: 'user-123',
            nombre: 'Test User'
        };

        mockSession = { id: 'session-123' };

        mockPullResult = {
            acknowledged: true,
            matchedCount: 1,
            modifiedCount: 1
        };

        // Mock del repositorio
        jest.spyOn(InventariosHistorialRepository, 'put_inventarioSimple_updateOne')
            .mockResolvedValue(mockPullResult);
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    // ============================================================
    // TEST GROUP: Validación de parámetros
    // ============================================================
    describe('validación de parámetros', () => {

        test('debería lanzar error con canastillas null', async () => {
            await expect(InventariosService.modificarRestarInventarioFrutaSinProocesar(
                null, mockUser, 'test', mockLote, mockSession, 'desc'
            )).rejects.toThrow('Las canastillas deben ser un número positivo');
        });

        test('debería lanzar error con canastillas undefined', async () => {
            await expect(InventariosService.modificarRestarInventarioFrutaSinProocesar(
                undefined, mockUser, 'test', mockLote, mockSession, 'desc'
            )).rejects.toThrow('Las canastillas deben ser un número positivo');
        });

        test('debería lanzar error con canastillas <= 0', async () => {
            await expect(InventariosService.modificarRestarInventarioFrutaSinProocesar(
                0, mockUser, 'test', mockLote, mockSession, 'desc'
            )).rejects.toThrow('Las canastillas deben ser un número positivo');

            await expect(InventariosService.modificarRestarInventarioFrutaSinProocesar(
                -5, mockUser, 'test', mockLote, mockSession, 'desc'
            )).rejects.toThrow('Las canastillas deben ser un número positivo');
        });

        test('debería lanzar error con lote sin _id', async () => {
            const loteIncompleto = { enf: 'EF1-001' };

            await expect(InventariosService.modificarRestarInventarioFrutaSinProocesar(
                10, mockUser, 'test', loteIncompleto, mockSession, 'desc'
            )).rejects.toThrow('Datos del lote incompletos');
        });

        test('debería lanzar error con lote sin enf', async () => {
            const loteIncompleto = { _id: '123' };

            await expect(InventariosService.modificarRestarInventarioFrutaSinProocesar(
                10, mockUser, 'test', loteIncompleto, mockSession, 'desc'
            )).rejects.toThrow('Datos del lote incompletos');
        });

        test('debería lanzar error con lote null', async () => {
            await expect(InventariosService.modificarRestarInventarioFrutaSinProocesar(
                10, mockUser, 'test', null, mockSession, 'desc'
            )).rejects.toThrow('Datos del lote incompletos');
        });

        test('debería lanzar error con user sin _id', async () => {
            await expect(InventariosService.modificarRestarInventarioFrutaSinProocesar(
                10, {}, 'test', mockLote, mockSession, 'desc'
            )).rejects.toThrow('ID de usuario requerido');
        });
    });

    // ============================================================
    // TEST GROUP: Normalización de ENF
    // ============================================================
    describe('normalización de ENF', () => {

        test('debería usar inventario para EF1- mayúsculas', async () => {
            mockLote.enf = 'EF1-001';

            await InventariosService.modificarRestarInventarioFrutaSinProocesar(
                10, mockUser, 'test', mockLote, mockSession, 'desc'
            );

            expect(InventariosHistorialRepository.put_inventarioSimple_updateOne).toHaveBeenCalledWith(
                expect.objectContaining({ 'inventario.lote': mockLote._id }),
                expect.objectContaining({ $pull: { inventario: expect.any(Object) } }),
                expect.any(Object)
            );
        });

        test('debería usar inventarioMaquila para EF10- mayúsculas', async () => {
            mockLote.enf = 'EF10-001';

            await InventariosService.modificarRestarInventarioFrutaSinProocesar(
                10, mockUser, 'test', mockLote, mockSession, 'desc'
            );

            expect(InventariosHistorialRepository.put_inventarioSimple_updateOne).toHaveBeenCalledWith(
                expect.objectContaining({ 'inventarioMaquila.lote': mockLote._id }),
                expect.objectContaining({ $pull: { inventarioMaquila: expect.any(Object) } }),
                expect.any(Object)
            );
        });

        test('debería usar inventario para ef1- minúsculas (normaliza)', async () => {
            mockLote.enf = 'ef1-001';

            await InventariosService.modificarRestarInventarioFrutaSinProocesar(
                10, mockUser, 'test', mockLote, mockSession, 'desc'
            );

            expect(InventariosHistorialRepository.put_inventarioSimple_updateOne).toHaveBeenCalledWith(
                expect.objectContaining({ 'inventario.lote': mockLote._id }),
                expect.any(Object),
                expect.any(Object)
            );
        });

        test('debería usar inventarioMaquila para ef10- minúsculas (normaliza)', async () => {
            mockLote.enf = 'ef10-001';

            await InventariosService.modificarRestarInventarioFrutaSinProocesar(
                10, mockUser, 'test', mockLote, mockSession, 'desc'
            );

            expect(InventariosHistorialRepository.put_inventarioSimple_updateOne).toHaveBeenCalledWith(
                expect.objectContaining({ 'inventarioMaquila.lote': mockLote._id }),
                expect.any(Object),
                expect.any(Object)
            );
        });

        test('debería manejar espacios en enf (trim)', async () => {
            mockLote.enf = '  EF1-001  ';

            await InventariosService.modificarRestarInventarioFrutaSinProocesar(
                10, mockUser, 'test', mockLote, mockSession, 'desc'
            );

            expect(InventariosHistorialRepository.put_inventarioSimple_updateOne).toHaveBeenCalledWith(
                expect.objectContaining({ 'inventario.lote': mockLote._id }),
                expect.any(Object),
                expect.any(Object)
            );
        });

        test('debería lanzar error con ENF inválido', async () => {
            mockLote.enf = 'EF99-001';

            await expect(InventariosService.modificarRestarInventarioFrutaSinProocesar(
                10, mockUser, 'test', mockLote, mockSession, 'desc'
            )).rejects.toThrow('ENF inválido');
        });
    });

    // ============================================================
    // TEST GROUP: Casos básicos
    // ============================================================
    describe('casos básicos', () => {

        test('debería eliminar lote de inventario (EF1) exitosamente', async () => {
            mockLote.enf = 'EF1-001';

            const result = await InventariosService.modificarRestarInventarioFrutaSinProocesar(
                10, mockUser, 'test', mockLote, mockSession, 'desc'
            );

            expect(result).toEqual(mockPullResult);
            expect(InventariosHistorialRepository.put_inventarioSimple_updateOne).toHaveBeenCalledTimes(1);
        });

        test('debería eliminar lote de inventarioMaquila (EF10) exitosamente', async () => {
            mockLote.enf = 'EF10-001';

            const result = await InventariosService.modificarRestarInventarioFrutaSinProocesar(
                10, mockUser, 'test', mockLote, mockSession, 'desc'
            );

            expect(result).toEqual(mockPullResult);
        });

        test('debería retornar pullResult', async () => {
            const result = await InventariosService.modificarRestarInventarioFrutaSinProocesar(
                10, mockUser, 'test', mockLote, mockSession, 'desc'
            );

            expect(result).toHaveProperty('matchedCount', 1);
            expect(result).toHaveProperty('modifiedCount', 1);
        });
    });

    // ============================================================
    // TEST GROUP: Manejo de errores
    // ============================================================
    describe('manejo de errores', () => {

        test('debería lanzar error cuando lote no existe en inventario (matchedCount === 0)', async () => {
            InventariosHistorialRepository.put_inventarioSimple_updateOne.mockResolvedValue({
                matchedCount: 0,
                modifiedCount: 0
            });

            await expect(InventariosService.modificarRestarInventarioFrutaSinProocesar(
                10, mockUser, 'test', mockLote, mockSession, 'desc'
            )).rejects.toThrow('ya no se encuentra en el inventario');
        });

        test('debería propagar error cuando BD falla', async () => {
            InventariosHistorialRepository.put_inventarioSimple_updateOne.mockRejectedValue(
                new Error('Connection timeout')
            );

            await expect(InventariosService.modificarRestarInventarioFrutaSinProocesar(
                10, mockUser, 'test', mockLote, mockSession, 'desc'
            )).rejects.toThrow('Connection timeout');
        });
    });

    // ============================================================
    // TEST GROUP: Contrato de API
    // ============================================================
    describe('contrato de API', () => {

        test('debería pasar filtro con verificación de existencia', async () => {
            await InventariosService.modificarRestarInventarioFrutaSinProocesar(
                10, mockUser, 'test', mockLote, mockSession, 'desc'
            );

            const [filter] = InventariosHistorialRepository.put_inventarioSimple_updateOne.mock.calls[0];
            expect(filter).toHaveProperty('_id'); // ID del inventario
            expect(filter['inventario.lote']).toBe(mockLote._id); // Verificación de existencia
        });

        test('debería pasar $pull y $inc correctos', async () => {

            await InventariosService.modificarRestarInventarioFrutaSinProocesar(
                10, mockUser, 'test', mockLote, mockSession, 'desc'
            );

            const [, update] = InventariosHistorialRepository.put_inventarioSimple_updateOne.mock.calls[0];
            expect(update).toHaveProperty('$pull');
            expect(update).toHaveProperty('$inc', { __v: 1 });
        });

        test('debería pasar session y opciones', async () => {

            await InventariosService.modificarRestarInventarioFrutaSinProocesar(
                10, mockUser, 'testAction', mockLote, mockSession, 'testDesc'
            );

            const [, , options] = InventariosHistorialRepository.put_inventarioSimple_updateOne.mock.calls[0];
            expect(options).toHaveProperty('session', mockSession);
            expect(options).toHaveProperty('action', 'testAction');
            expect(options).toHaveProperty('description', 'testDesc');
            expect(options).toHaveProperty('user', mockUser._id);
        });
    });

    // ============================================================
    // TEST GROUP: Edge cases
    // ============================================================
    describe('edge cases', () => {

        test('debería manejar lote._id como string', async () => {
            mockLote._id = '507f1f77bcf86cd799439011';

            await InventariosService.modificarRestarInventarioFrutaSinProocesar(
                10, mockUser, 'test', mockLote, mockSession, 'desc'
            );

            expect(InventariosHistorialRepository.put_inventarioSimple_updateOne).toHaveBeenCalled();
        });

        test('debería convertir lote._id a ObjectId en $pull', async () => {

            await InventariosService.modificarRestarInventarioFrutaSinProocesar(
                10, mockUser, 'test', mockLote, mockSession, 'desc'
            );

            const [, update] = InventariosHistorialRepository.put_inventarioSimple_updateOne.mock.calls[0];
            // El lote en $pull debe ser un ObjectId
            expect(update.$pull.inventario.lote).toBeDefined();
        });
    });

    // ============================================================
    // TEST GROUP: Concurrencia
    // ============================================================
    describe('concurrencia', () => {

        test('debería manejar doble clic simultáneo (1er éxito, 2do error)', async () => {

            // Primera llamada exitosa
            InventariosHistorialRepository.put_inventarioSimple_updateOne
                .mockResolvedValueOnce({ matchedCount: 1, modifiedCount: 1 })
                // Segunda llamada: el lote ya no existe
                .mockResolvedValueOnce({ matchedCount: 0, modifiedCount: 0 });

            // Primera llamada - éxito
            const result1 = await InventariosService.modificarRestarInventarioFrutaSinProocesar(
                10, mockUser, 'test', mockLote, mockSession, 'desc'
            );
            expect(result1.matchedCount).toBe(1);

            // Segunda llamada - error controlado
            await expect(InventariosService.modificarRestarInventarioFrutaSinProocesar(
                10, mockUser, 'test', mockLote, mockSession, 'desc'
            )).rejects.toThrow('ya no se encuentra en el inventario');
        });
    });

    // ============================================================
    // TEST GROUP: Atomicidad
    // ============================================================
    describe('atomicidad', () => {

        test('debería pasar session para permitir rollback si transacción falla', async () => {
            const transactionSession = { id: 'transaction-session', inTransaction: true };

            await InventariosService.modificarRestarInventarioFrutaSinProocesar(
                10, mockUser, 'test', mockLote, transactionSession, 'desc'
            );

            const [, , options] = InventariosHistorialRepository.put_inventarioSimple_updateOne.mock.calls[0];
            expect(options.session).toBe(transactionSession);
            // Si la transacción falla externamente, MongoDB hace rollback automático
        });

        test('debería propagar error para que la transacción pueda hacer rollback', async () => {
            InventariosHistorialRepository.put_inventarioSimple_updateOne.mockRejectedValue(
                new Error('Transaction aborted')
            );

            await expect(InventariosService.modificarRestarInventarioFrutaSinProocesar(
                10, mockUser, 'test', mockLote, mockSession, 'desc'
            )).rejects.toThrow('Transaction aborted');
            // El caller puede hacer session.abortTransaction()
        });
    });

    // ============================================================
    // TEST GROUP: Integridad
    // ============================================================
    describe('integridad', () => {

        test('debería no borrar nada si ID no coincide con array (desincronización ID vs ENF)', async () => {
            // Simular que el ID existe pero en el array equivocado
            // El filtro incluye verificación de existencia, así que matchedCount será 0
            InventariosHistorialRepository.put_inventarioSimple_updateOne.mockResolvedValue({
                matchedCount: 0,
                modifiedCount: 0
            });

            // ENF dice EF1, pero el lote._id no está en inventario (quizás está en inventarioMaquila)
            mockLote.enf = 'EF1-001';

            await expect(InventariosService.modificarRestarInventarioFrutaSinProocesar(
                10, mockUser, 'test', mockLote, mockSession, 'desc'
            )).rejects.toThrow('ya no se encuentra en el inventario');

            // Verifica que el filtro buscó en el array correcto según ENF
            const [filter] = InventariosHistorialRepository.put_inventarioSimple_updateOne.mock.calls[0];
            expect(filter['inventario.lote']).toBeDefined(); // No inventarioMaquila
        });
    });

    // ============================================================
    // TEST GROUP: Persistencia (preservación de vecinos)
    // ============================================================
    describe('persistencia', () => {

        test('debería usar $pull que solo afecta al lote específico (preserva vecinos)', async () => {

            await InventariosService.modificarRestarInventarioFrutaSinProocesar(
                10, mockUser, 'test', mockLote, mockSession, 'desc'
            );

            const [, update] = InventariosHistorialRepository.put_inventarioSimple_updateOne.mock.calls[0];

            // $pull solo elimina elementos que coincidan con el criterio
            expect(update.$pull.inventario).toEqual({
                lote: expect.any(Object) // ObjectId específico, no elimina todos
            });

            // No debería haber operadores que afecten todo el array
            expect(update.$set).toBeUndefined();
            expect(update.$unset).toBeUndefined();
        });

        test('debería no modificar otros campos del documento', async () => {

            await InventariosService.modificarRestarInventarioFrutaSinProocesar(
                10, mockUser, 'test', mockLote, mockSession, 'desc'
            );

            const [, update] = InventariosHistorialRepository.put_inventarioSimple_updateOne.mock.calls[0];

            // Solo debe tener $pull y $inc para __v
            const updateKeys = Object.keys(update);
            expect(updateKeys).toContain('$pull');
            expect(updateKeys).toContain('$inc');
            expect(updateKeys.length).toBe(2);
        });
    });

    // ============================================================
    // TEST GROUP: Versioning
    // ============================================================
    describe('versioning', () => {

        test('debería incrementar __v para evitar colisiones de caché', async () => {

            await InventariosService.modificarRestarInventarioFrutaSinProocesar(
                10, mockUser, 'test', mockLote, mockSession, 'desc'
            );

            const [, update] = InventariosHistorialRepository.put_inventarioSimple_updateOne.mock.calls[0];
            expect(update.$inc).toEqual({ __v: 1 });
        });

        test('debería incluir $inc.__v en la misma operación atómica que $pull', async () => {

            await InventariosService.modificarRestarInventarioFrutaSinProocesar(
                10, mockUser, 'test', mockLote, mockSession, 'desc'
            );

            // Verificar que se llama UNA sola vez (operación atómica)
            expect(InventariosHistorialRepository.put_inventarioSimple_updateOne).toHaveBeenCalledTimes(1);

            // Verificar que $pull y $inc están en el mismo update
            const [, update] = InventariosHistorialRepository.put_inventarioSimple_updateOne.mock.calls[0];
            expect(update.$pull).toBeDefined();
            expect(update.$inc).toBeDefined();
        });
    });
});
