import { describe, test, expect, beforeEach, jest } from '@jest/globals';

/**
 * Tests para IndicadoresService.put_indicadores_actualizar_indicador
 *
 * Lógica:
 * 1. Valida que `update` no sea null/undefined/vacío → ProcessError(400)
 * 2. Llama a IndicadoresRepository.actualizar_indicador con filtro {}, update, y opciones (sort, session)
 * 3. Si retorna null → ProcessError(404)
 * 4. Si retorna documento → lo devuelve
 * 5. Re-lanza cualquier error tal cual (throw err)
 */

// ============================================================
// MOCKS
// ============================================================
const mockActualizarIndicador = jest.fn();

jest.unstable_mockModule('../../../server/Class/Indicadores.js', () => ({
    IndicadoresRepository: {
        actualizar_indicador: mockActualizarIndicador
    }
}));

jest.unstable_mockModule('../../../server/api/helper/logs.js', () => ({
    registrarPasoLog: jest.fn()
}));

jest.unstable_mockModule('../../../server/services/helpers/lotes.js', () => ({
    calcularTotalDescarte: jest.fn()
}));

const { IndicadoresService } = await import('../../../server/services/indicadores.js');

describe('IndicadoresService.put_indicadores_actualizar_indicador', () => {

    const MOCK_SESSION = 'mock-session';
    const MOCK_UPDATE = { $inc: { 'kilos_procesados.tipo1': 50 } };

    const createMockIndicador = () => ({
        _id: 'indicador-001',
        fecha_creacion: new Date('2025-06-15'),
        kilos_procesados: { tipo1: 150 },
    });

    beforeEach(() => {
        jest.clearAllMocks();
        mockActualizarIndicador.mockResolvedValue(createMockIndicador());
    });

    // ============================================================
    // CASO EXITOSO
    // ============================================================
    test('debería retornar el indicador actualizado', async () => {
        const result = await IndicadoresService.put_indicadores_actualizar_indicador(
            MOCK_UPDATE, MOCK_SESSION
        );

        expect(result).toEqual(createMockIndicador());
    });

    // ============================================================
    // VERIFICACIÓN DE ARGUMENTOS
    // ============================================================
    test('debería pasar filtro {}, update y opciones correctas a actualizar_indicador', async () => {
        await IndicadoresService.put_indicadores_actualizar_indicador(
            MOCK_UPDATE, MOCK_SESSION
        );

        expect(mockActualizarIndicador).toHaveBeenCalledWith(
            {},
            MOCK_UPDATE,
            {
                sort: { fecha_creacion: -1, _id: -1 },
                session: MOCK_SESSION,
            }
        );
    });

    test('debería pasar session como null cuando no se proporciona', async () => {
        await IndicadoresService.put_indicadores_actualizar_indicador(MOCK_UPDATE);

        expect(mockActualizarIndicador).toHaveBeenCalledWith(
            {},
            MOCK_UPDATE,
            expect.objectContaining({ session: null })
        );
    });

    // ============================================================
    // VALIDACIÓN DE UPDATE VACÍO / NULL
    // ============================================================
    test('debería lanzar ProcessError(400) si update es null', async () => {
        await expect(
            IndicadoresService.put_indicadores_actualizar_indicador(null)
        ).rejects.toThrow('El objeto de actualización no puede estar vacío');

        expect(mockActualizarIndicador).not.toHaveBeenCalled();
    });

    test('debería lanzar ProcessError(400) si update es undefined', async () => {
        await expect(
            IndicadoresService.put_indicadores_actualizar_indicador(undefined)
        ).rejects.toThrow('El objeto de actualización no puede estar vacío');

        expect(mockActualizarIndicador).not.toHaveBeenCalled();
    });

    test('debería lanzar ProcessError(400) si update es un objeto vacío', async () => {
        await expect(
            IndicadoresService.put_indicadores_actualizar_indicador({})
        ).rejects.toThrow('El objeto de actualización no puede estar vacío');

        expect(mockActualizarIndicador).not.toHaveBeenCalled();
    });

    // ============================================================
    // INDICADOR NO ENCONTRADO
    // ============================================================
    test('debería lanzar ProcessError(404) si actualizar_indicador retorna null', async () => {
        mockActualizarIndicador.mockResolvedValue(null);

        await expect(
            IndicadoresService.put_indicadores_actualizar_indicador(MOCK_UPDATE)
        ).rejects.toThrow('No se encontró ningún indicador creado');
    });

    // ============================================================
    // MANEJO DE ERRORES
    // ============================================================
    test('debería re-lanzar errores del repositorio sin modificar', async () => {
        const error = new Error('DB connection lost');
        mockActualizarIndicador.mockRejectedValue(error);

        await expect(
            IndicadoresService.put_indicadores_actualizar_indicador(MOCK_UPDATE)
        ).rejects.toThrow(error);
    });
});
