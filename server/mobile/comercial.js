const express = require('express');
const { UserRepository } = require('../auth/users');
const { ComercialRepository } = require('../api/Comercial');
const routerComercial = express.Router();

routerComercial.get("/", (req, res) => {
    console.log(req)
    res.send("Comercial")
});

routerComercial.get("/get-proveedores", async (req, res) => {
    try {
        const token = req.headers['authorization'];
        await UserRepository.authenticateToken(token);

        const data = await ComercialRepository.get_proveedores();

        res.json({ status: 200, data: data });
    } catch (err) {
        res.json({ status: err.status, message: err.message });
    }

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

routerComercial.get("/get_proveedores_proceso", async (req, res) => {
    try {
        const token = req.headers['authorization'];
        await UserRepository.authenticateToken(token);

        const data = await ComercialRepository.get_proveedores_proceso();
        res.json({ status: 200, message: 'Ok', data: data });
    } catch (err) {
        console.log(`Code ${err.status}: ${err.message}`)
        res.json({ status: err.status, message: err.message })
    }
})


module.exports.routerComercial = routerComercial;
