import { describe, test, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { ZodError } from 'zod';

/**
 * Tests para PersonalControllerRepository.put_talentoHumano_upload_document
 *
 * Este endpoint permite subir la foto de carnet para actualizar los
 * registros de personal en talento humano.
 *
 * Flujo:
 * 1. Validación Zod de datos de entrada (_id, action, file como Buffer)
 * 2. Verificación de existencia del personal
 * 3. Verificación de estado activo del personal
 * 4. Subida del archivo crudo a STORAGE
 * 5. Envío del archivo a rustRcpClient para procesamiento de imagen (servidor Python)
 * 6. Actualización de urlFotoCarnet con la ruta devuelta por el procesamiento
 * 7. Eliminación del documento anterior si existía, una vez confirmada la actualización
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
    executeQueryTask: jest.fn(async (req, taskLogic) => await taskLogic(req))
}));

// ============================================================
// MOCKS DE REPOSITORIOS Y SERVICIOS
// ============================================================
const mockPersonalRepository = {
    get_data: jest.fn(),
    actualizar_data: jest.fn()
};

const mockFileService = {
    deleteFile: jest.fn(),
    saveBase64File: jest.fn(),
    saveBufferFile: jest.fn(),
    readFileAsBase64: jest.fn()
};

const mockCleanForRust = jest.fn(data => data);
const mockSendData = jest.fn();

jest.unstable_mockModule('../../../../server/Class/talentoHumano/Personal.js', () => ({
    PersonalRepository: mockPersonalRepository
}));

jest.unstable_mockModule('../../../../server/services/helpers/FileService.js', () => ({
    FileService: mockFileService
}));

// Mocks adicionales requeridos por el controlador
jest.unstable_mockModule('../../../../DB/mongoDB/config/init.js', () => ({
    db: { Personal: { db: { startSession: jest.fn() } } }
}));

jest.unstable_mockModule('../../../../server/Class/LogsSistema.js', () => ({
    LogsRepository: { create: jest.fn() }
}));

jest.unstable_mockModule('../../../../server/Class/Seriales.js', () => ({
    Seriales: {}
}));

jest.unstable_mockModule('../../../../server/api/utils/errorsHandlers.js', () => ({
    ErrorTalentHumanoLogicHandlers: jest.fn()
}));

jest.unstable_mockModule('../../../../server/routes/sockets/utils/cleanData.js', () => ({
    cleanForRust: mockCleanForRust
}));

jest.unstable_mockModule('../../../../config/grpcRust.js', () => ({
    rustRcpClient: { sendData: mockSendData }
}));

jest.unstable_mockModule('../../../../server/services/talentoHumano/carnets.js', () => ({
    CarnetsService: {}
}));

jest.unstable_mockModule('../../../../server/Class/talentoHumano/dotacion/Carnets.js', () => ({
    TalentoHumanoDotacionCarnetsRepository: {}
}));


// Importación dinámica del controlador
const { PersonalControllerRepository } = await import('../../../../server/api/talentoHumano/Personal.js');

describe('PersonalControllerRepository.put_talentoHumano_upload_document', () => {

    // ============================================================
    // CONSTANTES Y DATOS DE PRUEBA
    // ============================================================
    const VALID_OBJECT_ID = '507f1f77bcf86cd799439011';
    const VALID_FILE_BUFFER = Buffer.from('fake-image-data');
    const RAW_UPLOAD_PATH = 'personal/fotoCarnet/raw-photo.jpg';
    const PROCESSED_PHOTO_PATH = 'personal/fotoCarnet/processed-photo.jpg';

    let mockReq;

    const createValidRequest = () => ({
        user: { _id: 'user-123', nombre: 'Test User' },
        data: {
            _id: VALID_OBJECT_ID,
            action: 'put_talentoHumano_upload_document',
            file: VALID_FILE_BUFFER
        }
    });

    const createMockPersonal = (overrides = {}) => ({
        _id: VALID_OBJECT_ID,
        nombre: 'Juan',
        apellido: 'Pérez',
        estado: true,
        urlFotoCarnet: 'personal/fotoCarnet/existing-photo.jpg',
        ...overrides
    });

    beforeEach(() => {
        jest.clearAllMocks();
        mockReq = createValidRequest();

        // Happy path mocks
        mockPersonalRepository.get_data.mockResolvedValue([createMockPersonal()]);
        mockPersonalRepository.actualizar_data.mockResolvedValue({ _id: VALID_OBJECT_ID });
        mockFileService.deleteFile.mockResolvedValue(true);
        mockFileService.saveBufferFile.mockResolvedValue(RAW_UPLOAD_PATH);
        mockCleanForRust.mockImplementation(data => data);
        mockSendData.mockResolvedValue(JSON.stringify({ success: true, path: PROCESSED_PHOTO_PATH }));
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    // ============================================================
    // TEST GROUP 1: CASOS DE ÉXITO
    // ============================================================
    describe('Casos de Éxito', () => {

        test('debería subir foto exitosamente con datos válidos', async () => {
            await PersonalControllerRepository.put_talentoHumano_upload_document(mockReq);

            expect(mockPersonalRepository.get_data).toHaveBeenCalledWith(
                { ids: [VALID_OBJECT_ID] },
                { session: 'mock-session' }
            );
            expect(mockFileService.saveBufferFile).toHaveBeenCalled();
            expect(mockSendData).toHaveBeenCalled();
            expect(mockPersonalRepository.actualizar_data).toHaveBeenCalled();
            expect(mockFileService.deleteFile).toHaveBeenCalled();
        });

        test('debería subir el archivo crudo a STORAGE en la ruta personal/fotoCarnet', async () => {
            await PersonalControllerRepository.put_talentoHumano_upload_document(mockReq);

            expect(mockFileService.saveBufferFile).toHaveBeenCalledWith(
                mockReq.data.file,
                expect.stringContaining('fotoCarnet'),
                'STORAGE'
            );
        });

        test('debería enviar el archivo procesado a rustRcpClient con el payload correcto', async () => {
            mockFileService.saveBufferFile.mockResolvedValue(RAW_UPLOAD_PATH);

            await PersonalControllerRepository.put_talentoHumano_upload_document(mockReq);

            expect(mockSendData).toHaveBeenCalledWith({
                data: JSON.stringify(RAW_UPLOAD_PATH),
                server: 'python',
                action: 'talentoHumano_procesamiento_imagen'
            });
        });

        test('debería actualizar urlFotoCarnet con la ruta devuelta por rustRcpClient', async () => {
            mockSendData.mockResolvedValue(JSON.stringify({ success: true, path: PROCESSED_PHOTO_PATH }));

            await PersonalControllerRepository.put_talentoHumano_upload_document(mockReq);

            expect(mockPersonalRepository.actualizar_data).toHaveBeenCalledWith(
                { _id: VALID_OBJECT_ID },
                { urlFotoCarnet: PROCESSED_PHOTO_PATH },
                expect.objectContaining({ session: 'mock-session' })
            );
        });

        test('debería eliminar documento anterior si existe', async () => {
            const existingPath = 'personal/fotoCarnet/old-photo.jpg';
            mockPersonalRepository.get_data.mockResolvedValue([
                createMockPersonal({ urlFotoCarnet: existingPath })
            ]);

            await PersonalControllerRepository.put_talentoHumano_upload_document(mockReq);

            expect(mockFileService.deleteFile).toHaveBeenCalledWith(existingPath, 'STORAGE');
        });

        test('no debería llamar deleteFile si no existe documento anterior', async () => {
            mockPersonalRepository.get_data.mockResolvedValue([
                createMockPersonal({ urlFotoCarnet: null })
            ]);

            await PersonalControllerRepository.put_talentoHumano_upload_document(mockReq);

            expect(mockFileService.deleteFile).not.toHaveBeenCalled();
        });

        test('debería registrar pasos en el log', async () => {
            await PersonalControllerRepository.put_talentoHumano_upload_document(mockReq);

            expect(mockRegistrarPasoLog).toHaveBeenCalledWith('log-123', 'Obtener personal', 'completado');
            expect(mockRegistrarPasoLog).toHaveBeenCalledWith('log-123', 'Documento subido', 'completado');
            expect(mockRegistrarPasoLog).toHaveBeenCalledWith('log-123', 'Documento actualizado', 'completado');
        });

        test('debería registrar paso de eliminación de documento anterior', async () => {
            await PersonalControllerRepository.put_talentoHumano_upload_document(mockReq);

            expect(mockRegistrarPasoLog).toHaveBeenCalledWith(
                'log-123',
                'Documento anterior eliminado',
                'completado'
            );
        });
    });

    // ============================================================
    // TEST GROUP 2: ERRORES DE LÓGICA DE NEGOCIO
    // ============================================================
    describe('Errores de Lógica de Negocio', () => {

        test('debería lanzar error si el personal no existe', async () => {
            mockPersonalRepository.get_data.mockResolvedValue([]);

            await expect(
                PersonalControllerRepository.put_talentoHumano_upload_document(mockReq)
            ).rejects.toThrow('Personal no encontrado');
        });

        test('debería lanzar error si el personal no está activo', async () => {
            mockPersonalRepository.get_data.mockResolvedValue([
                createMockPersonal({ estado: false })
            ]);

            await expect(
                PersonalControllerRepository.put_talentoHumano_upload_document(mockReq)
            ).rejects.toThrow('Personal no activo');
        });

        test('debería propagar error si deleteFile falla', async () => {
            mockFileService.deleteFile.mockRejectedValue(
                new Error('Error al eliminar archivo')
            );

            await expect(
                PersonalControllerRepository.put_talentoHumano_upload_document(mockReq)
            ).rejects.toThrow('Error al eliminar archivo');
        });

        test('debería propagar error si saveBufferFile falla', async () => {
            mockFileService.saveBufferFile.mockRejectedValue(
                new Error('Error al guardar archivo')
            );

            await expect(
                PersonalControllerRepository.put_talentoHumano_upload_document(mockReq)
            ).rejects.toThrow('Error al guardar archivo');
        });

        test('debería propagar error si rustRcpClient.sendData falla', async () => {
            mockSendData.mockRejectedValue(new Error('Error de conexión con servicio de procesamiento'));

            await expect(
                PersonalControllerRepository.put_talentoHumano_upload_document(mockReq)
            ).rejects.toThrow('Error de conexión con servicio de procesamiento');
        });

        test('debería lanzar error si el procesamiento de imagen no tiene éxito', async () => {
            mockSendData.mockResolvedValue(JSON.stringify({ success: false, message: 'Imagen corrupta' }));

            await expect(
                PersonalControllerRepository.put_talentoHumano_upload_document(mockReq)
            ).rejects.toThrow('Imagen corrupta');
        });

        test('debería lanzar error genérico si el procesamiento falla sin mensaje', async () => {
            mockSendData.mockResolvedValue(JSON.stringify({ success: false }));

            await expect(
                PersonalControllerRepository.put_talentoHumano_upload_document(mockReq)
            ).rejects.toThrow('Error al procesar la imagen');
        });

        test('debería propagar error si actualizar_data falla', async () => {
            mockPersonalRepository.actualizar_data.mockRejectedValue(
                new Error('Error de conexión a base de datos')
            );

            await expect(
                PersonalControllerRepository.put_talentoHumano_upload_document(mockReq)
            ).rejects.toThrow('Error de conexión a base de datos');
        });

        test('debería propagar error si get_data falla', async () => {
            mockPersonalRepository.get_data.mockRejectedValue(
                new Error('Error al obtener personal')
            );

            await expect(
                PersonalControllerRepository.put_talentoHumano_upload_document(mockReq)
            ).rejects.toThrow('Error al obtener personal');
        });
    });

    // ============================================================
    // TEST GROUP 3: VALIDACIÓN ZOD - CAMPO _id
    // ============================================================
    describe('Validación Zod - Campo _id', () => {

        test('debería rechazar si _id no es un ObjectId válido', async () => {
            mockReq.data._id = 'no-es-objectid-valido';

            await expect(
                PersonalControllerRepository.put_talentoHumano_upload_document(mockReq)
            ).rejects.toThrow(ZodError);
        });

        test('debería rechazar si _id es muy corto', async () => {
            mockReq.data._id = '507f1f77';

            await expect(
                PersonalControllerRepository.put_talentoHumano_upload_document(mockReq)
            ).rejects.toThrow(ZodError);
        });

        test('debería rechazar si _id tiene caracteres no hexadecimales', async () => {
            mockReq.data._id = '507f1f77bcf86cd79943901Z';

            await expect(
                PersonalControllerRepository.put_talentoHumano_upload_document(mockReq)
            ).rejects.toThrow(ZodError);
        });

        test('debería rechazar si _id es null', async () => {
            mockReq.data._id = null;

            await expect(
                PersonalControllerRepository.put_talentoHumano_upload_document(mockReq)
            ).rejects.toThrow(ZodError);
        });

        test('debería rechazar si _id es undefined', async () => {
            delete mockReq.data._id;

            await expect(
                PersonalControllerRepository.put_talentoHumano_upload_document(mockReq)
            ).rejects.toThrow(ZodError);
        });

        test('debería rechazar si _id es un array', async () => {
            mockReq.data._id = [VALID_OBJECT_ID];

            await expect(
                PersonalControllerRepository.put_talentoHumano_upload_document(mockReq)
            ).rejects.toThrow(ZodError);
        });

        test('debería rechazar si _id es un número', async () => {
            mockReq.data._id = 12345;

            await expect(
                PersonalControllerRepository.put_talentoHumano_upload_document(mockReq)
            ).rejects.toThrow(ZodError);
        });

        test('debería aceptar ObjectId en mayúsculas', async () => {
            mockReq.data._id = '507F1F77BCF86CD799439011';

            await expect(
                PersonalControllerRepository.put_talentoHumano_upload_document(mockReq)
            ).resolves.not.toThrow(ZodError);
        });
    });

    // ============================================================
    // TEST GROUP 4: VALIDACIÓN ZOD - CAMPO action
    // ============================================================
    describe('Validación Zod - Campo action', () => {

        test('debería rechazar si action está vacío', async () => {
            mockReq.data.action = '';

            await expect(
                PersonalControllerRepository.put_talentoHumano_upload_document(mockReq)
            ).rejects.toThrow(ZodError);
        });

        test('debería rechazar si action es null', async () => {
            mockReq.data.action = null;

            await expect(
                PersonalControllerRepository.put_talentoHumano_upload_document(mockReq)
            ).rejects.toThrow(ZodError);
        });

        test('debería rechazar si action es undefined', async () => {
            delete mockReq.data.action;

            await expect(
                PersonalControllerRepository.put_talentoHumano_upload_document(mockReq)
            ).rejects.toThrow(ZodError);
        });

        test('debería rechazar si action es un número', async () => {
            mockReq.data.action = 12345;

            await expect(
                PersonalControllerRepository.put_talentoHumano_upload_document(mockReq)
            ).rejects.toThrow(ZodError);
        });

        test('debería rechazar si action es un objeto', async () => {
            mockReq.data.action = { value: 'action' };

            await expect(
                PersonalControllerRepository.put_talentoHumano_upload_document(mockReq)
            ).rejects.toThrow(ZodError);
        });
    });

    // ============================================================
    // TEST GROUP 5: VALIDACIÓN ZOD - CAMPO file (Buffer)
    // ============================================================
    describe('Validación Zod - Campo file (Buffer)', () => {

        test('debería rechazar si file es un string vacío', async () => {
            mockReq.data.file = '';

            await expect(
                PersonalControllerRepository.put_talentoHumano_upload_document(mockReq)
            ).rejects.toThrow(ZodError);
        });

        test('debería rechazar si file es null', async () => {
            mockReq.data.file = null;

            await expect(
                PersonalControllerRepository.put_talentoHumano_upload_document(mockReq)
            ).rejects.toThrow(ZodError);
        });

        test('debería rechazar si file es undefined', async () => {
            delete mockReq.data.file;

            await expect(
                PersonalControllerRepository.put_talentoHumano_upload_document(mockReq)
            ).rejects.toThrow(ZodError);
        });

        test('debería rechazar si file es un string base64 (ya no se acepta base64)', async () => {
            mockReq.data.file = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

            await expect(
                PersonalControllerRepository.put_talentoHumano_upload_document(mockReq)
            ).rejects.toThrow(ZodError);
        });

        test('debería rechazar si file es un número', async () => {
            mockReq.data.file = 12345;

            await expect(
                PersonalControllerRepository.put_talentoHumano_upload_document(mockReq)
            ).rejects.toThrow(ZodError);
        });

        test('debería rechazar si file es un objeto plano', async () => {
            mockReq.data.file = { data: VALID_FILE_BUFFER };

            await expect(
                PersonalControllerRepository.put_talentoHumano_upload_document(mockReq)
            ).rejects.toThrow(ZodError);
        });

        test('debería rechazar si file es un array', async () => {
            mockReq.data.file = [1, 2, 3];

            await expect(
                PersonalControllerRepository.put_talentoHumano_upload_document(mockReq)
            ).rejects.toThrow(ZodError);
        });

        test('debería aceptar file como Buffer válido', async () => {
            mockReq.data.file = Buffer.from('contenido-de-prueba');

            await expect(
                PersonalControllerRepository.put_talentoHumano_upload_document(mockReq)
            ).resolves.not.toThrow(ZodError);
        });

        test('debería aceptar file como Uint8Array', async () => {
            mockReq.data.file = new Uint8Array([1, 2, 3, 4]);

            await expect(
                PersonalControllerRepository.put_talentoHumano_upload_document(mockReq)
            ).resolves.not.toThrow(ZodError);
        });

        test('debería aceptar file como ArrayBuffer', async () => {
            mockReq.data.file = new ArrayBuffer(8);

            await expect(
                PersonalControllerRepository.put_talentoHumano_upload_document(mockReq)
            ).resolves.not.toThrow(ZodError);
        });
    });

    // ============================================================
    // TEST GROUP 6: SEGURIDAD - NoSQL INJECTION
    // ============================================================
    describe('Seguridad - Intentos de NoSQL Injection', () => {

        test('debería rechazar operador $ne en _id', async () => {
            mockReq.data._id = { $ne: null };

            await expect(
                PersonalControllerRepository.put_talentoHumano_upload_document(mockReq)
            ).rejects.toThrow(ZodError);
        });

        test('debería rechazar operador $gt en _id', async () => {
            mockReq.data._id = { $gt: '' };

            await expect(
                PersonalControllerRepository.put_talentoHumano_upload_document(mockReq)
            ).rejects.toThrow(ZodError);
        });

        test('debería rechazar operador $regex en action', async () => {
            mockReq.data.action = { $regex: '.*' };

            await expect(
                PersonalControllerRepository.put_talentoHumano_upload_document(mockReq)
            ).rejects.toThrow(ZodError);
        });

        test('debería rechazar operador $where en file', async () => {
            mockReq.data.file = { $where: 'return true' };

            await expect(
                PersonalControllerRepository.put_talentoHumano_upload_document(mockReq)
            ).rejects.toThrow(ZodError);
        });

        test('debería rechazar operador $or en file', async () => {
            mockReq.data.file = { $or: [{ $exists: true }] };

            await expect(
                PersonalControllerRepository.put_talentoHumano_upload_document(mockReq)
            ).rejects.toThrow(ZodError);
        });

        test('debería rechazar operador $exists en _id', async () => {
            mockReq.data._id = { $exists: true };

            await expect(
                PersonalControllerRepository.put_talentoHumano_upload_document(mockReq)
            ).rejects.toThrow(ZodError);
        });

        test('debería rechazar operador $in en _id', async () => {
            mockReq.data._id = { $in: [VALID_OBJECT_ID, '507f191e810c19729de860ea'] };

            await expect(
                PersonalControllerRepository.put_talentoHumano_upload_document(mockReq)
            ).rejects.toThrow(ZodError);
        });

        test('debería rechazar operador $elemMatch en data', async () => {
            mockReq.data = { $elemMatch: { _id: VALID_OBJECT_ID } };

            await expect(
                PersonalControllerRepository.put_talentoHumano_upload_document(mockReq)
            ).rejects.toThrow(ZodError);
        });
    });

    // ============================================================
    // TEST GROUP 7: SEGURIDAD - PROTOTYPE POLLUTION
    // ============================================================
    describe('Seguridad - Prototype Pollution', () => {

        test('no debería contaminar Object.prototype con __proto__', async () => {
            const originalPrototype = { ...Object.prototype };
            mockReq.data.__proto__ = { malicious: true };

            try {
                await PersonalControllerRepository.put_talentoHumano_upload_document(mockReq);
            } catch (e) {
                // Puede fallar, está bien
            }

            expect({}.malicious).toBeUndefined();
            expect(Object.prototype).toEqual(originalPrototype);
        });

        test('no debería contaminar con constructor.prototype', async () => {
            mockReq.data['constructor'] = { prototype: { pwned: true } };

            try {
                await PersonalControllerRepository.put_talentoHumano_upload_document(mockReq);
            } catch (e) {
                // Puede fallar validación
            }

            expect({}.pwned).toBeUndefined();
        });

        test('debería manejar __proto__ en data sin contaminar', async () => {
            mockReq.data.__proto__ = { hacked: true };

            try {
                await PersonalControllerRepository.put_talentoHumano_upload_document(mockReq);
            } catch (e) {
                // Puede fallar
            }

            expect({}.hacked).toBeUndefined();
        });
    });

    // ============================================================
    // TEST GROUP 8: DATOS MALFORMADOS
    // ============================================================
    describe('Datos Malformados', () => {

        test('debería rechazar si req.data es null', async () => {
            mockReq.data = null;

            await expect(
                PersonalControllerRepository.put_talentoHumano_upload_document(mockReq)
            ).rejects.toThrow();
        });

        test('debería rechazar si req.data es undefined', async () => {
            delete mockReq.data;

            await expect(
                PersonalControllerRepository.put_talentoHumano_upload_document(mockReq)
            ).rejects.toThrow();
        });

        test('debería rechazar si req.data es un string', async () => {
            mockReq.data = 'string-malicioso';

            await expect(
                PersonalControllerRepository.put_talentoHumano_upload_document(mockReq)
            ).rejects.toThrow(ZodError);
        });

        test('debería rechazar si req.data es un array', async () => {
            mockReq.data = [createValidRequest().data];

            await expect(
                PersonalControllerRepository.put_talentoHumano_upload_document(mockReq)
            ).rejects.toThrow(ZodError);
        });

        test('debería manejar req.user sin _id', async () => {
            delete mockReq.user._id;

            // Puede fallar en la lógica de negocio, no en Zod
            await expect(
                PersonalControllerRepository.put_talentoHumano_upload_document(mockReq)
            ).rejects.toThrow();
        });

        test('debería manejar req.user null', async () => {
            mockReq.user = null;

            await expect(
                PersonalControllerRepository.put_talentoHumano_upload_document(mockReq)
            ).rejects.toThrow();
        });

        test('debería manejar req.user undefined', async () => {
            delete mockReq.user;

            await expect(
                PersonalControllerRepository.put_talentoHumano_upload_document(mockReq)
            ).rejects.toThrow();
        });
    });

    // ============================================================
    // TEST GROUP 9: TIPOS DE DATOS INCORRECTOS
    // ============================================================
    describe('Tipos de Datos Incorrectos', () => {

        test('debería rechazar si _id es un objeto plano', async () => {
            mockReq.data._id = { id: VALID_OBJECT_ID };

            await expect(
                PersonalControllerRepository.put_talentoHumano_upload_document(mockReq)
            ).rejects.toThrow(ZodError);
        });

        test('debería rechazar si action es boolean', async () => {
            mockReq.data.action = true;

            await expect(
                PersonalControllerRepository.put_talentoHumano_upload_document(mockReq)
            ).rejects.toThrow(ZodError);
        });

        test('debería rechazar si file es boolean', async () => {
            mockReq.data.file = true;

            await expect(
                PersonalControllerRepository.put_talentoHumano_upload_document(mockReq)
            ).rejects.toThrow(ZodError);
        });
    });

    // ============================================================
    // TEST GROUP 10: CARACTERES ESPECIALES Y XSS
    // ============================================================
    describe('Seguridad - XSS y Caracteres Especiales', () => {

        test('debería manejar script tags en action como texto', async () => {
            mockReq.data.action = '<script>alert("xss")</script>';

            // Si pasa la validación Zod, debería procesarse como texto plano
            try {
                await PersonalControllerRepository.put_talentoHumano_upload_document(mockReq);
            } catch (e) {
                // Puede fallar por otras razones, no por XSS
            }
        });

        test('debería manejar caracteres unicode en action', async () => {
            mockReq.data.action = 'acción_特殊_🎉';

            try {
                await PersonalControllerRepository.put_talentoHumano_upload_document(mockReq);
            } catch (e) {
                // Puede fallar por validación
            }
        });

        test('debería manejar SQL injection payloads como texto', async () => {
            mockReq.data.action = "'; DROP TABLE users; --";

            try {
                await PersonalControllerRepository.put_talentoHumano_upload_document(mockReq);
            } catch (e) {
                // Puede fallar por validación
            }
        });

        test('debería manejar caracteres de control', async () => {
            mockReq.data.action = 'action\x00\x1f';

            try {
                await PersonalControllerRepository.put_talentoHumano_upload_document(mockReq);
            } catch (e) {
                // Puede fallar por validación
            }
        });
    });

    // ============================================================
    // TEST GROUP 11: CASOS EDGE
    // ============================================================
    describe('Casos Edge', () => {

        test('debería manejar personal sin foto de carnet previa', async () => {
            mockPersonalRepository.get_data.mockResolvedValue([
                createMockPersonal({ urlFotoCarnet: '' })
            ]);

            await expect(
                PersonalControllerRepository.put_talentoHumano_upload_document(mockReq)
            ).resolves.not.toThrow();

            expect(mockFileService.deleteFile).not.toHaveBeenCalled();
        });

        test('debería manejar personal con urlFotoCarnet undefined', async () => {
            mockPersonalRepository.get_data.mockResolvedValue([
                createMockPersonal({ urlFotoCarnet: undefined })
            ]);

            await expect(
                PersonalControllerRepository.put_talentoHumano_upload_document(mockReq)
            ).resolves.not.toThrow();
        });

        test('debería manejar un archivo (Buffer) grande', async () => {
            mockReq.data.file = Buffer.alloc(1024 * 1024, 'A');

            await expect(
                PersonalControllerRepository.put_talentoHumano_upload_document(mockReq)
            ).resolves.not.toThrow(ZodError);
        });
    });
});
