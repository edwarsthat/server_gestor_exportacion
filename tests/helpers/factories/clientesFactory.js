import { testDb } from '../mongoMemoryServer.js';
import { createPais } from './paisesFactory.js';
import { createUsuario } from './usuariosFactory.js';

let _codigoCounter = 1000;

/**
 * Crea un documento Cliente en la BD de test.
 * Si no se proveen `PAIS_DESTINO` ni `user`, los crea automáticamente.
 *
 * @param {Object} overrides - Campos a sobrescribir
 * @param {Object} options
 * @param {boolean} options.withUser   - Si crear un usuario relacionado (default: false)
 * @returns {Promise<Document>}
 */
export async function createCliente(overrides = {}, { withUser = false } = {}) {
    let paisDestino = overrides.PAIS_DESTINO;

    if (!paisDestino) {
        const pais = await createPais({
            nombre: `Pais-${Date.now()}`,
            codigo: `P${Date.now()}`,
        });
        paisDestino = [{ codigo: pais._id, requiereGGN: false }];
    }

    let userId = overrides.user;
    if (!userId && withUser) {
        const usuario = await createUsuario();
        userId = usuario._id;
    }

    const defaults = {
        CLIENTE:      'Cliente Test',
        CODIGO:       _codigoCounter++,
        PAIS_DESTINO: paisDestino,
        activo:       true,
        ...(userId && { user: userId }),
    };

    return testDb.Clientes.create({ ...defaults, ...overrides, PAIS_DESTINO: paisDestino });
}
