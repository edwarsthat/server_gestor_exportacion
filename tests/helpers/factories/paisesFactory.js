import { testDb } from '../mongoMemoryServer.js';

/**
 * Crea un documento Pais en la BD de test
 * @param {Object} overrides - Campos a sobrescribir
 * @returns {Promise<Document>}
 */
export async function createPais(overrides = {}) {
    const defaults = {
        nombre: 'Colombia',
        codigo: 'CO',
        activo: true,
    };
    return testDb.Paises.create({ ...defaults, ...overrides });
}

/**
 * Inserta los países más usados en los tests de contenedores
 * @returns {Promise<Object>} Mapa { CO, DE, US, ... } con los docs creados
 */
export async function seedPaises() {
    const data = [
        { nombre: 'Colombia',              codigo: 'CO' },
        { nombre: 'Alemania',              codigo: 'DE' },
        { nombre: 'Estados Unidos',        codigo: 'US' },
        { nombre: 'Republica dominicana',  codigo: 'DO' },
        { nombre: 'Puerto rico',           codigo: 'PR' },
    ];

    const docs = await testDb.Paises.insertMany(data);

    return Object.fromEntries(docs.map(d => [d.codigo, d]));
}
