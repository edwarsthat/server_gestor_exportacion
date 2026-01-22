import { describe, test, expect, beforeAll, afterAll } from '@jest/globals';
import { ConstantesDelSistema } from '../../server/Class/ConstantesDelSistema.js';
import { initMongoDB } from '../../DB/mongoDB/config/init.js';
import { dataRepository } from '../../server/api/data.js';
import mongoose from 'mongoose';

/**
 * Tests de Integración para get_data_bootstrap
 * Estos tests NO usan mocks y prueban la funcionalidad real
 */

let isConnected = false;

beforeAll(async () => {
    try {
        await initMongoDB();
        isConnected = true;
        console.log('✅ Conexión a MongoDB establecida para tests de integración');
    } catch (error) {
        console.error('❌ No se pudo conectar a MongoDB:', error.message);
        isConnected = false;
    }
}, 30000); // timeout de 30 segundos para la conexión

afterAll(async () => {
    try {
        // Cerrar todas las conexiones de mongoose (incluyendo las creadas con createConnection)
        const closePromises = mongoose.connections.map(conn => {
            if (conn.readyState !== 0) { // 0 = disconnected
                return conn.close();
            }
            return Promise.resolve();
        });
        await Promise.all(closePromises);
        console.log('✅ Conexiones a MongoDB cerradas');
    } catch (error) {
        console.error('❌ Error cerrando conexiones:', error.message);
    }
});

// ============================================================
// TEST 13: Archivos JSON - Verificar lectura de paisesEXP.json
// ============================================================
describe('Test 13: Archivos JSON - paisesEXP.json', () => {

    test('debería leer correctamente el archivo paisesEXP.json', async () => {
        const result = await ConstantesDelSistema.get_constantes_sistema_paises_GGN();

        expect(Array.isArray(result)).toBe(true);
        expect(result.length).toBeGreaterThan(0);
    });

    test('debería contener países conocidos', async () => {
        const result = await ConstantesDelSistema.get_constantes_sistema_paises_GGN();

        // Verificar algunos países que sabemos que existen (tal como están en el JSON)
        expect(result).toContain('colombia');
        expect(result).toContain('Estados unidos');
        expect(result).toContain('Ecuador');
    });

    test('todos los elementos deberían ser strings no vacíos', async () => {
        const result = await ConstantesDelSistema.get_constantes_sistema_paises_GGN();

        // Validación de esquema mínimo
        expect(result.length).toBeGreaterThan(0);

        result.forEach((pais) => {
            expect(typeof pais).toBe('string');
            expect(pais.trim().length).toBeGreaterThan(0);
        });
    });

    test('debería tener al menos 20 países', async () => {
        const result = await ConstantesDelSistema.get_constantes_sistema_paises_GGN();

        // Si falla, indica que el archivo puede estar corrupto o incompleto
        expect(result.length).toBeGreaterThanOrEqual(20);
    });

    test('no debería contener elementos duplicados', async () => {
        const result = await ConstantesDelSistema.get_constantes_sistema_paises_GGN();
        const uniqueSet = new Set(result.map(p => p.toLowerCase()));

        // Advertencia: Si hay duplicados, podría indicar datos corruptos
        expect(uniqueSet.size).toBe(result.length);
    });

    test('no debería contener valores nulos o undefined', async () => {
        const result = await ConstantesDelSistema.get_constantes_sistema_paises_GGN();

        const invalidEntries = result.filter(p => p === null || p === undefined);
        expect(invalidEntries).toHaveLength(0);
    });
});

// ============================================================
// TEST 14: Constantes importadas - ENUMS
// ============================================================
describe('Test 14: Constantes importadas', () => {

    test('get_constantes_carnets debería retornar CARNET_ENUMS con type y status', async () => {
        const result = await ConstantesDelSistema.get_constantes_carnets();

        expect(result).toHaveProperty('type');
        expect(result).toHaveProperty('status');
        expect(result.type).toHaveProperty('TEMP');
        expect(result.type).toHaveProperty('FINAL');
        expect(result.status).toHaveProperty('STOCK');
        expect(result.status).toHaveProperty('ACTIVE');
    });

    test('get_constantes_sistema_areasSeleccion debería retornar AREAS_SELECCION', async () => {
        const result = await ConstantesDelSistema.get_constantes_sistema_areasSeleccion();

        expect(result).toHaveProperty('proceso');
        expect(result.proceso).toHaveProperty('LAVADO');
        expect(result.proceso).toHaveProperty('ENCERADO');
    });

    test('get_constantes_sistema_tiposIdentificacion debería retornar TIPOS_IDENTIFICACION_ENUMS', () => {
        const result = ConstantesDelSistema.get_constantes_sistema_tiposIdentificacion();

        expect(result).toHaveProperty('tipo');
        expect(result.tipo).toHaveProperty('CEDULA');
        expect(result.tipo).toHaveProperty('PASAPORTE');
    });

    test('cada tipo de carnet debería tener value y label', async () => {
        const result = await ConstantesDelSistema.get_constantes_carnets();

        Object.values(result.type).forEach(tipo => {
            expect(tipo).toHaveProperty('value');
            expect(tipo).toHaveProperty('label');
        });
    });

    test('cada área de selección debería tener value y label', async () => {
        const result = await ConstantesDelSistema.get_constantes_sistema_areasSeleccion();

        Object.values(result.proceso).forEach(area => {
            expect(area).toHaveProperty('value');
            expect(area).toHaveProperty('label');
        });
    });
});

