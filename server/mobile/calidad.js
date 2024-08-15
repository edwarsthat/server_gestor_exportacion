const express = require('express');
const { UserRepository } = require('../auth/users');
const { CalidadRepository } = require('../api/Calidad');
const routerCalidad = express.Router();

routerCalidad.get("/", (req, res) => {
    console.log(req)
    res.send("Calidad")
});

routerCalidad.get("/get_lotes_clasificacion_descarte", async (req, res) => {
    try {
        const token = req.headers['authorization'];
        const { cargo, user } = await UserRepository.authenticateToken(token);
        await UserRepository.autentificacionPermisos(cargo, 'get_lotes_clasificacion_descarte', user)

        const data = await CalidadRepository.get_lotes_clasificacion_descarte();
        res.json({ status: 200, message: 'Ok', data: data });
    } catch (err) {
        console.log(`Code ${err.status}: ${err.message}`)
        res.json({ status: err.status, message: err.message })
    }
});

routerCalidad.put("/put_lotes_clasificacion_descarte", async (req, res) => {
    try {
        const token = req.headers['authorization'];
        const user = await UserRepository.authenticateToken(token);

        await UserRepository.autentificacionPermisos(user.cargo, req.body.action, user.user)

        await CalidadRepository.put_lotes_clasificacion_descarte(req.body, user.user)

        res.send({ status: 200, message: 'Ok' })
    } catch (err) {
        console.log(`Code ${err.status}: ${err.message}`)
        res.json({ status: err.status, message: err.message })
    }
});

module.exports.routerCalidad = routerCalidad;
