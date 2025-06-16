import express from 'express';
import { UserRepository } from '../../auth/users.js';
import { TransporteRepository } from '../../api/Transporte.js';
// import config from '../../../src/config/index.js';
// const { TEST_TOKEN } = config;

export const routerTransporte = express.Router();

routerTransporte.get("/", (req, res) => {
    console.log(req)
    res.send("Inventarios")
});



routerTransporte.get("/get_transporte_contenedores_entregaPrescinto", async (req, res) => {
    try {
        const token = req.headers['authorization'];
        const user = await UserRepository.authenticateToken(token);

        await UserRepository.autentificacionPermisosHttps(user.cargo, req.body.action)
        const response = await TransporteRepository.get_transporte_contenedores_entregaPrescinto()
        res.json({ status: 200, message: 'Ok', data: response })
    } catch (err) {
        res.json({ status: err.status, message: err.message })
    }
})
routerTransporte.get("/get_transporte_registros_entregaPrecintos", async (req, res) => {
    try {
        const token = req.headers['authorization'];
        const user = await UserRepository.authenticateToken(token);
        await UserRepository.autentificacionPermisosHttps(user.cargo, req.body.action)

        const data = req.body
        const query = { data }
        const response = await TransporteRepository.get_transporte_registros_entregaPrecintos(query)
        res.json({ status: 200, message: 'Ok', data: response })
    } catch (err) {
        res.json({ status: err.status, message: err.message })
    }
})
routerTransporte.get("/get_transporte_registros_entregaPrecintos_numeroElementos", async (req, res) => {
    try {
        const response = await TransporteRepository.get_transporte_registros_entregaPrecintos_numeroElementos()
        res.json({ status: 200, message: 'Ok', data: response })
    } catch (err) {
        res.json({ status: err.status, message: err.message })
    }
})
routerTransporte.get("/get_transporte_registros_entregaPrecintos_fotos", async (req, res) => {
    try {
        const data = req.body
        const response = await TransporteRepository.get_transporte_registros_entregaPrecintos_fotos(data)
        res.json({ status: 200, message: 'Ok', data: response })
    } catch (err) {
        res.json({ status: err.status, message: err.message })
    }
})
routerTransporte.post("/post_transporte_conenedor_entregaPrecinto", async (req, res) => {
    try {
        const token = req.headers['authorization'];
        const user = await UserRepository.authenticateToken(token);
        await UserRepository.autentificacionPermisosHttps(user.cargo, req.body.action)

        const data = req.body
        const query = { data, user }
        const response = await TransporteRepository.post_transporte_conenedor_entregaPrecinto(query)
        res.json({ status: 200, message: 'Ok', data: response })
    } catch (err) {
        res.json({ status: err.status, message: err.message })
    }
})