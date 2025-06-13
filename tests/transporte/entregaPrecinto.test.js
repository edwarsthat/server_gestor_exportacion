import 'dotenv/config';

import config from '../../src/config';
const { HOST, PORT, USUARIO_PRUEBA, PASSWORD_PRUEBA } = config
import { describe, test, expect } from '@jest/globals';
import request from 'supertest';
import { contenedoresEntregaPrecintoMock } from '../mock/contenedores/contenedores.mock';

let TEST_TOKEN

describe("Prueba integración entrega de precinto", () => {
    test("debería iniciar sesión con credenciales correctas", async () => {

        const response = await request(`http://${HOST}:${PORT}`)
            .post('/login2')
            .send({
                user: USUARIO_PRUEBA,
                password: PASSWORD_PRUEBA
            });
        TEST_TOKEN = response.body.accesToken
        expect(response.status).toBe(200);
    });

    const mockdata = contenedoresEntregaPrecintoMock();
    console.log(mockdata)

    test("post entrega precinto", async () => {
        const response = await request(`http://${HOST}:${PORT}`)
            .post("/transporte/post_transporte_conenedor_entregaPrecinto")
            .set("Authorization", `${TEST_TOKEN}`)
            .send(mockdata)

        console.log("response.body", response.body);
        const status = response.body.status
        expect(status).toBe(200);
    })
})