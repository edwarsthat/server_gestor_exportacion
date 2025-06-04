const { describe, test, expect } = require('@jest/globals');
const request = require('supertest');
const { HOST, PORT, USUARIO_PRUEBA, PASSWORD_PRUEBA } = require('../../src/config');

describe("Prueba integración /login2", () => {
    test("debería iniciar sesión con credenciales correctas", async () => {

        const response = await request(`http://${HOST}:${PORT}`)
            .post('/login2')
            .send({
                user: USUARIO_PRUEBA,
                password: PASSWORD_PRUEBA
            });
        expect(response.status).toBe(200);
    });

});