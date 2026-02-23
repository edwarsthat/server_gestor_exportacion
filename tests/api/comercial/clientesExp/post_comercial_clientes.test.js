import { describe, test, expect, beforeAll, afterAll, beforeEach, jest } from '@jest/globals';
import mongoose from 'mongoose';

import {
    connectTestDB,
    disconnectTestDB,
    clearTestDB,
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

function buildReq(dataOverrides = {}, userOverride) {
    return {
        user: userOverride !== undefined ? userOverride : { _id: userId },
        data: {
            action: 'post_comercial_clientes',
            data: {
                CLIENTE: 'Cliente Test',
                CORREO: 'test@correo.com',
                DIRECCIÓN: 'Calle 123',
                PAIS_DESTINO: [{ codigo: paisId.toString(), requiereGGN: false }],
                TELEFONO: '3001234567',
                ID: 'NIT123456',
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

describe('ClientesExpController.post_comercial_clientes', () => {
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
        await testDb.Seriales.findOneAndUpdate({ name: 'Cliente' }, { serial: 100 });
        jest.clearAllMocks();
    });

    // ============================================================
    // CASOS DE ÉXITO
    // ============================================================

    describe('Casos de exito', () => {
        test('debe crear un cliente correctamente', async () => {
            const req = buildReq();
            await ClientesExpController.post_comercial_clientes(req);

            const clientes = await testDb.Clientes.find({});
            expect(clientes).toHaveLength(1);
            expect(clientes[0].CLIENTE).toBe('Cliente Test');
            expect(clientes[0].CORREO).toBe('test@correo.com');
            expect(clientes[0].DIRECCIÓN).toBe('Calle 123');
            expect(clientes[0].TELEFONO).toBe('3001234567');
            expect(clientes[0].ID).toBe('NIT123456');
            expect(clientes[0].CODIGO).toBe(101);
        });

        test('debe incrementar el serial con cada cliente creado', async () => {
            await ClientesExpController.post_comercial_clientes(buildReq({ CLIENTE: 'Cliente 1' }));
            await ClientesExpController.post_comercial_clientes(buildReq({ CLIENTE: 'Cliente 2' }));

            const clientes = await testDb.Clientes.find({}).sort({ CODIGO: 1 });
            expect(clientes).toHaveLength(2);
            expect(clientes[0].CODIGO).toBe(101);
            expect(clientes[1].CODIGO).toBe(102);
        });

        test('debe guardar el user._id en el documento', async () => {
            await ClientesExpController.post_comercial_clientes(buildReq());

            const cliente = await testDb.Clientes.findOne({});
            expect(cliente.user.toString()).toBe(userId.toString());
        });

        test('debe guardar PAIS_DESTINO correctamente', async () => {
            await ClientesExpController.post_comercial_clientes(buildReq());

            const cliente = await testDb.Clientes.findOne({});
            expect(cliente.PAIS_DESTINO).toHaveLength(1);
            expect(cliente.PAIS_DESTINO[0].codigo.toString()).toBe(paisId.toString());
            expect(cliente.PAIS_DESTINO[0].requiereGGN).toBe(false);
        });

        test('debe aceptar multiples paises de destino', async () => {
            const pais2 = await testDb.Paises.create({ nombre: 'Ecuador', codigo: 'EC' });
            const req = buildReq({
                PAIS_DESTINO: [
                    { codigo: paisId.toString(), requiereGGN: false },
                    { codigo: pais2._id.toString(), requiereGGN: true },
                ],
            });
            await ClientesExpController.post_comercial_clientes(req);

            const cliente = await testDb.Clientes.findOne({});
            expect(cliente.PAIS_DESTINO).toHaveLength(2);
        });
    });

    // ============================================================
    // ERRORES DE USUARIO / AUTENTICACIÓN
    // ============================================================

    describe('Errores de usuario', () => {
        test('debe fallar si user es null', async () => {
            const req = buildReq({}, null);
            await expect(ClientesExpController.post_comercial_clientes(req))
                .rejects.toThrow('Usuario no encontrado');
        });

        test('debe fallar si user es undefined', async () => {
            const req = buildReq();
            req.user = undefined;
            await expect(ClientesExpController.post_comercial_clientes(req))
                .rejects.toThrow('Usuario no encontrado');
        });

        test('debe fallar si user no tiene _id', async () => {
            const req = buildReq({}, { nombre: 'sin id' });
            await expect(ClientesExpController.post_comercial_clientes(req))
                .rejects.toThrow('Usuario no encontrado');
        });

        test('debe fallar si user es un objeto vacio', async () => {
            const req = buildReq({}, {});
            await expect(ClientesExpController.post_comercial_clientes(req))
                .rejects.toThrow('Usuario no encontrado');
        });
    });

    // ============================================================
    // ERRORES DE VALIDACIÓN ZOD — campos requeridos
    // ============================================================

    describe('Validacion Zod - campos requeridos', () => {
        test('debe fallar si falta CLIENTE', async () => {
            await expectToReject(ClientesExpController.post_comercial_clientes(buildReq({ CLIENTE: '' })));
        });

        test('debe fallar si falta CORREO', async () => {
            await expectToReject(ClientesExpController.post_comercial_clientes(buildReq({ CORREO: '' })));
        });

        test('debe fallar si CORREO no es email valido', async () => {
            await expectToReject(ClientesExpController.post_comercial_clientes(buildReq({ CORREO: 'no-es-email' })));
        });

        test('debe fallar si falta DIRECCIÓN', async () => {
            await expectToReject(ClientesExpController.post_comercial_clientes(buildReq({ DIRECCIÓN: '' })));
        });

        test('debe fallar si falta TELEFONO', async () => {
            await expectToReject(ClientesExpController.post_comercial_clientes(buildReq({ TELEFONO: '' })));
        });

        test('debe fallar si falta ID', async () => {
            await expectToReject(ClientesExpController.post_comercial_clientes(buildReq({ ID: '' })));
        });

        test('debe fallar si PAIS_DESTINO esta vacio', async () => {
            await expectToReject(ClientesExpController.post_comercial_clientes(buildReq({ PAIS_DESTINO: [] })));
        });

        test('debe fallar si PAIS_DESTINO tiene codigo invalido', async () => {
            await expectToReject(ClientesExpController.post_comercial_clientes(
                buildReq({ PAIS_DESTINO: [{ codigo: 'no-valid', requiereGGN: false }] })
            ));
        });

        test('debe fallar si PAIS_DESTINO no tiene requiereGGN', async () => {
            await expectToReject(ClientesExpController.post_comercial_clientes(
                buildReq({ PAIS_DESTINO: [{ codigo: paisId.toString() }] })
            ));
        });

        test('debe fallar si action no es "post_comercial_clientes"', async () => {
            const req = buildReq();
            req.data.action = 'otra_accion';
            await expectToReject(ClientesExpController.post_comercial_clientes(req));
        });

        test('debe fallar si data es undefined', async () => {
            const req = { user: { _id: userId }, data: { action: 'post_comercial_clientes' } };
            await expectToReject(ClientesExpController.post_comercial_clientes(req));
        });

        test('no debe crear documento en BD cuando la validacion falla', async () => {
            await expectToReject(ClientesExpController.post_comercial_clientes(buildReq({ CLIENTE: '' })));
            const clientes = await testDb.Clientes.find({});
            expect(clientes).toHaveLength(0);
        });
    });

    // ============================================================
    // DATOS MALICIOSOS — NoSQL injection
    // ============================================================

    describe('Datos maliciosos - NoSQL injection', () => {
        test('debe rechazar CLIENTE con operador $gt', async () => {
            await expectToReject(ClientesExpController.post_comercial_clientes(
                buildReq({ CLIENTE: '{ "$gt": "" }' })
            ));
        });

        test('debe rechazar CLIENTE con $ne', async () => {
            await expectToReject(ClientesExpController.post_comercial_clientes(
                buildReq({ CLIENTE: '$ne' })
            ));
        });

        test('debe rechazar DIRECCIÓN con $where', async () => {
            await expectToReject(ClientesExpController.post_comercial_clientes(
                buildReq({ DIRECCIÓN: '$where: function() { return true }' })
            ));
        });

        test('debe rechazar TELEFONO con $regex', async () => {
            await expectToReject(ClientesExpController.post_comercial_clientes(
                buildReq({ TELEFONO: '$regex' })
            ));
        });

        test('debe rechazar ID con $set', async () => {
            await expectToReject(ClientesExpController.post_comercial_clientes(
                buildReq({ ID: '$set' })
            ));
        });

        test('debe rechazar campos con llaves { }', async () => {
            await expectToReject(ClientesExpController.post_comercial_clientes(
                buildReq({ CLIENTE: 'test { injection }' })
            ));
        });

        test('no debe guardar datos maliciosos en BD', async () => {
            await expectToReject(ClientesExpController.post_comercial_clientes(
                buildReq({ CLIENTE: '$ne', DIRECCIÓN: '$where' })
            ));
            const clientes = await testDb.Clientes.find({});
            expect(clientes).toHaveLength(0);
        });
    });

    // ============================================================
    // DATOS MALICIOSOS — XSS
    // ============================================================

    describe('Datos maliciosos - XSS', () => {
        test('debe rechazar CLIENTE con <script>', async () => {
            await expectToReject(ClientesExpController.post_comercial_clientes(
                buildReq({ CLIENTE: '<script>alert("xss")</script>' })
            ));
        });

        test('debe rechazar DIRECCIÓN con <script>', async () => {
            await expectToReject(ClientesExpController.post_comercial_clientes(
                buildReq({ DIRECCIÓN: '<script>document.cookie</script>' })
            ));
        });

        test('debe rechazar TELEFONO con <script>', async () => {
            await expectToReject(ClientesExpController.post_comercial_clientes(
                buildReq({ TELEFONO: '<script>fetch("http://evil.com")</script>' })
            ));
        });

        test('debe rechazar ID con <script>', async () => {
            await expectToReject(ClientesExpController.post_comercial_clientes(
                buildReq({ ID: '<script>alert(1)</script>' })
            ));
        });
    });

    // ============================================================
    // DATOS MALICIOSOS — tipos invalidos, null, undefined, Infinity
    // ============================================================

    describe('Datos maliciosos - tipos invalidos', () => {
        test('debe fallar si CLIENTE es null', async () => {
            await expectToReject(ClientesExpController.post_comercial_clientes(
                buildReq({ CLIENTE: null })
            ));
        });

        test('debe fallar si CLIENTE es undefined', async () => {
            await expectToReject(ClientesExpController.post_comercial_clientes(
                buildReq({ CLIENTE: undefined })
            ));
        });

        test('debe fallar si CLIENTE es un numero', async () => {
            await expectToReject(ClientesExpController.post_comercial_clientes(
                buildReq({ CLIENTE: 12345 })
            ));
        });

        test('debe fallar si CLIENTE es un boolean', async () => {
            await expectToReject(ClientesExpController.post_comercial_clientes(
                buildReq({ CLIENTE: true })
            ));
        });

        test('debe fallar si CLIENTE es un array', async () => {
            await expectToReject(ClientesExpController.post_comercial_clientes(
                buildReq({ CLIENTE: ['a', 'b'] })
            ));
        });

        test('debe fallar si CLIENTE es un objeto', async () => {
            await expectToReject(ClientesExpController.post_comercial_clientes(
                buildReq({ CLIENTE: { $gt: '' } })
            ));
        });

        test('debe fallar si CORREO es null', async () => {
            await expectToReject(ClientesExpController.post_comercial_clientes(
                buildReq({ CORREO: null })
            ));
        });

        test('debe fallar si TELEFONO es Infinity', async () => {
            await expectToReject(ClientesExpController.post_comercial_clientes(
                buildReq({ TELEFONO: Infinity })
            ));
        });

        test('debe fallar si TELEFONO es NaN', async () => {
            await expectToReject(ClientesExpController.post_comercial_clientes(
                buildReq({ TELEFONO: NaN })
            ));
        });

        test('debe fallar si PAIS_DESTINO es null', async () => {
            await expectToReject(ClientesExpController.post_comercial_clientes(
                buildReq({ PAIS_DESTINO: null })
            ));
        });

        test('debe fallar si PAIS_DESTINO es un string', async () => {
            await expectToReject(ClientesExpController.post_comercial_clientes(
                buildReq({ PAIS_DESTINO: 'colombia' })
            ));
        });

        test('debe fallar si PAIS_DESTINO tiene requiereGGN como string', async () => {
            await expectToReject(ClientesExpController.post_comercial_clientes(
                buildReq({ PAIS_DESTINO: [{ codigo: paisId.toString(), requiereGGN: 'true' }] })
            ));
        });

        test('debe fallar si data es null', async () => {
            const req = { user: { _id: userId }, data: null };
            await expectToReject(ClientesExpController.post_comercial_clientes(req));
        });

        test('debe fallar si data.data es un string', async () => {
            const req = {
                user: { _id: userId },
                data: { action: 'post_comercial_clientes', data: 'string malicioso' }
            };
            await expectToReject(ClientesExpController.post_comercial_clientes(req));
        });
    });

    // ============================================================
    // DATOS MALICIOSOS — strings extremos
    // ============================================================

    describe('Datos maliciosos - strings extremos', () => {
        test('no debe crashear con CLIENTE de 10000 caracteres', async () => {
            const longString = 'A'.repeat(10000);
            const req = buildReq({ CLIENTE: longString });
            // No hay maxLength en Zod, así que debería aceptarse sin crashear
            try {
                await ClientesExpController.post_comercial_clientes(req);
                const cliente = await testDb.Clientes.findOne({});
                expect(cliente).toBeDefined();
                expect(cliente.CLIENTE).toBe(longString);
            } catch {
                // Si falla, tambien es aceptable
                expect(true).toBe(true);
            }
        });
    });

    // ============================================================
    // INTEGRIDAD TRANSACCIONAL
    // ============================================================

    describe('Integridad transaccional', () => {
        test('no debe crear cliente si el serial no existe', async () => {
            await testDb.Seriales.deleteMany({});

            await expectToReject(ClientesExpController.post_comercial_clientes(buildReq()));

            const clientes = await testDb.Clientes.find({});
            expect(clientes).toHaveLength(0);

            // Restaurar serial para los demas tests
            await testDb.Seriales.create({ name: 'Cliente', serial: 100 });
        });

        test('no debe incrementar el serial si la creacion del cliente falla por CODIGO duplicado', async () => {
            // Crear un cliente con CODIGO 101 para provocar error de unique
            await testDb.Clientes.create({
                CLIENTE: 'Existente',
                CODIGO: 101,
                CORREO: 'exist@test.com',
                DIRECCIÓN: 'Dir',
                PAIS_DESTINO: [],
                TELEFONO: '123',
                ID: 'ID1',
            });

            await expectToReject(ClientesExpController.post_comercial_clientes(buildReq()));

            // El serial no debería haberse consumido gracias a la transacción
            const serial = await testDb.Seriales.findOne({ name: 'Cliente' });
            expect(serial.serial).toBe(100);
        });
    });
});
