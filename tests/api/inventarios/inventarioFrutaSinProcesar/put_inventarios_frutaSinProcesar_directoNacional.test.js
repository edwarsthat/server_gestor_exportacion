import { describe, test, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { ZodError } from 'zod';

/**
 * Tests para InventarioFrutaSinProcesarController.put_inventarios_frutaSinProcesar_directoNacional
 *
 * Este endpoint procesa la salida de fruta como "Directo Nacional", restando
 * canastillas del inventario y actualizando el lote correspondiente.
 *
 * Flujo:
 * 1. Validación Zod de datos de entrada
 * 2. Verificación de versión del inventario (optimistic locking)
 * 3. Verificación que el lote NO esté en orden de vaceo
 * 4. Cálculo y validación de kilos
 * 5. Actualización del lote
 * 6. Resta de canastillas del inventario
 * 7. Emisión de eventos
 */

// ============================================================
// MOCKS DE INFRAESTRUCTURA
// ============================================================
const mockRegistrarPasoLog = jest.fn();
const mockExecuteTransactionalTask = jest.fn(async (req, taskLogic) => {
    return await taskLogic('mock-session', { _id: 'log-123' });
});

const mockConfig = {
    INVENTARIO_FRUTA_SIN_PROCESAR: 'inventario-id-mock'
};

jest.unstable_mockModule('../../../../server/api/helper/logs.js', () => ({
    registrarPasoLog: mockRegistrarPasoLog
}));

jest.unstable_mockModule('../../../../server/utils/wrappers.js', () => ({
    executeTransactionalTask: mockExecuteTransactionalTask,
    executeQueryTask: jest.fn(async (req, taskLogic) => await taskLogic(req))
}));

jest.unstable_mockModule('../../../../src/config/index.js', () => ({
    default: mockConfig
}));

// ============================================================
// MOCKS DE REPOSITORIOS Y SERVICIOS
// ============================================================
const mockInventariosService = {
    check_inventarioVersion: jest.fn(),
    item_in_ordenVaceo: jest.fn(),
    modificarRestarInventarioFrutaSinProocesar: jest.fn()
};

const mockLotesRepository = {
    actualizar_lote: jest.fn()
};

const mockEventEmitter = { emit: jest.fn() };

jest.unstable_mockModule('../../../../server/services/inventarios.js', () => ({
    InventariosService: mockInventariosService
}));

jest.unstable_mockModule('../../../../server/Class/Lotes.js', () => ({
    LotesRepository: mockLotesRepository
}));

jest.unstable_mockModule('../../../../events/eventos.js', () => ({
    procesoEventEmitter: mockEventEmitter
}));

// Mocks adicionales requeridos por el controlador
jest.unstable_mockModule('../../../../server/Class/Inventarios.js', () => ({
    InventariosHistorialRepository: {}
}));

jest.unstable_mockModule('../../../../server/helper/lotes.js', () => ({
    LotesHelper: {}
}));

jest.unstable_mockModule('../../../../server/api/IndicadoresAPI.js', () => ({
    IndicadoresAPIRepository: {}
}));

// Importación dinámica del controlador
const { InventarioFrutaSinProcesarController } = await import('../../../../server/api/inventarios/inventarioFrutaSinProcesar.js');

describe('InventarioFrutaSinProcesarController.put_inventarios_frutaSinProcesar_directoNacional', () => {

    // ============================================================
    // CONSTANTES Y DATOS DE PRUEBA
    // ============================================================
    const VALID_OBJECT_ID = '507f1f77bcf86cd799439011';
    const VALID_OBJECT_ID_2 = '507f191e810c19729de860ea';

    let mockReq;

    const createValidRequest = () => ({
        user: { _id: 'user-123', nombre: 'Test User' },
        data: {
            action: 'put_inventarios_frutaSinProcesar_directoNacional',
            data: {
                cliente: VALID_OBJECT_ID,
                canastillas: 10,
                placa: 'ABC123',
                nombreConductor: 'Juan Pérez',
                telefono: '3001234567',
                cedula: '12345678',
                remision: 'REM-001'
            },
            lote: {
                _id: VALID_OBJECT_ID_2,
                enf: 'EF1-001',
                promedio: 20,
                kilos: 500
            },
            __v: 5
        }
    });

    beforeEach(() => {
        jest.clearAllMocks();
        mockReq = createValidRequest();

        // Happy path mocks
        mockInventariosService.check_inventarioVersion.mockResolvedValue(true);
        mockInventariosService.item_in_ordenVaceo.mockResolvedValue(true);
        mockInventariosService.modificarRestarInventarioFrutaSinProocesar.mockResolvedValue({});
        mockLotesRepository.actualizar_lote.mockResolvedValue({ _id: VALID_OBJECT_ID_2 });
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    // ============================================================
    // TEST GROUP 1: CASOS DE ÉXITO
    // ============================================================
    describe('Casos de Éxito', () => {

        test('debería procesar directo nacional exitosamente con datos válidos', async () => {
            await InventarioFrutaSinProcesarController.put_inventarios_frutaSinProcesar_directoNacional(mockReq);

            expect(mockInventariosService.check_inventarioVersion).toHaveBeenCalledWith(
                mockConfig.INVENTARIO_FRUTA_SIN_PROCESAR,
                5
            );
            expect(mockInventariosService.item_in_ordenVaceo).toHaveBeenCalledWith(VALID_OBJECT_ID_2);
        });

        test('debería actualizar el lote con los kilos calculados (promedio * canastillas)', async () => {
            // promedio: 20, canastillas: 10 => kilos = 200
            await InventarioFrutaSinProcesarController.put_inventarios_frutaSinProcesar_directoNacional(mockReq);

            expect(mockLotesRepository.actualizar_lote).toHaveBeenCalledWith(
                { _id: VALID_OBJECT_ID_2 },
                expect.objectContaining({
                    $inc: { directoNacional: 200, kilosProcesados: 200 }
                }),
                expect.objectContaining({ session: 'mock-session' })
            );
        });

        test('debería restar las canastillas del inventario', async () => {
            await InventarioFrutaSinProcesarController.put_inventarios_frutaSinProcesar_directoNacional(mockReq);

            expect(mockInventariosService.modificarRestarInventarioFrutaSinProocesar).toHaveBeenCalledWith(
                10,
                mockReq.user,
                'put_inventarios_frutaSinProcesar_directoNacional',
                mockReq.data.lote,
                'mock-session',
                expect.stringContaining('Directo Nacional')
            );
        });

        test('debería emitir evento server_event con acción directo_nacional', async () => {
            await InventarioFrutaSinProcesarController.put_inventarios_frutaSinProcesar_directoNacional(mockReq);

            expect(mockEventEmitter.emit).toHaveBeenCalledWith('server_event', {
                action: 'directo_nacional',
                data: {}
            });
        });

        test('debería guardar info del usuario en infoSalidaDirectoNacional', async () => {
            await InventarioFrutaSinProcesarController.put_inventarios_frutaSinProcesar_directoNacional(mockReq);

            expect(mockLotesRepository.actualizar_lote).toHaveBeenCalledWith(
                expect.any(Object),
                expect.objectContaining({
                    infoSalidaDirectoNacional: expect.objectContaining({
                        cliente: VALID_OBJECT_ID,
                        canastillas: 10,
                        user: 'user-123'
                    })
                }),
                expect.any(Object)
            );
        });

        test('debería registrar el paso en el log de auditoría', async () => {
            await InventarioFrutaSinProcesarController.put_inventarios_frutaSinProcesar_directoNacional(mockReq);

            expect(mockRegistrarPasoLog).toHaveBeenCalledWith(
                'log-123',
                'LotesRepository.actualizar_lote',
                'Completado',
                expect.stringContaining('directoNacional')
            );
        });

        test('debería funcionar con promedio decimal', async () => {
            mockReq.data.lote.promedio = 19.5;
            mockReq.data.data.canastillas = 10;
            // kilos = 195

            await InventarioFrutaSinProcesarController.put_inventarios_frutaSinProcesar_directoNacional(mockReq);

            expect(mockLotesRepository.actualizar_lote).toHaveBeenCalledWith(
                expect.any(Object),
                expect.objectContaining({
                    $inc: { directoNacional: 195, kilosProcesados: 195 }
                }),
                expect.any(Object)
            );
        });

        test('debería funcionar cuando kilos es exactamente igual a kilosTotales', async () => {
            mockReq.data.lote.promedio = 20;
            mockReq.data.data.canastillas = 25;
            mockReq.data.lote.kilosTotales = 500; // 20 * 25 = 500 exacto

            await expect(
                InventarioFrutaSinProcesarController.put_inventarios_frutaSinProcesar_directoNacional(mockReq)
            ).resolves.not.toThrow();
        });
    });

    // ============================================================
    // TEST GROUP 2: ERRORES DE LÓGICA DE NEGOCIO
    // ============================================================
    describe('Errores de Lógica de Negocio', () => {

        test('debería lanzar error si la versión del inventario cambió (optimistic locking)', async () => {
            mockInventariosService.check_inventarioVersion.mockRejectedValue(
                new Error('La versión del inventario ha cambiado. Por favor, recargue la página e intente de nuevo.')
            );

            await expect(
                InventarioFrutaSinProcesarController.put_inventarios_frutaSinProcesar_directoNacional(mockReq)
            ).rejects.toThrow('La versión del inventario ha cambiado');

            expect(mockInventariosService.item_in_ordenVaceo).not.toHaveBeenCalled();
            expect(mockLotesRepository.actualizar_lote).not.toHaveBeenCalled();
        });

        test('debería lanzar error si el lote está en la orden de vaceo', async () => {
            mockInventariosService.item_in_ordenVaceo.mockRejectedValue(
                new Error('EL lote ya está en la orden de vaceo, no se puede procesar como directo nacional.')
            );

            await expect(
                InventarioFrutaSinProcesarController.put_inventarios_frutaSinProcesar_directoNacional(mockReq)
            ).rejects.toThrow('orden de vaceo');

            expect(mockLotesRepository.actualizar_lote).not.toHaveBeenCalled();
        });

        test('debería lanzar error si kilos calculados exceden kilosTotales', async () => {
            mockReq.data.data.canastillas = 100; // 20 * 100 = 2000 > 500
            mockReq.data.lote.kilosTotales = 500;

            await expect(
                InventarioFrutaSinProcesarController.put_inventarios_frutaSinProcesar_directoNacional(mockReq)
            ).rejects.toThrow('No se puede procesar más kilos de los que hay en el lote');
        });

        test('debería lanzar error si kilos excede por solo 1 kilo', async () => {
            mockReq.data.lote.promedio = 20;
            mockReq.data.data.canastillas = 26; // 520 kilos
            mockReq.data.lote.kilosTotales = 519;

            await expect(
                InventarioFrutaSinProcesarController.put_inventarios_frutaSinProcesar_directoNacional(mockReq)
            ).rejects.toThrow('No se puede procesar más kilos');
        });

        test('debería lanzar error si kilos resulta en NaN (promedio inválido)', async () => {
            mockReq.data.lote.promedio = 'no-es-numero';

            await expect(
                InventarioFrutaSinProcesarController.put_inventarios_frutaSinProcesar_directoNacional(mockReq)
            ).rejects.toThrow('El valor de kilos debe ser un número');
        });

        test('debería lanzar error si kilos resulta en NaN (promedio undefined)', async () => {
            mockReq.data.lote.promedio = undefined;

            await expect(
                InventarioFrutaSinProcesarController.put_inventarios_frutaSinProcesar_directoNacional(mockReq)
            ).rejects.toThrow('El valor de kilos debe ser un número');
        });

        test('debería lanzar error si kilosTotales es 0', async () => {
            mockReq.data.lote.kilos = 0;
            mockReq.data.data.canastillas = 1;

            await expect(
                InventarioFrutaSinProcesarController.put_inventarios_frutaSinProcesar_directoNacional(mockReq)
            ).rejects.toThrow('No se puede procesar más kilos');
        });

        test('debería lanzar error si kilosTotales es negativo (dato corrupto)', async () => {
            mockReq.data.lote.kilos = -100;

            await expect(
                InventarioFrutaSinProcesarController.put_inventarios_frutaSinProcesar_directoNacional(mockReq)
            ).rejects.toThrow('No se puede procesar más kilos');
        });

        test('debería propagar error si actualizar_lote falla', async () => {
            mockLotesRepository.actualizar_lote.mockRejectedValue(
                new Error('Error de conexión a base de datos')
            );

            await expect(
                InventarioFrutaSinProcesarController.put_inventarios_frutaSinProcesar_directoNacional(mockReq)
            ).rejects.toThrow('Error de conexión a base de datos');
        });

        test('debería propagar error si modificarRestarInventarioFrutaSinProocesar falla', async () => {
            mockInventariosService.modificarRestarInventarioFrutaSinProocesar.mockRejectedValue(
                new Error('El lote ya no se encuentra en el inventario')
            );

            await expect(
                InventarioFrutaSinProcesarController.put_inventarios_frutaSinProcesar_directoNacional(mockReq)
            ).rejects.toThrow('ya no se encuentra en el inventario');
        });
    });

    // ============================================================
    // TEST GROUP 3: VALIDACIÓN ZOD - CAMPO action
    // ============================================================
    describe('Validación Zod - Campo action', () => {

        test('debería rechazar si action no es el literal esperado', async () => {
            mockReq.data.action = 'otra_accion_maliciosa';

            await expect(
                InventarioFrutaSinProcesarController.put_inventarios_frutaSinProcesar_directoNacional(mockReq)
            ).rejects.toThrow(ZodError);
        });

        test('debería rechazar si action es null', async () => {
            mockReq.data.action = null;

            await expect(
                InventarioFrutaSinProcesarController.put_inventarios_frutaSinProcesar_directoNacional(mockReq)
            ).rejects.toThrow(ZodError);
        });

        test('debería rechazar si action es undefined', async () => {
            delete mockReq.data.action;

            await expect(
                InventarioFrutaSinProcesarController.put_inventarios_frutaSinProcesar_directoNacional(mockReq)
            ).rejects.toThrow(ZodError);
        });

        test('debería rechazar si action es un número', async () => {
            mockReq.data.action = 12345;

            await expect(
                InventarioFrutaSinProcesarController.put_inventarios_frutaSinProcesar_directoNacional(mockReq)
            ).rejects.toThrow(ZodError);
        });

        test('debería rechazar si action tiene mayúsculas diferentes', async () => {
            mockReq.data.action = 'PUT_INVENTARIOS_FRUTASINPROCESAR_DIRECTONACIONAL';

            await expect(
                InventarioFrutaSinProcesarController.put_inventarios_frutaSinProcesar_directoNacional(mockReq)
            ).rejects.toThrow(ZodError);
        });
    });

    // ============================================================
    // TEST GROUP 4: VALIDACIÓN ZOD - CAMPO data.cliente
    // ============================================================
    describe('Validación Zod - Campo data.cliente', () => {

        test('debería rechazar si cliente no es un ObjectId válido', async () => {
            mockReq.data.data.cliente = 'no-es-objectid-valido';

            await expect(
                InventarioFrutaSinProcesarController.put_inventarios_frutaSinProcesar_directoNacional(mockReq)
            ).rejects.toThrow(ZodError);
        });

        test('debería rechazar si cliente es muy corto', async () => {
            mockReq.data.data.cliente = '507f1f77';

            await expect(
                InventarioFrutaSinProcesarController.put_inventarios_frutaSinProcesar_directoNacional(mockReq)
            ).rejects.toThrow(ZodError);
        });

        test('debería rechazar si cliente tiene caracteres no hexadecimales', async () => {
            mockReq.data.data.cliente = '507f1f77bcf86cd79943901Z';

            await expect(
                InventarioFrutaSinProcesarController.put_inventarios_frutaSinProcesar_directoNacional(mockReq)
            ).rejects.toThrow(ZodError);
        });

        test('debería rechazar si cliente es null', async () => {
            mockReq.data.data.cliente = null;

            await expect(
                InventarioFrutaSinProcesarController.put_inventarios_frutaSinProcesar_directoNacional(mockReq)
            ).rejects.toThrow(ZodError);
        });

        test('debería rechazar si cliente es undefined', async () => {
            delete mockReq.data.data.cliente;

            await expect(
                InventarioFrutaSinProcesarController.put_inventarios_frutaSinProcesar_directoNacional(mockReq)
            ).rejects.toThrow(ZodError);
        });

        test('debería rechazar si cliente es un array', async () => {
            mockReq.data.data.cliente = [VALID_OBJECT_ID];

            await expect(
                InventarioFrutaSinProcesarController.put_inventarios_frutaSinProcesar_directoNacional(mockReq)
            ).rejects.toThrow(ZodError);
        });

        test('debería aceptar ObjectId en mayúsculas', async () => {
            mockReq.data.data.cliente = '507F1F77BCF86CD799439011';

            await expect(
                InventarioFrutaSinProcesarController.put_inventarios_frutaSinProcesar_directoNacional(mockReq)
            ).resolves.not.toThrow(ZodError);
        });
    });

    // ============================================================
    // TEST GROUP 5: VALIDACIÓN ZOD - CAMPO data.canastillas
    // ============================================================
    describe('Validación Zod - Campo data.canastillas', () => {

        test('debería rechazar si canastillas es 0', async () => {
            mockReq.data.data.canastillas = 0;

            await expect(
                InventarioFrutaSinProcesarController.put_inventarios_frutaSinProcesar_directoNacional(mockReq)
            ).rejects.toThrow(ZodError);
        });

        test('debería rechazar si canastillas es negativo', async () => {
            mockReq.data.data.canastillas = -5;

            await expect(
                InventarioFrutaSinProcesarController.put_inventarios_frutaSinProcesar_directoNacional(mockReq)
            ).rejects.toThrow(ZodError);
        });

        test('debería rechazar si canastillas es null', async () => {
            mockReq.data.data.canastillas = null;

            await expect(
                InventarioFrutaSinProcesarController.put_inventarios_frutaSinProcesar_directoNacional(mockReq)
            ).rejects.toThrow(ZodError);
        });

        test('debería rechazar si canastillas es undefined', async () => {
            delete mockReq.data.data.canastillas;

            await expect(
                InventarioFrutaSinProcesarController.put_inventarios_frutaSinProcesar_directoNacional(mockReq)
            ).rejects.toThrow(ZodError);
        });

        test('debería aceptar canastillas como string numérico (z.coerce)', async () => {
            mockReq.data.data.canastillas = '10';
            mockReq.data.lote.kilos = 1000;

            await expect(
                InventarioFrutaSinProcesarController.put_inventarios_frutaSinProcesar_directoNacional(mockReq)
            ).resolves.not.toThrow(ZodError);
        });

        test('debería rechazar si canastillas es string no numérico', async () => {
            mockReq.data.data.canastillas = 'diez';

            await expect(
                InventarioFrutaSinProcesarController.put_inventarios_frutaSinProcesar_directoNacional(mockReq)
            ).rejects.toThrow(ZodError);
        });

        test('debería rechazar si canastillas es un objeto', async () => {
            mockReq.data.data.canastillas = { value: 10 };

            await expect(
                InventarioFrutaSinProcesarController.put_inventarios_frutaSinProcesar_directoNacional(mockReq)
            ).rejects.toThrow(ZodError);
        });

        test('debería rechazar si canastillas es NaN', async () => {
            mockReq.data.data.canastillas = NaN;

            await expect(
                InventarioFrutaSinProcesarController.put_inventarios_frutaSinProcesar_directoNacional(mockReq)
            ).rejects.toThrow(ZodError);
        });

        test('debería aceptar canastillas = 1 (mínimo válido)', async () => {
            mockReq.data.data.canastillas = 1;
            mockReq.data.lote.kilosTotales = 1000;

            await expect(
                InventarioFrutaSinProcesarController.put_inventarios_frutaSinProcesar_directoNacional(mockReq)
            ).resolves.not.toThrow(ZodError);
        });

        test('debería aceptar canastillas muy grandes', async () => {
            mockReq.data.data.canastillas = 999999;
            mockReq.data.lote.kilos = 999999999;

            await expect(
                InventarioFrutaSinProcesarController.put_inventarios_frutaSinProcesar_directoNacional(mockReq)
            ).resolves.not.toThrow(ZodError);
        });
    });

    // ============================================================
    // TEST GROUP 6: VALIDACIÓN ZOD - CAMPOS TEXTO REQUERIDOS
    // ============================================================
    describe('Validación Zod - Campos de texto requeridos', () => {

        test('debería rechazar si placa está vacía', async () => {
            mockReq.data.data.placa = '';

            await expect(
                InventarioFrutaSinProcesarController.put_inventarios_frutaSinProcesar_directoNacional(mockReq)
            ).rejects.toThrow(ZodError);
        });

        test('debería rechazar si placa es null', async () => {
            mockReq.data.data.placa = null;

            await expect(
                InventarioFrutaSinProcesarController.put_inventarios_frutaSinProcesar_directoNacional(mockReq)
            ).rejects.toThrow(ZodError);
        });

        test('debería rechazar si nombreConductor está vacío', async () => {
            mockReq.data.data.nombreConductor = '';

            await expect(
                InventarioFrutaSinProcesarController.put_inventarios_frutaSinProcesar_directoNacional(mockReq)
            ).rejects.toThrow(ZodError);
        });

        test('debería rechazar si nombreConductor es undefined', async () => {
            delete mockReq.data.data.nombreConductor;

            await expect(
                InventarioFrutaSinProcesarController.put_inventarios_frutaSinProcesar_directoNacional(mockReq)
            ).rejects.toThrow(ZodError);
        });

        test('debería rechazar si telefono está vacío', async () => {
            mockReq.data.data.telefono = '';

            await expect(
                InventarioFrutaSinProcesarController.put_inventarios_frutaSinProcesar_directoNacional(mockReq)
            ).rejects.toThrow(ZodError);
        });

        test('debería rechazar si cedula está vacía', async () => {
            mockReq.data.data.cedula = '';

            await expect(
                InventarioFrutaSinProcesarController.put_inventarios_frutaSinProcesar_directoNacional(mockReq)
            ).rejects.toThrow(ZodError);
        });

        test('debería rechazar si remision está vacía', async () => {
            mockReq.data.data.remision = '';

            await expect(
                InventarioFrutaSinProcesarController.put_inventarios_frutaSinProcesar_directoNacional(mockReq)
            ).rejects.toThrow(ZodError);
        });
    });

    // ============================================================
    // TEST GROUP 7: VALIDACIÓN ZOD - CAMPO lote
    // ============================================================
    describe('Validación Zod - Campo lote', () => {

        test('debería rechazar si lote._id no es ObjectId válido', async () => {
            mockReq.data.lote._id = 'no-valido';

            await expect(
                InventarioFrutaSinProcesarController.put_inventarios_frutaSinProcesar_directoNacional(mockReq)
            ).rejects.toThrow(ZodError);
        });

        test('debería rechazar si lote es null', async () => {
            mockReq.data.lote = null;

            await expect(
                InventarioFrutaSinProcesarController.put_inventarios_frutaSinProcesar_directoNacional(mockReq)
            ).rejects.toThrow(ZodError);
        });

        test('debería rechazar si lote es undefined', async () => {
            delete mockReq.data.lote;

            await expect(
                InventarioFrutaSinProcesarController.put_inventarios_frutaSinProcesar_directoNacional(mockReq)
            ).rejects.toThrow(ZodError);
        });

        test('debería rechazar si lote._id es undefined', async () => {
            delete mockReq.data.lote._id;

            await expect(
                InventarioFrutaSinProcesarController.put_inventarios_frutaSinProcesar_directoNacional(mockReq)
            ).rejects.toThrow(ZodError);
        });

        test('debería permitir campos adicionales en lote (passthrough)', async () => {
            mockReq.data.lote.campoExtra = 'valor-extra';
            mockReq.data.lote.otroCampo = 12345;

            await expect(
                InventarioFrutaSinProcesarController.put_inventarios_frutaSinProcesar_directoNacional(mockReq)
            ).resolves.not.toThrow(ZodError);
        });
    });

    // ============================================================
    // TEST GROUP 8: VALIDACIÓN ZOD - CAMPO __v (versión)
    // ============================================================
    describe('Validación Zod - Campo __v (versión)', () => {

        test('debería rechazar si __v no está presente', async () => {
            delete mockReq.data.__v;

            await expect(
                InventarioFrutaSinProcesarController.put_inventarios_frutaSinProcesar_directoNacional(mockReq)
            ).rejects.toThrow(ZodError);
        });

        test('debería rechazar si __v es null', async () => {
            mockReq.data.__v = null;

            await expect(
                InventarioFrutaSinProcesarController.put_inventarios_frutaSinProcesar_directoNacional(mockReq)
            ).rejects.toThrow(ZodError);
        });

        test('debería rechazar si __v es un string', async () => {
            mockReq.data.__v = '5';

            await expect(
                InventarioFrutaSinProcesarController.put_inventarios_frutaSinProcesar_directoNacional(mockReq)
            ).rejects.toThrow(ZodError);
        });

        test('debería aceptar __v = 0', async () => {
            mockReq.data.__v = 0;

            await expect(
                InventarioFrutaSinProcesarController.put_inventarios_frutaSinProcesar_directoNacional(mockReq)
            ).resolves.not.toThrow(ZodError);

            expect(mockInventariosService.check_inventarioVersion).toHaveBeenCalledWith(
                expect.any(String),
                0
            );
        });

        test('debería aceptar __v muy alto', async () => {
            mockReq.data.__v = 999999999;

            await expect(
                InventarioFrutaSinProcesarController.put_inventarios_frutaSinProcesar_directoNacional(mockReq)
            ).resolves.not.toThrow(ZodError);
        });
    });

    // ============================================================
    // TEST GROUP 9: SEGURIDAD - NoSQL INJECTION
    // ============================================================
    describe('Seguridad - Intentos de NoSQL Injection', () => {

        test('debería rechazar operador $ne en cliente', async () => {
            mockReq.data.data.cliente = { $ne: null };

            await expect(
                InventarioFrutaSinProcesarController.put_inventarios_frutaSinProcesar_directoNacional(mockReq)
            ).rejects.toThrow(ZodError);
        });

        test('debería rechazar operador $gt en lote._id', async () => {
            mockReq.data.lote._id = { $gt: '' };

            await expect(
                InventarioFrutaSinProcesarController.put_inventarios_frutaSinProcesar_directoNacional(mockReq)
            ).rejects.toThrow(ZodError);
        });

        test('debería rechazar operador $regex en placa', async () => {
            mockReq.data.data.placa = { $regex: '.*' };

            await expect(
                InventarioFrutaSinProcesarController.put_inventarios_frutaSinProcesar_directoNacional(mockReq)
            ).rejects.toThrow(ZodError);
        });

        test('debería rechazar operador $where en canastillas', async () => {
            mockReq.data.data.canastillas = { $where: 'return true' };

            await expect(
                InventarioFrutaSinProcesarController.put_inventarios_frutaSinProcesar_directoNacional(mockReq)
            ).rejects.toThrow(ZodError);
        });

        test('debería rechazar operador $or en __v', async () => {
            mockReq.data.__v = { $or: [{ $gt: 0 }] };

            await expect(
                InventarioFrutaSinProcesarController.put_inventarios_frutaSinProcesar_directoNacional(mockReq)
            ).rejects.toThrow(ZodError);
        });

        test('debería rechazar operador $exists en nombreConductor', async () => {
            mockReq.data.data.nombreConductor = { $exists: true };

            await expect(
                InventarioFrutaSinProcesarController.put_inventarios_frutaSinProcesar_directoNacional(mockReq)
            ).rejects.toThrow(ZodError);
        });

        test('debería rechazar operador $in en cedula', async () => {
            mockReq.data.data.cedula = { $in: ['123', '456'] };

            await expect(
                InventarioFrutaSinProcesarController.put_inventarios_frutaSinProcesar_directoNacional(mockReq)
            ).rejects.toThrow(ZodError);
        });

        test('debería rechazar operador $elemMatch en data', async () => {
            mockReq.data.data = { $elemMatch: { cliente: VALID_OBJECT_ID } };

            await expect(
                InventarioFrutaSinProcesarController.put_inventarios_frutaSinProcesar_directoNacional(mockReq)
            ).rejects.toThrow(ZodError);
        });
    });

    // ============================================================
    // TEST GROUP 10: SEGURIDAD - PROTOTYPE POLLUTION
    // ============================================================
    describe('Seguridad - Prototype Pollution', () => {

        test('no debería contaminar Object.prototype con __proto__', async () => {
            const originalPrototype = { ...Object.prototype };
            mockReq.data.data.__proto__ = { malicious: true };

            try {
                await InventarioFrutaSinProcesarController.put_inventarios_frutaSinProcesar_directoNacional(mockReq);
            } catch (e) {
                // Puede fallar, está bien
            }

            expect({}.malicious).toBeUndefined();
            expect(Object.prototype).toEqual(originalPrototype);
        });

        test('no debería contaminar con constructor.prototype', async () => {
            mockReq.data.data['constructor'] = { prototype: { pwned: true } };

            try {
                await InventarioFrutaSinProcesarController.put_inventarios_frutaSinProcesar_directoNacional(mockReq);
            } catch (e) {
                // Puede fallar validación
            }

            expect({}.pwned).toBeUndefined();
        });

        test('debería manejar __proto__ en lote sin contaminar', async () => {
            mockReq.data.lote.__proto__ = { hacked: true };

            try {
                await InventarioFrutaSinProcesarController.put_inventarios_frutaSinProcesar_directoNacional(mockReq);
            } catch (e) {
                // Puede fallar
            }

            expect({}.hacked).toBeUndefined();
        });
    });

    // ============================================================
    // TEST GROUP 11: SEGURIDAD - XSS Y CARACTERES ESPECIALES
    // ============================================================
    describe('Seguridad - XSS y Caracteres Especiales', () => {

        test('debería almacenar script tags como texto plano sin ejecutar', async () => {
            mockReq.data.data.nombreConductor = '<script>alert("xss")</script>';

            await InventarioFrutaSinProcesarController.put_inventarios_frutaSinProcesar_directoNacional(mockReq);

            expect(mockLotesRepository.actualizar_lote).toHaveBeenCalledWith(
                expect.any(Object),
                expect.objectContaining({
                    infoSalidaDirectoNacional: expect.objectContaining({
                        nombreConductor: '<script>alert("xss")</script>'
                    })
                }),
                expect.any(Object)
            );
        });

        test('debería manejar event handlers en texto', async () => {
            mockReq.data.data.nombreConductor = '<img src=x onerror=alert(1)>';

            await expect(
                InventarioFrutaSinProcesarController.put_inventarios_frutaSinProcesar_directoNacional(mockReq)
            ).resolves.not.toThrow(ZodError);
        });

        test('debería manejar caracteres unicode', async () => {
            mockReq.data.data.nombreConductor = 'José María Ñoño 你好 🚗';

            await expect(
                InventarioFrutaSinProcesarController.put_inventarios_frutaSinProcesar_directoNacional(mockReq)
            ).resolves.not.toThrow();
        });

        test('debería manejar strings muy largos', async () => {
            mockReq.data.data.nombreConductor = 'A'.repeat(10000);

            await expect(
                InventarioFrutaSinProcesarController.put_inventarios_frutaSinProcesar_directoNacional(mockReq)
            ).resolves.not.toThrow(ZodError);
        });

        test('debería manejar caracteres de control', async () => {
            mockReq.data.data.nombreConductor = 'Juan\x00Pérez\x1f';

            await expect(
                InventarioFrutaSinProcesarController.put_inventarios_frutaSinProcesar_directoNacional(mockReq)
            ).resolves.not.toThrow(ZodError);
        });

        test('debería manejar newlines y tabs', async () => {
            mockReq.data.data.nombreConductor = 'Juan\nPérez\tGómez';

            await expect(
                InventarioFrutaSinProcesarController.put_inventarios_frutaSinProcesar_directoNacional(mockReq)
            ).resolves.not.toThrow(ZodError);
        });

        test('debería manejar SQL injection payloads como texto', async () => {
            mockReq.data.data.nombreConductor = "'; DROP TABLE users; --";

            await expect(
                InventarioFrutaSinProcesarController.put_inventarios_frutaSinProcesar_directoNacional(mockReq)
            ).resolves.not.toThrow(ZodError);
        });
    });

    // ============================================================
    // TEST GROUP 12: DATOS MALFORMADOS
    // ============================================================
    describe('Datos Malformados', () => {

        test('debería rechazar si req.data es null', async () => {
            mockReq.data = null;

            await expect(
                InventarioFrutaSinProcesarController.put_inventarios_frutaSinProcesar_directoNacional(mockReq)
            ).rejects.toThrow();
        });

        test('debería rechazar si req.data es undefined', async () => {
            delete mockReq.data;

            await expect(
                InventarioFrutaSinProcesarController.put_inventarios_frutaSinProcesar_directoNacional(mockReq)
            ).rejects.toThrow();
        });

        test('debería rechazar si req.data es un string', async () => {
            mockReq.data = 'string-malicioso';

            await expect(
                InventarioFrutaSinProcesarController.put_inventarios_frutaSinProcesar_directoNacional(mockReq)
            ).rejects.toThrow(ZodError);
        });

        test('debería rechazar si req.data es un array', async () => {
            mockReq.data = [createValidRequest().data];

            await expect(
                InventarioFrutaSinProcesarController.put_inventarios_frutaSinProcesar_directoNacional(mockReq)
            ).rejects.toThrow(ZodError);
        });

        test('debería rechazar si req.data.data es un array', async () => {
            mockReq.data.data = [{ cliente: VALID_OBJECT_ID }];

            await expect(
                InventarioFrutaSinProcesarController.put_inventarios_frutaSinProcesar_directoNacional(mockReq)
            ).rejects.toThrow(ZodError);
        });

        test('debería rechazar si req.data.data es null', async () => {
            mockReq.data.data = null;

            await expect(
                InventarioFrutaSinProcesarController.put_inventarios_frutaSinProcesar_directoNacional(mockReq)
            ).rejects.toThrow(ZodError);
        });

        test('debería manejar req.user sin _id', async () => {
            delete mockReq.user._id;

            // Fallará en la lógica de negocio, no en Zod
            await expect(
                InventarioFrutaSinProcesarController.put_inventarios_frutaSinProcesar_directoNacional(mockReq)
            ).rejects.toThrow();
        });

        test('debería manejar req.user null', async () => {
            mockReq.user = null;

            await expect(
                InventarioFrutaSinProcesarController.put_inventarios_frutaSinProcesar_directoNacional(mockReq)
            ).rejects.toThrow();
        });
    });

    // ============================================================
    // TEST GROUP 13: TIPOS DE DATOS INCORRECTOS
    // ============================================================
    describe('Tipos de Datos Incorrectos', () => {

        test('debería rechazar si cliente es un número', async () => {
            mockReq.data.data.cliente = 12345;

            await expect(
                InventarioFrutaSinProcesarController.put_inventarios_frutaSinProcesar_directoNacional(mockReq)
            ).rejects.toThrow(ZodError);
        });

        test('debería rechazar si placa es un número', async () => {
            mockReq.data.data.placa = 123456;

            await expect(
                InventarioFrutaSinProcesarController.put_inventarios_frutaSinProcesar_directoNacional(mockReq)
            ).rejects.toThrow(ZodError);
        });

        test('debería rechazar si nombreConductor es un número', async () => {
            mockReq.data.data.nombreConductor = 12345;

            await expect(
                InventarioFrutaSinProcesarController.put_inventarios_frutaSinProcesar_directoNacional(mockReq)
            ).rejects.toThrow(ZodError);
        });

        test('debería rechazar si telefono es un número', async () => {
            mockReq.data.data.telefono = 3001234567;

            await expect(
                InventarioFrutaSinProcesarController.put_inventarios_frutaSinProcesar_directoNacional(mockReq)
            ).rejects.toThrow(ZodError);
        });

        test('debería rechazar si lote es un string', async () => {
            mockReq.data.lote = VALID_OBJECT_ID_2;

            await expect(
                InventarioFrutaSinProcesarController.put_inventarios_frutaSinProcesar_directoNacional(mockReq)
            ).rejects.toThrow(ZodError);
        });

        test('debería rechazar si __v es boolean', async () => {
            mockReq.data.__v = true;

            await expect(
                InventarioFrutaSinProcesarController.put_inventarios_frutaSinProcesar_directoNacional(mockReq)
            ).rejects.toThrow(ZodError);
        });

        test('debería rechazar si __v es un array', async () => {
            mockReq.data.__v = [5];

            await expect(
                InventarioFrutaSinProcesarController.put_inventarios_frutaSinProcesar_directoNacional(mockReq)
            ).rejects.toThrow(ZodError);
        });
    });

    // ============================================================
    // TEST GROUP 14: CONCURRENCIA Y RACE CONDITIONS
    // ============================================================
    describe('Concurrencia y Race Conditions', () => {

        test('debería detectar cambio de versión entre llamadas consecutivas', async () => {
            // Primera llamada exitosa
            await InventarioFrutaSinProcesarController.put_inventarios_frutaSinProcesar_directoNacional(mockReq);

            // Segunda llamada: versión cambió
            mockInventariosService.check_inventarioVersion.mockRejectedValue(
                new Error('La versión del inventario ha cambiado')
            );

            await expect(
                InventarioFrutaSinProcesarController.put_inventarios_frutaSinProcesar_directoNacional(mockReq)
            ).rejects.toThrow('versión del inventario ha cambiado');
        });

        test('debería detectar si lote fue agregado a orden de vaceo durante proceso', async () => {
            mockInventariosService.item_in_ordenVaceo.mockRejectedValue(
                new Error('EL lote ya está en la orden de vaceo')
            );

            await expect(
                InventarioFrutaSinProcesarController.put_inventarios_frutaSinProcesar_directoNacional(mockReq)
            ).rejects.toThrow('orden de vaceo');
        });

        test('debería manejar timeout en check_inventarioVersion', async () => {
            mockInventariosService.check_inventarioVersion.mockRejectedValue(
                new Error('Operation timed out')
            );

            await expect(
                InventarioFrutaSinProcesarController.put_inventarios_frutaSinProcesar_directoNacional(mockReq)
            ).rejects.toThrow('Operation timed out');
        });
    });

    // ============================================================
    // TEST GROUP 15: VALORES LÍMITE NUMÉRICOS
    // ============================================================
    describe('Valores Límite Numéricos', () => {

        test('debería manejar Number.MAX_SAFE_INTEGER en canastillas', async () => {
            mockReq.data.data.canastillas = Number.MAX_SAFE_INTEGER;
            mockReq.data.lote.kilo = Number.MAX_VALUE;

            // Pasará Zod pero fallará en lógica (kilos > kilosTotales probablemente)
            await expect(
                InventarioFrutaSinProcesarController.put_inventarios_frutaSinProcesar_directoNacional(mockReq)
            ).rejects.toThrow();
        });

        test('debería rechazar Infinity en canastillas', async () => {
            mockReq.data.data.canastillas = Infinity;

            await expect(
                InventarioFrutaSinProcesarController.put_inventarios_frutaSinProcesar_directoNacional(mockReq)
            ).rejects.toThrow();
        });

        test('debería rechazar -Infinity en canastillas', async () => {
            mockReq.data.data.canastillas = -Infinity;

            await expect(
                InventarioFrutaSinProcesarController.put_inventarios_frutaSinProcesar_directoNacional(mockReq)
            ).rejects.toThrow();
        });

        test('debería manejar números flotantes muy pequeños', async () => {
            mockReq.data.lote.promedio = 0.0001;
            mockReq.data.data.canastillas = 1;
            mockReq.data.lote.kilosTotales = 1000;

            await expect(
                InventarioFrutaSinProcesarController.put_inventarios_frutaSinProcesar_directoNacional(mockReq)
            ).resolves.not.toThrow();
        });

        test('debería manejar __v negativo', async () => {
            mockReq.data.__v = -1;

            // Zod z.number() acepta negativos, pero es un caso edge
            await expect(
                InventarioFrutaSinProcesarController.put_inventarios_frutaSinProcesar_directoNacional(mockReq)
            ).resolves.not.toThrow(ZodError);
        });
    });
});
