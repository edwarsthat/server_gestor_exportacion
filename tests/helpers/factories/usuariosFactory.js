import { testDb } from '../mongoMemoryServer.js';
import { createCargo } from './cargoFactory.js';

/**
 * Crea un documento Usuario en la BD de test.
 * Si no se provee `cargo`, crea uno por defecto automáticamente.
 * @param {Object} overrides - Campos a sobrescribir
 * @returns {Promise<Document>}
 */
export async function createUsuario(overrides = {}) {
    let cargoId = overrides.cargo;

    if (!cargoId) {
        const cargo = await createCargo({ Cargo: `cargo-${Date.now()}` });
        cargoId = cargo._id;
    }

    const defaults = {
        usuario:  `usuario-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        password: 'test-password',
        cargo:    cargoId,
        nombre:   'Test',
        apellido: 'Usuario',
        estado:   true,
    };

    return testDb.Usuarios.create({ ...defaults, ...overrides, cargo: cargoId });
}
