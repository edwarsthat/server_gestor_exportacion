import { describe, test, expect, beforeEach, jest } from '@jest/globals';
import { ZodError } from 'zod';

// 1. MOCKS DE INFRAESTRUCTURA (La "fontanería")
const mockRegistrarPasoLog = jest.fn();
// Mockeamos el wrapper para que solo ejecute la lógica interna
const mockExecuteTransactionalTask = jest.fn(async (req, taskLogic) => {
    return await taskLogic('mock-session', { _id: 'log-123' });
});

jest.unstable_mockModule('../../../server/api/helper/logs.js', () => ({
    registrarPasoLog: mockRegistrarPasoLog
}));

jest.unstable_mockModule('../../../server/utils/wrappers.js', () => ({
    executeTransactionalTask: mockExecuteTransactionalTask,
    executeQueryTask: jest.fn(async (req, taskLogic) => await taskLogic(req))
}));

// 2. MOCKS DE REPOSITORIOS Y SERVICIOS (La lógica)
const mockInventariosHistorialRepository = {
    get_item_frutaSinProcesar: jest.fn(),
    put_borrar_item_ordenVaceo: jest.fn()
};
const mockLotesHelper = { actualizar_lotes_helper: jest.fn() };
const mockInventariosService = {
    probar_deshidratacion_loteProcesando: jest.fn(),
    modificarRestarInventarioFrutaSinProocesar: jest.fn()
};
const mockIndicadoresAPIRepository = { put_indicadores_actualizar_indicador: jest.fn() };
const mockEventEmitter = { emit: jest.fn() };

jest.unstable_mockModule('../../../server/Class/Inventarios.js', () => ({ InventariosHistorialRepository: mockInventariosHistorialRepository }));
jest.unstable_mockModule('../../../server/helper/lotes.js', () => ({ LotesHelper: mockLotesHelper }));
jest.unstable_mockModule('../../../server/services/inventarios.js', () => ({ InventariosService: mockInventariosService }));
jest.unstable_mockModule('../../../server/api/IndicadoresAPI.js', () => ({ IndicadoresAPIRepository: mockIndicadoresAPIRepository }));
jest.unstable_mockModule('../../../events/eventos.js', () => ({ procesoEventEmitter: mockEventEmitter }));

// Importación dinámica del controlador
const { OrdenVaceoController } = await import('../../../server/api/inventarios/ordenVaceo.js');

describe('OrdenVaceoController - put_inventarios_ordenVaceo_vacear', () => {
    let mockReq;

    beforeEach(() => {
        jest.clearAllMocks();
        mockReq = {
            user: { _id: 'user-1' },
            data: { _id: '507f1f77bcf86cd799439011', kilosVaciados: 100, action: 'vaciar' }
        };

        // Configuración por defecto para que el test pase (Happy Path)
        mockInventariosService.probar_deshidratacion_loteProcesando.mockResolvedValue(null);
        mockInventariosHistorialRepository.get_item_frutaSinProcesar.mockResolvedValue({ _id: 'item-1', canastillas: 10, lote: 'lote-1' });
        mockLotesHelper.actualizar_lotes_helper.mockResolvedValue({ _id: 'lote-1', tipoFruta: { _id: 'fruta-1' } });
    });

    describe('Validación y Lógica de Negocio', () => {

        test('debería fallar si los datos de entrada son inválidos (Zod)', async () => {
            mockReq.data.kilosVaciados = -5;
            await expect(OrdenVaceoController.put_inventarios_ordenVaceo_vacear(mockReq))
                .rejects.toThrow(ZodError);
        });

        test('debería lanzar error si el ítem no existe en el inventario', async () => {
            mockInventariosHistorialRepository.get_item_frutaSinProcesar.mockResolvedValue(null);

            await expect(OrdenVaceoController.put_inventarios_ordenVaceo_vacear(mockReq))
                .rejects.toThrow("No se encontró el item en el inventario");
        });

        test('debería ejecutar el flujo completo de vaceo correctamente', async () => {
            await OrdenVaceoController.put_inventarios_ordenVaceo_vacear(mockReq);

            // Verificamos que se restó el inventario con el parseInt de canastillas
            expect(mockInventariosService.modificarRestarInventarioFrutaSinProocesar).toHaveBeenCalledWith(
                10, mockReq.user, 'vaciar', expect.anything(), 'mock-session', expect.any(String)
            );

            // Verificamos indicadores (el template string de la key)
            expect(mockIndicadoresAPIRepository.put_indicadores_actualizar_indicador).toHaveBeenCalledWith(
                { $inc: { 'kilos_vaciados.fruta-1': 100 } },
                'mock-session'
            );
        });

        test('debería finalizar el lote anterior si el servicio lo detecta', async () => {
            mockInventariosService.probar_deshidratacion_loteProcesando.mockResolvedValue({ _id: 'lote-antiguo' });

            await OrdenVaceoController.put_inventarios_ordenVaceo_vacear(mockReq);

            expect(mockLotesHelper.actualizar_lotes_helper).toHaveBeenCalledWith(
                { _id: 'lote-antiguo' },
                { finalizado: true },
                expect.objectContaining({ action: 'finalizado' })
            );
        });
    });

    describe('Efectos Secundarios', () => {
        test('debería emitir eventos de socket y proceso al terminar con éxito', async () => {
            await OrdenVaceoController.put_inventarios_ordenVaceo_vacear(mockReq);

            expect(mockEventEmitter.emit).toHaveBeenCalledWith('predio_vaciado', expect.any(Object));
            expect(mockEventEmitter.emit).toHaveBeenCalledWith('server_event', expect.objectContaining({
                action: 'inventario_frutaSinProcesar'
            }));
        });
    });
});
