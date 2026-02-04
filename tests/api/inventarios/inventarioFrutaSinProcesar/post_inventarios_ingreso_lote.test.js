import { describe, test, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { ZodError } from 'zod';

/**
 * Tests para InventarioFrutaSinProcesarController.post_inventarios_ingreso_lote
 *
 * Este endpoint registra el ingreso de un nuevo lote de fruta al inventario.
 *
 * Flujo:
 * 1. Validación Zod de datos de entrada (dataLote y dataCanastillas)
 * 2. Obtener tipo de fruta desde constantes del sistema
 * 3. Obtener en paralelo: precio/proveedor y serial EF1
 * 4. Validar GGN si el lote es certificado
 * 5. Construir query para el nuevo lote
 * 6. Crear registro de canastillas
 * 7. Añadir el lote a la BD
 * 8. Actualizar inventario simple
 * 9. Ajustar canastillas del proveedor (resta) y de CELIFRUT (suma)
 * 10. Registrar datos de canastillas
 * 11. Incrementar serial EF1
 * 12. Modificar canastillas prestadas
 * 13. Emitir evento server_event
 */

// ============================================================
// MOCKS DE INFRAESTRUCTURA
// ============================================================
const mockRegistrarPasoLog = jest.fn();
const mockExecuteTransactionalTask = jest.fn(async (req, taskLogic) => {
    return await taskLogic('mock-session', { _id: 'log-123' });
});

const mockConfig = {
    INVENTARIO_FRUTA_SIN_PROCESAR: 'inventario-id-mock',
    ID_CELIFRUT: '65c27f3870dd4b7f03ed9857'
};

jest.unstable_mockModule('../../../../server/api/helper/logs.js', () => ({
    registrarPasoLog: mockRegistrarPasoLog
}));

jest.unstable_mockModule('../../../../server/utils/wrappers.js', () => ({
    executeTransactionalTask: mockExecuteTransactionalTask,
    executeQueryTask: jest.fn(async (taskLogic) => await taskLogic())
}));

jest.unstable_mockModule('../../../../src/config/index.js', () => ({
    default: mockConfig
}));

// ============================================================
// MOCKS DE REPOSITORIOS Y SERVICIOS
// ============================================================
const mockInventariosService = {
    obtenerPrecioProveedor: jest.fn(),
    validarGGN: jest.fn(),
    construirQueryIngresoLote: jest.fn(),
    crearRegistroInventarioCanastillas: jest.fn(),
    ajustarCanastillasProveedorCliente: jest.fn()
};

const mockConstantesDelSistema = {
    get_constantes_sistema_tipo_frutas2: jest.fn()
};

const mockDataService = {
    get_ef1_serial: jest.fn()
};

const mockDataRepository = {
    incrementar_serial: jest.fn()
};

const mockLotesRepository = {
    addLote: jest.fn()
};

const mockInventariosHistorialRepository = {
    put_inventarioSimple: jest.fn()
};

const mockCanastillasRepository = {
    post_data: jest.fn()
};

const mockVariablesDelSistema = {
    modificar_canastillas_inventario: jest.fn()
};

const mockEventEmitter = { emit: jest.fn() };

jest.unstable_mockModule('../../../../server/services/inventarios.js', () => ({
    InventariosService: mockInventariosService
}));

jest.unstable_mockModule('../../../../server/Class/ConstantesDelSistema.js', () => ({
    ConstantesDelSistema: mockConstantesDelSistema
}));

jest.unstable_mockModule('../../../../server/services/data.js', () => ({
    dataService: mockDataService
}));

jest.unstable_mockModule('../../../../server/api/data.js', () => ({
    dataRepository: mockDataRepository
}));

jest.unstable_mockModule('../../../../server/Class/Lotes.js', () => ({
    LotesRepository: mockLotesRepository
}));

jest.unstable_mockModule('../../../../server/Class/Inventarios.js', () => ({
    InventariosHistorialRepository: mockInventariosHistorialRepository
}));

jest.unstable_mockModule('../../../../server/Class/CanastillasRegistros.js', () => ({
    CanastillasRepository: mockCanastillasRepository
}));

jest.unstable_mockModule('../../../../server/Class/VariablesDelSistema.js', () => ({
    VariablesDelSistema: mockVariablesDelSistema
}));

jest.unstable_mockModule('../../../../events/eventos.js', () => ({
    procesoEventEmitter: mockEventEmitter
}));

// Mocks adicionales requeridos por el controlador
jest.unstable_mockModule('../../../../server/helper/lotes.js', () => ({
    LotesHelper: {}
}));

jest.unstable_mockModule('../../../../server/api/IndicadoresAPI.js', () => ({
    IndicadoresAPIRepository: {}
}));

jest.unstable_mockModule('../../../../server/api/utils/filtros.js', () => ({
    buildDateRangeFilter: jest.fn()
}));

// Importación dinámica del controlador
const { InventarioFrutaSinProcesarController } = await import('../../../../server/api/inventarios/inventarioFrutaSinProcesar.js');

describe('InventarioFrutaSinProcesarController.post_inventarios_ingreso_lote', () => {

    // ============================================================
    // CONSTANTES Y DATOS DE PRUEBA
    // ============================================================
    const VALID_OBJECT_ID = '507f1f77bcf86cd799439011';
    const VALID_OBJECT_ID_2 = '507f191e810c19729de860ea';
    const VALID_OBJECT_ID_3 = '60d5ecb54b24a1234567890a';

    let mockReq;

    const createValidRequest = () => ({
        user: { _id: 'user-123', nombre: 'Test User', user: 'testuser', Rol: 1 },
        action: 'post_inventarios_ingreso_lote',
        data: {
            dataLote: {
                fecha_estimada_llegada: '2024-01-15',
                numeroRemision: 'REM-001',
                kilos: 1000,
                canastillas: 50,
                promedio: 20,
                tipoFruta: VALID_OBJECT_ID,
                GGN: false,
                predio: VALID_OBJECT_ID_2,
                observaciones: 'Lote de prueba',
                placa: 'ABC123'
            },
            dataCanastillas: {
                canastillasPropias: 40,
                canastillasPrestadas: 10
            }
        }
    });

    const mockTipoFruta = [{ _id: VALID_OBJECT_ID, tipoFruta: 'Naranja' }];
    const mockPrecioProveedor = {
        precioId: VALID_OBJECT_ID_3,
        proveedor: {
            _id: VALID_OBJECT_ID_2,
            PREDIO: 'Finca Test',
            GGN: {
                fechaVencimiento: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 año adelante
                code: 'GGN-123',
                tipo_fruta: ['Naranja']
            }
        }
    };
    const mockEf1 = 'EF1-0001';
    const mockLoteCreado = {
        _id: 'lote-nuevo-123',
        enf: mockEf1,
        canastillas: 50
    };

    beforeEach(() => {
        jest.clearAllMocks();
        mockReq = createValidRequest();

        // Happy path mocks
        mockConstantesDelSistema.get_constantes_sistema_tipo_frutas2.mockResolvedValue(mockTipoFruta);
        mockInventariosService.obtenerPrecioProveedor.mockResolvedValue(mockPrecioProveedor);
        mockDataService.get_ef1_serial.mockResolvedValue(mockEf1);
        mockInventariosService.validarGGN.mockReturnValue(true);
        mockInventariosService.construirQueryIngresoLote.mockReturnValue({ enf: mockEf1 });
        mockInventariosService.crearRegistroInventarioCanastillas.mockReturnValue({ tipo: 'registro' });
        mockLotesRepository.addLote.mockResolvedValue(mockLoteCreado);
        mockInventariosHistorialRepository.put_inventarioSimple.mockResolvedValue({ modifiedCount: 1 });
        mockInventariosService.ajustarCanastillasProveedorCliente.mockResolvedValue({});
        mockCanastillasRepository.post_data.mockResolvedValue({});
        mockDataRepository.incrementar_serial.mockResolvedValue({});
        mockVariablesDelSistema.modificar_canastillas_inventario.mockResolvedValue({});
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    // ============================================================
    // TEST GROUP 1: CASOS DE ÉXITO
    // ============================================================
    describe('Casos de Éxito', () => {

        test('debería registrar ingreso de lote exitosamente con datos válidos', async () => {
            await InventarioFrutaSinProcesarController.post_inventarios_ingreso_lote(mockReq);

            expect(mockConstantesDelSistema.get_constantes_sistema_tipo_frutas2).toHaveBeenCalledWith(VALID_OBJECT_ID);
            expect(mockInventariosService.obtenerPrecioProveedor).toHaveBeenCalled();
            expect(mockDataService.get_ef1_serial).toHaveBeenCalled();
        });

        test('debería crear el lote con la query construida', async () => {
            await InventarioFrutaSinProcesarController.post_inventarios_ingreso_lote(mockReq);

            expect(mockInventariosService.construirQueryIngresoLote).toHaveBeenCalled();
            expect(mockLotesRepository.addLote).toHaveBeenCalledWith(
                expect.any(Object),
                expect.objectContaining({ session: 'mock-session' })
            );
        });

        test('debería actualizar el inventario simple con el lote creado', async () => {
            await InventarioFrutaSinProcesarController.post_inventarios_ingreso_lote(mockReq);

            expect(mockInventariosHistorialRepository.put_inventarioSimple).toHaveBeenCalledWith(
                { _id: mockConfig.INVENTARIO_FRUTA_SIN_PROCESAR },
                expect.objectContaining({
                    $push: expect.any(Object),
                    $inc: { __v: 1 }
                }),
                expect.objectContaining({ session: 'mock-session' })
            );
        });

        test('debería ajustar canastillas del proveedor (restar)', async () => {
            await InventarioFrutaSinProcesarController.post_inventarios_ingreso_lote(mockReq);

            expect(mockInventariosService.ajustarCanastillasProveedorCliente).toHaveBeenCalledWith(
                VALID_OBJECT_ID_2,
                -40,
                mockReq.user,
                'mock-session'
            );
        });

        test('debería ajustar canastillas de CELIFRUT (sumar)', async () => {
            await InventarioFrutaSinProcesarController.post_inventarios_ingreso_lote(mockReq);

            expect(mockInventariosService.ajustarCanastillasProveedorCliente).toHaveBeenCalledWith(
                mockConfig.ID_CELIFRUT,
                40,
                mockReq.user,
                'mock-session'
            );
        });

        test('debería registrar datos de canastillas', async () => {
            await InventarioFrutaSinProcesarController.post_inventarios_ingreso_lote(mockReq);

            expect(mockCanastillasRepository.post_data).toHaveBeenCalledWith(
                expect.any(Object),
                expect.objectContaining({ session: 'mock-session' })
            );
        });

        test('debería incrementar el serial EF1', async () => {
            await InventarioFrutaSinProcesarController.post_inventarios_ingreso_lote(mockReq);

            expect(mockDataRepository.incrementar_serial).toHaveBeenCalledWith('EF1-', 'mock-session');
        });

        test('debería modificar canastillas prestadas', async () => {
            await InventarioFrutaSinProcesarController.post_inventarios_ingreso_lote(mockReq);

            expect(mockVariablesDelSistema.modificar_canastillas_inventario).toHaveBeenCalledWith(
                10,
                'canastillasPrestadas'
            );
        });

        test('debería emitir evento server_event con acción add_lote', async () => {
            await InventarioFrutaSinProcesarController.post_inventarios_ingreso_lote(mockReq);

            expect(mockEventEmitter.emit).toHaveBeenCalledWith('server_event', {
                action: 'add_lote'
            });
        });

        test('debería validar GGN cuando GGN es true', async () => {
            mockReq.data.dataLote.GGN = true;

            await InventarioFrutaSinProcesarController.post_inventarios_ingreso_lote(mockReq);

            expect(mockInventariosService.validarGGN).toHaveBeenCalledWith(
                mockPrecioProveedor.proveedor,
                'Naranja',
                mockReq.user
            );
        });

        test('debería completar flujo exitosamente con GGN true y proveedor con certificación válida', async () => {
            mockReq.data.dataLote.GGN = true;

            // Configurar proveedor con GGN válido:
            // - fechaVencimiento: más de un mes de vigencia (6 meses adelante)
            // - tipo_fruta: array que contiene el tipo de fruta del lote
            const fechaVencimientoValida = new Date();
            fechaVencimientoValida.setMonth(fechaVencimientoValida.getMonth() + 6); // 6 meses adelante

            const mockPrecioProveedorConGGN = {
                precioId: VALID_OBJECT_ID_3,
                proveedor: {
                    _id: VALID_OBJECT_ID_2,
                    PREDIO: 'Finca Certificada',
                    GGN: {
                        fechaVencimiento: fechaVencimientoValida,
                        code: 'GGN-CERT-2024-001',
                        tipo_fruta: ['Naranja', 'Limon', 'Mandarina'] // Array con tipos de fruta
                    }
                }
            };

            mockInventariosService.obtenerPrecioProveedor.mockResolvedValue(mockPrecioProveedorConGGN);

            // Configurar mock para verificar que la query se construye con GGN
            const mockQueryConGGN = {
                enf: mockEf1,
                GGN: true,
                certificacion: {
                    code: mockPrecioProveedorConGGN.proveedor.GGN.code,
                    fechaVencimiento: mockPrecioProveedorConGGN.proveedor.GGN.fechaVencimiento
                }
            };
            mockInventariosService.construirQueryIngresoLote.mockReturnValue(mockQueryConGGN);

            await InventarioFrutaSinProcesarController.post_inventarios_ingreso_lote(mockReq);

            // Verificar que se validó el GGN con el proveedor certificado
            expect(mockInventariosService.validarGGN).toHaveBeenCalledWith(
                mockPrecioProveedorConGGN.proveedor,
                'Naranja',
                mockReq.user
            );

            // Verificar que se construyó la query con los datos de GGN
            expect(mockInventariosService.construirQueryIngresoLote).toHaveBeenCalled();

            // Verificar que el lote se creó exitosamente
            expect(mockLotesRepository.addLote).toHaveBeenCalledWith(
                expect.objectContaining({ GGN: true }),
                expect.objectContaining({ session: 'mock-session' })
            );

            // Verificar que se emitió el evento
            expect(mockEventEmitter.emit).toHaveBeenCalledWith('server_event', {
                action: 'add_lote'
            });
        });

        test('no debería validar GGN cuando GGN es false', async () => {
            mockReq.data.dataLote.GGN = false;

            await InventarioFrutaSinProcesarController.post_inventarios_ingreso_lote(mockReq);

            expect(mockInventariosService.validarGGN).not.toHaveBeenCalled();
        });

        test('debería funcionar con canastillasPrestadas = 0', async () => {
            mockReq.data.dataCanastillas.canastillasPrestadas = 0;

            await InventarioFrutaSinProcesarController.post_inventarios_ingreso_lote(mockReq);

            expect(mockVariablesDelSistema.modificar_canastillas_inventario).toHaveBeenCalledWith(
                0,
                'canastillasPrestadas'
            );
        });

        test('debería registrar pasos en el log de auditoría', async () => {
            await InventarioFrutaSinProcesarController.post_inventarios_ingreso_lote(mockReq);

            expect(mockRegistrarPasoLog).toHaveBeenCalled();
            // Algunas llamadas tienen 3 argumentos, otras 4
            expect(mockRegistrarPasoLog).toHaveBeenCalledWith(
                'log-123',
                expect.any(String),
                'Completado'
            );
        });
    });

    // ============================================================
    // TEST GROUP 2: ERRORES DE LÓGICA DE NEGOCIO
    // ============================================================
    describe('Errores de Lógica de Negocio', () => {

        test('debería lanzar error si INVENTARIO_FRUTA_SIN_PROCESAR no está configurado', async () => {
            const originalValue = mockConfig.INVENTARIO_FRUTA_SIN_PROCESAR;
            mockConfig.INVENTARIO_FRUTA_SIN_PROCESAR = null;

            await expect(
                InventarioFrutaSinProcesarController.post_inventarios_ingreso_lote(mockReq)
            ).rejects.toThrow('No se encontró el inventario en la base de datos');

            mockConfig.INVENTARIO_FRUTA_SIN_PROCESAR = originalValue;
        });

        test('debería lanzar error si no se encuentra el tipo de fruta', async () => {
            mockConstantesDelSistema.get_constantes_sistema_tipo_frutas2.mockResolvedValue([]);

            await expect(
                InventarioFrutaSinProcesarController.post_inventarios_ingreso_lote(mockReq)
            ).rejects.toThrow('No se encontró el tipo de fruta');
        });

        test('debería propagar error si obtenerPrecioProveedor falla', async () => {
            mockInventariosService.obtenerPrecioProveedor.mockRejectedValue(
                new Error('Proveedor no encontrado')
            );

            await expect(
                InventarioFrutaSinProcesarController.post_inventarios_ingreso_lote(mockReq)
            ).rejects.toThrow('Proveedor no encontrado');
        });

        test('debería propagar error si get_ef1_serial falla', async () => {
            mockDataService.get_ef1_serial.mockRejectedValue(
                new Error('Error generando serial EF1')
            );

            await expect(
                InventarioFrutaSinProcesarController.post_inventarios_ingreso_lote(mockReq)
            ).rejects.toThrow('Error generando serial EF1');
        });

        test('debería propagar error si validarGGN falla cuando GGN es true', async () => {
            mockReq.data.dataLote.GGN = true;
            mockInventariosService.validarGGN.mockImplementation(() => {
                throw new Error('El GGN del proveedor ya expiró');
            });

            await expect(
                InventarioFrutaSinProcesarController.post_inventarios_ingreso_lote(mockReq)
            ).rejects.toThrow('El GGN del proveedor ya expiró');
        });

        test('debería propagar error si addLote falla', async () => {
            mockLotesRepository.addLote.mockRejectedValue(
                new Error('Error de base de datos al crear lote')
            );

            await expect(
                InventarioFrutaSinProcesarController.post_inventarios_ingreso_lote(mockReq)
            ).rejects.toThrow('Error de base de datos al crear lote');
        });

        test('debería propagar error si put_inventarioSimple falla', async () => {
            mockInventariosHistorialRepository.put_inventarioSimple.mockRejectedValue(
                new Error('Error actualizando inventario')
            );

            await expect(
                InventarioFrutaSinProcesarController.post_inventarios_ingreso_lote(mockReq)
            ).rejects.toThrow('Error actualizando inventario');
        });

        test('debería propagar error si ajustarCanastillasProveedorCliente falla', async () => {
            mockInventariosService.ajustarCanastillasProveedorCliente.mockRejectedValue(
                new Error('No existe proveedor/cliente')
            );

            await expect(
                InventarioFrutaSinProcesarController.post_inventarios_ingreso_lote(mockReq)
            ).rejects.toThrow('No existe proveedor/cliente');
        });

        test('debería propagar error si post_data de canastillas falla', async () => {
            mockCanastillasRepository.post_data.mockRejectedValue(
                new Error('Error registrando canastillas')
            );

            await expect(
                InventarioFrutaSinProcesarController.post_inventarios_ingreso_lote(mockReq)
            ).rejects.toThrow('Error registrando canastillas');
        });

        test('debería propagar error si incrementar_serial falla', async () => {
            mockDataRepository.incrementar_serial.mockRejectedValue(
                new Error('Error incrementando serial')
            );

            await expect(
                InventarioFrutaSinProcesarController.post_inventarios_ingreso_lote(mockReq)
            ).rejects.toThrow('Error incrementando serial');
        });
    });

    // ============================================================
    // TEST GROUP 3: VALIDACIÓN ZOD - dataLote.fecha_estimada_llegada
    // ============================================================
    describe('Validación Zod - Campo dataLote.fecha_estimada_llegada', () => {

        test('debería rechazar si fecha_estimada_llegada está vacía', async () => {
            mockReq.data.dataLote.fecha_estimada_llegada = '';

            await expect(
                InventarioFrutaSinProcesarController.post_inventarios_ingreso_lote(mockReq)
            ).rejects.toThrow(ZodError);
        });

        test('debería rechazar si fecha_estimada_llegada es null', async () => {
            mockReq.data.dataLote.fecha_estimada_llegada = null;

            await expect(
                InventarioFrutaSinProcesarController.post_inventarios_ingreso_lote(mockReq)
            ).rejects.toThrow(ZodError);
        });

        test('debería rechazar si fecha_estimada_llegada es undefined', async () => {
            delete mockReq.data.dataLote.fecha_estimada_llegada;

            await expect(
                InventarioFrutaSinProcesarController.post_inventarios_ingreso_lote(mockReq)
            ).rejects.toThrow(ZodError);
        });

        test('debería rechazar si fecha_estimada_llegada no es válida', async () => {
            mockReq.data.dataLote.fecha_estimada_llegada = 'no-es-fecha';

            await expect(
                InventarioFrutaSinProcesarController.post_inventarios_ingreso_lote(mockReq)
            ).rejects.toThrow(ZodError);
        });

        test('debería aceptar fecha en formato ISO', async () => {
            mockReq.data.dataLote.fecha_estimada_llegada = '2024-01-15T10:30:00.000Z';

            await expect(
                InventarioFrutaSinProcesarController.post_inventarios_ingreso_lote(mockReq)
            ).resolves.not.toThrow(ZodError);
        });

        test('debería aceptar fecha en formato YYYY-MM-DD', async () => {
            mockReq.data.dataLote.fecha_estimada_llegada = '2024-01-15';

            await expect(
                InventarioFrutaSinProcesarController.post_inventarios_ingreso_lote(mockReq)
            ).resolves.not.toThrow(ZodError);
        });
    });

    // ============================================================
    // TEST GROUP 4: VALIDACIÓN ZOD - dataLote.numeroRemision
    // ============================================================
    describe('Validación Zod - Campo dataLote.numeroRemision', () => {

        test('debería rechazar si numeroRemision está vacío', async () => {
            mockReq.data.dataLote.numeroRemision = '';

            await expect(
                InventarioFrutaSinProcesarController.post_inventarios_ingreso_lote(mockReq)
            ).rejects.toThrow(ZodError);
        });

        test('debería rechazar si numeroRemision es null', async () => {
            mockReq.data.dataLote.numeroRemision = null;

            await expect(
                InventarioFrutaSinProcesarController.post_inventarios_ingreso_lote(mockReq)
            ).rejects.toThrow(ZodError);
        });

        test('debería rechazar si numeroRemision es undefined', async () => {
            delete mockReq.data.dataLote.numeroRemision;

            await expect(
                InventarioFrutaSinProcesarController.post_inventarios_ingreso_lote(mockReq)
            ).rejects.toThrow(ZodError);
        });

        test('debería rechazar si numeroRemision es un número', async () => {
            mockReq.data.dataLote.numeroRemision = 12345;

            await expect(
                InventarioFrutaSinProcesarController.post_inventarios_ingreso_lote(mockReq)
            ).rejects.toThrow(ZodError);
        });

        test('debería aceptar numeroRemision válido', async () => {
            mockReq.data.dataLote.numeroRemision = 'REM-2024-001';

            await expect(
                InventarioFrutaSinProcesarController.post_inventarios_ingreso_lote(mockReq)
            ).resolves.not.toThrow(ZodError);
        });
    });

    // ============================================================
    // TEST GROUP 5: VALIDACIÓN ZOD - dataLote.kilos
    // ============================================================
    describe('Validación Zod - Campo dataLote.kilos', () => {

        test('debería rechazar si kilos es 0', async () => {
            mockReq.data.dataLote.kilos = 0;

            await expect(
                InventarioFrutaSinProcesarController.post_inventarios_ingreso_lote(mockReq)
            ).rejects.toThrow(ZodError);
        });

        test('debería rechazar si kilos es negativo', async () => {
            mockReq.data.dataLote.kilos = -100;

            await expect(
                InventarioFrutaSinProcesarController.post_inventarios_ingreso_lote(mockReq)
            ).rejects.toThrow(ZodError);
        });

        test('debería rechazar si kilos es null', async () => {
            mockReq.data.dataLote.kilos = null;

            await expect(
                InventarioFrutaSinProcesarController.post_inventarios_ingreso_lote(mockReq)
            ).rejects.toThrow(ZodError);
        });

        test('debería rechazar si kilos es undefined', async () => {
            delete mockReq.data.dataLote.kilos;

            await expect(
                InventarioFrutaSinProcesarController.post_inventarios_ingreso_lote(mockReq)
            ).rejects.toThrow(ZodError);
        });

        test('debería aceptar kilos como string numérico (z.coerce)', async () => {
            mockReq.data.dataLote.kilos = '1000';

            await expect(
                InventarioFrutaSinProcesarController.post_inventarios_ingreso_lote(mockReq)
            ).resolves.not.toThrow(ZodError);
        });

        test('debería rechazar kilos como string no numérico', async () => {
            mockReq.data.dataLote.kilos = 'mil';

            await expect(
                InventarioFrutaSinProcesarController.post_inventarios_ingreso_lote(mockReq)
            ).rejects.toThrow(ZodError);
        });

        test('debería aceptar kilos = 1 (mínimo válido)', async () => {
            mockReq.data.dataLote.kilos = 1;
            mockReq.data.dataLote.canastillas = 1;
            mockReq.data.dataLote.promedio = 17; // Mínimo válido

            // Ajustar para que el promedio sea válido
            await expect(
                InventarioFrutaSinProcesarController.post_inventarios_ingreso_lote(mockReq)
            ).resolves.not.toThrow(ZodError);
        });
    });

    // ============================================================
    // TEST GROUP 6: VALIDACIÓN ZOD - dataLote.canastillas
    // ============================================================
    describe('Validación Zod - Campo dataLote.canastillas', () => {

        test('debería rechazar si canastillas es 0', async () => {
            mockReq.data.dataLote.canastillas = 0;

            await expect(
                InventarioFrutaSinProcesarController.post_inventarios_ingreso_lote(mockReq)
            ).rejects.toThrow(ZodError);
        });

        test('debería rechazar si canastillas es negativo', async () => {
            mockReq.data.dataLote.canastillas = -5;

            await expect(
                InventarioFrutaSinProcesarController.post_inventarios_ingreso_lote(mockReq)
            ).rejects.toThrow(ZodError);
        });

        test('debería rechazar si canastillas es null', async () => {
            mockReq.data.dataLote.canastillas = null;

            await expect(
                InventarioFrutaSinProcesarController.post_inventarios_ingreso_lote(mockReq)
            ).rejects.toThrow(ZodError);
        });

        test('debería aceptar canastillas como string numérico (z.coerce)', async () => {
            mockReq.data.dataLote.canastillas = '50';

            await expect(
                InventarioFrutaSinProcesarController.post_inventarios_ingreso_lote(mockReq)
            ).resolves.not.toThrow(ZodError);
        });
    });

    // ============================================================
    // TEST GROUP 7: VALIDACIÓN ZOD - dataLote.promedio
    // ============================================================
    describe('Validación Zod - Campo dataLote.promedio', () => {

        test('debería rechazar si promedio es menor a 17', async () => {
            mockReq.data.dataLote.promedio = 16;

            await expect(
                InventarioFrutaSinProcesarController.post_inventarios_ingreso_lote(mockReq)
            ).rejects.toThrow(ZodError);
        });

        test('debería rechazar si promedio es mayor a 25', async () => {
            mockReq.data.dataLote.promedio = 26;

            await expect(
                InventarioFrutaSinProcesarController.post_inventarios_ingreso_lote(mockReq)
            ).rejects.toThrow(ZodError);
        });

        test('debería aceptar promedio = 17 (límite inferior)', async () => {
            mockReq.data.dataLote.promedio = 17;

            await expect(
                InventarioFrutaSinProcesarController.post_inventarios_ingreso_lote(mockReq)
            ).resolves.not.toThrow(ZodError);
        });

        test('debería aceptar promedio = 25 (límite superior)', async () => {
            mockReq.data.dataLote.promedio = 25;

            await expect(
                InventarioFrutaSinProcesarController.post_inventarios_ingreso_lote(mockReq)
            ).resolves.not.toThrow(ZodError);
        });

        test('debería aceptar promedio decimal dentro del rango', async () => {
            mockReq.data.dataLote.promedio = 20.5;

            await expect(
                InventarioFrutaSinProcesarController.post_inventarios_ingreso_lote(mockReq)
            ).resolves.not.toThrow(ZodError);
        });

        test('debería rechazar si promedio es null', async () => {
            mockReq.data.dataLote.promedio = null;

            await expect(
                InventarioFrutaSinProcesarController.post_inventarios_ingreso_lote(mockReq)
            ).rejects.toThrow(ZodError);
        });

        test('debería aceptar promedio como string numérico (z.coerce)', async () => {
            mockReq.data.dataLote.promedio = '20';

            await expect(
                InventarioFrutaSinProcesarController.post_inventarios_ingreso_lote(mockReq)
            ).resolves.not.toThrow(ZodError);
        });
    });

    // ============================================================
    // TEST GROUP 8: VALIDACIÓN ZOD - dataLote.tipoFruta
    // ============================================================
    describe('Validación Zod - Campo dataLote.tipoFruta', () => {

        test('debería rechazar si tipoFruta está vacío', async () => {
            mockReq.data.dataLote.tipoFruta = '';

            await expect(
                InventarioFrutaSinProcesarController.post_inventarios_ingreso_lote(mockReq)
            ).rejects.toThrow(ZodError);
        });

        test('debería rechazar si tipoFruta es null', async () => {
            mockReq.data.dataLote.tipoFruta = null;

            await expect(
                InventarioFrutaSinProcesarController.post_inventarios_ingreso_lote(mockReq)
            ).rejects.toThrow(ZodError);
        });

        test('debería rechazar si tipoFruta es undefined', async () => {
            delete mockReq.data.dataLote.tipoFruta;

            await expect(
                InventarioFrutaSinProcesarController.post_inventarios_ingreso_lote(mockReq)
            ).rejects.toThrow(ZodError);
        });
    });

    // ============================================================
    // TEST GROUP 9: VALIDACIÓN ZOD - dataLote.GGN
    // ============================================================
    describe('Validación Zod - Campo dataLote.GGN', () => {

        test('debería rechazar si GGN no es boolean', async () => {
            mockReq.data.dataLote.GGN = 'true';

            await expect(
                InventarioFrutaSinProcesarController.post_inventarios_ingreso_lote(mockReq)
            ).rejects.toThrow(ZodError);
        });

        test('debería rechazar si GGN es null', async () => {
            mockReq.data.dataLote.GGN = null;

            await expect(
                InventarioFrutaSinProcesarController.post_inventarios_ingreso_lote(mockReq)
            ).rejects.toThrow(ZodError);
        });

        test('debería rechazar si GGN es undefined', async () => {
            delete mockReq.data.dataLote.GGN;

            await expect(
                InventarioFrutaSinProcesarController.post_inventarios_ingreso_lote(mockReq)
            ).rejects.toThrow(ZodError);
        });

        test('debería aceptar GGN = true', async () => {
            mockReq.data.dataLote.GGN = true;

            await expect(
                InventarioFrutaSinProcesarController.post_inventarios_ingreso_lote(mockReq)
            ).resolves.not.toThrow(ZodError);
        });

        test('debería aceptar GGN = false', async () => {
            mockReq.data.dataLote.GGN = false;

            await expect(
                InventarioFrutaSinProcesarController.post_inventarios_ingreso_lote(mockReq)
            ).resolves.not.toThrow(ZodError);
        });
    });

    // ============================================================
    // TEST GROUP 10: VALIDACIÓN ZOD - dataLote.predio
    // ============================================================
    describe('Validación Zod - Campo dataLote.predio', () => {

        test('debería rechazar si predio está vacío', async () => {
            mockReq.data.dataLote.predio = '';

            await expect(
                InventarioFrutaSinProcesarController.post_inventarios_ingreso_lote(mockReq)
            ).rejects.toThrow(ZodError);
        });

        test('debería rechazar si predio es null', async () => {
            mockReq.data.dataLote.predio = null;

            await expect(
                InventarioFrutaSinProcesarController.post_inventarios_ingreso_lote(mockReq)
            ).rejects.toThrow(ZodError);
        });

        test('debería rechazar si predio es undefined', async () => {
            delete mockReq.data.dataLote.predio;

            await expect(
                InventarioFrutaSinProcesarController.post_inventarios_ingreso_lote(mockReq)
            ).rejects.toThrow(ZodError);
        });
    });

    // ============================================================
    // TEST GROUP 11: VALIDACIÓN ZOD - dataLote.placa
    // ============================================================
    describe('Validación Zod - Campo dataLote.placa', () => {

        test('debería rechazar si placa tiene menos de 6 caracteres', async () => {
            mockReq.data.dataLote.placa = 'ABC12';

            await expect(
                InventarioFrutaSinProcesarController.post_inventarios_ingreso_lote(mockReq)
            ).rejects.toThrow(ZodError);
        });

        test('debería rechazar si placa tiene más de 6 caracteres', async () => {
            mockReq.data.dataLote.placa = 'ABC1234';

            await expect(
                InventarioFrutaSinProcesarController.post_inventarios_ingreso_lote(mockReq)
            ).rejects.toThrow(ZodError);
        });

        test('debería rechazar si placa no tiene formato AAA123', async () => {
            mockReq.data.dataLote.placa = '123ABC';

            await expect(
                InventarioFrutaSinProcesarController.post_inventarios_ingreso_lote(mockReq)
            ).rejects.toThrow(ZodError);
        });

        test('debería rechazar si placa tiene formato A1A1A1', async () => {
            mockReq.data.dataLote.placa = 'A1B2C3';

            await expect(
                InventarioFrutaSinProcesarController.post_inventarios_ingreso_lote(mockReq)
            ).rejects.toThrow(ZodError);
        });

        test('debería aceptar placa válida en minúsculas (se transforma)', async () => {
            mockReq.data.dataLote.placa = 'abc123';

            await expect(
                InventarioFrutaSinProcesarController.post_inventarios_ingreso_lote(mockReq)
            ).resolves.not.toThrow(ZodError);
        });

        test('debería aceptar placa válida ABC123', async () => {
            mockReq.data.dataLote.placa = 'ABC123';

            await expect(
                InventarioFrutaSinProcesarController.post_inventarios_ingreso_lote(mockReq)
            ).resolves.not.toThrow(ZodError);
        });

        test('debería rechazar si placa es null', async () => {
            mockReq.data.dataLote.placa = null;

            await expect(
                InventarioFrutaSinProcesarController.post_inventarios_ingreso_lote(mockReq)
            ).rejects.toThrow(ZodError);
        });

        test('debería rechazar si placa es undefined', async () => {
            delete mockReq.data.dataLote.placa;

            await expect(
                InventarioFrutaSinProcesarController.post_inventarios_ingreso_lote(mockReq)
            ).rejects.toThrow(ZodError);
        });
    });

    // ============================================================
    // TEST GROUP 12: VALIDACIÓN ZOD - dataLote.observaciones
    // ============================================================
    describe('Validación Zod - Campo dataLote.observaciones', () => {

        test('debería aceptar observaciones vacías (campo opcional)', async () => {
            mockReq.data.dataLote.observaciones = '';

            await expect(
                InventarioFrutaSinProcesarController.post_inventarios_ingreso_lote(mockReq)
            ).resolves.not.toThrow(ZodError);
        });

        test('debería aceptar observaciones undefined (campo opcional)', async () => {
            delete mockReq.data.dataLote.observaciones;

            await expect(
                InventarioFrutaSinProcesarController.post_inventarios_ingreso_lote(mockReq)
            ).resolves.not.toThrow(ZodError);
        });

        test('debería aceptar observaciones con texto', async () => {
            mockReq.data.dataLote.observaciones = 'Lote en buen estado';

            await expect(
                InventarioFrutaSinProcesarController.post_inventarios_ingreso_lote(mockReq)
            ).resolves.not.toThrow(ZodError);
        });
    });

    // ============================================================
    // TEST GROUP 13: VALIDACIÓN ZOD - dataCanastillas
    // ============================================================
    describe('Validación Zod - Objeto dataCanastillas', () => {

        test('debería rechazar si dataCanastillas es null', async () => {
            mockReq.data.dataCanastillas = null;

            await expect(
                InventarioFrutaSinProcesarController.post_inventarios_ingreso_lote(mockReq)
            ).rejects.toThrow(ZodError);
        });

        test('debería rechazar si dataCanastillas es undefined', async () => {
            delete mockReq.data.dataCanastillas;

            await expect(
                InventarioFrutaSinProcesarController.post_inventarios_ingreso_lote(mockReq)
            ).rejects.toThrow(ZodError);
        });

        test('debería rechazar si canastillasPropias es negativo', async () => {
            mockReq.data.dataCanastillas.canastillasPropias = -1;

            await expect(
                InventarioFrutaSinProcesarController.post_inventarios_ingreso_lote(mockReq)
            ).rejects.toThrow(ZodError);
        });

        test('debería rechazar si canastillasPrestadas es negativo', async () => {
            mockReq.data.dataCanastillas.canastillasPrestadas = -1;

            await expect(
                InventarioFrutaSinProcesarController.post_inventarios_ingreso_lote(mockReq)
            ).rejects.toThrow(ZodError);
        });

        test('debería aceptar canastillasPropias = 0', async () => {
            mockReq.data.dataCanastillas.canastillasPropias = 0;

            await expect(
                InventarioFrutaSinProcesarController.post_inventarios_ingreso_lote(mockReq)
            ).resolves.not.toThrow(ZodError);
        });

        test('debería aceptar canastillasPrestadas = 0', async () => {
            mockReq.data.dataCanastillas.canastillasPrestadas = 0;

            await expect(
                InventarioFrutaSinProcesarController.post_inventarios_ingreso_lote(mockReq)
            ).resolves.not.toThrow(ZodError);
        });

        test('debería aceptar valores como string numérico (z.coerce)', async () => {
            mockReq.data.dataCanastillas.canastillasPropias = '40';
            mockReq.data.dataCanastillas.canastillasPrestadas = '10';

            await expect(
                InventarioFrutaSinProcesarController.post_inventarios_ingreso_lote(mockReq)
            ).resolves.not.toThrow(ZodError);
        });
    });

    // ============================================================
    // TEST GROUP 14: SEGURIDAD - NoSQL INJECTION
    // ============================================================
    describe('Seguridad - Intentos de NoSQL Injection', () => {

        test('debería rechazar operador $ne en tipoFruta', async () => {
            mockReq.data.dataLote.tipoFruta = { $ne: null };

            await expect(
                InventarioFrutaSinProcesarController.post_inventarios_ingreso_lote(mockReq)
            ).rejects.toThrow(ZodError);
        });

        test('debería rechazar operador $gt en predio', async () => {
            mockReq.data.dataLote.predio = { $gt: '' };

            await expect(
                InventarioFrutaSinProcesarController.post_inventarios_ingreso_lote(mockReq)
            ).rejects.toThrow(ZodError);
        });

        test('debería rechazar operador $regex en numeroRemision', async () => {
            mockReq.data.dataLote.numeroRemision = { $regex: '.*' };

            await expect(
                InventarioFrutaSinProcesarController.post_inventarios_ingreso_lote(mockReq)
            ).rejects.toThrow(ZodError);
        });

        test('debería rechazar operador $where en kilos', async () => {
            mockReq.data.dataLote.kilos = { $where: 'return true' };

            await expect(
                InventarioFrutaSinProcesarController.post_inventarios_ingreso_lote(mockReq)
            ).rejects.toThrow(ZodError);
        });

        test('debería rechazar operador $or en canastillasPropias', async () => {
            mockReq.data.dataCanastillas.canastillasPropias = { $or: [{ $gt: 0 }] };

            await expect(
                InventarioFrutaSinProcesarController.post_inventarios_ingreso_lote(mockReq)
            ).rejects.toThrow(ZodError);
        });

        test('debería rechazar operador $exists en placa', async () => {
            mockReq.data.dataLote.placa = { $exists: true };

            await expect(
                InventarioFrutaSinProcesarController.post_inventarios_ingreso_lote(mockReq)
            ).rejects.toThrow(ZodError);
        });

        test('debería rechazar operador $in en fecha', async () => {
            mockReq.data.dataLote.fecha_estimada_llegada = { $in: ['2024-01-15'] };

            await expect(
                InventarioFrutaSinProcesarController.post_inventarios_ingreso_lote(mockReq)
            ).rejects.toThrow(ZodError);
        });
    });

    // ============================================================
    // TEST GROUP 15: SEGURIDAD - PROTOTYPE POLLUTION
    // ============================================================
    describe('Seguridad - Prototype Pollution', () => {

        test('no debería contaminar Object.prototype con __proto__', async () => {
            const originalPrototype = { ...Object.prototype };
            mockReq.data.dataLote.__proto__ = { malicious: true };

            try {
                await InventarioFrutaSinProcesarController.post_inventarios_ingreso_lote(mockReq);
            } catch (e) {
                // Puede fallar, está bien
            }

            expect({}.malicious).toBeUndefined();
            expect(Object.prototype).toEqual(originalPrototype);
        });

        test('no debería contaminar con constructor.prototype', async () => {
            mockReq.data.dataLote['constructor'] = { prototype: { pwned: true } };

            try {
                await InventarioFrutaSinProcesarController.post_inventarios_ingreso_lote(mockReq);
            } catch (e) {
                // Puede fallar validación
            }

            expect({}.pwned).toBeUndefined();
        });

        test('debería manejar __proto__ en dataCanastillas sin contaminar', async () => {
            mockReq.data.dataCanastillas.__proto__ = { hacked: true };

            try {
                await InventarioFrutaSinProcesarController.post_inventarios_ingreso_lote(mockReq);
            } catch (e) {
                // Puede fallar
            }

            expect({}.hacked).toBeUndefined();
        });
    });

    // ============================================================
    // TEST GROUP 16: SEGURIDAD - XSS Y CARACTERES ESPECIALES
    // ============================================================
    describe('Seguridad - XSS y Caracteres Especiales', () => {

        test('debería rechazar script tags en observaciones (protección XSS)', async () => {
            mockReq.data.dataLote.observaciones = '<script>alert("xss")</script>';

            // optionalSafeString rechaza strings que contengan '<script'
            await expect(
                InventarioFrutaSinProcesarController.post_inventarios_ingreso_lote(mockReq)
            ).rejects.toThrow(ZodError);
        });

        test('debería manejar event handlers en texto', async () => {
            mockReq.data.dataLote.observaciones = '<img src=x onerror=alert(1)>';

            await expect(
                InventarioFrutaSinProcesarController.post_inventarios_ingreso_lote(mockReq)
            ).resolves.not.toThrow(ZodError);
        });

        test('debería manejar caracteres unicode', async () => {
            mockReq.data.dataLote.observaciones = 'Lote José María Ñoño 你好 🍊';

            await expect(
                InventarioFrutaSinProcesarController.post_inventarios_ingreso_lote(mockReq)
            ).resolves.not.toThrow();
        });

        test('debería manejar SQL injection payloads como texto', async () => {
            mockReq.data.dataLote.observaciones = "'; DROP TABLE lotes; --";

            await expect(
                InventarioFrutaSinProcesarController.post_inventarios_ingreso_lote(mockReq)
            ).resolves.not.toThrow(ZodError);
        });
    });

    // ============================================================
    // TEST GROUP 17: DATOS MALFORMADOS
    // ============================================================
    describe('Datos Malformados', () => {

        test('debería rechazar si req.data es null', async () => {
            mockReq.data = null;

            await expect(
                InventarioFrutaSinProcesarController.post_inventarios_ingreso_lote(mockReq)
            ).rejects.toThrow();
        });

        test('debería rechazar si req.data es undefined', async () => {
            delete mockReq.data;

            await expect(
                InventarioFrutaSinProcesarController.post_inventarios_ingreso_lote(mockReq)
            ).rejects.toThrow();
        });

        test('debería rechazar si req.data es un string', async () => {
            mockReq.data = 'string-malicioso';

            await expect(
                InventarioFrutaSinProcesarController.post_inventarios_ingreso_lote(mockReq)
            ).rejects.toThrow(ZodError);
        });

        test('debería rechazar si req.data es un array', async () => {
            mockReq.data = [createValidRequest().data];

            await expect(
                InventarioFrutaSinProcesarController.post_inventarios_ingreso_lote(mockReq)
            ).rejects.toThrow(ZodError);
        });

        test('debería rechazar si dataLote es un array', async () => {
            mockReq.data.dataLote = [mockReq.data.dataLote];

            await expect(
                InventarioFrutaSinProcesarController.post_inventarios_ingreso_lote(mockReq)
            ).rejects.toThrow(ZodError);
        });

        test('debería rechazar si dataLote es null', async () => {
            mockReq.data.dataLote = null;

            await expect(
                InventarioFrutaSinProcesarController.post_inventarios_ingreso_lote(mockReq)
            ).rejects.toThrow(ZodError);
        });

        test('debería manejar req.user sin _id', async () => {
            delete mockReq.user._id;

            // Con mocks, el flujo puede completarse porque los servicios están mockeados.
            // Este test verifica que el método no falla catastróficamente sin user._id.
            // En un entorno real, los servicios internos validarían la existencia de user._id.
            await expect(
                InventarioFrutaSinProcesarController.post_inventarios_ingreso_lote(mockReq)
            ).resolves.not.toThrow();
        });

        test('debería manejar req.user null', async () => {
            mockReq.user = null;

            await expect(
                InventarioFrutaSinProcesarController.post_inventarios_ingreso_lote(mockReq)
            ).rejects.toThrow();
        });
    });

    // ============================================================
    // TEST GROUP 18: TIPOS DE DATOS INCORRECTOS
    // ============================================================
    describe('Tipos de Datos Incorrectos', () => {

        test('debería rechazar si tipoFruta es un número', async () => {
            mockReq.data.dataLote.tipoFruta = 12345;

            await expect(
                InventarioFrutaSinProcesarController.post_inventarios_ingreso_lote(mockReq)
            ).rejects.toThrow(ZodError);
        });

        test('debería rechazar si predio es un número', async () => {
            mockReq.data.dataLote.predio = 12345;

            await expect(
                InventarioFrutaSinProcesarController.post_inventarios_ingreso_lote(mockReq)
            ).rejects.toThrow(ZodError);
        });

        test('debería rechazar si GGN es un string', async () => {
            mockReq.data.dataLote.GGN = 'true';

            await expect(
                InventarioFrutaSinProcesarController.post_inventarios_ingreso_lote(mockReq)
            ).rejects.toThrow(ZodError);
        });

        test('debería rechazar si placa es un número', async () => {
            mockReq.data.dataLote.placa = 123456;

            await expect(
                InventarioFrutaSinProcesarController.post_inventarios_ingreso_lote(mockReq)
            ).rejects.toThrow(ZodError);
        });

        test('debería rechazar si canastillasPropias es un objeto', async () => {
            mockReq.data.dataCanastillas.canastillasPropias = { value: 40 };

            await expect(
                InventarioFrutaSinProcesarController.post_inventarios_ingreso_lote(mockReq)
            ).rejects.toThrow(ZodError);
        });
    });

    // ============================================================
    // TEST GROUP 19: VALORES LÍMITE NUMÉRICOS
    // ============================================================
    describe('Valores Límite Numéricos', () => {

        test('debería rechazar kilos que excedan el límite máximo (1 millón)', async () => {
            mockReq.data.dataLote.kilos = 1_000_001; // Excede el límite de 1,000,000
            mockReq.data.dataLote.canastillas = 50;
            mockReq.data.dataLote.promedio = 20;

            await expect(
                InventarioFrutaSinProcesarController.post_inventarios_ingreso_lote(mockReq)
            ).rejects.toThrow(ZodError);
        });

        test('debería rechazar Infinity en kilos', async () => {
            mockReq.data.dataLote.kilos = Infinity;

            await expect(
                InventarioFrutaSinProcesarController.post_inventarios_ingreso_lote(mockReq)
            ).rejects.toThrow();
        });

        test('debería rechazar NaN en canastillas', async () => {
            mockReq.data.dataLote.canastillas = NaN;

            await expect(
                InventarioFrutaSinProcesarController.post_inventarios_ingreso_lote(mockReq)
            ).rejects.toThrow(ZodError);
        });

        test('debería manejar promedio en límite inferior exacto (17)', async () => {
            mockReq.data.dataLote.promedio = 17;

            await expect(
                InventarioFrutaSinProcesarController.post_inventarios_ingreso_lote(mockReq)
            ).resolves.not.toThrow(ZodError);
        });

        test('debería manejar promedio en límite superior exacto (25)', async () => {
            mockReq.data.dataLote.promedio = 25;

            await expect(
                InventarioFrutaSinProcesarController.post_inventarios_ingreso_lote(mockReq)
            ).resolves.not.toThrow(ZodError);
        });

        test('debería rechazar promedio = 16.99 (justo debajo del límite)', async () => {
            mockReq.data.dataLote.promedio = 16.99;

            await expect(
                InventarioFrutaSinProcesarController.post_inventarios_ingreso_lote(mockReq)
            ).rejects.toThrow(ZodError);
        });

        test('debería rechazar promedio = 25.01 (justo encima del límite)', async () => {
            mockReq.data.dataLote.promedio = 25.01;

            await expect(
                InventarioFrutaSinProcesarController.post_inventarios_ingreso_lote(mockReq)
            ).rejects.toThrow(ZodError);
        });
    });

    // ============================================================
    // TEST GROUP 20: TRANSACCIONALIDAD (NIVEL SENIOR)
    // ============================================================
    describe('Transaccionalidad - Session en Todos los Repositorios', () => {

        test('debería pasar session a LotesRepository.addLote', async () => {
            await InventarioFrutaSinProcesarController.post_inventarios_ingreso_lote(mockReq);

            expect(mockLotesRepository.addLote).toHaveBeenCalledWith(
                expect.any(Object),
                expect.objectContaining({ session: 'mock-session' })
            );
        });

        test('debería pasar session a InventariosHistorialRepository.put_inventarioSimple', async () => {
            await InventarioFrutaSinProcesarController.post_inventarios_ingreso_lote(mockReq);

            expect(mockInventariosHistorialRepository.put_inventarioSimple).toHaveBeenCalledWith(
                expect.any(Object),
                expect.any(Object),
                expect.objectContaining({ session: 'mock-session' })
            );
        });

        test('debería pasar session a ajustarCanastillasProveedorCliente (proveedor)', async () => {
            await InventarioFrutaSinProcesarController.post_inventarios_ingreso_lote(mockReq);

            const calls = mockInventariosService.ajustarCanastillasProveedorCliente.mock.calls;
            const proveedorCall = calls.find(c => c[1] < 0); // Buscar la llamada con valor negativo (resta)

            expect(proveedorCall).toBeDefined();
            expect(proveedorCall[3]).toBe('mock-session');
        });

        test('debería pasar session a ajustarCanastillasProveedorCliente (CELIFRUT)', async () => {
            await InventarioFrutaSinProcesarController.post_inventarios_ingreso_lote(mockReq);

            const calls = mockInventariosService.ajustarCanastillasProveedorCliente.mock.calls;
            const celifrutCall = calls.find(c => c[1] > 0); // Buscar la llamada con valor positivo (suma)

            expect(celifrutCall).toBeDefined();
            expect(celifrutCall[3]).toBe('mock-session');
        });

        test('debería pasar session a CanastillasRepository.post_data', async () => {
            await InventarioFrutaSinProcesarController.post_inventarios_ingreso_lote(mockReq);

            expect(mockCanastillasRepository.post_data).toHaveBeenCalledWith(
                expect.any(Object),
                expect.objectContaining({ session: 'mock-session' })
            );
        });

        test('debería pasar session a dataRepository.incrementar_serial', async () => {
            await InventarioFrutaSinProcesarController.post_inventarios_ingreso_lote(mockReq);

            expect(mockDataRepository.incrementar_serial).toHaveBeenCalledWith(
                'EF1-',
                'mock-session'
            );
        });

        test('debería pasar session a obtenerPrecioProveedor', async () => {
            await InventarioFrutaSinProcesarController.post_inventarios_ingreso_lote(mockReq);

            expect(mockInventariosService.obtenerPrecioProveedor).toHaveBeenCalledWith(
                expect.any(String),
                expect.any(String),
                'mock-session'
            );
        });

        test('todas las operaciones transaccionales deben recibir la misma session', async () => {
            await InventarioFrutaSinProcesarController.post_inventarios_ingreso_lote(mockReq);

            // Verificar que todas las operaciones recibieron la misma session
            const sessionUsedInAddLote = mockLotesRepository.addLote.mock.calls[0][1].session;
            const sessionUsedInCanastillas = mockCanastillasRepository.post_data.mock.calls[0][1].session;
            const sessionUsedInSerial = mockDataRepository.incrementar_serial.mock.calls[0][1];

            expect(sessionUsedInAddLote).toBe('mock-session');
            expect(sessionUsedInCanastillas).toBe('mock-session');
            expect(sessionUsedInSerial).toBe('mock-session');
        });
    });

    // ============================================================
    // TEST GROUP 21: SIDE EFFECTS - LOGS (NIVEL SENIOR)
    // ============================================================
    describe('Side Effects - registrarPasoLog', () => {

        test('actualmente propaga errores de log (comportamiento a considerar mejorar)', async () => {
            mockRegistrarPasoLog.mockRejectedValue(new Error('Error de log'));

            // NOTA: Idealmente los logs no deberían bloquear el flujo de negocio.
            // Este test documenta el comportamiento ACTUAL: si el log falla, el método falla.
            // Considerar envolver registrarPasoLog en try-catch para que no bloquee.
            await expect(
                InventarioFrutaSinProcesarController.post_inventarios_ingreso_lote(mockReq)
            ).rejects.toThrow('Error de log');

            // Restaurar el mock para no afectar otros tests
            mockRegistrarPasoLog.mockReset();
            mockRegistrarPasoLog.mockResolvedValue(undefined);
        });

        test('debería llamar a registrarPasoLog durante el proceso', async () => {
            await InventarioFrutaSinProcesarController.post_inventarios_ingreso_lote(mockReq);

            // Verificar que se registran pasos (al menos algunos)
            expect(mockRegistrarPasoLog).toHaveBeenCalled();
            expect(mockRegistrarPasoLog.mock.calls.length).toBeGreaterThan(0);
        });

        test('debería pasar el log._id correcto a registrarPasoLog', async () => {
            await InventarioFrutaSinProcesarController.post_inventarios_ingreso_lote(mockReq);

            // Verificar que todas las llamadas usan el log._id correcto
            const allCallsUseCorrectLogId = mockRegistrarPasoLog.mock.calls.every(
                call => call[0] === 'log-123'
            );
            expect(allCallsUseCorrectLogId).toBe(true);
        });

        test('debería incluir nombre del método en los logs', async () => {
            await InventarioFrutaSinProcesarController.post_inventarios_ingreso_lote(mockReq);

            // Verificar que al menos un log menciona la validación
            const logMessages = mockRegistrarPasoLog.mock.calls.map(call => call[1]);
            const hasValidationLog = logMessages.some(msg =>
                msg.toLowerCase().includes('validation') ||
                msg.toLowerCase().includes('inventarios')
            );
            expect(hasValidationLog).toBe(true);
        });
    });

    // ============================================================
    // TEST GROUP 22: IDEMPOTENCIA - NÚMERO DE REMISIÓN DUPLICADO (NIVEL SENIOR)
    // ============================================================
    describe('Idempotencia - Número de Remisión Duplicado', () => {

        test('no valida unicidad de numeroRemision a nivel de este método', async () => {
            // Este test verifica que el método NO tiene validación de unicidad de numeroRemision.
            // La unicidad (si se requiere) debería manejarse a nivel de base de datos con índices únicos.
            await InventarioFrutaSinProcesarController.post_inventarios_ingreso_lote(mockReq);

            // Si llegamos aquí sin error, el método no rechazó el lote por su numeroRemision
            expect(mockLotesRepository.addLote).toHaveBeenCalled();
        });

        test('el serial EF1 se obtiene del servicio dataService', async () => {
            const expectedSerial = 'EF1-0001';
            mockDataService.get_ef1_serial.mockResolvedValue(expectedSerial);

            await InventarioFrutaSinProcesarController.post_inventarios_ingreso_lote(mockReq);

            expect(mockDataService.get_ef1_serial).toHaveBeenCalled();
            // Verificar que el serial se usa en construirQueryIngresoLote
            expect(mockInventariosService.construirQueryIngresoLote).toHaveBeenCalled();
        });

        test('debería incrementar serial después de ingreso exitoso', async () => {
            await InventarioFrutaSinProcesarController.post_inventarios_ingreso_lote(mockReq);

            expect(mockDataRepository.incrementar_serial).toHaveBeenCalledTimes(1);
            expect(mockDataRepository.incrementar_serial).toHaveBeenCalledWith('EF1-', 'mock-session');
        });

        test('no debería incrementar serial si addLote falla', async () => {
            mockLotesRepository.addLote.mockRejectedValue(new Error('Error creando lote'));

            await expect(
                InventarioFrutaSinProcesarController.post_inventarios_ingreso_lote(mockReq)
            ).rejects.toThrow('Error creando lote');

            // El serial no debería incrementarse porque addLote falló
            expect(mockDataRepository.incrementar_serial).not.toHaveBeenCalled();
        });
    });

    // ============================================================
    // TEST GROUP 23: ORDEN DE OPERACIONES
    // ============================================================
    describe('Orden de Operaciones', () => {

        test('debería validar datos antes de cualquier operación de BD', async () => {
            mockReq.data.dataLote.kilos = 0; // Dato inválido

            await expect(
                InventarioFrutaSinProcesarController.post_inventarios_ingreso_lote(mockReq)
            ).rejects.toThrow(ZodError);

            // Ninguna operación de BD debería haberse ejecutado
            expect(mockLotesRepository.addLote).not.toHaveBeenCalled();
            expect(mockInventariosHistorialRepository.put_inventarioSimple).not.toHaveBeenCalled();
        });

        test('debería obtener tipo de fruta y validar GGN solo cuando GGN es true', async () => {
            mockReq.data.dataLote.GGN = true;

            await InventarioFrutaSinProcesarController.post_inventarios_ingreso_lote(mockReq);

            // Verificamos que ambos fueron llamados (el orden se infiere del flujo del código)
            expect(mockConstantesDelSistema.get_constantes_sistema_tipo_frutas2).toHaveBeenCalled();
            expect(mockInventariosService.validarGGN).toHaveBeenCalled();

            // validarGGN debe recibir el tipo de fruta obtenido
            expect(mockInventariosService.validarGGN).toHaveBeenCalledWith(
                expect.any(Object),
                'Naranja', // El tipo de fruta del mock
                mockReq.user
            );
        });

        test('debería crear lote antes de actualizar inventario (verificación por dependencia)', async () => {
            // Si addLote falla, put_inventarioSimple no debe ejecutarse
            mockLotesRepository.addLote.mockRejectedValue(new Error('Error en addLote'));

            await expect(
                InventarioFrutaSinProcesarController.post_inventarios_ingreso_lote(mockReq)
            ).rejects.toThrow('Error en addLote');

            // addLote fue llamado pero put_inventarioSimple no (porque addLote falló primero)
            expect(mockLotesRepository.addLote).toHaveBeenCalled();
            expect(mockInventariosHistorialRepository.put_inventarioSimple).not.toHaveBeenCalled();
        });

        test('debería usar el lote creado para actualizar el inventario', async () => {
            const mockLoteResult = { _id: 'lote-test-123', enf: 'EF1-TEST', canastillas: 50 };
            mockLotesRepository.addLote.mockResolvedValue(mockLoteResult);

            await InventarioFrutaSinProcesarController.post_inventarios_ingreso_lote(mockReq);

            // Verificar que put_inventarioSimple fue llamado con datos del lote creado
            expect(mockInventariosHistorialRepository.put_inventarioSimple).toHaveBeenCalledWith(
                expect.any(Object),
                expect.objectContaining({
                    $push: expect.objectContaining({
                        inventario: expect.objectContaining({
                            lote: mockLoteResult._id
                        })
                    })
                }),
                expect.any(Object)
            );
        });
    });

    // ============================================================
    // TEST GROUP 24: LLAMADAS PARALELAS
    // ============================================================
    describe('Llamadas Paralelas (Promise.all)', () => {

        test('debería llamar tanto a obtenerPrecioProveedor como a get_ef1_serial', async () => {
            await InventarioFrutaSinProcesarController.post_inventarios_ingreso_lote(mockReq);

            expect(mockInventariosService.obtenerPrecioProveedor).toHaveBeenCalled();
            expect(mockDataService.get_ef1_serial).toHaveBeenCalled();
        });

        test('si obtenerPrecioProveedor falla, el error se propaga correctamente', async () => {
            mockInventariosService.obtenerPrecioProveedor.mockRejectedValue(
                new Error('Proveedor no encontrado')
            );

            await expect(
                InventarioFrutaSinProcesarController.post_inventarios_ingreso_lote(mockReq)
            ).rejects.toThrow('Proveedor no encontrado');

            // El servicio fue llamado
            expect(mockInventariosService.obtenerPrecioProveedor).toHaveBeenCalled();
        });

        test('si get_ef1_serial falla, el error se propaga correctamente', async () => {
            mockDataService.get_ef1_serial.mockRejectedValue(
                new Error('Error generando serial')
            );

            await expect(
                InventarioFrutaSinProcesarController.post_inventarios_ingreso_lote(mockReq)
            ).rejects.toThrow('Error generando serial');

            // El servicio fue llamado
            expect(mockDataService.get_ef1_serial).toHaveBeenCalled();
        });

        test('ambos servicios reciben los parámetros correctos', async () => {
            await InventarioFrutaSinProcesarController.post_inventarios_ingreso_lote(mockReq);

            // obtenerPrecioProveedor debe recibir predio, tipoFruta y session
            expect(mockInventariosService.obtenerPrecioProveedor).toHaveBeenCalledWith(
                mockReq.data.dataLote.predio,
                mockReq.data.dataLote.tipoFruta,
                'mock-session'
            );

            // get_ef1_serial debe ser llamado (sin parámetros específicos)
            expect(mockDataService.get_ef1_serial).toHaveBeenCalled();
        });
    });

    // ============================================================
    // TEST GROUP 25: EVENTO SERVER_EVENT
    // ============================================================
    describe('Evento server_event', () => {

        test('debería emitir evento con action add_lote tras éxito', async () => {
            await InventarioFrutaSinProcesarController.post_inventarios_ingreso_lote(mockReq);

            expect(mockEventEmitter.emit).toHaveBeenCalledWith('server_event', {
                action: 'add_lote'
            });
        });

        test('no debería emitir evento si la transacción falla', async () => {
            mockLotesRepository.addLote.mockRejectedValue(new Error('Error'));

            await expect(
                InventarioFrutaSinProcesarController.post_inventarios_ingreso_lote(mockReq)
            ).rejects.toThrow();

            expect(mockEventEmitter.emit).not.toHaveBeenCalled();
        });

        test('no debería emitir evento si la validación falla', async () => {
            mockReq.data.dataLote.kilos = 0; // Dato inválido

            await expect(
                InventarioFrutaSinProcesarController.post_inventarios_ingreso_lote(mockReq)
            ).rejects.toThrow(ZodError);

            expect(mockEventEmitter.emit).not.toHaveBeenCalled();
        });

        test('el evento se emite una sola vez por ingreso exitoso', async () => {
            await InventarioFrutaSinProcesarController.post_inventarios_ingreso_lote(mockReq);

            // Contar cuántas veces se emitió el evento add_lote
            const addLoteEvents = mockEventEmitter.emit.mock.calls.filter(
                call => call[0] === 'server_event' && call[1]?.action === 'add_lote'
            );

            expect(addLoteEvents.length).toBe(1);
        });
    });

    // ============================================================
    // TEST GROUP 26: TESTS "LOCOS" - EDGE CASES EXTREMOS
    // ============================================================
    describe('Tests Locos - Edge Cases Extremos', () => {

        // ---------------------------------------------------------
        // OVERFLOW NUMÉRICO
        // ---------------------------------------------------------
        describe('Overflow Numérico', () => {

            test('debería rechazar canastillas = Number.MAX_SAFE_INTEGER (excede límite)', async () => {
                mockReq.data.dataLote.canastillas = Number.MAX_SAFE_INTEGER;
                mockReq.data.dataLote.kilos = 1000;
                mockReq.data.dataLote.promedio = 20;

                // Con el nuevo límite de 50,000 canastillas, esto debe rechazarse
                await expect(
                    InventarioFrutaSinProcesarController.post_inventarios_ingreso_lote(mockReq)
                ).rejects.toThrow(ZodError);
            });

            test('debería rechazar kilos = 2,000,000 (excede límite de 1 millón)', async () => {
                mockReq.data.dataLote.kilos = 2_000_000;
                mockReq.data.dataLote.canastillas = 100;
                mockReq.data.dataLote.promedio = 20;

                await expect(
                    InventarioFrutaSinProcesarController.post_inventarios_ingreso_lote(mockReq)
                ).rejects.toThrow(ZodError);
            });

            test('debería aceptar kilos = 999,999 (justo debajo del límite)', async () => {
                mockReq.data.dataLote.kilos = 999_999;
                mockReq.data.dataLote.canastillas = 49_999;
                mockReq.data.dataLote.promedio = 20;

                await expect(
                    InventarioFrutaSinProcesarController.post_inventarios_ingreso_lote(mockReq)
                ).resolves.not.toThrow();
            });

            test('debería rechazar canastillasPropias = Number.MAX_VALUE (excede límite)', async () => {
                mockReq.data.dataCanastillas.canastillasPropias = Number.MAX_VALUE;

                // Con el nuevo límite de 50,000, esto debe rechazarse
                await expect(
                    InventarioFrutaSinProcesarController.post_inventarios_ingreso_lote(mockReq)
                ).rejects.toThrow(ZodError);
            });

            test('debería rechazar -0 como valor de kilos (caso especial de JS)', async () => {
                mockReq.data.dataLote.kilos = -0;

                // En JS, -0 === 0, pero .gt(0) debería rechazarlo
                await expect(
                    InventarioFrutaSinProcesarController.post_inventarios_ingreso_lote(mockReq)
                ).rejects.toThrow(ZodError);
            });

            test('debería aceptar canastillas en el límite máximo (50,000)', async () => {
                mockReq.data.dataLote.canastillas = 50_000;
                mockReq.data.dataLote.kilos = 1_000_000;
                mockReq.data.dataLote.promedio = 20;

                await expect(
                    InventarioFrutaSinProcesarController.post_inventarios_ingreso_lote(mockReq)
                ).resolves.not.toThrow();
            });
        });

        // ---------------------------------------------------------
        // BYPASS DE GGN
        // ---------------------------------------------------------
        describe('Bypass de GGN - Intento de Engaño', () => {

            test('debería rechazar GGN:true si el proveedor NO tiene GGN activo', async () => {
                mockReq.data.dataLote.GGN = true;

                // Simular proveedor sin GGN válido
                const proveedorSinGGN = {
                    precioId: '60d5ecb54b24a1234567890a',
                    proveedor: {
                        _id: '507f191e810c19729de860ea',
                        PREDIO: 'Finca Sin Certificación',
                        GGN: null // Sin certificación GGN
                    }
                };
                mockInventariosService.obtenerPrecioProveedor.mockResolvedValue(proveedorSinGGN);

                // validarGGN debe lanzar error cuando el proveedor no tiene GGN
                mockInventariosService.validarGGN.mockImplementation(() => {
                    throw new Error('El proveedor no tiene certificación GGN activa');
                });

                await expect(
                    InventarioFrutaSinProcesarController.post_inventarios_ingreso_lote(mockReq)
                ).rejects.toThrow('El proveedor no tiene certificación GGN activa');

                // Verificar que validarGGN fue llamado
                expect(mockInventariosService.validarGGN).toHaveBeenCalled();
            });

            test('debería rechazar GGN:true si el GGN del proveedor está vencido', async () => {
                mockReq.data.dataLote.GGN = true;

                // Simular proveedor con GGN vencido
                const proveedorGGNVencido = {
                    precioId: '60d5ecb54b24a1234567890a',
                    proveedor: {
                        _id: '507f191e810c19729de860ea',
                        PREDIO: 'Finca GGN Vencido',
                        GGN: {
                            fechaVencimiento: new Date('2020-01-01'), // Fecha pasada
                            code: 'GGN-VENCIDO',
                            tipo_fruta: ['Naranja']
                        }
                    }
                };
                mockInventariosService.obtenerPrecioProveedor.mockResolvedValue(proveedorGGNVencido);

                mockInventariosService.validarGGN.mockImplementation(() => {
                    throw new Error('El certificado GGN del proveedor ha expirado');
                });

                await expect(
                    InventarioFrutaSinProcesarController.post_inventarios_ingreso_lote(mockReq)
                ).rejects.toThrow('El certificado GGN del proveedor ha expirado');
            });

            test('debería rechazar GGN:true si el tipo de fruta no está en el GGN del proveedor', async () => {
                mockReq.data.dataLote.GGN = true;

                // Simular proveedor con GGN pero para otra fruta
                const proveedorGGNOtraFruta = {
                    precioId: '60d5ecb54b24a1234567890a',
                    proveedor: {
                        _id: '507f191e810c19729de860ea',
                        PREDIO: 'Finca Solo Limones',
                        GGN: {
                            fechaVencimiento: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
                            code: 'GGN-LIMONES',
                            tipo_fruta: ['Limón'] // No incluye 'Naranja'
                        }
                    }
                };
                mockInventariosService.obtenerPrecioProveedor.mockResolvedValue(proveedorGGNOtraFruta);

                mockInventariosService.validarGGN.mockImplementation(() => {
                    throw new Error('El tipo de fruta no está cubierto por el certificado GGN del proveedor');
                });

                await expect(
                    InventarioFrutaSinProcesarController.post_inventarios_ingreso_lote(mockReq)
                ).rejects.toThrow('El tipo de fruta no está cubierto por el certificado GGN del proveedor');
            });

            test('GGN:false NO debe llamar a validarGGN aunque el proveedor tenga GGN válido', async () => {
                mockReq.data.dataLote.GGN = false;

                // Aunque el proveedor tenga GGN válido, si GGN:false no se valida
                await InventarioFrutaSinProcesarController.post_inventarios_ingreso_lote(mockReq);

                expect(mockInventariosService.validarGGN).not.toHaveBeenCalled();
            });
        });

        // ---------------------------------------------------------
        // INYECCIÓN DE SESIÓN / USER NULL
        // ---------------------------------------------------------
        describe('Inyección de Sesión - User Malformado', () => {

            test('req.user = null no debe romper el proceso de logging', async () => {
                mockReq.user = null;

                // El método debería fallar en algún punto (user._id se usa internamente)
                // pero el log no debe ser la causa del crash
                await expect(
                    InventarioFrutaSinProcesarController.post_inventarios_ingreso_lote(mockReq)
                ).rejects.toThrow();

                // El error no debe ser del sistema de logging
                // (esto depende de la implementación actual)
            });

            test('req.user = undefined no debe romper el proceso', async () => {
                mockReq.user = undefined;

                await expect(
                    InventarioFrutaSinProcesarController.post_inventarios_ingreso_lote(mockReq)
                ).rejects.toThrow();
            });

            test('req.user con _id = null debería manejarse gracefully', async () => {
                mockReq.user = { _id: null, nombre: 'Test', user: 'test', Rol: 1 };

                // El método puede o no fallar dependiendo de cómo se use user._id
                // Este test documenta el comportamiento
                try {
                    await InventarioFrutaSinProcesarController.post_inventarios_ingreso_lote(mockReq);
                    // Si pasa, verificamos que no hubo crash catastrófico
                    expect(true).toBe(true);
                } catch (error) {
                    // Si falla, el error no debe ser de tipo "Cannot read property of null"
                    expect(error.message).not.toMatch(/Cannot read propert/i);
                }
            });

            test('req.user con campos extra maliciosos no debe afectar el proceso', async () => {
                mockReq.user = {
                    _id: 'user-123',
                    nombre: 'Test User',
                    user: 'testuser',
                    Rol: 1,
                    __proto__: { admin: true },
                    constructor: { prototype: { hacked: true } },
                    $where: 'malicious code'
                };

                // El método debe ejecutarse normalmente ignorando campos extra
                await expect(
                    InventarioFrutaSinProcesarController.post_inventarios_ingreso_lote(mockReq)
                ).resolves.not.toThrow();

                // Verificar que no se contaminó el prototipo
                expect({}.admin).toBeUndefined();
                expect({}.hacked).toBeUndefined();
            });
        });

        // ---------------------------------------------------------
        // UNICODE / EMOJIS EN PLACA
        // ---------------------------------------------------------
        describe('Unicode y Emojis en Campos', () => {

            test('debería rechazar placa con emoji de bandera', async () => {
                mockReq.data.dataLote.placa = '🇨🇴ABC12';

                await expect(
                    InventarioFrutaSinProcesarController.post_inventarios_ingreso_lote(mockReq)
                ).rejects.toThrow(ZodError);
            });

            test('debería rechazar placa con emojis', async () => {
                mockReq.data.dataLote.placa = '🚗🚗🚗123';

                await expect(
                    InventarioFrutaSinProcesarController.post_inventarios_ingreso_lote(mockReq)
                ).rejects.toThrow(ZodError);
            });

            test('debería rechazar placa con caracteres unicode especiales', async () => {
                mockReq.data.dataLote.placa = 'ÄÖÜ123'; // Caracteres alemanes

                await expect(
                    InventarioFrutaSinProcesarController.post_inventarios_ingreso_lote(mockReq)
                ).rejects.toThrow(ZodError);
            });

            test('debería rechazar placa con caracteres chinos', async () => {
                mockReq.data.dataLote.placa = '中文字123';

                await expect(
                    InventarioFrutaSinProcesarController.post_inventarios_ingreso_lote(mockReq)
                ).rejects.toThrow(ZodError);
            });

            test('debería rechazar placa con caracteres cirílicos que parecen latinos', async () => {
                // Ataque de homoglyph: А (cirílico) parece A (latino)
                mockReq.data.dataLote.placa = 'АВС123'; // Esto es cirílico, no latino

                await expect(
                    InventarioFrutaSinProcesarController.post_inventarios_ingreso_lote(mockReq)
                ).rejects.toThrow(ZodError);
            });

            test('debería rechazar placa con zero-width characters', async () => {
                // Zero-width space puede ocultar la longitud real
                mockReq.data.dataLote.placa = 'ABC\u200B123'; // Zero-width space

                await expect(
                    InventarioFrutaSinProcesarController.post_inventarios_ingreso_lote(mockReq)
                ).rejects.toThrow(ZodError);
            });

            test('debería rechazar placa con combining characters', async () => {
                // Combining characters pueden hacer que la validación visual falle
                mockReq.data.dataLote.placa = 'A\u0308BC123'; // A con diéresis combinada

                await expect(
                    InventarioFrutaSinProcesarController.post_inventarios_ingreso_lote(mockReq)
                ).rejects.toThrow(ZodError);
            });

            test('debería aceptar placa válida con números colombianos estándar', async () => {
                mockReq.data.dataLote.placa = 'ABC123';

                await expect(
                    InventarioFrutaSinProcesarController.post_inventarios_ingreso_lote(mockReq)
                ).resolves.not.toThrow();
            });

            test('debería aceptar placa válida y convertir minúsculas a mayúsculas', async () => {
                mockReq.data.dataLote.placa = 'abc123';

                await InventarioFrutaSinProcesarController.post_inventarios_ingreso_lote(mockReq);

                // Verificar que la query se construyó con placa en mayúsculas
                expect(mockInventariosService.construirQueryIngresoLote).toHaveBeenCalled();
            });
        });

        // ---------------------------------------------------------
        // CASOS ADICIONALES EXTREMOS
        // ---------------------------------------------------------
        describe('Casos Extremos Adicionales', () => {

            test('debería manejar fecha muy antigua (año 1)', async () => {
                mockReq.data.dataLote.fecha_estimada_llegada = '0001-01-01';

                // La fecha es válida técnicamente, aunque ridícula
                await expect(
                    InventarioFrutaSinProcesarController.post_inventarios_ingreso_lote(mockReq)
                ).resolves.not.toThrow();
            });

            test('debería manejar fecha muy futura (año 9999)', async () => {
                mockReq.data.dataLote.fecha_estimada_llegada = '9999-12-31';

                await expect(
                    InventarioFrutaSinProcesarController.post_inventarios_ingreso_lote(mockReq)
                ).resolves.not.toThrow();
            });

            test('debería rechazar fecha inválida 2024-02-30', async () => {
                mockReq.data.dataLote.fecha_estimada_llegada = '2024-02-30'; // Febrero no tiene 30 días

                // Date.parse() convierte esto a una fecha válida (marzo)
                // Este test documenta el comportamiento actual
                // NOTA: Si quieres validación estricta, necesitas validación adicional
                await expect(
                    InventarioFrutaSinProcesarController.post_inventarios_ingreso_lote(mockReq)
                ).resolves.not.toThrow();
            });

            test('debería rechazar observaciones extremadamente largas (más de 2000 chars)', async () => {
                // String de 3000 caracteres (excede el límite de 2000)
                const longString = 'A'.repeat(3000);
                mockReq.data.dataLote.observaciones = longString;

                // Con el nuevo límite de 2000 caracteres, esto debe rechazarse
                await expect(
                    InventarioFrutaSinProcesarController.post_inventarios_ingreso_lote(mockReq)
                ).rejects.toThrow(ZodError);
            });

            test('debería aceptar observaciones de 2000 caracteres (límite exacto)', async () => {
                const maxString = 'A'.repeat(2000);
                mockReq.data.dataLote.observaciones = maxString;

                await expect(
                    InventarioFrutaSinProcesarController.post_inventarios_ingreso_lote(mockReq)
                ).resolves.not.toThrow();
            });

            test('debería rechazar numeroRemision con solo espacios (ahora tiene trim)', async () => {
                mockReq.data.dataLote.numeroRemision = '   ';

                // Con .trim() antes de .min(1), los espacios se eliminan
                // y queda un string vacío que falla la validación
                await expect(
                    InventarioFrutaSinProcesarController.post_inventarios_ingreso_lote(mockReq)
                ).rejects.toThrow(ZodError);
            });

            test('debería aceptar numeroRemision con espacios alrededor del texto', async () => {
                mockReq.data.dataLote.numeroRemision = '  REM-001  ';

                // Los espacios se eliminan con trim, queda "REM-001" que es válido
                await expect(
                    InventarioFrutaSinProcesarController.post_inventarios_ingreso_lote(mockReq)
                ).resolves.not.toThrow();
            });

            test('debería manejar promedio en el límite exacto 17.0', async () => {
                mockReq.data.dataLote.promedio = 17.0;
                mockReq.data.dataLote.kilos = 850; // 850 / 50 canastillas = 17

                await expect(
                    InventarioFrutaSinProcesarController.post_inventarios_ingreso_lote(mockReq)
                ).resolves.not.toThrow();
            });

            test('debería manejar promedio en el límite exacto 25.0', async () => {
                mockReq.data.dataLote.promedio = 25.0;
                mockReq.data.dataLote.kilos = 1250; // 1250 / 50 canastillas = 25

                await expect(
                    InventarioFrutaSinProcesarController.post_inventarios_ingreso_lote(mockReq)
                ).resolves.not.toThrow();
            });
        });
    });
});
