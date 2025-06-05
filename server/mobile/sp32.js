const express = require('express');
const { HandleErrors } = require('../../Error/recordErrors');
const { ProcesoRepository } = require('../api/Proceso.mjs');

const sp32 = express.Router();

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

module.exports = { sp32 };
