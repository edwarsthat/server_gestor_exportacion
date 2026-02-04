/**
 * Helper para tests de integración con MongoDB en memoria
 * Reutiliza los schemas existentes del proyecto
 */
import { MongoMemoryReplSet } from 'mongodb-memory-server';
import mongoose from 'mongoose';

// Importar las funciones de definición de schemas existentes
import { defineAuditInventariosSimples } from '../../DB/mongoDB/schemas/audit/AuditInventariosSimples.js';
import { defineInventarioSimple } from '../../DB/mongoDB/schemas/inventarios/SchemaInventariosSimples.js';
import { defineSchemaCarnets } from '../../DB/mongoDB/schemas/personal/dotaciones/SchemaCarnets.js';
import { defineTipoFrutas } from '../../DB/mongoDB/schemas/catalogs/schemaTipoFruta.js';
import { defineLotes } from '../../DB/mongoDB/schemas/lotes/schemaLotes.js';
import { defineFrutaDescompuesta } from '../../DB/mongoDB/schemas/frutaDescompuesta/schemaFrutaDecompuesta.js';
import { defineInventarioActualDescarte } from '../../DB/mongoDB/schemas/inventarios/SchemaInventarioActualDescarte.js';
import { defineInventarioMovimientosDescarte } from '../../DB/mongoDB/schemas/inventarios/SchemaMovimientoInventarioDescartes.js';
import { defineAuditSistemaLogs } from '../../DB/mongoDB/schemas/audit/AuditLosSistemaSchema.js';
import { defineDescartes } from '../../DB/mongoDB/schemas/catalogs/schemaDescartes.js';
import { defineUser } from '../../DB/mongoDB/schemas/usuarios/schemaUsuarios.js';
import { defineInventarioDescarte } from '../../DB/mongoDB/schemas/inventarios/SchemaInventarioDescartes.js';

let replSet = null;
let testConnection = null;
let isConnected = false;

// Objeto para almacenar los modelos de test (similar a `db` en init.js)
export const testDb = {};

/**
 * Conecta a una instancia de MongoDB en memoria con replica set
 * Las transacciones de MongoDB requieren replica set
 * @returns {Promise<mongoose.Connection>}
 */
export async function connectTestDB() {
    if (isConnected && testConnection) {
        return testConnection;
    }

    // Crear replica set en memoria (requerido para transacciones)
    replSet = await MongoMemoryReplSet.create({
        replSet: {
            count: 1,
            storageEngine: 'wiredTiger',
            name: 'testset'
        }
    });

    const uri = replSet.getUri();

    // Crear una conexión separada para tests (no usar mongoose.connect global)
    testConnection = mongoose.createConnection(uri);

    await testConnection.asPromise();

    isConnected = true;
    return testConnection;
}

/**
 * Define los schemas necesarios para los tests de integración
 * Reutiliza los schemas existentes del proyecto
 * @param {mongoose.Connection} conn - Conexión a MongoDB
 * @returns {Promise<Object>} Objeto con los modelos definidos
 */
export async function defineTestSchemas(conn) {
    // Definir schema de auditoría primero (requerido por InventarioSimple)
    const AuditInventariosSimples = await defineAuditInventariosSimples(conn);
    testDb.AuditInventariosSimples = AuditInventariosSimples;

    // Definir schema de InventariosSimples usando el existente
    const InventariosSimples = await defineInventarioSimple(conn, AuditInventariosSimples);
    testDb.InventariosSimples = InventariosSimples;

    // Definir schema de InventariosSimples usando el existente
    const SchemaCarnets = await defineSchemaCarnets(conn, AuditInventariosSimples);
    testDb.SchemaCarnets = SchemaCarnets;

    // Definir schema de tipoFrutas (catálogo, sin dependencias)
    const TipoFrutas = await defineTipoFrutas(conn);
    testDb.TipoFrutas = TipoFrutas;

    // Definir schema de Lotes (requiere AuditLog para plugin de auditoría)
    const Lotes = await defineLotes(conn, AuditInventariosSimples);
    testDb.Lotes = Lotes;

    // Schemas para Inventario de Descarte y Fruta Descompuesta
    testDb.frutaDescompuesta = await defineFrutaDescompuesta(conn);
    testDb.InventarioActualDescarte = await defineInventarioActualDescarte(conn);
    testDb.InventarioMovimientoDescarte = await defineInventarioMovimientosDescarte(conn);
    testDb.Logs = await defineAuditSistemaLogs(conn);
    testDb.Descartes = await defineDescartes(conn);
    testDb.Usuarios = await defineUser(conn);
    testDb.InventarioDescarte = await defineInventarioDescarte(conn);

    return testDb;
}

/**
 * Desconecta y detiene la instancia de MongoDB en memoria
 */
export async function disconnectTestDB() {
    if (testConnection) {
        await testConnection.close();
        testConnection = null;
    }

    if (replSet) {
        await replSet.stop();
        replSet = null;
    }

    // Limpiar modelos registrados
    Object.keys(testDb).forEach(key => delete testDb[key]);

    isConnected = false;
}

/**
 * Limpia todas las colecciones de la base de datos de test
 */
export async function clearTestDB() {
    if (!testConnection) return;

    const collections = testConnection.collections;

    for (const key in collections) {
        await collections[key].deleteMany({});
    }
}

/**
 * Crea un documento de inventario de prueba
 * @param {Object} overrides - Campos a sobrescribir
 * @returns {Promise<Document>}
 */
export async function createTestInventario(overrides = {}) {
    if (!testDb.InventariosSimples) {
        throw new Error('Los schemas no han sido definidos. Llama a defineTestSchemas primero.');
    }

    const defaultData = {
        nombre: `test-inventario-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        descripcion: 'Inventario de prueba para tests de integración',
        ordenVaceo: [],
        inventario: [],
        inventarioMaquila: [],
        ...overrides
    };

    const doc = new testDb.InventariosSimples(defaultData);
    return await doc.save();
}

/**
 * Simula la función put_inventarioSimple del repositorio real
 * con la misma lógica de validación y error
 * @param {Object} filter - Filtro para buscar el documento
 * @param {Object} update - Actualización a aplicar
 * @param {Object} options - Opciones (session, user, action, etc.)
 * @returns {Promise<Object>} Resultado del updateOne
 */
export async function putInventarioSimple(filter, update, options = {}) {
    if (!testDb.InventariosSimples) {
        throw new Error('Los schemas no han sido definidos. Llama a defineTestSchemas primero.');
    }

    // Validación de parámetros (igual que el repositorio real)
    if (!filter || typeof filter !== 'object' || Object.keys(filter).length === 0) {
        throw new Error('El filtro es requerido y no puede estar vacío');
    }
    if (!update || typeof update !== 'object' || Object.keys(update).length === 0) {
        throw new Error('El update es requerido y no puede estar vacío');
    }

    const { session, ...restOptions } = options;

    const finalOptions = {
        runValidators: false,
        ...restOptions,
        ...(session && { session })
    };

    const res = await testDb.InventariosSimples.updateOne(filter, update, finalOptions);

    // Mismo comportamiento que el repositorio real
    if (res.matchedCount === 0) {
        throw new Error('No se encontró ningún documento que coincida con el filtro');
    }

    return res;
}

/**
 * Obtiene la conexión de test actual
 * @returns {mongoose.Connection|null}
 */
export function getTestConnection() {
    return testConnection;
}
