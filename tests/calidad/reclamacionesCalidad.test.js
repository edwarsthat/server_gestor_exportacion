import { describe, test, expect } from '@jest/globals';
import request from 'supertest';
import config from '../../src/config';
const { HOST, PORT, USUARIO_PRUEBA, PASSWORD_PRUEBA } = config

// import {
//     reclamacionValida1,
//     reclamacionValida2,
//     reclamacionValida3,
//     reclamacionInvalida1,
//     reclamacionInvalida2,
//     reclamacionInvalida3
// } from "../mock/contenedores/reclamacionCalidad.mock.js";

// const casos = [
//     { data: reclamacionValida1, debePasar: true },
//     { data: reclamacionValida2, debePasar: true },
//     { data: reclamacionValida3, debePasar: true },
//     { data: reclamacionInvalida1, debePasar: false },
//     { data: reclamacionInvalida2, debePasar: false },
//     { data: reclamacionInvalida3, debePasar: false },
// ];


describe("Prueba integración Reclamaciones calidad del cliente", () => {

    let TEST_TOKEN;
    beforeAll(async () => {
        // Consigue tu token una sola vez antes de las pruebas
        const login = await request(`http://${HOST}:${PORT}`)
            .post('/login2')
            .send({
                user: USUARIO_PRUEBA,
                password: PASSWORD_PRUEBA
            });
        TEST_TOKEN = login.body.accesToken;
        expect(login.status).toBe(200);
    });

    //! tener en cuenta que se envian correos, evitar que me metan en la black list de spam
    // casos.forEach(({ data, debePasar }, idx) => {
    //     test(`Caso ${idx + 1}: ${debePasar ? "válido" : "inválido"}`, async () => {
    //         const response = await request(`http://${HOST}:${PORT}`)
    //             .post("/forms/reclamaciones_calidad")
    //             .set("Authorization", `${TEST_TOKEN}`)
    //             .send(data);

    //         if (debePasar) {
    //             expect(response.status).toBe(200); // O el status esperado para éxito
    //         } else {
    //             expect(response.status).toBeGreaterThanOrEqual(400);
    //         }
    //     });
    // });

    test("Obtener numero de reclamaciones calidad del cliente", async () => {
        const response = await request(`http://${HOST}:${PORT}`)
            .get("/calidad/get_calidad_reclamaciones_contenedores_numeroElementos")

        // 1. Status HTTP
        expect(response.status).toBe(200);

        // 2. Estructura de la respuesta
        expect(response.body).toHaveProperty("status");
        expect(response.body).toHaveProperty("message");
        expect(response.body).toHaveProperty("data");

        // 3. Validar valores
        expect(response.body.status).toBe(200);
        expect(response.body.message).toBe("Ok");
        expect(typeof response.body.data).toBe("number");
        expect(Number.isInteger(response.body.data)).toBe(true);
        expect(response.body.data).toBeGreaterThanOrEqual(0); // acepta cero o más

    })

    test("Obtener reclamaciones calidad del cliente", async () => {
        const response = await request(`http://${HOST}:${PORT}`)
            .get("/calidad/get_calidad_reclamaciones_contenedores")
            .set("Authorization", `${TEST_TOKEN}`)
            .send({ data: { page: 1 } });

        // 1. Status HTTP
        expect(response.status).toBe(200);
        // 2. Estructura de la respuesta
        expect(response.body).toBeDefined();
        expect(response.body).toHaveProperty("status");
        expect(response.body).toHaveProperty("message");
        expect(response.body).toHaveProperty("data");
        expect(response.body.message).toBe("Ok");
        // 3. Validar valores
        expect(response.body.status).toBe(200);
        expect(response.body.message).toBe("Ok");
        expect(Array.isArray(response.body.data)).toBe(true);
        expect(response.body.data).not.toBeNull();
        expect(response.body.data.length).toBeGreaterThanOrEqual(0);
    });

    test("Debe rechazar sin autorización", async () => {
        const response = await request(`http://${HOST}:${PORT}`)
            .get("/calidad/get_calidad_reclamaciones_contenedores")
            .send({ data: { page: 1 } });
        expect(response.body.status).toBeGreaterThanOrEqual(401);
    });
});