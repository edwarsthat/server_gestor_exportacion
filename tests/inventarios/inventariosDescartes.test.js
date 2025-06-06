import 'dotenv/config';

import config from '../../src/config';
const { HOST, PORT, USUARIO_PRUEBA, PASSWORD_PRUEBA } = config
import { describe, test, expect } from '@jest/globals';
import request from 'supertest';
import fs from 'fs/promises';
const raw = await fs.readFile(new URL('../../constants/tipo_fruta.json', import.meta.url), 'utf-8');
const tipoFrutas = JSON.parse(raw);
let TEST_TOKEN

describe("Prueba integración inventarios Descartes", () => {
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
    test("Prueba estructura del inventario de descarte", async () => {
        const response = await request(`http://${HOST}:${PORT}`)
            .get("/inventarios/get_inventarios_frutaDescarte_fruta")
            .set("Authorization", `${TEST_TOKEN}`);

        const data = response.body

        expect(data.status).toBe(200);
        expect(Object.keys(data.data)).toEqual(expect.arrayContaining(tipoFrutas));
        Object.values(data.data).forEach(item =>
            expect(Object.keys(item)).toEqual(expect.arrayContaining(["descarteLavado", "descarteEncerado"]))
        )
    });
    test("Prueba reiniciar inventario descarte", async () => {
        const response = await request(`http://${HOST}:${PORT}`)
            .patch("/inventarios/sys_reiniciar_inventario_descarte")
            .set("Authorization", `${TEST_TOKEN}`);

        const data = response.body
        expect(data.status).toBe(200);
        const responseInventario = await request(`http://${HOST}:${PORT}`)
            .get("/inventarios/get_inventarios_frutaDescarte_fruta")
            .set("Authorization", `${TEST_TOKEN}`);

        const data2 = responseInventario.body

        expect(data2.status).toBe(200);
        expect(Object.keys(data2.data)).toEqual(expect.arrayContaining(tipoFrutas));
        Object.values(data2.data).forEach(tipoInventario => {
            Object.values(tipoInventario).forEach(tipoDescarte => {
                Object.values(tipoDescarte).forEach(valor =>
                    expect(Number(valor)).toBe(0)
                );
            });
        });
    })
    test("Prueba agregar elementos al inventario descartes", async () => {
        const inventario = {
            "descarteLavado:descarteGeneral": 100,
            "descarteLavado:pareja": 200,
            "descarteLavado:balin": 300,
            "descarteEncerado:descarteGeneral": 400,
            "descarteEncerado:pareja": 500,
            "descarteEncerado:balin": 600,
            "descarteEncerado:extra": 700,
            "descarteEncerado:suelo": 800,
            "descarteEncerado:frutaNacional": 900,
        }
        const tipoFruta = "Limon"

        const response = await request(`http://${HOST}:${PORT}`)
            .put("/inventarios/sys_add_inventarios_descarte")
            .set("Authorization", `${TEST_TOKEN}`)
            .send({
                inventario,
                tipoFruta
            })

        const status = response.body.status
        expect(status).toBe(200);

        const responseInventario = await request(`http://${HOST}:${PORT}`)
            .get("/inventarios/get_inventarios_frutaDescarte_fruta")
            .set("Authorization", `${TEST_TOKEN}`);

        const statusInv = responseInventario.body.status
        expect(statusInv).toBe(200);

        // --- Aquí comienza la validación de los valores seteados ---
        const data = responseInventario.body.data;
        // Estructura: { tipoFruta: { descarteLavado: { ... }, descarteEncerado: { ... } } }

        // Solo validamos "Limon"
        const inventarioLimon = data[tipoFruta];
        expect(inventarioLimon).toBeDefined();

        // Mapear los nombres del inventario recibido
        const esperado = {
            descarteLavado: {
                descarteGeneral: 100,
                pareja: 200,
                balin: 300
            },
            descarteEncerado: {
                descarteGeneral: 400,
                pareja: 500,
                balin: 600,
                extra: 700,
                suelo: 800,
                frutaNacional: 900
            }
        };

        // Validar cada campo uno a uno
        Object.entries(esperado).forEach(([tipoDescarte, items]) => {
            expect(inventarioLimon[tipoDescarte]).toBeDefined();
            Object.entries(items).forEach(([item, valorEsperado]) => {
                // Redis puede devolver strings, así que casteamos
                expect(Number(inventarioLimon[tipoDescarte][item] || 0)).toBe(valorEsperado);
            });
        });

    })
    test("Prueba reproceso descarte", async () => {
        const data = {
            tipoFruta: "Limon",
            "descarteLavado:descarteGeneral": "5",
            "descarteLavado:pareja": "4",
            "descarteLavado:balin": "3",
            "descarteEncerado:descarteGeneral": "10",
            "descarteEncerado:pareja": "11",
            "descarteEncerado:balin": "12",
            "descarteEncerado:extra": "13",
            "descarteEncerado:suelo": "14",
            "descarteEncerado:frutaNacional": "15",
        }

        const response = await request(`http://${HOST}:${PORT}`)
            .put("/inventarios/put_inventarios_frutaDescarte_reprocesarFruta")
            .set("Authorization", `${TEST_TOKEN}`)
            .send({ data })

        const status = response.body.status
        expect(status).toBe(200);

        const responseInventario = await request(`http://${HOST}:${PORT}`)
            .get("/inventarios/get_inventarios_frutaDescarte_fruta")
            .set("Authorization", `${TEST_TOKEN}`);

        const statusInv = responseInventario.body.status
        expect(statusInv).toBe(200);

        // --- Aquí comienza la validación de los valores seteados ---
        const responseInv = responseInventario.body.data;
        // Estructura: { tipoFruta: { descarteLavado: { ... }, descarteEncerado: { ... } } }

        // Solo validamos "Limon"
        const inventarioLimon = responseInv["Limon"];
        expect(inventarioLimon).toBeDefined();

        // Mapear los nombres del inventario recibido
        const esperado = {
            descarteLavado: {
                descarteGeneral: 95,
                pareja: 196,
                balin: 297
            },
            descarteEncerado: {
                descarteGeneral: 390,
                pareja: 489,
                balin: 588,
                extra: 687,
                suelo: 786,
                frutaNacional: 885
            }
        };

        // Validar cada campo uno a uno
        Object.entries(esperado).forEach(([tipoDescarte, items]) => {
            expect(inventarioLimon[tipoDescarte]).toBeDefined();
            Object.entries(items).forEach(([item, valorEsperado]) => {
                // Redis puede devolver strings, así que casteamos
                expect(Number(inventarioLimon[tipoDescarte][item] || 0)).toBe(valorEsperado);
            });
        });

        const responseLote = await request(`http://${HOST}:${PORT}`)
            .get("/inventarios/get_inventarios_lotes_infoLotes")
            .set("Authorization", `${TEST_TOKEN}`)
            .send({
                _id: response.body.data,
                EF: '',
                GGN: false,
                all: true,
                fechaFin: '',
                fechaInicio: '',
                proveedor: '',
                tipoFecha: '',
                tipoFruta: '',
                action: "get_inventarios_lotes_infoLotes",
                buscar: ""
            })

        const statusLote = responseLote.body.status
        expect(statusLote).toBe(200);
        const lote = responseLote.body.data.lotes[0]

        expect(lote._id).toBe(response.body.data);
        expect(lote.kilos).toBe(87);
        expect(lote.kilosVaciados).toBe(87);


    })
    test("Prueba despacho descarte", async () => {
        await request(`http://${HOST}:${PORT}`)
            .patch("/inventarios/sys_reiniciar_inventario_descarte")
            .set("Authorization", `${TEST_TOKEN}`);

        const inventario = {
            "descarteLavado:descarteGeneral": 50,
            "descarteLavado:pareja": 50,
            "descarteLavado:balin": 50,
            "descarteEncerado:descarteGeneral": 50,
            "descarteEncerado:pareja": 50,
            "descarteEncerado:balin": 50,
            "descarteEncerado:extra": 50,
            "descarteEncerado:suelo": 50,
            "descarteEncerado:frutaNacional": 50,
        }
        const tipoFruta = "Limon"

        await request(`http://${HOST}:${PORT}`)
            .put("/inventarios/sys_add_inventarios_descarte")
            .set("Authorization", `${TEST_TOKEN}`)
            .send({
                inventario,
                tipoFruta
            })

        const response = await request(`http://${HOST}:${PORT}`)
            .put("/inventarios/put_inventarios_frutaDescarte_despachoDescarte")
            .set("Authorization", `${TEST_TOKEN}`)
            .send({
                data: {
                    cliente: "67f92245ebb75c1a966e7a9a",
                    placa: "KDK780",
                    nombreConductor: "Alonso",
                    telefono: "777888999",
                    cedula: "1094942882",
                    remision: "ac150",
                    kilos: 360,
                },
                inventario: {
                    tipoFruta: "Limon",
                    "descarteLavado:descarteGeneral": "40",
                    "descarteLavado:pareja": "40",
                    "descarteLavado:balin": "40",
                    "descarteEncerado:descarteGeneral": "40",
                    "descarteEncerado:pareja": "40",
                    "descarteEncerado:balin": "40",
                    "descarteEncerado:extra": "40",
                    "descarteEncerado:suelo": "40",
                    "descarteEncerado:frutaNacional": "40",
                }
            })

        const data = response.body
        expect(data.status).toBe(200);
        expect(data.data.placa).toBe("KDK780");
        expect(data.data.remision).toBe("ac150");
        expect(data.data.nombreConductor).toBe("Alonso");


        const responseInventario = await request(`http://${HOST}:${PORT}`)
            .get("/inventarios/get_inventarios_frutaDescarte_fruta")
            .set("Authorization", `${TEST_TOKEN}`);

        const statusInv = responseInventario.body.status
        expect(statusInv).toBe(200);

        const responseErr = await request(`http://${HOST}:${PORT}`)
            .put("/inventarios/put_inventarios_frutaDescarte_despachoDescarte")
            .set("Authorization", `${TEST_TOKEN}`)
            .send({
                data: {
                    cliente: "67f92245ebb75c1a966e7a9a",
                    placa: "KDK780",
                    nombreConductor: "Alberto",
                    telefono: "777888999",
                    cedula: "1094942882",
                    remision: "ac150",
                    kilos: 360,
                },
                inventario: {
                    tipoFruta: "Limon",
                    "descarteLavado:descarteGeneral": "40",
                    "descarteLavado:pareja": "40",
                    "descarteLavado:balin": "40",
                    "descarteEncerado:descarteGeneral": "40",
                    "descarteEncerado:pareja": "40",
                    "descarteEncerado:balin": "40",
                    "descarteEncerado:extra": "40",
                    "descarteEncerado:suelo": "40",
                    "descarteEncerado:frutaNacional": "40",
                }
            })

        const dataErr = responseErr.body
        expect(dataErr.status).toBe(470);

        const responseErr2 = await request(`http://${HOST}:${PORT}`)
            .put("/inventarios/put_inventarios_frutaDescarte_despachoDescarte")
            .set("Authorization", `${TEST_TOKEN}`)
            .send({
                data: {
                    cliente: "67f92245ebb75c1a966e7a9a",
                    placa: "KDK780",
                    nombreConductor: "Alberto",
                    telefono: "777888999",
                    cedula: "1094942882",
                    remision: "ac150",
                    kilos: 360,
                },
                inventario: {
                    tipoFruta: "Limon",
                    "descarteLavado:descarteGeneral": "40.5",
                    "descarteLavado:pareja": "40.5",
                    "descarteLavado:balin": "40.5",
                    "descarteEncerado:descarteGeneral": "40.5",
                    "descarteEncerado:pareja": "40",
                    "descarteEncerado:balin": "40",
                    "descarteEncerado:extra": "40",
                    "descarteEncerado:suelo": "40",
                    "descarteEncerado:frutaNacional": "40",
                }
            })

        const dataErr2 = responseErr2.body
        expect(dataErr2.status).toBe(470);



        // --- Aquí comienza la validación de los valores seteados ---
        const responseInv = responseInventario.body.data;
        // Estructura: { tipoFruta: { descarteLavado: { ... }, descarteEncerado: { ... } } }

        // Solo validamos "Limon"
        const inventarioLimon = responseInv["Limon"];
        expect(inventarioLimon).toBeDefined();

        // Mapear los nombres del inventario recibido
        const esperado = {
            descarteLavado: {
                descarteGeneral: 10,
                pareja: 10,
                balin: 10
            },
            descarteEncerado: {
                descarteGeneral: 10,
                pareja: 10,
                balin: 10,
                extra: 10,
                suelo: 10,
                frutaNacional: 10
            }
        };

        // Validar cada campo uno a uno
        Object.entries(esperado).forEach(([tipoDescarte, items]) => {
            expect(inventarioLimon[tipoDescarte]).toBeDefined();
            Object.entries(items).forEach(([item, valorEsperado]) => {
                // Redis puede devolver strings, así que casteamos
                expect(Number(inventarioLimon[tipoDescarte][item] || 0)).toBe(valorEsperado);
            });
        });
    })
    test("Prueba ingreso fruta descompuesta", async () => {
        await request(`http://${HOST}:${PORT}`)
            .patch("/inventarios/sys_reiniciar_inventario_descarte")
            .set("Authorization", `${TEST_TOKEN}`);

        const inventario = {
            "descarteLavado:descarteGeneral": 50,
            "descarteLavado:pareja": 50,
            "descarteLavado:balin": 50,
            "descarteEncerado:descarteGeneral": 50,
            "descarteEncerado:pareja": 50,
            "descarteEncerado:balin": 50,
            "descarteEncerado:extra": 50,
            "descarteEncerado:suelo": 50,
            "descarteEncerado:frutaNacional": 50,
        }
        const tipoFruta = "Limon"

        await request(`http://${HOST}:${PORT}`)
            .put("/inventarios/sys_add_inventarios_descarte")
            .set("Authorization", `${TEST_TOKEN}`)
            .send({
                inventario,
                tipoFruta
            })

        const response = await request(`http://${HOST}:${PORT}`)
            .put("/inventarios/post_inventarios_frutaDescarte_frutaDescompuesta")
            .set("Authorization", `${TEST_TOKEN}`)
            .send({
                data: {
                    razon: "prueba de integracion",
                    comentario_adicional: "Es una prueba de integracion",
                },
                inventario: {
                    tipoFruta: "Limon",
                    "descarteLavado:descarteGeneral": "40",
                    "descarteLavado:pareja": "40",
                    "descarteLavado:balin": "40",
                    "descarteEncerado:descarteGeneral": "40",
                    "descarteEncerado:pareja": "40",
                    "descarteEncerado:balin": "40",
                    "descarteEncerado:extra": "40",
                    "descarteEncerado:suelo": "40",
                    "descarteEncerado:frutaNacional": "40",
                }
            })
        const data = response.body
        expect(data.status).toBe(200);
        expect(data.data.razon).toBe("prueba de integracion");

        const responseErr = await request(`http://${HOST}:${PORT}`)
            .put("/inventarios/post_inventarios_frutaDescarte_frutaDescompuesta")
            .set("Authorization", `${TEST_TOKEN}`)
            .send({
                data: {
                    razon: "prueba de integracion",
                    comentario_adicional: "Es una prueba de integracion",
                },
                inventario: {
                    tipoFruta: "Limon",
                    "descarteLavado:descarteGeneral": "40",
                    "descarteLavado:pareja": "40",
                    "descarteLavado:balin": "40",
                    "descarteEncerado:descarteGeneral": "40",
                    "descarteEncerado:pareja": "40",
                    "descarteEncerado:balin": "40",
                    "descarteEncerado:extra": "40",
                    "descarteEncerado:suelo": "40",
                    "descarteEncerado:frutaNacional": "40",
                }
            })

        const dataErr = responseErr.body
        expect(dataErr.status).toBe(470);

        const responseInventario = await request(`http://${HOST}:${PORT}`)
            .get("/inventarios/get_inventarios_frutaDescarte_fruta")
            .set("Authorization", `${TEST_TOKEN}`);

        const statusInv = responseInventario.body.status
        expect(statusInv).toBe(200);

        // --- Aquí comienza la validación de los valores seteados ---
        const responseInv = responseInventario.body.data;
        // Estructura: { tipoFruta: { descarteLavado: { ... }, descarteEncerado: { ... } } }

        // Solo validamos "Limon"
        const inventarioLimon = responseInv["Limon"];
        expect(inventarioLimon).toBeDefined();

        // Mapear los nombres del inventario recibido
        const esperado = {
            descarteLavado: {
                descarteGeneral: 10,
                pareja: 10,
                balin: 10
            },
            descarteEncerado: {
                descarteGeneral: 10,
                pareja: 10,
                balin: 10,
                extra: 10,
                suelo: 10,
                frutaNacional: 10
            }
        };

        // Validar cada campo uno a uno
        Object.entries(esperado).forEach(([tipoDescarte, items]) => {
            expect(inventarioLimon[tipoDescarte]).toBeDefined();
            Object.entries(items).forEach(([item, valorEsperado]) => {
                // Redis puede devolver strings, así que casteamos
                expect(Number(inventarioLimon[tipoDescarte][item] || 0)).toBe(valorEsperado);
            });
        });
    })
    test("Modificar registro despacho fruta", async () => {
        await request(`http://${HOST}:${PORT}`)
            .patch("/inventarios/sys_reiniciar_inventario_descarte")
            .set("Authorization", `${TEST_TOKEN}`);

        const inventario = {
            "descarteLavado:descarteGeneral": 50,
            "descarteLavado:pareja": 50,
            "descarteLavado:balin": 50,
            "descarteEncerado:descarteGeneral": 50,
            "descarteEncerado:pareja": 50,
            "descarteEncerado:balin": 50,
            "descarteEncerado:extra": 50,
            "descarteEncerado:suelo": 50,
            "descarteEncerado:frutaNacional": 50,
        }
        const tipoFruta = "Limon"

        await request(`http://${HOST}:${PORT}`)
            .put("/inventarios/sys_add_inventarios_descarte")
            .set("Authorization", `${TEST_TOKEN}`)
            .send({
                inventario,
                tipoFruta
            })

        const response = await request(`http://${HOST}:${PORT}`)
            .put("/inventarios/put_inventarios_frutaDescarte_despachoDescarte")
            .set("Authorization", `${TEST_TOKEN}`)
            .send({
                data: {
                    cliente: "67f92245ebb75c1a966e7a9a",
                    placa: "KDK780",
                    nombreConductor: "Alberto",
                    telefono: "777888999",
                    cedula: "1094942882",
                    remision: "ac150",
                    kilos: 360,
                },
                inventario: {
                    tipoFruta: "Limon",
                    "descarteLavado:descarteGeneral": "40",
                    "descarteLavado:pareja": "40",
                    "descarteLavado:balin": "40",
                    "descarteEncerado:descarteGeneral": "40",
                    "descarteEncerado:pareja": "40",
                    "descarteEncerado:balin": "40",
                    "descarteEncerado:extra": "40",
                    "descarteEncerado:suelo": "40",
                    "descarteEncerado:frutaNacional": "40",
                }
            })

        const data = response.body
        expect(data.status).toBe(200);
        expect(data.data.placa).toBe("KDK780");
        expect(data.data.remision).toBe("ac150");
        expect(data.data.nombreConductor).toBe("Alberto");

        const modifyResponse = await request(`http://${HOST}:${PORT}`)
            .put("/inventarios/put_inventarios_historiales_despachoDescarte")
            .set("Authorization", `${TEST_TOKEN}`)
            .send({
                data: {
                    cliente: "67f92245ebb75c1a966e7a9a",
                    placa: "KDK780",
                    nombreConductor: "Jaime",
                    telefono: "777888999",
                    cedula: "1094942882",
                    remision: "ac150",
                    kilos: 180,
                    tipoFruta: "Limon",
                    "descarteLavado.descarteGeneral": "20",
                    "descarteLavado.pareja": "20",
                    "descarteLavado.balin": "20",
                    "descarteEncerado.descarteGeneral": "20",
                    "descarteEncerado.pareja": "20",
                    "descarteEncerado.balin": "20",
                    "descarteEncerado.extra": "20",
                    "descarteEncerado.suelo": "20",
                    "descarteEncerado.frutaNacional": "20",
                },
                _id: data.data._id,
                action: "put_inventarios_historiales_despachoDescarte"
            })

        const dataM = modifyResponse.body
        expect(dataM.status).toBe(200);

        const modifyErrResponse = await request(`http://${HOST}:${PORT}`)
            .put("/inventarios/put_inventarios_historiales_despachoDescarte")
            .set("Authorization", `${TEST_TOKEN}`)
            .send({
                data: {
                    cliente: "67f92245ebb75c1a966e7a9a",
                    placa: "KDK780",
                    nombreConductor: "Jaime",
                    telefono: "777888999",
                    cedula: "1094942882",
                    remision: "ac150",
                    kilos: 180,
                    tipoFruta: "Naranja",
                    "descarteLavado.descarteGeneral": "20",
                    "descarteLavado.pareja": "20",
                    "descarteLavado.balin": "20",
                    "descarteEncerado.descarteGeneral": "20",
                    "descarteEncerado.pareja": "20",
                    "descarteEncerado.balin": "20",
                    "descarteEncerado.extra": "20",
                    "descarteEncerado.suelo": "20",
                    "descarteEncerado.frutaNacional": "20",
                },
                _id: data.data._id,
                action: "put_inventarios_historiales_despachoDescarte"
            })

        const modifyErr = modifyErrResponse.body
        expect(modifyErr.status).toBe(470);


        const modifyErrResponse2 = await request(`http://${HOST}:${PORT}`)
            .put("/inventarios/put_inventarios_historiales_despachoDescarte")
            .set("Authorization", `${TEST_TOKEN}`)
            .send({
                data: {
                    cliente: "67f92245ebb75c1a966e7a9a",
                    placa: "KDK780",
                    nombreConductor: "Jaime",
                    telefono: "777888999",
                    cedula: "1094942882",
                    remision: "ac150",
                    kilos: 630,
                    tipoFruta: "Limon",
                    "descarteLavado.descarteGeneral": "70",
                    "descarteLavado.pareja": "70",
                    "descarteLavado.balin": "70",
                    "descarteEncerado.descarteGeneral": "70",
                    "descarteEncerado.pareja": "70",
                    "descarteEncerado.balin": "70",
                    "descarteEncerado.extra": "70",
                    "descarteEncerado.suelo": "70",
                    "descarteEncerado.frutaNacional": "70",
                },
                _id: data.data._id,
                action: "put_inventarios_historiales_despachoDescarte"
            })

        const modifyErr2 = modifyErrResponse2.body
        expect(modifyErr2.status).toBe(470);


        const responseInventario = await request(`http://${HOST}:${PORT}`)
            .get("/inventarios/get_inventarios_frutaDescarte_fruta")
            .set("Authorization", `${TEST_TOKEN}`);

        const statusInv = responseInventario.body.status
        expect(statusInv).toBe(200);

        // --- Aquí comienza la validación de los valores seteados ---
        const responseInv = responseInventario.body.data;
        // Estructura: { tipoFruta: { descarteLavado: { ... }, descarteEncerado: { ... } } }

        // Solo validamos "Limon"
        const inventarioLimon = responseInv["Limon"];
        expect(inventarioLimon).toBeDefined();

        // Mapear los nombres del inventario recibido
        const esperado = {
            descarteLavado: {
                descarteGeneral: 30,
                pareja: 30,
                balin: 30
            },
            descarteEncerado: {
                descarteGeneral: 30,
                pareja: 30,
                balin: 30,
                extra: 30,
                suelo: 30,
                frutaNacional: 30
            }
        };

        // Validar cada campo uno a uno
        Object.entries(esperado).forEach(([tipoDescarte, items]) => {
            expect(inventarioLimon[tipoDescarte]).toBeDefined();
            Object.entries(items).forEach(([item, valorEsperado]) => {
                // Redis puede devolver strings, así que casteamos
                expect(Number(inventarioLimon[tipoDescarte][item] || 0)).toBe(valorEsperado);
            });
        });



    })
    test("Modificar registro fruta descompuesta", async () => {
        await request(`http://${HOST}:${PORT}`)
            .patch("/inventarios/sys_reiniciar_inventario_descarte")
            .set("Authorization", `${TEST_TOKEN}`);

        const inventario = {
            "descarteLavado:descarteGeneral": 50,
            "descarteLavado:pareja": 50,
            "descarteLavado:balin": 50,
            "descarteEncerado:descarteGeneral": 50,
            "descarteEncerado:pareja": 50,
            "descarteEncerado:balin": 50,
            "descarteEncerado:extra": 50,
            "descarteEncerado:suelo": 50,
            "descarteEncerado:frutaNacional": 50,
        }
        const tipoFruta = "Limon"

        await request(`http://${HOST}:${PORT}`)
            .put("/inventarios/sys_add_inventarios_descarte")
            .set("Authorization", `${TEST_TOKEN}`)
            .send({
                inventario,
                tipoFruta
            })

        const response = await request(`http://${HOST}:${PORT}`)
            .put("/inventarios/post_inventarios_frutaDescarte_frutaDescompuesta")
            .set("Authorization", `${TEST_TOKEN}`)
            .send({
                data: {
                    razon: "prueba de integracion",
                    comentario_adicional: "Es una prueba de integracion",
                },
                inventario: {
                    tipoFruta: "Limon",
                    "descarteLavado:descarteGeneral": "40",
                    "descarteLavado:pareja": "40",
                    "descarteLavado:balin": "40",
                    "descarteEncerado:descarteGeneral": "40",
                    "descarteEncerado:pareja": "40",
                    "descarteEncerado:balin": "40",
                    "descarteEncerado:extra": "40",
                    "descarteEncerado:suelo": "40",
                    "descarteEncerado:frutaNacional": "40",
                }
            })
        const data = response.body
        expect(data.status).toBe(200);
        expect(data.data.razon).toBe("prueba de integracion");

        const modifyResponse = await request(`http://${HOST}:${PORT}`)
            .put("/inventarios/put_inventarios_registros_fruta_descompuesta")
            .set("Authorization", `${TEST_TOKEN}`)
            .send({
                data: {
                    razon: "prueba de integracion modificaciones",
                    comentario_adicional: "Es una prueba de integracion modificacion",
                    tipoFruta: "Limon",
                    kilos: "180",
                    "descarteLavado.descarteGeneral": "20",
                    "descarteLavado.pareja": "20",
                    "descarteLavado.balin": "20",
                    "descarteEncerado.descarteGeneral": "20",
                    "descarteEncerado.pareja": "20",
                    "descarteEncerado.balin": "20",
                    "descarteEncerado.extra": "20",
                    "descarteEncerado.suelo": "20",
                    "descarteEncerado.frutaNacional": "20",
                },
                _id: data.data._id,
                action: "put_inventarios_put_inventarios_registros_fruta_descompuestahistoriales_despachoDescarte"
            })

        const dataM = modifyResponse.body
        expect(dataM.status).toBe(200);

        const modifyErrResponse = await request(`http://${HOST}:${PORT}`)
            .put("/inventarios/put_inventarios_registros_fruta_descompuesta")
            .set("Authorization", `${TEST_TOKEN}`)
            .send({
                data: {
                    razon: "prueba de integracion modificaciones",
                    comentario_adicional: "Es una prueba de integracion modificacion",
                    tipoFruta: "Naranja",
                    kilos: "180",
                    "descarteLavado.descarteGeneral": "20",
                    "descarteLavado.pareja": "20",
                    "descarteLavado.balin": "20",
                    "descarteEncerado.descarteGeneral": "20",
                    "descarteEncerado.pareja": "20",
                    "descarteEncerado.balin": "20",
                    "descarteEncerado.extra": "20",
                    "descarteEncerado.suelo": "20",
                    "descarteEncerado.frutaNacional": "20",
                },
                _id: data.data._id,
                action: "put_inventarios_registros_fruta_descompuesta"
            })

        const modifyErr = modifyErrResponse.body
        expect(modifyErr.status).toBe(470);


        const modifyErrResponse2 = await request(`http://${HOST}:${PORT}`)
            .put("/inventarios/put_inventarios_registros_fruta_descompuesta")
            .set("Authorization", `${TEST_TOKEN}`)
            .send({
                data: {
                    razon: "prueba de integracion modificaciones",
                    comentario_adicional: "Es una prueba de integracion modificacion",
                    tipoFruta: "Limon",
                    kilos: "630",
                    "descarteLavado.descarteGeneral": "70",
                    "descarteLavado.pareja": "70",
                    "descarteLavado.balin": "70",
                    "descarteEncerado.descarteGeneral": "70",
                    "descarteEncerado.pareja": "70",
                    "descarteEncerado.balin": "70",
                    "descarteEncerado.extra": "70",
                    "descarteEncerado.suelo": "70",
                    "descarteEncerado.frutaNacional": "70",
                },
                _id: data.data._id,
                action: "put_inventarios_registros_fruta_descompuesta"
            })

        const modifyErr2 = modifyErrResponse2.body
        expect(modifyErr2.status).toBe(470);

        const responseInventario = await request(`http://${HOST}:${PORT}`)
            .get("/inventarios/get_inventarios_frutaDescarte_fruta")
            .set("Authorization", `${TEST_TOKEN}`);

        const statusInv = responseInventario.body.status
        expect(statusInv).toBe(200);

        // --- Aquí comienza la validación de los valores seteados ---
        const responseInv = responseInventario.body.data;
        // Estructura: { tipoFruta: { descarteLavado: { ... }, descarteEncerado: { ... } } }

        // Solo validamos "Limon"
        const inventarioLimon = responseInv["Limon"];
        expect(inventarioLimon).toBeDefined();

        // Mapear los nombres del inventario recibido
        const esperado = {
            descarteLavado: {
                descarteGeneral: 30,
                pareja: 30,
                balin: 30
            },
            descarteEncerado: {
                descarteGeneral: 30,
                pareja: 30,
                balin: 30,
                extra: 30,
                suelo: 30,
                frutaNacional: 30
            }
        };

        // Validar cada campo uno a uno
        Object.entries(esperado).forEach(([tipoDescarte, items]) => {
            expect(inventarioLimon[tipoDescarte]).toBeDefined();
            Object.entries(items).forEach(([item, valorEsperado]) => {
                // Redis puede devolver strings, así que casteamos
                expect(Number(inventarioLimon[tipoDescarte][item] || 0)).toBe(valorEsperado);
            });
        });

    })
});
