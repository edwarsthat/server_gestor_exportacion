/**
 * Tests de Integración para OrdenVaceoController.put_inventarios_ordenVaceo_modificar
 *
 * Estos tests usan MongoDB en memoria (mongodb-memory-server) para probar
 * el comportamiento REAL del controlador con:
 * - Transacciones y rollback atómico
 * - Optimistic locking con __v (colisiones de versión)
 * - Race conditions con actualizaciones concurrentes
 */
import { describe, test, expect, beforeAll, afterAll, beforeEach, jest } from '@jest/globals';
import mongoose from 'mongoose';

import {
    connectTestDB,
    disconnectTestDB,
    clearTestDB,
    defineTestSchemas,
    createTestInventario,
    testDb,
    getTestConnection
} from '../../../helpers/mongoMemoryServer.js';

// ============================================================
// CONFIGURACIÓN DE MOCKS
// ============================================================

let testConnection;
let testInventarioId;

// Mock de config - se actualizará con el ID del inventario de test
const mockConfig = {
    INVENTARIO_ORDEN_VACEO: null, // Se asignará en beforeEach
    ENCRYPTION_KEY: 'a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2'
};

// Mock de logs
const mockLog = { _id: new mongoose.Types.ObjectId() };

// Mock de eventos
const mockEventEmitter = {
    emit: jest.fn()
};

// Configurar mocks ANTES de importar el controlador
jest.unstable_mockModule('../../../../src/config/index.js', () => ({
    default: mockConfig
}));

jest.unstable_mockModule('../../../../events/eventos.js', () => ({
    procesoEventEmitter: mockEventEmitter
}));

jest.unstable_mockModule('../../../../server/Class/LogsSistema.js', () => ({
    LogsRepository: {
        create: jest.fn().mockResolvedValue(mockLog)
    }
}));

jest.unstable_mockModule('../../../../server/api/helper/logs.js', () => ({
    registrarPasoLog: jest.fn().mockResolvedValue(true)
}));

jest.unstable_mockModule('../../../../server/utils/ErrorHandler.js', () => ({
    GlobalControllerErrorHandler: jest.fn().mockResolvedValue(undefined)
}));

// Mock de procesoConn - se configurará con la conexión real de test
jest.unstable_mockModule('../../../../DB/mongoDB/config/init.js', () => ({
    procesoConn: {
        readyState: 1,
        startSession: () => testConnection.startSession()
    },
    db: {
        InventariosSimples: null // Se asignará después de definir schemas
    }
}));

// Mock del repositorio - usará el modelo real de la BD de test
jest.unstable_mockModule('../../../../server/Class/Inventarios.js', () => ({
    InventariosHistorialRepository: {
        put_inventarioSimple: async (filter, update, options = {}) => {
            const { session, ...restOptions } = options;
            const finalOptions = {
                runValidators: false,
                ...restOptions,
                ...(session && { session })
            };
            const res = await testDb.InventariosSimples.updateOne(filter, update, finalOptions);
            if (res.matchedCount === 0) {
                throw new Error('No se encontró ningún documento que coincida con el filtro');
            }
            return res;
        }
    },
    InventarioDescartesRepository: {
        get_data: jest.fn()
    }
}));

// Importar el controlador DESPUÉS de configurar los mocks
const { OrdenVaceoController } = await import('../../../../server/api/inventarios/ordenVaceo.js');
const { procesoEventEmitter } = await import('../../../../events/eventos.js');

