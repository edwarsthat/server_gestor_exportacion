import { describe, test, expect, beforeEach, jest } from '@jest/globals';

/**
 * Tests para ProcesoService.modificarLotedescartes
 *
 * Lógica:
 * 1. Llama a LotesHelper.actualizar_lotes_helper con filtro { _id, finalizado: false }
 * 2. Si retorna null (lote finalizado o no encontrado) → lanza ProcessError(400)
 * 3. Si retorna documento → lo devuelve
 */

// ============================================================
// MOCKS
// ============================================================
const mockActualizarLotesHelper = jest.fn();

jest.unstable_mockModule('../../../server/helper/lotes.js', () => ({
    LotesHelper: {
        actualizar_lotes_helper: mockActualizarLotesHelper
    }
}));

jest.unstable_mockModule('../../../server/api/utils/lotesFunctions.js', () => ({
    checkFinalizadoLote: jest.fn()
}));

const { ProcesoService } = await import('../../../server/services/proceso.js');

describe('ProcesoService.modificarLotedescartes', () => {

    const MOCK_LOTE_ID = '507f1f77bcf86cd799439011';
    const MOCK_USER = { _id: 'user-123' };
    const MOCK_ACTION = 'put_proceso_aplicaciones_descarte';
    const MOCK_SESSION = 'mock-session';
    const MOCK_QUERY = { $inc: { kilosProcesados: 10 } };

    const createMockLote = () => ({
        _id: MOCK_LOTE_ID,
        enf: 'EF1-001',
        finalizado: false,
        kilosProcesados: 100,
    });

    beforeEach(() => {
        jest.clearAllMocks();
        mockActualizarLotesHelper.mockResolvedValue(createMockLote());
    });

    test('debería retornar el lote actualizado cuando existe y no está finalizado', async () => {
        const result = await ProcesoService.modificarLotedescartes(
            MOCK_LOTE_ID, MOCK_QUERY, MOCK_USER, MOCK_ACTION, MOCK_SESSION
        );

        expect(result).toEqual(createMockLote());
    });

    test('debería pasar el filtro con _id y finalizado: false a actualizar_lotes_helper', async () => {
        await ProcesoService.modificarLotedescartes(
            MOCK_LOTE_ID, MOCK_QUERY, MOCK_USER, MOCK_ACTION, MOCK_SESSION
        );

        expect(mockActualizarLotesHelper).toHaveBeenCalledWith(
            { _id: MOCK_LOTE_ID, finalizado: false },
            MOCK_QUERY,
            { user: MOCK_USER._id, action: MOCK_ACTION, session: MOCK_SESSION }
        );
    });

    test('debería lanzar ProcessError(400) si actualizar_lotes_helper retorna null', async () => {
        mockActualizarLotesHelper.mockResolvedValue(null);

        await expect(
            ProcesoService.modificarLotedescartes(
                MOCK_LOTE_ID, MOCK_QUERY, MOCK_USER, MOCK_ACTION, MOCK_SESSION
            )
        ).rejects.toThrow('El lote no se pudo modificar, lote finalizado');
    });
});
