const express = require('express');
const { UserRepository } = require('../auth/users');
const { CalidadRepository } = require('../api/Calidad');
const { HandleErrors } = require('../../Error/recordErrors');
const { AccessError } = require('../../Error/ValidationErrors');
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
        await HandleErrors.addError(err)
        console.log(`Code ${err.status}: ${err.message}`)
        res.json({ status: err.status, message: err.message })
    }
});

routerCalidad.get("/get_formularios_calidad_creados", async (req, res) => {
    try {
        const token = req.headers['authorization'];
        const { user, cargo } = await UserRepository.authenticateToken(token);

        const autorizado2 = await UserRepository.autentificacionPermisosHttps(cargo, "get_formularios_calidad_creados");
        if (!autorizado2) {
            throw new AccessError(412, `Acceso no autorizado obtener_historial_decarte_lavado_proceso`);
        }

        const data = await CalidadRepository.get_formularios_calidad_creados(user);
        res.json({ status: 200, message: 'Ok', data: data });
    } catch (err) {
        console.log(`Code ${err.status}: ${err.message}`)
        res.json({ status: err.status, message: err.message })
    }
})

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
routerCalidad.put("/add_item_formulario_calidad", async (req, res) => {
    try {
        const token = req.headers['authorization'];
        const user = await UserRepository.authenticateToken(token);

        await UserRepository.autentificacionPermisos(user.cargo, req.body.action, user.user)
        await CalidadRepository.add_item_formulario_calidad(req.body, user._id)

        res.send({ status: 200, message: 'Ok' })
    } catch (err) {
        console.log(`Code ${err.status}: ${err.message}`)
        res.json({ status: err.status, message: err.message })
    }
});

module.exports.routerCalidad = routerCalidad;
