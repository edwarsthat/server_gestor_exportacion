import { testDb } from '../mongoMemoryServer.js';

/**
 * Crea un documento Cargo en la BD de test
 * @param {Object} overrides - Campos a sobrescribir
 * @returns {Promise<Document>}
 */
export async function createCargo(overrides = {}) {
    const defaults = {
        Cargo: 'Operario',
        Rol: 1,
    };
    return testDb.Cargo.create({ ...defaults, ...overrides });
}

/**
 * Inserta los cargos base usados en tests
 * @returns {Promise<Object>} Mapa por nombre de cargo { Administrador, Operario, ... }
 */
export async function seedCargos() {
    const data = [
        { Cargo: 'Administrador', Rol: 99 },
        { Cargo: 'Supervisor',    Rol: 5  },
        { Cargo: 'Operario',      Rol: 1  },
    ];

    const docs = await testDb.Cargo.insertMany(data);

    return Object.fromEntries(docs.map(d => [d.Cargo, d]));
}
