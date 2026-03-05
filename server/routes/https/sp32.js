import express from 'express';
import { HandleErrors } from '../../../Error/recordErrors.js';
import { ProcesoRepository } from '../../api/Proceso.mjs';
import { appendFile } from 'fs/promises';
import { join } from 'path';
import config from '../../../src/config/index.js';

export const sp32 = express.Router();

sp32.get("/", (req, res) => {
    res.send("Sistema")
});

sp32.post("/", async (req, res) => {
    try {
        console.log("Header", req.headers)
        console.log("desde el sp32", req.body)

        const key = config.API_KEY_SP32;
        const authHeader = req.headers['authorization'];
        if (!authHeader || authHeader !== `Bearer ${key}`) {
            return res.status(401).json({ status: 401, message: 'Unauthorized' });
        }

        //registro temporal de los cambios de maquina 
        const filePath = join(process.cwd(), 'sp32_log.txt');
        await appendFile(filePath, JSON.stringify(req.body, null, 2) + '\n---\n', 'utf8');

        //Logica de inicio y fin 
        await ProcesoRepository.sp32_funcionamiento_maquina(req.body)
        res.json({ status: 200, message: 'Ok' })

    } catch (err) {
        res.json({ status: err.status, message: err.message })
        await HandleErrors.addError(err)
    }
})


