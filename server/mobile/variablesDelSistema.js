
const express = require('express');
const { ProcesoRepository } = require('../api/Proceso');
const routerVariablesdelSistema = express.Router();

routerVariablesdelSistema.get("/", (req, res) => {
    res.send("Variables de proceso")
})

routerVariablesdelSistema.get("/predioProcesoDescarte", async (req, res) => {
    try {
        const response = await ProcesoRepository.get_proceso_aplicaciones_descarteLavado(req.body)
        res.send({ response: response, status: 200, message: "Ok" })
    } catch (err) {
        res.json({ status: err.status, message: err.message })
    }
})

module.exports.routerVariablesdelSistema = routerVariablesdelSistema;