// ============================================================
// TESTS DE INTEGRACIÓN
// ============================================================
describe('OrdenVaceoController.put_inventarios_ordenVaceo_modificar - Integración', () => {

    beforeAll(async () => {
        // Conectar a MongoDB en memoria
        testConnection = await connectTestDB();
        await defineTestSchemas(testConnection);
    }, 60000);

    afterAll(async () => {
        await disconnectTestDB();
    }, 30000);

    beforeEach(async () => {
        await clearTestDB();
        jest.clearAllMocks();

        // Crear documento de inventario de prueba
        const inventario = await createTestInventario({
            nombre: 'orden-vaceo-test',
            ordenVaceo: []
        });
        testInventarioId = inventario._id.toString();

        // Configurar el mock de config con el ID real
        mockConfig.INVENTARIO_ORDEN_VACEO = testInventarioId;
    });

    // ============================================================
    // HELPER PARA CREAR REQUEST
    // ============================================================
    const createRequest = (overrides = {}) => ({
        user: { _id: new mongoose.Types.ObjectId(), nombre: 'Test User' },
        data: {
            data: [
                new mongoose.Types.ObjectId().toString(),
                new mongoose.Types.ObjectId().toString(),
                new mongoose.Types.ObjectId().toString()
            ],
            __v: 0,
            action: 'modificar_orden_vaceo',
            ...overrides
        }
    });

    // ============================================================
    // TESTS DE FLUJO EXITOSO
    // ============================================================
    describe('flujo exitoso', () => {

        test('debería modificar el orden de vaceo correctamente en la BD', async () => {
            const nuevosIds = [
                new mongoose.Types.ObjectId().toString(),
                new mongoose.Types.ObjectId().toString()
            ];

            const req = createRequest({ data: nuevosIds, __v: 0 });

            // Llamar al método REAL del controlador
            await OrdenVaceoController.put_inventarios_ordenVaceo_modificar(req);

            // Verificar en la BD que se actualizó
            const inventarioActualizado = await testDb.InventariosSimples
                .findById(testInventarioId)
                .lean();

            expect(inventarioActualizado.ordenVaceo).toHaveLength(2);
            expect(inventarioActualizado.ordenVaceo.map(id => id.toString())).toEqual(nuevosIds);
            expect(inventarioActualizado.__v).toBe(1);
        });

        test('debería emitir evento después de modificar exitosamente', async () => {
            const req = createRequest({ __v: 0 });

            await OrdenVaceoController.put_inventarios_ordenVaceo_modificar(req);

            expect(procesoEventEmitter.emit).toHaveBeenCalledWith(
                'server_event',
                { action: 'modificar_orden_vaceo', data: {} }
            );
        });

        test('debería incrementar __v en cada actualización exitosa', async () => {
            // Primera actualización
            const req1 = createRequest({ data: [new mongoose.Types.ObjectId().toString()], __v: 0 });
            await OrdenVaceoController.put_inventarios_ordenVaceo_modificar(req1);

            let inventario = await testDb.InventariosSimples.findById(testInventarioId).lean();
            expect(inventario.__v).toBe(1);

            // Segunda actualización con __v correcto
            const req2 = createRequest({ data: [new mongoose.Types.ObjectId().toString()], __v: 1 });
            await OrdenVaceoController.put_inventarios_ordenVaceo_modificar(req2);

            inventario = await testDb.InventariosSimples.findById(testInventarioId).lean();
            expect(inventario.__v).toBe(2);
        });
    });

    // ============================================================
    // TESTS DE ROLLBACK ATÓMICO
    // ============================================================
    describe('rollback atómico con transacciones', () => {

        test('debería hacer rollback si falla durante la transacción', async () => {
            // Guardar estado original
            const inventarioOriginal = await testDb.InventariosSimples
                .findById(testInventarioId)
                .lean();

            // Intentar actualizar con __v incorrecto (simulando que otro usuario ya modificó)
            const req = createRequest({ __v: 999 }); // __v incorrecto

            await expect(
                OrdenVaceoController.put_inventarios_ordenVaceo_modificar(req)
            ).rejects.toThrow('No se encontró ningún documento que coincida con el filtro');

            // Verificar que NO hubo cambios en la BD
            const inventarioDespues = await testDb.InventariosSimples
                .findById(testInventarioId)
                .lean();

            expect(inventarioDespues.__v).toBe(inventarioOriginal.__v);
            expect(inventarioDespues.ordenVaceo).toEqual(inventarioOriginal.ordenVaceo);
        });

        test('NO debería emitir evento si la transacción falla', async () => {
            const req = createRequest({ __v: 999 }); // __v incorrecto

            await expect(
                OrdenVaceoController.put_inventarios_ordenVaceo_modificar(req)
            ).rejects.toThrow();

            // El evento NO debería haberse emitido
            const serverEventCalls = procesoEventEmitter.emit.mock.calls
                .filter(call => call[0] === 'server_event');

            expect(serverEventCalls).toHaveLength(0);
        });
    });

    // ============================================================
    // TESTS DE COLISIÓN DE VERSIONES (OPTIMISTIC LOCKING)
    // ============================================================
    describe('colisión de versiones / optimistic locking', () => {

        test('debería rechazar actualización cuando __v no coincide (otro usuario modificó primero)', async () => {
            // Usuario A lee el inventario (tiene __v = 0)
            const lecturaUsuarioA = await testDb.InventariosSimples
                .findById(testInventarioId)
                .lean();
            expect(lecturaUsuarioA.__v).toBe(0);

            // Usuario B también lee (tiene __v = 0)
            const lecturaUsuarioB = await testDb.InventariosSimples
                .findById(testInventarioId)
                .lean();
            expect(lecturaUsuarioB.__v).toBe(0);

            // Usuario A actualiza exitosamente
            const reqUsuarioA = createRequest({
                data: [new mongoose.Types.ObjectId().toString()],
                __v: lecturaUsuarioA.__v
            });
            await OrdenVaceoController.put_inventarios_ordenVaceo_modificar(reqUsuarioA);

            // Verificar que A tuvo éxito
            const despuesDeA = await testDb.InventariosSimples
                .findById(testInventarioId)
                .lean();
            expect(despuesDeA.__v).toBe(1);

            // Usuario B intenta actualizar con __v = 0 (ya obsoleto) -> DEBE FALLAR
            const reqUsuarioB = createRequest({
                data: [new mongoose.Types.ObjectId().toString()],
                __v: lecturaUsuarioB.__v // __v = 0, pero el documento ya tiene __v = 1
            });

            await expect(
                OrdenVaceoController.put_inventarios_ordenVaceo_modificar(reqUsuarioB)
            ).rejects.toThrow('No se encontró ningún documento que coincida con el filtro');

            // Verificar que los datos de A persisten
            const estadoFinal = await testDb.InventariosSimples
                .findById(testInventarioId)
                .lean();
            expect(estadoFinal.__v).toBe(1); // Sigue siendo 1, no 2
        });

        test('debería manejar múltiples actualizaciones concurrentes - solo una tiene éxito', async () => {
            const versionInicial = 0;
            const NUM_USUARIOS = 5;

            // Simular 5 usuarios intentando actualizar al mismo tiempo
            const actualizaciones = Array.from({ length: NUM_USUARIOS }, (_, i) => {
                const req = createRequest({
                    data: [new mongoose.Types.ObjectId().toString()],
                    __v: versionInicial
                });
                req.user.nombre = `Usuario ${i}`;

                return OrdenVaceoController.put_inventarios_ordenVaceo_modificar(req)
                    .then(() => ({ success: true, usuario: i }))
                    .catch(() => ({ success: false, usuario: i }));
            });

            const resultados = await Promise.all(actualizaciones);

            // Contar éxitos y fallos
            const exitos = resultados.filter(r => r.success);
            const fallos = resultados.filter(r => !r.success);

            // Solo UNO debería tener éxito
            expect(exitos.length).toBe(1);
            expect(fallos.length).toBe(NUM_USUARIOS - 1);

            // Verificar versión final en la BD
            const estadoFinal = await testDb.InventariosSimples
                .findById(testInventarioId)
                .lean();
            expect(estadoFinal.__v).toBe(1);
        });

        test('stress test: 10 actualizaciones simultáneas', async () => {
            const versionInicial = 0;
            const NUM_USUARIOS = 10;

            // Lanzar 10 actualizaciones concurrentes
            const actualizaciones = Array.from({ length: NUM_USUARIOS }, (_, i) => {
                const req = createRequest({
                    data: Array.from({ length: i + 1 }, () => new mongoose.Types.ObjectId().toString()),
                    __v: versionInicial
                });

                return OrdenVaceoController.put_inventarios_ordenVaceo_modificar(req)
                    .then(() => 'success')
                    .catch(() => 'failed');
            });

            const resultados = await Promise.all(actualizaciones);

            const exitos = resultados.filter(r => r === 'success').length;
            const fallos = resultados.filter(r => r === 'failed').length;

            // Solo 1 de 10 debería tener éxito
            expect(exitos).toBe(1);
            expect(fallos).toBe(NUM_USUARIOS - 1);

            // Verificar integridad del documento
            const estadoFinal = await testDb.InventariosSimples
                .findById(testInventarioId)
                .lean();
            expect(estadoFinal.__v).toBe(1);
        });

        test('actualizaciones secuenciales con versión correcta deberían todas tener éxito', async () => {
            // Hacer 5 actualizaciones secuenciales, cada una leyendo la versión actual
            for (let i = 0; i < 5; i++) {
                const doc = await testDb.InventariosSimples
                    .findById(testInventarioId)
                    .lean();

                const req = createRequest({
                    data: [new mongoose.Types.ObjectId().toString()],
                    __v: doc.__v
                });

                await OrdenVaceoController.put_inventarios_ordenVaceo_modificar(req);
            }

            // Verificar que todas las actualizaciones se aplicaron
            const estadoFinal = await testDb.InventariosSimples
                .findById(testInventarioId)
                .lean();
            expect(estadoFinal.__v).toBe(5);
        });
    });
});
