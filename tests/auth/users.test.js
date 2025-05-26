const { describe, test, expect } = require('@jest/globals');
const request = require('supertest');
const { HOST, PORT, USUARIO_PRUEBA, PASSWORD_PRUEBA } = require('../../src/config');

describe("Prueba integración /login2", () => {
    test("debería iniciar sesión con credenciales correctas", async () => {

        const response = await request(`http://${HOST}:${PORT}`)
            .post('/login2')
            .send({
                username: USUARIO_PRUEBA,
                password: PASSWORD_PRUEBA
            });
        console.log("Response:", response.body);
        expect(response.status).toBe(200);
    });

});