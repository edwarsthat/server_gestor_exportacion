import express from 'express';
import { HandleErrors } from '../../Error/recordErrors.js';
import { ProcesoRepository } from '../api/Proceso.mjs';

export const sp32 = express.Router();

sp32.get("/", (req, res) => {
    res.send("Sistema")
});

sp32.post("/", async (req, res) => {
    try {
        console.log(req.body)
        await ProcesoRepository.sp32_funcionamiento_maquina(req.body)
        res.json({ status: 200, message: 'Ok' })

    } catch (err) {
        res.json({ status: err.status, message: err.message })
        await HandleErrors.addError(err)
    }
})


