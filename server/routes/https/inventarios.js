import express from 'express';
import { InventariosRepository } from '../../api/inventarios.js';
import { UserRepository } from '../../auth/users.js';
import config from '../../../src/config/index.js';
const { TEST_TOKEN } = config;

export const routerInventarios = express.Router();

routerInventarios.get("/", (req, res) => {
    console.log(req)
    res.send("Inventarios")
});



routerInventarios.get("/get_inventarios_frutaDescarte_fruta", async (req, res) => {
    try {
        const token = req.headers['authorization'];
        const user = await UserRepository.authenticateToken(token);
        await UserRepository.autentificacionPermisosHttps(user.cargo, "get_inventarios_frutaDescarte_fruta")
        const response = await InventariosRepository.get_inventarios_frutaDescarte_fruta()
        res.json({ status: 200, message: 'Ok', data: response })
    } catch (err) {
        res.json({ status: err.status, message: err.message })
    }
})
routerInventarios.get("/get_inventarios_lotes_infoLotes", async (req, res) => {
    try {
        const token = req.headers['authorization'];
        const data = req.body

        const user = await UserRepository.authenticateToken(token);
        await UserRepository.autentificacionPermisosHttps(user.cargo, req.body.action)

        const query = { data, user }

        const response = await InventariosRepository.get_inventarios_lotes_infoLotes(query)
        res.json({ status: 200, message: 'Ok', data: response })
    } catch (err) {
        res.json({ status: err.status, message: err.message })
    }
})
routerInventarios.patch("/sys_reiniciar_inventario_descarte", async (req, res) => {
    try {
        const token = req.headers['authorization'];
        const user = await UserRepository.authenticateToken(token);
        await UserRepository.autentificacionPermisosHttps(user.cargo, "sys_reiniciar_inventario_descarte")

        await InventariosRepository.sys_reiniciar_inventario_descarte()

        res.json({ status: 200, message: 'Ok' })
    } catch (err) {
        res.json({ status: err.status, message: err.message })
    }
})
routerInventarios.put("/sys_add_inventarios_descarte", async (req, res) => {
    try {
        const token = req.headers['authorization'];
        const data = req.body

        const user = await UserRepository.authenticateToken(token);
        await UserRepository.autentificacionPermisosHttps(user.cargo, req.body.action)

        const query = { data, user }
        await InventariosRepository.sys_add_inventarios_descarte(query)

        res.json({ status: 200, message: 'Ok' })
    } catch (err) {
        res.json({ status: err.status, message: err.message })
    }
})
routerInventarios.put("/put_inventarios_frutaDescarte_reprocesarFruta", async (req, res) => {
    try {
        const token = req.headers['authorization'];
        const data = req.body

        const user = await UserRepository.authenticateToken(token);
        await UserRepository.autentificacionPermisosHttps(user.cargo, req.body.action)

        const query = { data, user }
        const response = await InventariosRepository.put_inventarios_frutaDescarte_reprocesarFruta(query)

        res.json({ status: 200, message: 'Ok', data: response })
    } catch (err) {
        res.json({ status: err.status, message: err.message })
    }
})
routerInventarios.put("/put_inventarios_frutaDescarte_despachoDescarte", async (req, res) => {
    try {
        const token = req.headers['authorization'];
        const data = req.body

        const user = await UserRepository.authenticateToken(token);
        await UserRepository.autentificacionPermisosHttps(user.cargo, req.body.action)

        const query = { data, user }
        const response = await InventariosRepository.put_inventarios_frutaDescarte_despachoDescarte(query)
        res.json({ status: 200, message: 'Ok', data: response })
    } catch (err) {
        res.json({ status: err.status, message: err.message })
    }
})
routerInventarios.put("/post_inventarios_frutaDescarte_frutaDescompuesta", async (req, res) => {
    try {
        const token = req.headers['authorization'];
        const data = req.body

        const user = await UserRepository.authenticateToken(token);
        await UserRepository.autentificacionPermisosHttps(user.cargo, req.body.action)

        const query = { data, user }
        const response = await InventariosRepository.post_inventarios_frutaDescarte_frutaDescompuesta(query)
        res.json({ status: 200, message: 'Ok', data: response })
    } catch (err) {
        res.json({ status: err.status, message: err.message })
    }
})
routerInventarios.put("/put_inventarios_historiales_despachoDescarte", async (req, res) => {
    try {
        const token = req.headers['authorization'];
        const data = req.body

        const user = await UserRepository.authenticateToken(token);
        await UserRepository.autentificacionPermisosHttps(user.cargo, req.body.action)

        const query = { data, user }
        await InventariosRepository.put_inventarios_historiales_despachoDescarte(query)
        res.json({ status: 200, message: 'Ok' })
    } catch (err) {
        res.json({ status: err.status, message: err.message })
    }
})
routerInventarios.put("/put_inventarios_registros_fruta_descompuesta", async (req, res) => {
    try {
        const token = req.headers['authorization'];
        const data = req.body

        const user = await UserRepository.authenticateToken(token);
        await UserRepository.autentificacionPermisosHttps(user.cargo, req.body.action)

        const query = { data, user }
        await InventariosRepository.put_inventarios_registros_fruta_descompuesta(query)
        res.json({ status: 200, message: 'Ok' })
    } catch (err) {
        res.json({ status: err.status, message: err.message })
    }
})
routerInventarios.put("/put_inventarios_frutaSinProcesar_desverdizado", async (req, res) => {
    try {
        const token = req.headers['authorization'];

        const user = await UserRepository.authenticateToken(token);
        await UserRepository.autentificacionPermisosHttps(user.cargo, req.body.action)
        const data = req.body

        const query = { data, user }
        await InventariosRepository.put_inventarios_frutaSinProcesar_desverdizado(query)
        res.json({ status: 200, message: 'Ok' })
    } catch (err) {
        res.json({ status: err.status, message: err.message })
    }
})
routerInventarios.get("/get_inventarios_frutaDesverdizando_lotes", async (req, res) => {
    try {
        const token = req.headers['authorization'];
        const user = await UserRepository.authenticateToken(token);
        await UserRepository.autentificacionPermisosHttps(user.cargo, req.body.action)
        const data = req.body

        // const user = {
        //     user: 'edwarsthat',
        //     cargo: '66b29b1736733668246c9559',
        //     _id: '66b62fc3777ac9bdcc5050ed',
        //     Rol: 0,
        //     iat: 1749504988,
        //     exp: 1749533788
        // }

        const query = { data, user }

        const response = await InventariosRepository.get_inventarios_frutaDesverdizando_lotes(query)
        res.json({ status: 200, message: 'Ok', data: response })
    } catch (err) {
        res.json({ status: err.status, message: err.message })
    }
})
routerInventarios.put("/put_inventarios_frutaDesverdizando_parametros", async (req, res) => {
    try {
        const token = req.headers['authorization'];

        const user = await UserRepository.authenticateToken(token);
        await UserRepository.autentificacionPermisosHttps(user.cargo, req.body.action)
        const data = req.body
        // const user = {
        //     user: 'edwarsthat',
        //     cargo: '66b29b1736733668246c9559',
        //     _id: '66b62fc3777ac9bdcc5050ed',
        //     Rol: 0,
        //     iat: 1749504988,
        //     exp: 1749533788
        // }
        const query = { data, user }
        await InventariosRepository.put_inventarios_frutaDesverdizando_parametros(query)
        res.json({ status: 200, message: 'Ok' })
    } catch (err) {
        res.json({ status: err.status, message: err.message })
    }
})
routerInventarios.put("/put_inventarios_frutaDesverdizado_finalizar", async (req, res) => {
    try {
        const token = req.headers['authorization'];
        const user = await UserRepository.authenticateToken(token);
        await UserRepository.autentificacionPermisosHttps(user.cargo, req.body.action)

        const data = req.body
        // const user = {
        //     user: 'edwarsthat',
        //     cargo: '66b29b1736733668246c9559',
        //     _id: '66b62fc3777ac9bdcc5050ed',
        //     Rol: 0,
        //     iat: 1749504988,
        //     exp: 1749533788
        // }
        const query = { data, user }
        await InventariosRepository.put_inventarios_frutaDesverdizado_finalizar(query)
        res.json({ status: 200, message: 'Ok' })
    } catch (err) {
        res.json({ status: err.status, message: err.message })
    }
})

routerInventarios.post("/set_inventarios_inventario-descarte", async (req, res) => {
    try {
        const token = req.headers['authorization'];
        if(!token === TEST_TOKEN) return res.json({ status: 401, message: 'Token de prueba no autorizado' })
        const data = req.body

        await InventariosRepository.set_inventarios_inventario(data)
        res.json({ status: 200, message: 'Ok'})
    } catch (err) {
        res.json({ status: err.status, message: err.message })
    }
})