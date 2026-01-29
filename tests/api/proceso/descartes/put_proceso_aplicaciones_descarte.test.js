import { describe, test, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { ZodError } from 'zod';

/**
 * Tests para DescartesControllers.put_proceso_aplicaciones_descarte
 *
 * Flujo activo:
 * 1. Validación de usuario autenticado (user && user._id)
 * 2. Validación Zod (action, registroFrutaProcesada, tipo, data)
 * 3. executeTransactionalTask:
 *    a. FrutaProcesada.get_data (buscar registro por ID con populate tipoFruta)
 *    b. Validar que el registro existe (length > 0)
 *
 * Schema Zod:
 * - action: requiredSafeString (sin $, {, }, <script)
 * - registroFrutaProcesada: objectIdString (24 hex chars)
 * - tipo: requiredSafeString
 * - data.descarte: string min 1
 * - data.canastillas: string numérico >= 0 (opcional)
 * - data.kilos: string numérico >= 0 (opcional)
 */

// ============================================================
// MOCKS DE INFRAESTRUCTURA
// ============================================================
const mockExecuteTransactionalTask = jest.fn(async (req, taskLogic) => {
    return await taskLogic('mock-session', { _id: 'log-123' });
});

jest.unstable_mockModule('../../../../server/utils/wrappers.js', () => ({
    executeTransactionalTask: mockExecuteTransactionalTask,
    executeQueryTask: jest.fn(async (taskLogic) => await taskLogic())
}));

// ============================================================
// MOCKS DE REPOSITORIOS
// ============================================================
const mockFrutaProcesada = {
    get_data: jest.fn(),
};

jest.unstable_mockModule('../../../../server/Class/frutaProcesada.js', () => ({
    FrutaProcesada: mockFrutaProcesada
}));

const { DescartesControllers } = await import('../../../../server/api/proceso/descartes.js');

describe('DescartesControllers.put_proceso_aplicaciones_descarte', () => {

    // ============================================================
    // CONSTANTES Y DATOS DE PRUEBA
    // ============================================================
    const VALID_OBJECT_ID = '507f1f77bcf86cd799439011';
    const MOCK_TIPO_FRUTA_ID = 'aabbccddee11223344556677';

    let mockReq;

    const createMockRegistroProceso = () => ({
        _id: VALID_OBJECT_ID,
        loteId: '112233445566778899aabbcc',
        loteType: 'Lote',
        proceso: 'Vaceo',
        tipoFruta: {
            _id: MOCK_TIPO_FRUTA_ID,
            tipoFruta: 'Naranja',
            valorPromedio: 22.5
        },
        canastillas: 150,
        promedio: 22.5,
    });

    const setupHappyPathMocks = () => {
        mockFrutaProcesada.get_data.mockResolvedValue([createMockRegistroProceso()]);
    };

    const createValidRequest = () => ({
        user: { _id: 'user-123', nombre: 'Test User' },
        data: {
            action: 'put_proceso_aplicaciones_descarte',
            registroFrutaProcesada: VALID_OBJECT_ID,
            tipo: 'encerado',
            data: {
                descarte: VALID_OBJECT_ID,
                canastillas: '5',
                kilos: '10.5'
            }
        }
    });

    beforeEach(() => {
        jest.clearAllMocks();
        mockReq = createValidRequest();
        setupHappyPathMocks();
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    // ============================================================
    // TEST GROUP 1: VALIDACIÓN DE USUARIO
    // ============================================================
    describe('Validación de Usuario', () => {

        test('debería completar sin error con usuario y datos válidos', async () => {
            await expect(
                DescartesControllers.put_proceso_aplicaciones_descarte(mockReq)
            ).resolves.not.toThrow();
        });

        test('debería lanzar error si req.user es undefined', async () => {
            delete mockReq.user;

            await expect(
                DescartesControllers.put_proceso_aplicaciones_descarte(mockReq)
            ).rejects.toThrow('No se encontró el usuario');
        });

        test('debería lanzar error si req.user es null', async () => {
            mockReq.user = null;

            await expect(
                DescartesControllers.put_proceso_aplicaciones_descarte(mockReq)
            ).rejects.toThrow('No se encontró el usuario');
        });

        test('debería lanzar error si req.user es un objeto vacío (sin _id)', async () => {
            mockReq.user = {};

            await expect(
                DescartesControllers.put_proceso_aplicaciones_descarte(mockReq)
            ).rejects.toThrow('No se encontró el usuario');
        });

        test('debería lanzar error si req.user._id es undefined', async () => {
            delete mockReq.user._id;

            await expect(
                DescartesControllers.put_proceso_aplicaciones_descarte(mockReq)
            ).rejects.toThrow('No se encontró el usuario');
        });

        test('debería lanzar error si req.user._id es null', async () => {
            mockReq.user._id = null;

            await expect(
                DescartesControllers.put_proceso_aplicaciones_descarte(mockReq)
            ).rejects.toThrow('No se encontró el usuario');
        });

        test('debería lanzar error si req.user._id es string vacío', async () => {
            mockReq.user._id = '';

            await expect(
                DescartesControllers.put_proceso_aplicaciones_descarte(mockReq)
            ).rejects.toThrow('No se encontró el usuario');
        });

        test('debería lanzar error si req.user._id es 0', async () => {
            mockReq.user._id = 0;

            await expect(
                DescartesControllers.put_proceso_aplicaciones_descarte(mockReq)
            ).rejects.toThrow('No se encontró el usuario');
        });

        test('debería lanzar error si req.user es false', async () => {
            mockReq.user = false;

            await expect(
                DescartesControllers.put_proceso_aplicaciones_descarte(mockReq)
            ).rejects.toThrow('No se encontró el usuario');
        });
    });

    // ============================================================
    // TEST GROUP 2: CASOS DE ÉXITO - DATOS VÁLIDOS
    // ============================================================
    describe('Casos de Éxito - Datos Válidos', () => {

        test('debería aceptar datos completos válidos', async () => {
            await expect(
                DescartesControllers.put_proceso_aplicaciones_descarte(mockReq)
            ).resolves.not.toThrow();

            expect(mockExecuteTransactionalTask).toHaveBeenCalledWith(
                mockReq,
                expect.any(Function)
            );
        });

        test('debería aceptar canastillas vacío (opcional)', async () => {
            mockReq.data.data.canastillas = '';

            await expect(
                DescartesControllers.put_proceso_aplicaciones_descarte(mockReq)
            ).resolves.not.toThrow();
        });

        test('debería aceptar kilos vacío (opcional)', async () => {
            mockReq.data.data.kilos = '';

            await expect(
                DescartesControllers.put_proceso_aplicaciones_descarte(mockReq)
            ).resolves.not.toThrow();
        });

        test('debería aceptar canastillas y kilos vacíos simultáneamente', async () => {
            mockReq.data.data.canastillas = '';
            mockReq.data.data.kilos = '';

            await expect(
                DescartesControllers.put_proceso_aplicaciones_descarte(mockReq)
            ).resolves.not.toThrow();
        });

        test('debería aceptar canastillas con valor "0"', async () => {
            mockReq.data.data.canastillas = '0';

            await expect(
                DescartesControllers.put_proceso_aplicaciones_descarte(mockReq)
            ).resolves.not.toThrow();
        });

        test('debería aceptar kilos con valor decimal "123.45"', async () => {
            mockReq.data.data.kilos = '123.45';

            await expect(
                DescartesControllers.put_proceso_aplicaciones_descarte(mockReq)
            ).resolves.not.toThrow();
        });

        test('debería aceptar sin canastillas (undefined, campo opcional)', async () => {
            delete mockReq.data.data.canastillas;

            await expect(
                DescartesControllers.put_proceso_aplicaciones_descarte(mockReq)
            ).resolves.not.toThrow();
        });

        test('debería aceptar sin kilos (undefined, campo opcional)', async () => {
            delete mockReq.data.data.kilos;

            await expect(
                DescartesControllers.put_proceso_aplicaciones_descarte(mockReq)
            ).resolves.not.toThrow();
        });
    });

    // ============================================================
    // TEST GROUP 3: VALIDACIÓN ZOD - CAMPO action
    // ============================================================
    describe('Validación Zod - Campo action', () => {

        test('debería rechazar si action está vacío', async () => {
            mockReq.data.action = '';

            await expect(
                DescartesControllers.put_proceso_aplicaciones_descarte(mockReq)
            ).rejects.toThrow(ZodError);
        });

        test('debería rechazar si action es undefined', async () => {
            delete mockReq.data.action;

            await expect(
                DescartesControllers.put_proceso_aplicaciones_descarte(mockReq)
            ).rejects.toThrow(ZodError);
        });

        test('debería rechazar si action es null', async () => {
            mockReq.data.action = null;

            await expect(
                DescartesControllers.put_proceso_aplicaciones_descarte(mockReq)
            ).rejects.toThrow(ZodError);
        });

        test('debería rechazar si action es un número', async () => {
            mockReq.data.action = 12345;

            await expect(
                DescartesControllers.put_proceso_aplicaciones_descarte(mockReq)
            ).rejects.toThrow(ZodError);
        });

        test('debería rechazar si action contiene $', async () => {
            mockReq.data.action = '$malicious';

            await expect(
                DescartesControllers.put_proceso_aplicaciones_descarte(mockReq)
            ).rejects.toThrow(ZodError);
        });

        test('debería rechazar si action contiene {', async () => {
            mockReq.data.action = 'action{injection}';

            await expect(
                DescartesControllers.put_proceso_aplicaciones_descarte(mockReq)
            ).rejects.toThrow(ZodError);
        });

        test('debería rechazar si action contiene <script', async () => {
            mockReq.data.action = '<script>alert(1)</script>';

            await expect(
                DescartesControllers.put_proceso_aplicaciones_descarte(mockReq)
            ).rejects.toThrow(ZodError);
        });
    });

    // ============================================================
    // TEST GROUP 4: VALIDACIÓN ZOD - CAMPO registroFrutaProcesada
    // ============================================================
    describe('Validación Zod - Campo registroFrutaProcesada (objectIdString)', () => {

        test('debería rechazar si registroFrutaProcesada es undefined', async () => {
            delete mockReq.data.registroFrutaProcesada;

            await expect(
                DescartesControllers.put_proceso_aplicaciones_descarte(mockReq)
            ).rejects.toThrow(ZodError);
        });

        test('debería rechazar si registroFrutaProcesada es vacío', async () => {
            mockReq.data.registroFrutaProcesada = '';

            await expect(
                DescartesControllers.put_proceso_aplicaciones_descarte(mockReq)
            ).rejects.toThrow(ZodError);
        });

        test('debería rechazar si registroFrutaProcesada tiene menos de 24 chars', async () => {
            mockReq.data.registroFrutaProcesada = '507f1f77bcf86cd7';

            await expect(
                DescartesControllers.put_proceso_aplicaciones_descarte(mockReq)
            ).rejects.toThrow(ZodError);
        });

        test('debería rechazar si registroFrutaProcesada tiene más de 24 chars', async () => {
            mockReq.data.registroFrutaProcesada = '507f1f77bcf86cd799439011aabb';

            await expect(
                DescartesControllers.put_proceso_aplicaciones_descarte(mockReq)
            ).rejects.toThrow(ZodError);
        });

        test('debería rechazar si registroFrutaProcesada tiene chars no hex', async () => {
            mockReq.data.registroFrutaProcesada = '507f1f77bcf86cd79943ZZZZ';

            await expect(
                DescartesControllers.put_proceso_aplicaciones_descarte(mockReq)
            ).rejects.toThrow(ZodError);
        });

        test('debería rechazar si registroFrutaProcesada es un número', async () => {
            mockReq.data.registroFrutaProcesada = 123456789012345678901234;

            await expect(
                DescartesControllers.put_proceso_aplicaciones_descarte(mockReq)
            ).rejects.toThrow(ZodError);
        });

        test('debería aceptar ObjectId válido en minúsculas', async () => {
            mockReq.data.registroFrutaProcesada = 'aabbccddee11223344556677';

            await expect(
                DescartesControllers.put_proceso_aplicaciones_descarte(mockReq)
            ).resolves.not.toThrow();
        });

        test('debería aceptar ObjectId válido en mayúsculas', async () => {
            mockReq.data.registroFrutaProcesada = 'AABBCCDDEE11223344556677';

            await expect(
                DescartesControllers.put_proceso_aplicaciones_descarte(mockReq)
            ).resolves.not.toThrow();
        });
    });

    // ============================================================
    // TEST GROUP 5: VALIDACIÓN ZOD - CAMPO tipo
    // ============================================================
    describe('Validación Zod - Campo tipo', () => {

        test('debería rechazar si tipo es undefined', async () => {
            delete mockReq.data.tipo;

            await expect(
                DescartesControllers.put_proceso_aplicaciones_descarte(mockReq)
            ).rejects.toThrow(ZodError);
        });

        test('debería rechazar si tipo está vacío', async () => {
            mockReq.data.tipo = '';

            await expect(
                DescartesControllers.put_proceso_aplicaciones_descarte(mockReq)
            ).rejects.toThrow(ZodError);
        });

        test('debería rechazar si tipo es null', async () => {
            mockReq.data.tipo = null;

            await expect(
                DescartesControllers.put_proceso_aplicaciones_descarte(mockReq)
            ).rejects.toThrow(ZodError);
        });

        test('debería rechazar si tipo contiene $', async () => {
            mockReq.data.tipo = '$ne';

            await expect(
                DescartesControllers.put_proceso_aplicaciones_descarte(mockReq)
            ).rejects.toThrow(ZodError);
        });

        test('debería rechazar si tipo contiene }', async () => {
            mockReq.data.tipo = 'tipo}';

            await expect(
                DescartesControllers.put_proceso_aplicaciones_descarte(mockReq)
            ).rejects.toThrow(ZodError);
        });

        test('debería rechazar si tipo contiene <script', async () => {
            mockReq.data.tipo = '<script>alert(1)</script>';

            await expect(
                DescartesControllers.put_proceso_aplicaciones_descarte(mockReq)
            ).rejects.toThrow(ZodError);
        });
    });

    // ============================================================
    // TEST GROUP 6: VALIDACIÓN ZOD - OBJETO data
    // ============================================================
    describe('Validación Zod - Objeto data', () => {

        test('debería rechazar si data es undefined', async () => {
            delete mockReq.data.data;

            await expect(
                DescartesControllers.put_proceso_aplicaciones_descarte(mockReq)
            ).rejects.toThrow(ZodError);
        });

        test('debería rechazar si data es null', async () => {
            mockReq.data.data = null;

            await expect(
                DescartesControllers.put_proceso_aplicaciones_descarte(mockReq)
            ).rejects.toThrow(ZodError);
        });

        test('debería rechazar si data.descarte está vacío', async () => {
            mockReq.data.data.descarte = '';

            await expect(
                DescartesControllers.put_proceso_aplicaciones_descarte(mockReq)
            ).rejects.toThrow(ZodError);
        });

        test('debería rechazar si data.descarte es undefined', async () => {
            delete mockReq.data.data.descarte;

            await expect(
                DescartesControllers.put_proceso_aplicaciones_descarte(mockReq)
            ).rejects.toThrow(ZodError);
        });

        test('debería rechazar si data.canastillas es negativo', async () => {
            mockReq.data.data.canastillas = '-5';

            await expect(
                DescartesControllers.put_proceso_aplicaciones_descarte(mockReq)
            ).rejects.toThrow(ZodError);
        });

        test('debería rechazar si data.canastillas no es numérico', async () => {
            mockReq.data.data.canastillas = 'abc';

            await expect(
                DescartesControllers.put_proceso_aplicaciones_descarte(mockReq)
            ).rejects.toThrow(ZodError);
        });

        test('debería rechazar si data.kilos es negativo', async () => {
            mockReq.data.data.kilos = '-10';

            await expect(
                DescartesControllers.put_proceso_aplicaciones_descarte(mockReq)
            ).rejects.toThrow(ZodError);
        });

        test('debería rechazar si data.kilos no es numérico', async () => {
            mockReq.data.data.kilos = 'xyz';

            await expect(
                DescartesControllers.put_proceso_aplicaciones_descarte(mockReq)
            ).rejects.toThrow(ZodError);
        });
    });

    // ============================================================
    // TEST GROUP 7: SEGURIDAD - NoSQL INJECTION
    // ============================================================
    describe('Seguridad - NoSQL Injection', () => {

        test('debería rechazar operador $ne en action', async () => {
            mockReq.data.action = { $ne: null };

            await expect(
                DescartesControllers.put_proceso_aplicaciones_descarte(mockReq)
            ).rejects.toThrow(ZodError);
        });

        test('debería rechazar operador $gt en registroFrutaProcesada', async () => {
            mockReq.data.registroFrutaProcesada = { $gt: '' };

            await expect(
                DescartesControllers.put_proceso_aplicaciones_descarte(mockReq)
            ).rejects.toThrow(ZodError);
        });

        test('debería rechazar operador $regex en tipo', async () => {
            mockReq.data.tipo = { $regex: '.*' };

            await expect(
                DescartesControllers.put_proceso_aplicaciones_descarte(mockReq)
            ).rejects.toThrow(ZodError);
        });

        test('debería rechazar operador $where en data.descarte', async () => {
            mockReq.data.data.descarte = { $where: 'return true' };

            await expect(
                DescartesControllers.put_proceso_aplicaciones_descarte(mockReq)
            ).rejects.toThrow(ZodError);
        });

        test('debería rechazar operador $exists en data.canastillas', async () => {
            mockReq.data.data.canastillas = { $exists: true };

            await expect(
                DescartesControllers.put_proceso_aplicaciones_descarte(mockReq)
            ).rejects.toThrow(ZodError);
        });

        test('debería rechazar operador $in en data.kilos', async () => {
            mockReq.data.data.kilos = { $in: ['10', '20'] };

            await expect(
                DescartesControllers.put_proceso_aplicaciones_descarte(mockReq)
            ).rejects.toThrow(ZodError);
        });

        test('debería rechazar string con $ en action', async () => {
            mockReq.data.action = '$ne';

            await expect(
                DescartesControllers.put_proceso_aplicaciones_descarte(mockReq)
            ).rejects.toThrow(ZodError);
        });

        test('debería rechazar string con $ en tipo', async () => {
            mockReq.data.tipo = '$gt';

            await expect(
                DescartesControllers.put_proceso_aplicaciones_descarte(mockReq)
            ).rejects.toThrow(ZodError);
        });

        test('debería rechazar string con llaves en action', async () => {
            mockReq.data.action = '{$ne: null}';

            await expect(
                DescartesControllers.put_proceso_aplicaciones_descarte(mockReq)
            ).rejects.toThrow(ZodError);
        });
    });

    // ============================================================
    // TEST GROUP 8: DATOS MALICIOSOS Y RAROS
    // ============================================================
    describe('Datos Maliciosos y Raros', () => {

        test('debería rechazar si req.data es null', async () => {
            mockReq.data = null;

            await expect(
                DescartesControllers.put_proceso_aplicaciones_descarte(mockReq)
            ).rejects.toThrow();
        });

        test('debería rechazar si req.data es undefined', async () => {
            delete mockReq.data;

            await expect(
                DescartesControllers.put_proceso_aplicaciones_descarte(mockReq)
            ).rejects.toThrow();
        });

        test('debería rechazar si req.data es un string', async () => {
            mockReq.data = 'string-malicioso';

            await expect(
                DescartesControllers.put_proceso_aplicaciones_descarte(mockReq)
            ).rejects.toThrow();
        });

        test('debería rechazar si req.data es un array', async () => {
            mockReq.data = [{ action: 'test' }];

            await expect(
                DescartesControllers.put_proceso_aplicaciones_descarte(mockReq)
            ).rejects.toThrow();
        });

        test('HALLAZGO: "Infinity" pasa la validación de kilos (Number("Infinity") >= 0 es true)', async () => {
            mockReq.data.data.kilos = 'Infinity';

            // Number('Infinity') = Infinity → !isNaN(Infinity) = true, Infinity >= 0 = true
            // Considerar agregar isFinite() en la validación Zod
            await expect(
                DescartesControllers.put_proceso_aplicaciones_descarte(mockReq)
            ).resolves.not.toThrow();
        });

        test('debería rechazar -Infinity en data.canastillas', async () => {
            mockReq.data.data.canastillas = '-Infinity';

            await expect(
                DescartesControllers.put_proceso_aplicaciones_descarte(mockReq)
            ).rejects.toThrow(ZodError);
        });

        test('debería rechazar NaN en data.kilos', async () => {
            mockReq.data.data.kilos = 'NaN';

            await expect(
                DescartesControllers.put_proceso_aplicaciones_descarte(mockReq)
            ).rejects.toThrow(ZodError);
        });

        test('debería rechazar action como boolean', async () => {
            mockReq.data.action = true;

            await expect(
                DescartesControllers.put_proceso_aplicaciones_descarte(mockReq)
            ).rejects.toThrow(ZodError);
        });

        test('debería rechazar tipo como array', async () => {
            mockReq.data.tipo = ['encerado', 'clasificacion'];

            await expect(
                DescartesControllers.put_proceso_aplicaciones_descarte(mockReq)
            ).rejects.toThrow(ZodError);
        });

        test('debería rechazar data.descarte como número', async () => {
            mockReq.data.data.descarte = 12345;

            await expect(
                DescartesControllers.put_proceso_aplicaciones_descarte(mockReq)
            ).rejects.toThrow(ZodError);
        });

        test('debería rechazar data.canastillas como número (no string)', async () => {
            mockReq.data.data.canastillas = 5;

            await expect(
                DescartesControllers.put_proceso_aplicaciones_descarte(mockReq)
            ).rejects.toThrow(ZodError);
        });

        test('debería rechazar data.kilos como número (no string)', async () => {
            mockReq.data.data.kilos = 10.5;

            await expect(
                DescartesControllers.put_proceso_aplicaciones_descarte(mockReq)
            ).rejects.toThrow(ZodError);
        });

        test('debería rechazar XSS en tipo', async () => {
            mockReq.data.tipo = '<script>document.cookie</script>';

            await expect(
                DescartesControllers.put_proceso_aplicaciones_descarte(mockReq)
            ).rejects.toThrow(ZodError);
        });

        test('debería rechazar req como null', async () => {
            await expect(
                DescartesControllers.put_proceso_aplicaciones_descarte(null)
            ).rejects.toThrow();
        });

        test('debería rechazar req como undefined', async () => {
            await expect(
                DescartesControllers.put_proceso_aplicaciones_descarte(undefined)
            ).rejects.toThrow();
        });
    });

    // ============================================================
    // TEST GROUP 9: SEGURIDAD - PROTOTYPE POLLUTION
    // ============================================================
    describe('Seguridad - Prototype Pollution', () => {

        test('no debería contaminar Object.prototype con __proto__', async () => {
            const originalPrototype = { ...Object.prototype };
            mockReq.data.__proto__ = { malicious: true };

            try {
                await DescartesControllers.put_proceso_aplicaciones_descarte(mockReq);
            } catch (e) {
                // Puede fallar, está bien
            }

            expect({}.malicious).toBeUndefined();
            expect(Object.prototype).toEqual(originalPrototype);
        });

        test('no debería contaminar con constructor.prototype', async () => {
            mockReq.data['constructor'] = { prototype: { pwned: true } };

            try {
                await DescartesControllers.put_proceso_aplicaciones_descarte(mockReq);
            } catch (e) {
                // Puede fallar validación
            }

            expect({}.pwned).toBeUndefined();
        });
    });

    // ============================================================
    // TEST GROUP 10: TRANSACCIÓN
    // ============================================================
    describe('Transacción', () => {

        test('debería ejecutar executeTransactionalTask después de la validación', async () => {
            await DescartesControllers.put_proceso_aplicaciones_descarte(mockReq);

            expect(mockExecuteTransactionalTask).toHaveBeenCalledWith(
                mockReq,
                expect.any(Function)
            );
        });

        test('no debería ejecutar transacción si la validación Zod falla', async () => {
            mockReq.data.action = '';

            await expect(
                DescartesControllers.put_proceso_aplicaciones_descarte(mockReq)
            ).rejects.toThrow(ZodError);

            expect(mockExecuteTransactionalTask).not.toHaveBeenCalled();
        });

        test('no debería ejecutar transacción si la validación de usuario falla', async () => {
            delete mockReq.user;

            await expect(
                DescartesControllers.put_proceso_aplicaciones_descarte(mockReq)
            ).rejects.toThrow('No se encontró el usuario');

            expect(mockExecuteTransactionalTask).not.toHaveBeenCalled();
        });
    });

    // ============================================================
    // TEST GROUP 11: FrutaProcesada.get_data - BÚSQUEDA DE REGISTRO
    // ============================================================
    describe('FrutaProcesada.get_data - Búsqueda de registro', () => {

        test('debería buscar el registro con el ID y populate de tipoFruta', async () => {
            await DescartesControllers.put_proceso_aplicaciones_descarte(mockReq);

            expect(mockFrutaProcesada.get_data).toHaveBeenCalledWith({
                ids: [VALID_OBJECT_ID],
                populate: [
                    { path: 'tipoFruta', select: 'tipoFruta valorPromedio' }
                ]
            });
        });

        test('debería completar exitosamente cuando get_data retorna documentos', async () => {
            await expect(
                DescartesControllers.put_proceso_aplicaciones_descarte(mockReq)
            ).resolves.not.toThrow();

            expect(mockFrutaProcesada.get_data).toHaveBeenCalledTimes(1);
        });

        test('debería lanzar error si get_data retorna array vacío', async () => {
            mockFrutaProcesada.get_data.mockResolvedValue([]);

            await expect(
                DescartesControllers.put_proceso_aplicaciones_descarte(mockReq)
            ).rejects.toThrow('No se encontró el registro de fruta procesada');
        });

        test('debería propagar error si get_data lanza excepción de BD', async () => {
            mockFrutaProcesada.get_data.mockRejectedValue(
                new Error('Error obteniendo frutaProcesada: connection timeout')
            );

            await expect(
                DescartesControllers.put_proceso_aplicaciones_descarte(mockReq)
            ).rejects.toThrow('Error obteniendo frutaProcesada: connection timeout');
        });

        test('no debería llamar a get_data si la validación Zod falla', async () => {
            mockReq.data.action = '';

            await expect(
                DescartesControllers.put_proceso_aplicaciones_descarte(mockReq)
            ).rejects.toThrow(ZodError);

            expect(mockFrutaProcesada.get_data).not.toHaveBeenCalled();
        });

        test('no debería llamar a get_data si la validación de usuario falla', async () => {
            delete mockReq.user;

            await expect(
                DescartesControllers.put_proceso_aplicaciones_descarte(mockReq)
            ).rejects.toThrow('No se encontró el usuario');

            expect(mockFrutaProcesada.get_data).not.toHaveBeenCalled();
        });

        test('debería usar el registroFrutaProcesada validado por Zod en la búsqueda', async () => {
            const otroId = 'aabbccddee11223344556677';
            mockReq.data.registroFrutaProcesada = otroId;

            await DescartesControllers.put_proceso_aplicaciones_descarte(mockReq);

            expect(mockFrutaProcesada.get_data).toHaveBeenCalledWith(
                expect.objectContaining({
                    ids: [otroId]
                })
            );
        });
    });
});
