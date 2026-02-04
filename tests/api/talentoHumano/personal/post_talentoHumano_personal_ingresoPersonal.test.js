import { describe, test, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { ZodError } from 'zod';

/**
 * Tests para PersonalControllerRepository.post_talentoHumano_personal_ingresoPersonal
 *
 * Este endpoint permite registrar nuevo personal en talento humano.
 *
 * Flujo:
 * 1. Validación de usuario autenticado
 * 2. Validación Zod de datos de entrada (data, foto, cedulaPath, action)
 * 3. Validación manual de foto y cedulaPath
 * 4. Guardar archivo de foto (FileService.saveBufferFile)
 * 5. Procesar imagen con servicio Python (rustRcpClient.sendData)
 * 6. TRANSACCIÓN:
 *    a. Generar ObjectId para el nuevo empleado
 *    b. Incrementar y obtener serial SKU (Seriales.modificar_seriales)
 *    c. Crear carnet (TalentoHumanoDotacionCarnetsRepository.post_data)
 *    d. Incrementar y obtener serial PE (Seriales.modificar_seriales)
 *    e. Crear empleado (PersonalRepository.post_data)
 * 7. Limpieza de archivos (filePath + responsePath) en caso de error
 */

// ============================================================
// MOCKS DE INFRAESTRUCTURA
// ============================================================
const mockRegistrarPasoLog = jest.fn();
const mockExecuteTransactionalTask = jest.fn(async (req, taskLogic) => {
    return await taskLogic('mock-session', { _id: 'log-123' });
});

jest.unstable_mockModule('../../../../server/api/helper/logs.js', () => ({
    registrarPasoLog: mockRegistrarPasoLog
}));

jest.unstable_mockModule('../../../../server/utils/wrappers.js', () => ({
    executeTransactionalTask: mockExecuteTransactionalTask,
    executeQueryTask: jest.fn(async (taskLogic) => await taskLogic())
}));

// ============================================================
// MOCKS DE REPOSITORIOS Y SERVICIOS
// ============================================================
const mockPersonalRepository = {
    get_data: jest.fn(),
    post_data: jest.fn(),
    actualizar_data: jest.fn()
};

const mockTalentoHumanoDotacionCarnetsRepository = {
    post_data: jest.fn(),
    get_data: jest.fn(),
    actualizar_data: jest.fn()
};

const mockFileService = {
    saveBufferFile: jest.fn(),
    deleteFile: jest.fn(),
    readFileAsBase64: jest.fn()
};

const mockSeriales = {
    modificar_seriales: jest.fn()
};

const mockRustRpcClient = {
    sendData: jest.fn()
};

const mockCleanForRust = jest.fn(data => data);

jest.unstable_mockModule('../../../../server/Class/talentoHumano/Personal.js', () => ({
    PersonalRepository: mockPersonalRepository
}));

jest.unstable_mockModule('../../../../server/Class/talentoHumano/dotacion/Carnets.js', () => ({
    TalentoHumanoDotacionCarnetsRepository: mockTalentoHumanoDotacionCarnetsRepository
}));

jest.unstable_mockModule('../../../../server/services/helpers/FileService.js', () => ({
    FileService: mockFileService
}));

jest.unstable_mockModule('../../../../server/Class/Seriales.js', () => ({
    Seriales: mockSeriales
}));

jest.unstable_mockModule('../../../../config/grpcRust.js', () => ({
    rustRcpClient: mockRustRpcClient
}));

jest.unstable_mockModule('../../../../server/routes/sockets/utils/cleanData.js', () => ({
    cleanForRust: mockCleanForRust
}));

// Mocks adicionales requeridos por el controlador
jest.unstable_mockModule('../../../../DB/mongoDB/config/init.js', () => ({
    db: { Personal: { db: { startSession: jest.fn() } } }
}));

jest.unstable_mockModule('../../../../server/Class/LogsSistema.js', () => ({
    LogsRepository: { create: jest.fn() }
}));

jest.unstable_mockModule('../../../../server/api/utils/errorsHandlers.js', () => ({
    ErrorTalentHumanoLogicHandlers: jest.fn()
}));

jest.unstable_mockModule('../../../../server/services/talentoHumano/carnets.js', () => ({
    CarnetsService: {}
}));

// Importación dinámica del controlador
const { PersonalControllerRepository } = await import('../../../../server/api/talentoHumano/Personal.js');

describe('PersonalControllerRepository.post_talentoHumano_personal_ingresoPersonal', () => {

    // ============================================================
    // CONSTANTES Y DATOS DE PRUEBA
    // ============================================================
    const VALID_OBJECT_ID = '507f1f77bcf86cd799439011';
    const MOCK_FILE_PATH = 'personal/fotoCarnet/foto-123.jpg';
    const MOCK_PROCESSED_PATH = 'personal/fotoCarnetProcessed/foto-123-processed.jpg';
    const MOCK_CEDULA_PATH = 'personal/identificacion/cedula-123.pdf';
    const MOCK_SKU_SERIAL = 1001;
    const MOCK_PE_SERIAL = 5001;
    const MOCK_CARNET_ID = 'carnet-abc-123';

    let mockReq;

    const createValidBuffer = () => Buffer.from('fake-image-data');

    const createValidRequest = () => ({
        user: { _id: 'user-123', nombre: 'Test User' },
        data: {
            action: 'post_talentoHumano_personal_ingresoPersonal',
            data: {
                nombre: 'Juan Pérez',
                identificacion: '12345678',
                tipoDocumento: 'CC',
                tipoSangre: 'O+',
                cargo: VALID_OBJECT_ID
            },
            foto: createValidBuffer(),
            cedulaPath: MOCK_CEDULA_PATH
        }
    });

    const createSuccessRpcResponse = () => JSON.stringify({
        success: true,
        path: MOCK_PROCESSED_PATH
    });

    /** modificar_seriales usa findOneAndUpdate → retorna un documento, no un array */
    const createMockSkuResult = (serial = MOCK_SKU_SERIAL) => ({
        _id: 'sku-id',
        name: 'SKU',
        serial: serial
    });

    const createMockPeResult = (serial = MOCK_PE_SERIAL) => ({
        _id: 'pe-id',
        name: 'PE-',
        serial: serial
    });

    const setupHappyPathMocks = () => {
        mockFileService.saveBufferFile.mockResolvedValue(MOCK_FILE_PATH);
        mockFileService.deleteFile.mockResolvedValue(true);
        mockRustRpcClient.sendData.mockResolvedValue(createSuccessRpcResponse());
        mockSeriales.modificar_seriales
            .mockResolvedValueOnce(createMockSkuResult())
            .mockResolvedValueOnce(createMockPeResult());
        mockTalentoHumanoDotacionCarnetsRepository.post_data.mockResolvedValue({ _id: MOCK_CARNET_ID });
        mockPersonalRepository.post_data.mockResolvedValue({ _id: VALID_OBJECT_ID });
    };

    beforeEach(() => {
        jest.clearAllMocks();
        mockReq = createValidRequest();
        setupHappyPathMocks();
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    // ============================================================
    // TEST GROUP 1: CASOS DE ÉXITO
    // ============================================================
    describe('Casos de Éxito', () => {

        test('debería registrar personal exitosamente con datos válidos', async () => {
            await PersonalControllerRepository.post_talentoHumano_personal_ingresoPersonal(mockReq);

            expect(mockFileService.saveBufferFile).toHaveBeenCalledWith(
                mockReq.data.foto,
                expect.stringContaining('fotoCarnet'),
                'STORAGE'
            );
            expect(mockRustRpcClient.sendData).toHaveBeenCalled();
            expect(mockSeriales.modificar_seriales).toHaveBeenCalledTimes(2);
            expect(mockTalentoHumanoDotacionCarnetsRepository.post_data).toHaveBeenCalled();
            expect(mockPersonalRepository.post_data).toHaveBeenCalled();
        });

        test('debería crear el carnet con type "final", SKU y employeeId', async () => {
            await PersonalControllerRepository.post_talentoHumano_personal_ingresoPersonal(mockReq);

            expect(mockTalentoHumanoDotacionCarnetsRepository.post_data).toHaveBeenCalledWith(
                expect.objectContaining({
                    type: 'final',
                    SKU: MOCK_SKU_SERIAL,
                }),
                expect.objectContaining({
                    user: mockReq.user,
                    session: 'mock-session'
                })
            );
        });

        test('debería usar el mismo ObjectId como employeeId del carnet y _id del empleado', async () => {
            await PersonalControllerRepository.post_talentoHumano_personal_ingresoPersonal(mockReq);

            const carnetArgs = mockTalentoHumanoDotacionCarnetsRepository.post_data.mock.calls[0][0];
            const personalArgs = mockPersonalRepository.post_data.mock.calls[0][0];
            expect(personalArgs._id).toBe(carnetArgs.employeeId);
        });

        test('debería asignar PE serial correctamente al empleado', async () => {
            const expectedPe = 7777;
            mockSeriales.modificar_seriales
                .mockReset()
                .mockResolvedValueOnce(createMockSkuResult())
                .mockResolvedValueOnce(createMockPeResult(expectedPe));

            await PersonalControllerRepository.post_talentoHumano_personal_ingresoPersonal(mockReq);

            expect(mockPersonalRepository.post_data).toHaveBeenCalledWith(
                expect.objectContaining({ PE: expectedPe }),
                expect.any(Object)
            );
        });

        test('debería asignar el _id del carnet creado al empleado', async () => {
            await PersonalControllerRepository.post_talentoHumano_personal_ingresoPersonal(mockReq);

            expect(mockPersonalRepository.post_data).toHaveBeenCalledWith(
                expect.objectContaining({ carnet: MOCK_CARNET_ID }),
                expect.any(Object)
            );
        });

        test('debería asignar urlIdentificacion correctamente', async () => {
            await PersonalControllerRepository.post_talentoHumano_personal_ingresoPersonal(mockReq);

            expect(mockPersonalRepository.post_data).toHaveBeenCalledWith(
                expect.objectContaining({ urlIdentificacion: MOCK_CEDULA_PATH }),
                expect.any(Object)
            );
        });

        test('debería asignar urlFotoCarnet desde respuesta del servicio Python', async () => {
            await PersonalControllerRepository.post_talentoHumano_personal_ingresoPersonal(mockReq);

            expect(mockPersonalRepository.post_data).toHaveBeenCalledWith(
                expect.objectContaining({ urlFotoCarnet: MOCK_PROCESSED_PATH }),
                expect.any(Object)
            );
        });

        test('debería pasar el user._id y action a post_data del empleado', async () => {
            await PersonalControllerRepository.post_talentoHumano_personal_ingresoPersonal(mockReq);

            expect(mockPersonalRepository.post_data).toHaveBeenCalledWith(
                expect.any(Object),
                expect.objectContaining({
                    user: 'user-123',
                    action: 'post_talentoHumano_personal_ingresoPersonal',
                    session: 'mock-session'
                })
            );
        });

        test('debería llamar a modificar_seriales con SKU y session', async () => {
            await PersonalControllerRepository.post_talentoHumano_personal_ingresoPersonal(mockReq);

            expect(mockSeriales.modificar_seriales).toHaveBeenCalledWith(
                { name: 'SKU' },
                { $inc: { serial: 1 } },
                { session: 'mock-session' }
            );
        });

        test('debería llamar a modificar_seriales con PE- y session', async () => {
            await PersonalControllerRepository.post_talentoHumano_personal_ingresoPersonal(mockReq);

            expect(mockSeriales.modificar_seriales).toHaveBeenCalledWith(
                { name: 'PE-' },
                { $inc: { serial: 1 } },
                { session: 'mock-session' }
            );
        });

        test('debería registrar pasos en el log correctamente', async () => {
            await PersonalControllerRepository.post_talentoHumano_personal_ingresoPersonal(mockReq);

            expect(mockRegistrarPasoLog).toHaveBeenCalledWith('log-123', 'Actualizar serial', 'completado');
            expect(mockRegistrarPasoLog).toHaveBeenCalledWith('log-123', 'Creacion del carnet', 'completado');
            expect(mockRegistrarPasoLog).toHaveBeenCalledWith('log-123', 'Éxito', 'Completado', 'Empleado vinculado al carnet exitosamente');
        });

        test('debería enviar payload correcto al servicio Python', async () => {
            await PersonalControllerRepository.post_talentoHumano_personal_ingresoPersonal(mockReq);

            expect(mockRustRpcClient.sendData).toHaveBeenCalledWith({
                data: JSON.stringify(MOCK_FILE_PATH),
                server: 'python',
                action: 'talentoHumano_procesamiento_imagen'
            });
        });
    });

    // ============================================================
    // TEST GROUP 2: VALIDACIÓN DE USUARIO
    // ============================================================
    describe('Validación de Usuario', () => {

        test('debería lanzar error si req.user es undefined', async () => {
            delete mockReq.user;

            await expect(
                PersonalControllerRepository.post_talentoHumano_personal_ingresoPersonal(mockReq)
            ).rejects.toThrow('Usuario no encontrado');
        });

        test('debería lanzar error si req.user es null', async () => {
            mockReq.user = null;

            await expect(
                PersonalControllerRepository.post_talentoHumano_personal_ingresoPersonal(mockReq)
            ).rejects.toThrow('Usuario no encontrado');
        });

        test('debería lanzar error si req.user._id es undefined', async () => {
            delete mockReq.user._id;

            await expect(
                PersonalControllerRepository.post_talentoHumano_personal_ingresoPersonal(mockReq)
            ).rejects.toThrow('Usuario no encontrado');
        });

        test('debería lanzar error si req.user._id es null', async () => {
            mockReq.user._id = null;

            await expect(
                PersonalControllerRepository.post_talentoHumano_personal_ingresoPersonal(mockReq)
            ).rejects.toThrow('Usuario no encontrado');
        });
    });

    // ============================================================
    // TEST GROUP 3: VALIDACIÓN MANUAL DE FOTO Y CEDULAPATH
    // ============================================================
    describe('Validación Manual de foto y cedulaPath', () => {

        test('debería lanzar error si foto es undefined', async () => {
            delete mockReq.data.foto;

            await expect(
                PersonalControllerRepository.post_talentoHumano_personal_ingresoPersonal(mockReq)
            ).rejects.toThrow();
        });

        test('debería lanzar error si foto es null', async () => {
            mockReq.data.foto = null;

            await expect(
                PersonalControllerRepository.post_talentoHumano_personal_ingresoPersonal(mockReq)
            ).rejects.toThrow();
        });

        test('debería lanzar error si cedulaPath es undefined', async () => {
            delete mockReq.data.cedulaPath;

            await expect(
                PersonalControllerRepository.post_talentoHumano_personal_ingresoPersonal(mockReq)
            ).rejects.toThrow();
        });

        test('debería lanzar error si cedulaPath es null', async () => {
            mockReq.data.cedulaPath = null;

            await expect(
                PersonalControllerRepository.post_talentoHumano_personal_ingresoPersonal(mockReq)
            ).rejects.toThrow();
        });

        test('debería lanzar error si cedulaPath está vacío', async () => {
            mockReq.data.cedulaPath = '';

            await expect(
                PersonalControllerRepository.post_talentoHumano_personal_ingresoPersonal(mockReq)
            ).rejects.toThrow();
        });
    });

    // ============================================================
    // TEST GROUP 4: VALIDACIÓN ZOD - CAMPO data (objeto interno)
    // ============================================================
    describe('Validación Zod - Campo data (objeto interno)', () => {

        test('debería rechazar si data.nombre está vacío', async () => {
            mockReq.data.data.nombre = '';

            await expect(
                PersonalControllerRepository.post_talentoHumano_personal_ingresoPersonal(mockReq)
            ).rejects.toThrow(ZodError);
        });

        test('debería rechazar si data.nombre es undefined', async () => {
            delete mockReq.data.data.nombre;

            await expect(
                PersonalControllerRepository.post_talentoHumano_personal_ingresoPersonal(mockReq)
            ).rejects.toThrow(ZodError);
        });

        test('debería rechazar si data.identificacion está vacío', async () => {
            mockReq.data.data.identificacion = '';

            await expect(
                PersonalControllerRepository.post_talentoHumano_personal_ingresoPersonal(mockReq)
            ).rejects.toThrow(ZodError);
        });

        test('debería rechazar si data.identificacion es undefined', async () => {
            delete mockReq.data.data.identificacion;

            await expect(
                PersonalControllerRepository.post_talentoHumano_personal_ingresoPersonal(mockReq)
            ).rejects.toThrow(ZodError);
        });

        test('debería rechazar si data.tipoDocumento está vacío', async () => {
            mockReq.data.data.tipoDocumento = '';

            await expect(
                PersonalControllerRepository.post_talentoHumano_personal_ingresoPersonal(mockReq)
            ).rejects.toThrow(ZodError);
        });

        test('debería rechazar si data.tipoDocumento es undefined', async () => {
            delete mockReq.data.data.tipoDocumento;

            await expect(
                PersonalControllerRepository.post_talentoHumano_personal_ingresoPersonal(mockReq)
            ).rejects.toThrow(ZodError);
        });

        test('debería rechazar si data.tipoSangre está vacío', async () => {
            mockReq.data.data.tipoSangre = '';

            await expect(
                PersonalControllerRepository.post_talentoHumano_personal_ingresoPersonal(mockReq)
            ).rejects.toThrow(ZodError);
        });

        test('debería rechazar si data.tipoSangre es undefined', async () => {
            delete mockReq.data.data.tipoSangre;

            await expect(
                PersonalControllerRepository.post_talentoHumano_personal_ingresoPersonal(mockReq)
            ).rejects.toThrow(ZodError);
        });

        test('debería rechazar si data.cargo está vacío', async () => {
            mockReq.data.data.cargo = '';

            await expect(
                PersonalControllerRepository.post_talentoHumano_personal_ingresoPersonal(mockReq)
            ).rejects.toThrow(ZodError);
        });

        test('debería rechazar si data.cargo es undefined', async () => {
            delete mockReq.data.data.cargo;

            await expect(
                PersonalControllerRepository.post_talentoHumano_personal_ingresoPersonal(mockReq)
            ).rejects.toThrow(ZodError);
        });

        test('debería rechazar si data es null', async () => {
            mockReq.data.data = null;

            await expect(
                PersonalControllerRepository.post_talentoHumano_personal_ingresoPersonal(mockReq)
            ).rejects.toThrow(ZodError);
        });

        test('debería rechazar si data es undefined', async () => {
            delete mockReq.data.data;

            await expect(
                PersonalControllerRepository.post_talentoHumano_personal_ingresoPersonal(mockReq)
            ).rejects.toThrow(ZodError);
        });
    });

    // ============================================================
    // TEST GROUP 5: VALIDACIÓN ZOD - CAMPO action
    // ============================================================
    describe('Validación Zod - Campo action', () => {

        test('debería rechazar si action está vacío', async () => {
            mockReq.data.action = '';

            await expect(
                PersonalControllerRepository.post_talentoHumano_personal_ingresoPersonal(mockReq)
            ).rejects.toThrow(ZodError);
        });

        test('debería rechazar si action es null', async () => {
            mockReq.data.action = null;

            await expect(
                PersonalControllerRepository.post_talentoHumano_personal_ingresoPersonal(mockReq)
            ).rejects.toThrow(ZodError);
        });

        test('debería rechazar si action es undefined', async () => {
            delete mockReq.data.action;

            await expect(
                PersonalControllerRepository.post_talentoHumano_personal_ingresoPersonal(mockReq)
            ).rejects.toThrow(ZodError);
        });

        test('debería rechazar si action es un número', async () => {
            mockReq.data.action = 12345;

            await expect(
                PersonalControllerRepository.post_talentoHumano_personal_ingresoPersonal(mockReq)
            ).rejects.toThrow(ZodError);
        });

        test('debería rechazar si action contiene $', async () => {
            mockReq.data.action = '$malicious';

            await expect(
                PersonalControllerRepository.post_talentoHumano_personal_ingresoPersonal(mockReq)
            ).rejects.toThrow(ZodError);
        });

        test('debería rechazar si action contiene {', async () => {
            mockReq.data.action = 'action{injection}';

            await expect(
                PersonalControllerRepository.post_talentoHumano_personal_ingresoPersonal(mockReq)
            ).rejects.toThrow(ZodError);
        });

        test('debería rechazar si action contiene <script', async () => {
            mockReq.data.action = '<script>alert(1)</script>';

            await expect(
                PersonalControllerRepository.post_talentoHumano_personal_ingresoPersonal(mockReq)
            ).rejects.toThrow(ZodError);
        });
    });

    // ============================================================
    // TEST GROUP 6: VALIDACIÓN ZOD - CAMPO cedulaPath (requiredSafeString)
    // ============================================================
    describe('Validación Zod - Campo cedulaPath', () => {

        test('debería rechazar si cedulaPath contiene $', async () => {
            mockReq.data.cedulaPath = 'path/$ne/file.pdf';

            await expect(
                PersonalControllerRepository.post_talentoHumano_personal_ingresoPersonal(mockReq)
            ).rejects.toThrow(ZodError);
        });

        test('debería rechazar si cedulaPath contiene {', async () => {
            mockReq.data.cedulaPath = 'path/{injection}/file.pdf';

            await expect(
                PersonalControllerRepository.post_talentoHumano_personal_ingresoPersonal(mockReq)
            ).rejects.toThrow(ZodError);
        });

        test('debería rechazar si cedulaPath contiene }', async () => {
            mockReq.data.cedulaPath = 'path/injection}/file.pdf';

            await expect(
                PersonalControllerRepository.post_talentoHumano_personal_ingresoPersonal(mockReq)
            ).rejects.toThrow(ZodError);
        });

        test('debería rechazar si cedulaPath contiene <script', async () => {
            mockReq.data.cedulaPath = '<script>alert(1)</script>.pdf';

            await expect(
                PersonalControllerRepository.post_talentoHumano_personal_ingresoPersonal(mockReq)
            ).rejects.toThrow(ZodError);
        });

        test('debería aceptar cedulaPath con ruta válida', async () => {
            mockReq.data.cedulaPath = 'personal/identificacion/cedula-12345.pdf';

            await expect(
                PersonalControllerRepository.post_talentoHumano_personal_ingresoPersonal(mockReq)
            ).resolves.not.toThrow(ZodError);
        });
    });

    // ============================================================
    // TEST GROUP 7: VALIDACIÓN ZOD - CAMPO foto (bufferData)
    // ============================================================
    describe('Validación Zod - Campo foto (bufferData)', () => {

        test('debería aceptar foto como Buffer', async () => {
            mockReq.data.foto = Buffer.from('valid-image-data');

            await expect(
                PersonalControllerRepository.post_talentoHumano_personal_ingresoPersonal(mockReq)
            ).resolves.not.toThrow(ZodError);
        });

        test('debería aceptar foto como Uint8Array', async () => {
            mockReq.data.foto = new Uint8Array([0x89, 0x50, 0x4E, 0x47]);

            await expect(
                PersonalControllerRepository.post_talentoHumano_personal_ingresoPersonal(mockReq)
            ).resolves.not.toThrow(ZodError);
        });

        test('debería rechazar foto como string', async () => {
            mockReq.data.foto = 'no-es-un-buffer';

            await expect(
                PersonalControllerRepository.post_talentoHumano_personal_ingresoPersonal(mockReq)
            ).rejects.toThrow(ZodError);
        });

        test('debería rechazar foto como número', async () => {
            mockReq.data.foto = 12345;

            await expect(
                PersonalControllerRepository.post_talentoHumano_personal_ingresoPersonal(mockReq)
            ).rejects.toThrow(ZodError);
        });

        test('debería rechazar foto como objeto plano', async () => {
            mockReq.data.foto = { data: 'fake' };

            await expect(
                PersonalControllerRepository.post_talentoHumano_personal_ingresoPersonal(mockReq)
            ).rejects.toThrow(ZodError);
        });

        test('debería rechazar foto como array', async () => {
            mockReq.data.foto = [1, 2, 3, 4];

            await expect(
                PersonalControllerRepository.post_talentoHumano_personal_ingresoPersonal(mockReq)
            ).rejects.toThrow(ZodError);
        });
    });

    // ============================================================
    // TEST GROUP 8: MANEJO DE ERRORES Y LIMPIEZA DE ARCHIVOS
    // ============================================================
    describe('Manejo de Errores y Limpieza de Archivos', () => {

        test('debería eliminar filePath y NO ejecutar transacción si rustRcpClient.sendData falla', async () => {
            mockRustRpcClient.sendData.mockRejectedValue(new Error('Error de conexión RPC'));

            await expect(
                PersonalControllerRepository.post_talentoHumano_personal_ingresoPersonal(mockReq)
            ).rejects.toThrow('Error de conexión RPC');

            expect(mockFileService.deleteFile).toHaveBeenCalledWith(MOCK_FILE_PATH, 'STORAGE');
            expect(mockFileService.deleteFile).toHaveBeenCalledTimes(1);
            expect(mockExecuteTransactionalTask).not.toHaveBeenCalled();
            expect(mockSeriales.modificar_seriales).not.toHaveBeenCalled();
            expect(mockPersonalRepository.post_data).not.toHaveBeenCalled();
        });

        test('debería eliminar filePath y NO ejecutar transacción si JSON.parse falla (respuesta inválida)', async () => {
            mockRustRpcClient.sendData.mockResolvedValue('respuesta-no-json-valida');

            await expect(
                PersonalControllerRepository.post_talentoHumano_personal_ingresoPersonal(mockReq)
            ).rejects.toThrow();

            expect(mockFileService.deleteFile).toHaveBeenCalledWith(MOCK_FILE_PATH, 'STORAGE');
            expect(mockFileService.deleteFile).toHaveBeenCalledTimes(1);
            expect(mockExecuteTransactionalTask).not.toHaveBeenCalled();
        });

        test('debería eliminar filePath y NO ejecutar transacción si response.success es false', async () => {
            mockRustRpcClient.sendData.mockResolvedValue(JSON.stringify({
                success: false,
                message: 'Error al procesar imagen'
            }));

            await expect(
                PersonalControllerRepository.post_talentoHumano_personal_ingresoPersonal(mockReq)
            ).rejects.toThrow('Error al procesar imagen');

            expect(mockFileService.deleteFile).toHaveBeenCalledWith(MOCK_FILE_PATH, 'STORAGE');
            expect(mockFileService.deleteFile).toHaveBeenCalledTimes(1);
            expect(mockExecuteTransactionalTask).not.toHaveBeenCalled();
        });

        test('debería eliminar filePath y responsePath si el serial SKU no se encuentra', async () => {
            mockSeriales.modificar_seriales
                .mockReset()
                .mockResolvedValueOnce(null);

            await expect(
                PersonalControllerRepository.post_talentoHumano_personal_ingresoPersonal(mockReq)
            ).rejects.toThrow('No se encontró el serial SKU');

            expect(mockFileService.deleteFile).toHaveBeenCalledWith(MOCK_FILE_PATH, 'STORAGE');
            expect(mockFileService.deleteFile).toHaveBeenCalledWith(MOCK_PROCESSED_PATH, 'STORAGE');
            expect(mockExecuteTransactionalTask).toHaveBeenCalled();
            expect(mockTalentoHumanoDotacionCarnetsRepository.post_data).not.toHaveBeenCalled();
            expect(mockPersonalRepository.post_data).not.toHaveBeenCalled();
        });

        test('debería eliminar filePath y responsePath si la creación del carnet falla', async () => {
            mockTalentoHumanoDotacionCarnetsRepository.post_data.mockResolvedValue(null);

            await expect(
                PersonalControllerRepository.post_talentoHumano_personal_ingresoPersonal(mockReq)
            ).rejects.toThrow('Error creando el carnet');

            expect(mockFileService.deleteFile).toHaveBeenCalledWith(MOCK_FILE_PATH, 'STORAGE');
            expect(mockFileService.deleteFile).toHaveBeenCalledWith(MOCK_PROCESSED_PATH, 'STORAGE');
            expect(mockPersonalRepository.post_data).not.toHaveBeenCalled();
        });

        test('debería eliminar filePath y responsePath si la creación del carnet lanza error', async () => {
            mockTalentoHumanoDotacionCarnetsRepository.post_data.mockRejectedValue(new Error('Error de BD en carnet'));

            await expect(
                PersonalControllerRepository.post_talentoHumano_personal_ingresoPersonal(mockReq)
            ).rejects.toThrow('Error de BD en carnet');

            expect(mockFileService.deleteFile).toHaveBeenCalledWith(MOCK_FILE_PATH, 'STORAGE');
            expect(mockFileService.deleteFile).toHaveBeenCalledWith(MOCK_PROCESSED_PATH, 'STORAGE');
            expect(mockPersonalRepository.post_data).not.toHaveBeenCalled();
        });

        test('debería eliminar filePath y responsePath si el serial PE no se encuentra', async () => {
            mockSeriales.modificar_seriales
                .mockReset()
                .mockResolvedValueOnce(createMockSkuResult())
                .mockResolvedValueOnce(null);

            await expect(
                PersonalControllerRepository.post_talentoHumano_personal_ingresoPersonal(mockReq)
            ).rejects.toThrow('No se encontró el serial PE');

            expect(mockFileService.deleteFile).toHaveBeenCalledWith(MOCK_FILE_PATH, 'STORAGE');
            expect(mockFileService.deleteFile).toHaveBeenCalledWith(MOCK_PROCESSED_PATH, 'STORAGE');
            expect(mockTalentoHumanoDotacionCarnetsRepository.post_data).toHaveBeenCalled();
            expect(mockPersonalRepository.post_data).not.toHaveBeenCalled();
        });

        test('debería eliminar filePath y responsePath si PersonalRepository.post_data falla', async () => {
            mockPersonalRepository.post_data.mockRejectedValue(new Error('Error de base de datos'));

            await expect(
                PersonalControllerRepository.post_talentoHumano_personal_ingresoPersonal(mockReq)
            ).rejects.toThrow('Error de base de datos');

            expect(mockFileService.deleteFile).toHaveBeenCalledWith(MOCK_FILE_PATH, 'STORAGE');
            expect(mockFileService.deleteFile).toHaveBeenCalledWith(MOCK_PROCESSED_PATH, 'STORAGE');
            expect(mockFileService.deleteFile).toHaveBeenCalledTimes(2);
        });

        test('debería propagar error original si FileService.deleteFile también falla', async () => {
            const originalError = new Error('Error RPC original');
            mockRustRpcClient.sendData.mockRejectedValue(originalError);
            mockFileService.deleteFile.mockRejectedValue(new Error('Error al eliminar archivo'));

            await expect(
                PersonalControllerRepository.post_talentoHumano_personal_ingresoPersonal(mockReq)
            ).rejects.toThrow('Error RPC original');

            expect(mockExecuteTransactionalTask).not.toHaveBeenCalled();
        });

        test('no debería llamar deleteFile ni transacción si saveBufferFile falla', async () => {
            mockFileService.saveBufferFile.mockRejectedValue(new Error('Error al guardar archivo'));

            await expect(
                PersonalControllerRepository.post_talentoHumano_personal_ingresoPersonal(mockReq)
            ).rejects.toThrow('Error al guardar archivo');

            expect(mockFileService.deleteFile).not.toHaveBeenCalled();
            expect(mockExecuteTransactionalTask).not.toHaveBeenCalled();
            expect(mockRustRpcClient.sendData).not.toHaveBeenCalled();
            expect(mockSeriales.modificar_seriales).not.toHaveBeenCalled();
            expect(mockPersonalRepository.post_data).not.toHaveBeenCalled();
        });
    });

    // ============================================================
    // TEST GROUP 9: SEGURIDAD - NoSQL INJECTION
    // ============================================================
    describe('Seguridad - Intentos de NoSQL Injection', () => {

        test('debería rechazar operador $ne en action', async () => {
            mockReq.data.action = { $ne: null };

            await expect(
                PersonalControllerRepository.post_talentoHumano_personal_ingresoPersonal(mockReq)
            ).rejects.toThrow(ZodError);
        });

        test('debería rechazar operador $gt en cedulaPath', async () => {
            mockReq.data.cedulaPath = { $gt: '' };

            await expect(
                PersonalControllerRepository.post_talentoHumano_personal_ingresoPersonal(mockReq)
            ).rejects.toThrow(ZodError);
        });

        test('debería rechazar operador $regex en data.nombre', async () => {
            mockReq.data.data.nombre = { $regex: '.*' };

            await expect(
                PersonalControllerRepository.post_talentoHumano_personal_ingresoPersonal(mockReq)
            ).rejects.toThrow(ZodError);
        });

        test('debería rechazar operador $where en data.identificacion', async () => {
            mockReq.data.data.identificacion = { $where: 'return true' };

            await expect(
                PersonalControllerRepository.post_talentoHumano_personal_ingresoPersonal(mockReq)
            ).rejects.toThrow(ZodError);
        });

        test('debería rechazar operador $exists en data.cargo', async () => {
            mockReq.data.data.cargo = { $exists: true };

            await expect(
                PersonalControllerRepository.post_talentoHumano_personal_ingresoPersonal(mockReq)
            ).rejects.toThrow(ZodError);
        });

        test('debería rechazar operador $in en data.tipoSangre', async () => {
            mockReq.data.data.tipoSangre = { $in: ['A+', 'O+'] };

            await expect(
                PersonalControllerRepository.post_talentoHumano_personal_ingresoPersonal(mockReq)
            ).rejects.toThrow(ZodError);
        });
    });

    // ============================================================
    // TEST GROUP 10: SEGURIDAD - PROTOTYPE POLLUTION
    // ============================================================
    describe('Seguridad - Prototype Pollution', () => {

        test('no debería contaminar Object.prototype con __proto__', async () => {
            const originalPrototype = { ...Object.prototype };
            mockReq.data.__proto__ = { malicious: true };

            try {
                await PersonalControllerRepository.post_talentoHumano_personal_ingresoPersonal(mockReq);
            } catch (e) {
                // Puede fallar, está bien
            }

            expect({}.malicious).toBeUndefined();
            expect(Object.prototype).toEqual(originalPrototype);
        });

        test('no debería contaminar con constructor.prototype', async () => {
            mockReq.data['constructor'] = { prototype: { pwned: true } };

            try {
                await PersonalControllerRepository.post_talentoHumano_personal_ingresoPersonal(mockReq);
            } catch (e) {
                // Puede fallar validación
            }

            expect({}.pwned).toBeUndefined();
        });
    });

    // ============================================================
    // TEST GROUP 11: DATOS MALFORMADOS
    // ============================================================
    describe('Datos Malformados', () => {

        test('debería rechazar si req.data es null', async () => {
            mockReq.data = null;

            await expect(
                PersonalControllerRepository.post_talentoHumano_personal_ingresoPersonal(mockReq)
            ).rejects.toThrow();
        });

        test('debería rechazar si req.data es undefined', async () => {
            delete mockReq.data;

            await expect(
                PersonalControllerRepository.post_talentoHumano_personal_ingresoPersonal(mockReq)
            ).rejects.toThrow();
        });

        test('debería rechazar si req.data es un string', async () => {
            mockReq.data = 'string-malicioso';

            await expect(
                PersonalControllerRepository.post_talentoHumano_personal_ingresoPersonal(mockReq)
            ).rejects.toThrow();
        });

        test('debería rechazar si req.data es un array', async () => {
            mockReq.data = [createValidRequest().data];

            await expect(
                PersonalControllerRepository.post_talentoHumano_personal_ingresoPersonal(mockReq)
            ).rejects.toThrow();
        });
    });

    // ============================================================
    // TEST GROUP 12: TRANSACCIONES
    // ============================================================
    describe('Transacciones', () => {

        test('debería ejecutar operaciones dentro de executeTransactionalTask', async () => {
            await PersonalControllerRepository.post_talentoHumano_personal_ingresoPersonal(mockReq);

            expect(mockExecuteTransactionalTask).toHaveBeenCalledWith(
                mockReq,
                expect.any(Function)
            );
        });

        test('debería revertir transacción si post_data falla', async () => {
            mockPersonalRepository.post_data.mockRejectedValue(new Error('DB Error'));

            await expect(
                PersonalControllerRepository.post_talentoHumano_personal_ingresoPersonal(mockReq)
            ).rejects.toThrow('DB Error');

            expect(mockExecuteTransactionalTask).toHaveBeenCalled();
        });

        test('debería pasar session a ambas llamadas de Seriales.modificar_seriales', async () => {
            await PersonalControllerRepository.post_talentoHumano_personal_ingresoPersonal(mockReq);

            const calls = mockSeriales.modificar_seriales.mock.calls;
            expect(calls).toHaveLength(2);
            expect(calls[0][2]).toEqual({ session: 'mock-session' });
            expect(calls[1][2]).toEqual({ session: 'mock-session' });
        });

        test('debería pasar session a TalentoHumanoDotacionCarnetsRepository.post_data', async () => {
            await PersonalControllerRepository.post_talentoHumano_personal_ingresoPersonal(mockReq);

            expect(mockTalentoHumanoDotacionCarnetsRepository.post_data).toHaveBeenCalledWith(
                expect.any(Object),
                expect.objectContaining({ session: 'mock-session' })
            );
        });

        test('debería pasar session a PersonalRepository.post_data', async () => {
            await PersonalControllerRepository.post_talentoHumano_personal_ingresoPersonal(mockReq);

            expect(mockPersonalRepository.post_data).toHaveBeenCalledWith(
                expect.any(Object),
                expect.objectContaining({ session: 'mock-session' })
            );
        });
    });

    // ============================================================
    // TEST GROUP 13: CASOS EDGE
    // ============================================================
    describe('Casos Edge', () => {

        test('debería manejar foto muy pequeña (1 byte)', async () => {
            mockReq.data.foto = Buffer.from([0x00]);

            await expect(
                PersonalControllerRepository.post_talentoHumano_personal_ingresoPersonal(mockReq)
            ).resolves.not.toThrow();
        });

        test('debería manejar datos con caracteres unicode', async () => {
            mockReq.data.data.nombre = 'José María Ñoño 日本語';

            await expect(
                PersonalControllerRepository.post_talentoHumano_personal_ingresoPersonal(mockReq)
            ).resolves.not.toThrow();
        });

        test('debería manejar SKU con valor muy alto', async () => {
            mockSeriales.modificar_seriales
                .mockReset()
                .mockResolvedValueOnce(createMockSkuResult(999999999))
                .mockResolvedValueOnce(createMockPeResult());

            await PersonalControllerRepository.post_talentoHumano_personal_ingresoPersonal(mockReq);

            expect(mockTalentoHumanoDotacionCarnetsRepository.post_data).toHaveBeenCalledWith(
                expect.objectContaining({ SKU: 999999999 }),
                expect.any(Object)
            );
        });

        test('debería manejar PE con valor muy alto', async () => {
            mockSeriales.modificar_seriales
                .mockReset()
                .mockResolvedValueOnce(createMockSkuResult())
                .mockResolvedValueOnce(createMockPeResult(999999999));

            await PersonalControllerRepository.post_talentoHumano_personal_ingresoPersonal(mockReq);

            expect(mockPersonalRepository.post_data).toHaveBeenCalledWith(
                expect.objectContaining({ PE: 999999999 }),
                expect.any(Object)
            );
        });

        test('debería manejar response.message undefined cuando success es false', async () => {
            mockRustRpcClient.sendData.mockResolvedValue(JSON.stringify({
                success: false
                // message es undefined
            }));

            await expect(
                PersonalControllerRepository.post_talentoHumano_personal_ingresoPersonal(mockReq)
            ).rejects.toThrow('Error al procesar la imagen');
        });

        test('debería manejar cedulaPath con espacios', async () => {
            mockReq.data.cedulaPath = 'personal/identificacion/cedula con espacios.pdf';

            await expect(
                PersonalControllerRepository.post_talentoHumano_personal_ingresoPersonal(mockReq)
            ).resolves.not.toThrow();
        });

        test('debería manejar response.path vacío', async () => {
            mockRustRpcClient.sendData.mockResolvedValue(JSON.stringify({
                success: true,
                path: ''
            }));

            await PersonalControllerRepository.post_talentoHumano_personal_ingresoPersonal(mockReq);

            expect(mockPersonalRepository.post_data).toHaveBeenCalledWith(
                expect.objectContaining({ urlFotoCarnet: '' }),
                expect.any(Object)
            );
        });
    });

    // ============================================================
    // TEST GROUP 14: ORDEN DE EJECUCIÓN
    // ============================================================
    describe('Orden de Ejecución', () => {

        test('debería validar antes de guardar archivo', async () => {
            mockReq.data.action = ''; // Inválido

            await expect(
                PersonalControllerRepository.post_talentoHumano_personal_ingresoPersonal(mockReq)
            ).rejects.toThrow(ZodError);

            expect(mockFileService.saveBufferFile).not.toHaveBeenCalled();
        });

        test('debería guardar archivo antes de llamar al servicio Python', async () => {
            const callOrder = [];
            mockFileService.saveBufferFile.mockImplementation(async () => {
                callOrder.push('saveBufferFile');
                return MOCK_FILE_PATH;
            });
            mockRustRpcClient.sendData.mockImplementation(async () => {
                callOrder.push('sendData');
                return createSuccessRpcResponse();
            });

            await PersonalControllerRepository.post_talentoHumano_personal_ingresoPersonal(mockReq);

            expect(callOrder).toEqual(expect.arrayContaining(['saveBufferFile', 'sendData']));
            expect(callOrder.indexOf('saveBufferFile')).toBeLessThan(callOrder.indexOf('sendData'));
        });

        test('debería llamar al servicio Python antes de la transacción', async () => {
            const callOrder = [];
            mockRustRpcClient.sendData.mockImplementation(async () => {
                callOrder.push('sendData');
                return createSuccessRpcResponse();
            });
            mockExecuteTransactionalTask.mockImplementation(async (req, taskLogic) => {
                callOrder.push('transaction');
                return await taskLogic('mock-session', { _id: 'log-123' });
            });

            await PersonalControllerRepository.post_talentoHumano_personal_ingresoPersonal(mockReq);

            expect(callOrder.indexOf('sendData')).toBeLessThan(callOrder.indexOf('transaction'));
        });

        test('debería seguir el orden: SKU → carnet → PE → empleado dentro de la transacción', async () => {
            const callOrder = [];
            mockSeriales.modificar_seriales.mockReset().mockImplementation(async (filter) => {
                callOrder.push(`seriales_${filter.name}`);
                return filter.name === 'SKU' ? createMockSkuResult() : createMockPeResult();
            });
            mockTalentoHumanoDotacionCarnetsRepository.post_data.mockImplementation(async () => {
                callOrder.push('carnet_post_data');
                return { _id: MOCK_CARNET_ID };
            });
            mockPersonalRepository.post_data.mockImplementation(async () => {
                callOrder.push('personal_post_data');
                return { _id: VALID_OBJECT_ID };
            });

            await PersonalControllerRepository.post_talentoHumano_personal_ingresoPersonal(mockReq);

            expect(callOrder).toEqual([
                'seriales_SKU',
                'carnet_post_data',
                'seriales_PE-',
                'personal_post_data'
            ]);
        });
    });
});
