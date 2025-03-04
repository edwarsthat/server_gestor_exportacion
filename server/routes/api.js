const express = require('express');
const { SistemaRepository } = require('../api/Sistema');
const { LotesRepository } = require('../Class/Lotes');

const routerAPI = express.Router();


routerAPI.get("/get_data_lotes", async (req, res) => {
    try {
        const data = req.body

        const user = { user: data.data.user, password: data.data.password }
        const dataUser = await SistemaRepository.login2(user)

        if (dataUser.status !== 200) {
            res.json({ status: 401, message: "Error con las credenciales" })
        }

        const lotes = await LotesRepository.getLotes({ limit: 'all' })
        res.send({ status: 200, message: 'Ok', data: lotes })
    } catch (err) {
        console.log(`Code ${err.status}: ${err.message}`)
        res.json({ status: err.status, message: err.message })
    }
})

module.exports.routerAPI = routerAPI
