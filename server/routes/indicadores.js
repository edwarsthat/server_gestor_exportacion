import express from 'express';
import { UserRepository } from '../auth/users.js';
import { IndicadoresAPIRepository } from '../api/IndicadoresAPI.js';


export const routerIndicadores = express.Router();


routerIndicadores.get("/get_indicadores_proceso_numero_items", async (req, res) => {
    try {
        //autentificacion
        const token = req.headers['authorization'];
        const user = await UserRepository.authenticateToken(token);
        await UserRepository.autentificacionPermisosHttps(user.cargo, req.body.action)

        const response = await IndicadoresAPIRepository.get_indicadores_proceso_numero_items()

        res.send({ status: 200, message: 'Ok', data: response })
    } catch (err) {
        console.log(`Code ${err.status}: ${err.message}`)
        res.json({ status: err.status, message: err.message })
    }
})
routerIndicadores.get("/get_indicadores_eficiencia_operativa_elementos", async (req, res) => {
    try {
        //autentificacion
        const token = req.headers['authorization'];
        const user = await UserRepository.authenticateToken(token);
        await UserRepository.autentificacionPermisosHttps(user.cargo, req.body.action)

        const data = req.body

        const response = await IndicadoresAPIRepository.get_indicadores_eficiencia_operativa_elementos(data)

        res.send({ status: 200, message: 'Ok', data: response })
    } catch (err) {
        console.log(`Code ${err.status}: ${err.message}`)
        res.json({ status: err.status, message: err.message })
    }
})
routerIndicadores.put("/put_indicadores_eficiencia_operativa_modificar", async (req, res) => {
    try {
        // autentificacion
        const token = req.headers['authorization'];
        const user = await UserRepository.authenticateToken(token);
        await UserRepository.autentificacionPermisosHttps(user.cargo, req.body.action)

        const data = req.body

        const response = await IndicadoresAPIRepository.put_indicadores_eficiencia_operativa_modificar(data.data)


        res.send({ status: 200, message: 'Ok', data: response })
    } catch (err) {
        console.log(`Code ${err.status}: ${err.message}`)
        res.json({ status: err.status, message: err.message })
    }
})
