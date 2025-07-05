import express from 'express';
import { UserRepository } from '../auth/users.js';
import { ComercialRepository } from '../api/Comercial.js';
export const routerComercial = express.Router();

routerComercial.get("/", (req, res) => {
    console.log(req)
    res.send("Comercial")
});

routerComercial.put("/ingresar_precio_fruta", async (req, res) => {
    try {
        const token = req.headers['authorization'];

        const { user, cargo } = await UserRepository.authenticateToken(token);
        await UserRepository.autentificacionPermisosHttps(cargo, 'ingresar_precio_fruta')

        await ComercialRepository.ingresar_precio_fruta(req.body, user)

        res.json({ status: 200, message: 'Ok' });

    } catch (err) {
        res.json({ status: err.status, message: err.message });

    }
})

routerComercial.get("/get_comercial_proveedores_elementos", async (req, res) => {
    try {
        //autentificacion
        const token = req.headers['authorization'];
        const user = await UserRepository.authenticateToken(token);
        await UserRepository.autentificacionPermisosHttps(user.cargo, "get_comercial_proveedores_elementos")

        const response = await ComercialRepository.get_comercial_proveedores_elementos()

        res.send({ status: 200, message: 'Ok', data: response })
    } catch (err) {
        console.log(`Code ${err.status}: ${err.message}`)
        res.json({ status: err.status, message: err.message })
    }
})

routerComercial.post("/post_comercial_precios_add_precio", async (req, res) => {
    try {
        //autentificacion
        // const token = req.headers['authorization'];
        // const user = await UserRepository.authenticateToken(token);
        // await UserRepository.autentificacionPermisosHttps(user.cargo, req.body.action)
        const data = req.body

        const response = await ComercialRepository.post_comercial_precios_add_precio(data)

        res.send({ status: 200, message: 'Ok', data: response })
    } catch (err) {
        console.log(`Code ${err.status}: ${err.message}`)
        res.json({ status: err.status, message: err.message })
    }
})

routerComercial.get("/get_comercial_precios_cantidad_registros", async (req, res) => {
    try {
        //autentificacion
        // const token = req.headers['authorization'];
        // const user = await UserRepository.authenticateToken(token);
        // await UserRepository.autentificacionPermisosHttps(user.cargo, req.body.action)

        const response = await ComercialRepository.get_comercial_precios_cantidad_registros()

        res.send({ status: 200, message: 'Ok', data: response })
    } catch (err) {
        console.log(`Code ${err.status}: ${err.message}`)
        res.json({ status: err.status, message: err.message })
    }
})


