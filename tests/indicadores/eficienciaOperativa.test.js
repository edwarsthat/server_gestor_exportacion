import 'dotenv/config';

import config from '../../src/config';
const { HOST, PORT, USUARIO_PRUEBA, PASSWORD_PRUEBA } = config
import { describe, test, expect } from '@jest/globals';
import request from 'supertest';

let TEST_TOKEN

describe("Prueba integración indicadoresProceso", () => {
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
    test("lectura de registros", async () => {
        const response = await request(`http://${HOST}:${PORT}`)
            .get("/indicadores/get_indicadores_operaciones_eficienciaOperativa")
            .set("Authorization", `${TEST_TOKEN}`)
            .send({ page: 1 })
        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty("status", 200);
        expect(response.body).toHaveProperty("message", "Ok");
        expect(Array.isArray(response.body.data)).toBe(true);

        if (response.body.data.length > 0) {
            const item = response.body.data[0];

            expect(item).toHaveProperty("_id");
            expect(typeof item._id).toBe("string");

            expect(item).toHaveProperty("fecha_creacion");
            expect(typeof item.fecha_creacion).toBe("string");

            if (item.kilos_procesados !== undefined) {
                expect(item).toHaveProperty("kilos_procesados");
                expect(typeof item.kilos_procesados).toBe("object");
            }
            if (item.kilos_vaciados !== undefined) {
                expect(item).toHaveProperty("kilos_vaciados");
                expect(typeof item.kilos_vaciados).toBe("object");
            }

            expect(item).toHaveProperty("kilos_meta_hora");
            expect(typeof item.kilos_meta_hora).toBe("number");

            expect(item).toHaveProperty("duracion_turno_horas");
            expect(typeof item.duracion_turno_horas).toBe("number");

        }
    });
    it("debería cumplir con las restricciones de dominio en los datos", async () => {
        const response = await request(`http://${HOST}:${PORT}`)
            .get("/indicadores/get_indicadores_operaciones_eficienciaOperativa")
            .set("Authorization", `${TEST_TOKEN}`)
            .send({ page: 1 })

        expect(response.status).toBe(200);
        expect(Array.isArray(response.body.data)).toBe(true);

        response.body.data.forEach((item) => {
            // fecha_creacion debe ser una fecha válida
            expect(typeof item.fecha_creacion).toBe("string");
            const fecha = Date.parse(item.fecha_creacion);
            expect(isNaN(fecha)).toBe(false);

            // kilos_procesados debe ser un objeto y sus valores >= 0
            // expect(typeof item.kilos_procesados).toBe("object");
            // Object.values(item.kilos_procesados).forEach(valor => {
            //     expect(typeof valor).toBe("number");
            //     expect(valor).toBeGreaterThanOrEqual(0);
            // });

            // kilos_vaciados debe ser un objeto y sus valores >= 0 (si existe)
            if (item.kilos_vaciados !== undefined) {
                expect(typeof item.kilos_vaciados).toBe("object");
                Object.values(item.kilos_vaciados).forEach(valor => {
                    expect(typeof valor).toBe("number");
                    expect(valor).toBeGreaterThanOrEqual(0);
                });
            }

            // meta_kilos_procesados (si existe)
            if (item.kilos_procesados !== undefined) {
                expect(typeof item.kilos_procesados).toBe("object");
                Object.values(item.kilos_procesados).forEach(valor => {
                    expect(typeof valor).toBe("number");
                    expect(valor).toBeGreaterThanOrEqual(0);
                });
            }

            // meta_kilos_procesados_hora
            expect(typeof item.meta_kilos_procesados).toBe("number");
            expect(item.meta_kilos_procesados).toBeGreaterThanOrEqual(0);

            // meta_kilos_procesados_hora
            expect(typeof item.kilos_meta_hora).toBe("number");
            expect(item.kilos_meta_hora).toBeGreaterThanOrEqual(0);

            // kilos_meta_hora
            expect(typeof item.duracion_turno_horas).toBe("number");
            expect(item.duracion_turno_horas).toBeGreaterThanOrEqual(0);

        });
    });
    it("debería rechazar la petición si no se envía el token de autorización", async () => {
        const response = await request(`http://${HOST}:${PORT}`)
            .get("/indicadores/get_indicadores_operaciones_eficienciaOperativa"); // NO se envía .set("Authorization", ...)

        console.log(response.body)
        expect(response.body.status).toBe(405); // O el código que uses, puede ser 401 o 403
        expect(response.body).toHaveProperty("message");
    });
    test("lectura de registros", async () => {
        const response = await request(`http://${HOST}:${PORT}`)
            .get("/indicadores/get_indicadores_proceso_numero_items")
            .send({ page: 9999 });
        expect(response.body.status).toBe(200);
        expect(typeof response.body.data).toBe("number");
    });
});