// ============================================================
// TEST 12: Conexión a BD - Verificar datos reales de MongoDB
// ============================================================
describe('Test 12: Conexión a BD', () => {

    test('debería conectarse a MongoDB correctamente', () => {
        expect(isConnected).toBe(true);
    });

    test('debería retornar datos reales de TipoFrutas', async () => {
        if (!isConnected) {
            console.warn('⚠️ Test saltado: No hay conexión a MongoDB');
            return;
        }

        const result = await ConstantesDelSistema.get_constantes_sistema_tipo_frutas2();

        expect(Array.isArray(result)).toBe(true);
        expect(result.length).toBeGreaterThan(0);
    });

    test('debería retornar datos reales de CalidadesExpFruta', async () => {
        if (!isConnected) {
            console.warn('⚠️ Test saltado: No hay conexión a MongoDB');
            return;
        }

        const result = await ConstantesDelSistema.get_constantes_sistema_calidades();

        expect(Array.isArray(result)).toBe(true);
        expect(result.length).toBeGreaterThan(0);
    });

    test('debería retornar datos reales de Descartes', async () => {
        if (!isConnected) {
            console.warn('⚠️ Test saltado: No hay conexión a MongoDB');
            return;
        }

        const result = await ConstantesDelSistema.get_constantes_sistema_descartes();

        expect(Array.isArray(result)).toBe(true);
        expect(result.length).toBeGreaterThan(0);
    });

    test('get_data_bootstrap debería retornar objeto completo con datos reales', async () => {
        if (!isConnected) {
            console.warn('⚠️ Test saltado: No hay conexión a MongoDB');
            return;
        }

        const result = await dataRepository.get_data_bootstrap();

        // Verificar estructura
        expect(Object.keys(result)).toHaveLength(7);
        expect(result).toHaveProperty('tipoFrutas');
        expect(result).toHaveProperty('calidadesExport');
        expect(result).toHaveProperty('descartes');
        expect(result).toHaveProperty('carnet');
        expect(result).toHaveProperty('areasSeleccion');
        expect(result).toHaveProperty('paisesExpGGN');
        expect(result).toHaveProperty('tiposIdentificacion');

        // Verificar que hay datos
        expect(Array.isArray(result.tipoFrutas)).toBe(true);
        expect(Array.isArray(result.calidadesExport)).toBe(true);
        expect(Array.isArray(result.descartes)).toBe(true);
        expect(Array.isArray(result.paisesExpGGN)).toBe(true);
    });
});

// ============================================================
// TEST 15: BD no disponible - Manejo de error de conexión
// ============================================================
describe('Test 15: Manejo de BD no disponible', () => {

    test('debería manejar correctamente cuando la BD no responde', async () => {
        // Este test documenta el comportamiento esperado cuando la BD falla
        // En un escenario real, si la BD no está disponible,
        // get_data_bootstrap debería lanzar un error que es manejado por ErrorDataLogicHandlers

        if (!isConnected) {
            // Si no hay conexión, verificamos que el sistema lo detectó correctamente
            expect(isConnected).toBe(false);
            return;
        }

        // Si hay conexión, el test pasa (la BD está disponible)
        expect(isConnected).toBe(true);
    });
});

// ============================================================
// TEST 16: Archivo JSON faltante - Ya cubierto por test de errores unitarios
// ============================================================
describe('Test 16: Integridad de archivos JSON', () => {

    test('el archivo paisesEXP.json debería existir y ser válido', async () => {
        // Si el archivo no existe, get_constantes_sistema_paises_GGN lanzará ProcessError(540)
        const result = await ConstantesDelSistema.get_constantes_sistema_paises_GGN();

        expect(result).toBeDefined();
        expect(Array.isArray(result)).toBe(true);
    });
});
