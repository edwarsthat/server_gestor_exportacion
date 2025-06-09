import config from '../../src/config';
const { HOST, PORT, USUARIO_PRUEBA, PASSWORD_PRUEBA } = config;
import { describe, test, expect, beforeAll } from '@jest/globals';
import request from 'supertest';

let TEST_TOKEN = "";

describe("Pruebas de integración: inventarios - desverdizado", () => {
    beforeAll(async () => {
        const response = await request(`http://${HOST}:${PORT}`)
            .post('/login2')
            .send({
                user: USUARIO_PRUEBA,
                password: PASSWORD_PRUEBA
            });

        expect(response.status).toBe(200);
        TEST_TOKEN = response.body.accesToken;
        expect(TEST_TOKEN).toBeDefined();
    });

    test("Debe obtener los cuartos de desverdizado en el formato esperado", async () => {
        const response = await request(`http://${HOST}:${PORT}`)
            .get("/dataSys/get_data_cuartosDesverdizados")
            .set("Authorization", `Bearer ${TEST_TOKEN}`); // <-- asegúrate que tu backend espera esto

        expect(response.status).toBe(200);

        const data = response.body;

        // Validación básica: ¿es un arreglo?
        expect(Array.isArray(data.data)).toBe(true);

        if (data.length > 0) {
            // Validación de la estructura de cada objeto
            const cuarto = data[0];
            expect(cuarto).toHaveProperty("nombre");
            expect(typeof cuarto.nombre).toBe("string");

        }
    });
});
