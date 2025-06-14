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

    test("post entrega precinto", async () => {
        const response = await request(`http://${HOST}:${PORT}`)
            .post("/transporte/post_transporte_conenedor_entregaPrecinto")
            .set("Authorization", `${TEST_TOKEN}`)
            .send(mockdata)

        const status = response.body.status
        expect(status).toBe(200);
    });
    test("lectura de registros", async () => {
        const response = await request(`http://${HOST}:${PORT}`)
            .get("/transporte/get_transporte_registros_entregaPrecintos")
            .set("Authorization", `${TEST_TOKEN}`)
            .send({ page: 1 })
        expect(response.body.status).toBe(200);
        expect(Array.isArray(response.body.data)).toBe(true);

        const item = response.body.data[0];
        expect(item).toHaveProperty("_id");
        expect(typeof item._id).toBe("string");

        expect(item).toHaveProperty("numeroContenedor");
        expect(typeof item.numeroContenedor).toBe("number");

        expect(item).toHaveProperty("infoContenedor");
        expect(item.infoContenedor).toHaveProperty("clienteInfo");
        expect(item.infoContenedor.clienteInfo).toHaveProperty("_id");
        expect(typeof item.infoContenedor.clienteInfo._id).toBe("string");
        expect(item.infoContenedor.clienteInfo).toHaveProperty("CLIENTE");
        expect(typeof item.infoContenedor.clienteInfo.CLIENTE).toBe("string");

        expect(item).toHaveProperty("entregaPrecinto");
        expect(item.entregaPrecinto).toHaveProperty("entrega");
        expect(typeof item.entregaPrecinto.entrega).toBe("string");
        expect(item.entregaPrecinto).toHaveProperty("recibe");
        expect(typeof item.entregaPrecinto.recibe).toBe("string");
        expect(item.entregaPrecinto).toHaveProperty("fechaEntrega");
        expect(typeof item.entregaPrecinto.fechaEntrega).toBe("string");
        expect(item.entregaPrecinto).toHaveProperty("fotos");
        expect(Array.isArray(item.entregaPrecinto.fotos)).toBe(true);
    })
    test("los registros vienen ordenados por fechaEntrega descendente", async () => {
        const response = await request(`http://${HOST}:${PORT}`)
            .get("/transporte/get_transporte_registros_entregaPrecintos")
            .set("Authorization", `${TEST_TOKEN}`)
            .send({ page: 1 });

        const fechas = response.body.data.map(
            item => new Date(item.entregaPrecinto.fechaEntrega)
        );
        const sorted = [...fechas].sort((a, b) => b - a);
        expect(fechas).toEqual(sorted);
    });
    test("sin token de autorización no se puede acceder", async () => {
        const response = await request(`http://${HOST}:${PORT}`)
            .post("/transporte/get_transporte_registros_entregaPrecintos")
            .send({ page: 1 });
        expect(response.body.status).not.toBe(200);
        // O el código/propiedad de error que devuelva tu backend
    });
    test("lectura paginacion de la pagina", async () => {
        const response = await request(`http://${HOST}:${PORT}`)
            .get("/transporte/get_transporte_registros_entregaPrecintos")
            .set("Authorization", `${TEST_TOKEN}`)
            .send({ page: 9999 });
        expect(response.body.status).toBe(200);
        expect(Array.isArray(response.body.data)).toBe(true);
        expect(response.body.data.length).toBe(0);
    });
    test("lectura de registros", async () => {
        const response = await request(`http://${HOST}:${PORT}`)
            .get("/transporte/get_transporte_registros_entregaPrecintos_numeroElementos")

        expect(response.body.status).toBe(200);
        expect(response.body.message).toBe("Ok");
        expect(typeof response.body.data).toBe("number");


    })
})