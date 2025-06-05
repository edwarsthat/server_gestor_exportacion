import express from 'express';
import { dataRepository } from '../../api/data.js';
import { UserRepository } from '../../auth/users.js';


export const routerDataSys = express.Router();


routerDataSys.get("/get_data_tipoFruta", async (req, res) => {
    try {

        const token = req.headers['authorization'];

        const user = await UserRepository.authenticateToken(token);
        await UserRepository.autentificacionPermisosHttps(user.cargo, 'get_data_tipoFruta')

        const response = await dataRepository.get_data_tipoFruta()
        res.send({ status: 200, message: 'Ok', data: response })
    } catch (err) {
        res.json({ status: err.status, message: err.message })
    }
});

