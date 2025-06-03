const express = require('express');
const { InventariosRepository } = require('../../api/inventarios');
const routerInventarios = express.Router();

routerInventarios.get("/", (req, res) => {
    console.log(req)
    res.send("Inventarios")
});


routerInventarios.put("/put_inventarios_historiales_despachoDescarte", async (req, res) => {
    try {
        const data = req.body
        const response = await InventariosRepository.put_inventarios_historiales_despachoDescarte(data)
        res.json({ status: 200, message: 'Ok', data: response })
    } catch (err) {
        res.json({ status: err.status, message: err.message })
    }
})

module.exports.routerInventarios = routerInventarios