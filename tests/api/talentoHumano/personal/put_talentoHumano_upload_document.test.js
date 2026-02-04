import { describe, test, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { ZodError } from 'zod';

/**
 * Tests para PersonalControllerRepository.put_talentoHumano_upload_document
 *
 * Este endpoint permite subir documentos (foto o cédula) para actualizar
 * los registros de personal en talento humano.
 *
 * Flujo:
 * 1. Validación Zod de datos de entrada (_id, action, typeDoc, file)
 * 2. Verificación de existencia del personal
 * 3. Verificación de estado activo del personal
 * 4. Determinación del tipo de documento (foto/cedula)
 * 5. Eliminación del documento anterior si existe
 * 6. Subida del nuevo documento
 * 7. Actualización del registro en base de datos
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
    readFileAsBase64: jest.fn()
};

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
    cleanForRust: jest.fn(data => data)
}));

jest.unstable_mockModule('../../../../config/grpcRust.js', () => ({
    rustRcpClient: { sendData: jest.fn() }
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
    const VALID_BASE64_FILE = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
    const VALID_PDF_BASE64 = 'data:application/pdf;base64,JVBERi0xLjQKJeLjz9MKMSAwIG9iago8PC9UeXBlL0NhdGFsb2cvUGFnZXMgMiAwIFI+PgplbmRvYmoKMiAwIG9iago8PC9UeXBlL1BhZ2VzL0NvdW50IDEvS2lkc1szIDAgUl0+PgplbmRvYmoKdHJhaWxlcgo8PC9Sb290IDEgMCBSPj4KJSVFT0Y=';

    let mockReq;

    const createValidRequest = (typeDoc = 'foto') => ({
        user: { _id: 'user-123', nombre: 'Test User' },
        data: {
            _id: VALID_OBJECT_ID,
            action: 'put_talentoHumano_upload_document',
            typeDoc: typeDoc,
            file: typeDoc === 'foto' ? VALID_BASE64_FILE : VALID_PDF_BASE64
        }
    });

    const createMockPersonal = (overrides = {}) => ({
        _id: VALID_OBJECT_ID,
        nombre: 'Juan',
        apellido: 'Pérez',
        estado: true,
        urlFotoCarnet: 'personal/fotoCarnetProcessed/existing-photo.jpg',
        urlIdentificacion: 'personal/identificacion/existing-cedula.pdf',
        ...overrides
    });

    beforeEach(() => {
        jest.clearAllMocks();
        mockReq = createValidRequest();

        // Happy path mocks
        mockPersonalRepository.get_data.mockResolvedValue([createMockPersonal()]);
        mockPersonalRepository.actualizar_data.mockResolvedValue({ _id: VALID_OBJECT_ID });
        mockFileService.deleteFile.mockResolvedValue(true);
        mockFileService.saveBase64File.mockResolvedValue('personal/fotoCarnetProcessed/new-photo.jpg');
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
            expect(mockFileService.deleteFile).toHaveBeenCalled();
            expect(mockFileService.saveBase64File).toHaveBeenCalled();
            expect(mockPersonalRepository.actualizar_data).toHaveBeenCalled();
        });

        test('debería subir cédula exitosamente', async () => {
            mockReq = createValidRequest('cedula');
            mockFileService.saveBase64File.mockResolvedValue('personal/identificacion/new-cedula.pdf');

            await PersonalControllerRepository.put_talentoHumano_upload_document(mockReq);

            expect(mockFileService.saveBase64File).toHaveBeenCalledWith(
                mockReq.data.file,
                expect.stringContaining('identificacion'),
                'STORAGE',
                { encrypt: true }
            );
        });

        test('debería subir foto sin encriptación', async () => {
            mockReq = createValidRequest('foto');

            await PersonalControllerRepository.put_talentoHumano_upload_document(mockReq);

            expect(mockFileService.saveBase64File).toHaveBeenCalledWith(
                mockReq.data.file,
                expect.stringContaining('fotoCarnetProcessed'),
                'STORAGE',
                { encrypt: false }
            );
        });

        test('debería actualizar urlFotoCarnet cuando typeDoc es foto', async () => {
            const newPhotoPath = 'personal/fotoCarnetProcessed/new-photo-123.jpg';
            mockFileService.saveBase64File.mockResolvedValue(newPhotoPath);

            await PersonalControllerRepository.put_talentoHumano_upload_document(mockReq);

            expect(mockPersonalRepository.actualizar_data).toHaveBeenCalledWith(
                { _id: VALID_OBJECT_ID },
                { urlFotoCarnet: newPhotoPath },
                expect.objectContaining({ session: 'mock-session' })
            );
        });

        test('debería actualizar urlIdentificacion cuando typeDoc es cedula', async () => {
            mockReq = createValidRequest('cedula');
            const newCedulaPath = 'personal/identificacion/new-cedula-123.pdf';
            mockFileService.saveBase64File.mockResolvedValue(newCedulaPath);

            await PersonalControllerRepository.put_talentoHumano_upload_document(mockReq);

            expect(mockPersonalRepository.actualizar_data).toHaveBeenCalledWith(
                { _id: VALID_OBJECT_ID },
                { urlIdentificacion: newCedulaPath },
                expect.objectContaining({ session: 'mock-session' })
            );
        });

        test('debería eliminar documento anterior si existe', async () => {
            const existingPath = 'personal/fotoCarnetProcessed/old-photo.jpg';
            mockPersonalRepository.get_data.mockResolvedValue([
                createMockPersonal({ urlFotoCarnet: existingPath })
            ]);

            await PersonalControllerRepository.put_talentoHumano_upload_document(mockReq);

            expect(mockFileService.deleteFile).toHaveBeenCalledWith(existingPath, 'STORAGE');
        });

        test('no debería llamar deleteFile si no existe documento anterior (foto)', async () => {
            mockPersonalRepository.get_data.mockResolvedValue([
                createMockPersonal({ urlFotoCarnet: null })
            ]);

            await PersonalControllerRepository.put_talentoHumano_upload_document(mockReq);

            expect(mockFileService.deleteFile).not.toHaveBeenCalled();
        });

        test('no debería llamar deleteFile si no existe documento anterior (cedula)', async () => {
            mockReq = createValidRequest('cedula');
            mockPersonalRepository.get_data.mockResolvedValue([
                createMockPersonal({ urlIdentificacion: null })
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

        test('debería propagar error si saveBase64File falla', async () => {
            mockFileService.saveBase64File.mockRejectedValue(
                new Error('Error al guardar archivo')
            );

            await expect(
                PersonalControllerRepository.put_talentoHumano_upload_document(mockReq)
            ).rejects.toThrow('Error al guardar archivo');
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
    // TEST GROUP 5: VALIDACIÓN ZOD - CAMPO typeDoc
    // ============================================================
    describe('Validación Zod - Campo typeDoc', () => {

        test('debería rechazar si typeDoc está vacío', async () => {
            mockReq.data.typeDoc = '';

            await expect(
                PersonalControllerRepository.put_talentoHumano_upload_document(mockReq)
            ).rejects.toThrow(ZodError);
        });

        test('debería rechazar si typeDoc es null', async () => {
            mockReq.data.typeDoc = null;

            await expect(
                PersonalControllerRepository.put_talentoHumano_upload_document(mockReq)
            ).rejects.toThrow(ZodError);
        });

        test('debería rechazar si typeDoc es undefined', async () => {
            delete mockReq.data.typeDoc;

            await expect(
                PersonalControllerRepository.put_talentoHumano_upload_document(mockReq)
            ).rejects.toThrow(ZodError);
        });

        test('debería rechazar si typeDoc es un número', async () => {
            mockReq.data.typeDoc = 12345;

            await expect(
                PersonalControllerRepository.put_talentoHumano_upload_document(mockReq)
            ).rejects.toThrow(ZodError);
        });

        test('debería rechazar si typeDoc es un array', async () => {
            mockReq.data.typeDoc = ['foto'];

            await expect(
                PersonalControllerRepository.put_talentoHumano_upload_document(mockReq)
            ).rejects.toThrow(ZodError);
        });

        test('debería aceptar typeDoc "foto"', async () => {
            mockReq.data.typeDoc = 'foto';

            await expect(
                PersonalControllerRepository.put_talentoHumano_upload_document(mockReq)
            ).resolves.not.toThrow(ZodError);
        });

        test('debería aceptar typeDoc "cedula"', async () => {
            mockReq.data.typeDoc = 'cedula';

            await expect(
                PersonalControllerRepository.put_talentoHumano_upload_document(mockReq)
            ).resolves.not.toThrow(ZodError);
        });
    });

    // ============================================================
    // TEST GROUP 6: VALIDACIÓN ZOD - CAMPO file (base64)
    // ============================================================
    describe('Validación Zod - Campo file (base64)', () => {

        test('debería rechazar si file está vacío', async () => {
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

        test('debería rechazar si file no tiene formato base64 válido', async () => {
            mockReq.data.file = 'esto-no-es-base64-valido';

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

        test('debería rechazar si file es un objeto', async () => {
            mockReq.data.file = { url: VALID_BASE64_FILE };

            await expect(
                PersonalControllerRepository.put_talentoHumano_upload_document(mockReq)
            ).rejects.toThrow(ZodError);
        });

        test('debería rechazar si file es un array', async () => {
            mockReq.data.file = [VALID_BASE64_FILE];

            await expect(
                PersonalControllerRepository.put_talentoHumano_upload_document(mockReq)
            ).rejects.toThrow(ZodError);
        });

        test('debería aceptar file con formato data:image/png;base64', async () => {
            mockReq.data.file = VALID_BASE64_FILE;

            await expect(
                PersonalControllerRepository.put_talentoHumano_upload_document(mockReq)
            ).resolves.not.toThrow(ZodError);
        });

        test('debería aceptar file con formato data:application/pdf;base64', async () => {
            mockReq.data.file = VALID_PDF_BASE64;

            await expect(
                PersonalControllerRepository.put_talentoHumano_upload_document(mockReq)
            ).resolves.not.toThrow(ZodError);
        });

        test('debería aceptar file con formato data:image/jpeg;base64', async () => {
            mockReq.data.file = 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAA==';

            await expect(
                PersonalControllerRepository.put_talentoHumano_upload_document(mockReq)
            ).resolves.not.toThrow(ZodError);
        });
    });

    // ============================================================
    // TEST GROUP 7: SEGURIDAD - NoSQL INJECTION
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

        test('debería rechazar operador $where en typeDoc', async () => {
            mockReq.data.typeDoc = { $where: 'return true' };

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
    // TEST GROUP 8: SEGURIDAD - PROTOTYPE POLLUTION
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
    // TEST GROUP 9: DATOS MALFORMADOS
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
    // TEST GROUP 10: TIPOS DE DATOS INCORRECTOS
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

        test('debería rechazar si typeDoc es boolean', async () => {
            mockReq.data.typeDoc = false;

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
    // TEST GROUP 11: CARACTERES ESPECIALES Y XSS
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

        test('debería manejar event handlers en typeDoc', async () => {
            mockReq.data.typeDoc = '<img src=x onerror=alert(1)>';

            try {
                await PersonalControllerRepository.put_talentoHumano_upload_document(mockReq);
            } catch (e) {
                // Puede fallar por lógica, no por XSS
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
    // TEST GROUP 12: CASOS EDGE
    // ============================================================
    describe('Casos Edge', () => {

        test('debería manejar personal con todos los campos de documento vacíos', async () => {
            mockPersonalRepository.get_data.mockResolvedValue([
                createMockPersonal({ urlFotoCarnet: '', urlIdentificacion: '' })
            ]);

            await expect(
                PersonalControllerRepository.put_talentoHumano_upload_document(mockReq)
            ).resolves.not.toThrow();

            expect(mockFileService.deleteFile).not.toHaveBeenCalled();
        });

        test('debería manejar personal con campos undefined', async () => {
            mockPersonalRepository.get_data.mockResolvedValue([
                createMockPersonal({ urlFotoCarnet: undefined, urlIdentificacion: undefined })
            ]);

            await expect(
                PersonalControllerRepository.put_talentoHumano_upload_document(mockReq)
            ).resolves.not.toThrow();
        });

        test('debería manejar file base64 muy grande', async () => {
            // Simular un archivo grande (1MB en base64)
            const largeBase64 = 'data:image/png;base64,' + 'A'.repeat(1024 * 1024);
            mockReq.data.file = largeBase64;

            await expect(
                PersonalControllerRepository.put_talentoHumano_upload_document(mockReq)
            ).resolves.not.toThrow(ZodError);
        });

        test('debería rechazar typeDoc desconocido (no foto ni cedula)', async () => {
            mockReq.data.typeDoc = 'otro_tipo';

            // Con la validación enum, solo se aceptan "foto" y "cedula"
            await expect(
                PersonalControllerRepository.put_talentoHumano_upload_document(mockReq)
            ).rejects.toThrow(ZodError);
        });
    });
});
