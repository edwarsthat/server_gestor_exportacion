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