import { describe, test, expect, beforeAll, afterAll, beforeEach, jest } from '@jest/globals';
import mongoose from 'mongoose';

/**
 * Los tests de integración requieren:
 * 1. Conexión a MongoDB en memoria (con soporte para transacciones)
 * 2. Mocks de datos específicos (poblar la base de datos)
 * 3. Mocks de módulos externos (para que el controlador use la BD de test)
 */
import {
    connectTestDB,
    disconnectTestDB,
    clearTestDB,
    defineTestSchemas,
    testDb
} from '../../../helpers/mongoMemoryServer.js';

import {
    createMockInventarioActualDescarte,
    createRandomMockInventario,
    createManyMockInventarioActualDescarte
} from '../../../helpers/mockData/inventarios/inventarioDescartes.mock.js';

// ============================================================
// CONFIGURACIÓN DE MOCKS DE MÓDULOS
// ============================================================

// Mock de la conexión y BD para que el controlador use la de memoria
jest.unstable_mockModule('../../../../DB/mongoDB/config/init.js', () => ({
    db: testDb,
    procesoConn: {
        readyState: 1,
        startSession: () => mongoose.connection.startSession() // Se ajustará en el setup
    }
}));

// Mock de eventos para evitar efectos secundarios
jest.unstable_mockModule('../../../../events/eventos.js', () => ({
    procesoEventEmitter: {
        emit: jest.fn()
    }
}));

// Importar el controlador después de configurar los mocks de los módulos
const { InventarioDescarteController } = await import('../../../../server/api/inventarios/inventarioDescarte.js');

describe('InventarioDescarteController.post_inventarios_frutaDescarte_frutaDescompuesta - Integración', () => {
    let testConnection;

    beforeAll(async () => {
        testConnection = await connectTestDB();
        await defineTestSchemas(testConnection);
    });

    afterAll(async () => {
        await disconnectTestDB();
    });

    beforeEach(async () => {
        await clearTestDB();
        jest.clearAllMocks();
    });

    /**
     * Boilerplate listo para empezar a escribir los tests.
     * Puedes usar:
     * - testDb.InventarioActualDescarte.create(...)
     * - createManyMockInventarioActualDescarte(count, overrides)
     * - InventarioDescarteController.post_inventarios_frutaDescarte_frutaDescompuesta(req)
     */
    test('El controlador debería estar definido', () => {
        expect(InventarioDescarteController).toBeDefined();
        expect(typeof InventarioDescarteController.post_inventarios_frutaDescarte_frutaDescompuesta).toBe('function');
    });
});
