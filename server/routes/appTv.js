const express = require('express');
const path = require('path')
const { ProcesoRepository } = require('../api/Proceso');
const { procesoEventEmitter } = require('../../events/eventos');
const routerAppTv = express.Router();

routerAppTv.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, '..', '..', 'public', 'appTv', 'index.html'));
});

routerAppTv.get("/get_data_proceso", async (req, res) => {
    try {
        const response = await ProcesoRepository.get_data_proceso()
        res.json({ status: 200, message: 'Ok', data: response })
    } catch (err) {
        res.json({ status: err.status, message: err.message })
    }
});

routerAppTv.get("/set_inicio", async (req, res) => {
    try {
        const data = await ProcesoRepository.set_hora_inicio_proceso();
        res.json({ status: 200, message: 'Ok', data: data })

    } catch (err) {
        res.json({ status: err.status, message: err.message })
    }
})

routerAppTv.get("/events", async (req, res) => {
    try {
        res.writeHead(200, {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive'
        });

        const sendEvent = (event) => {
            res.write(`data: ${JSON.stringify(event)}\n\n`);
        };

        procesoEventEmitter.on('proceso_event', sendEvent);
        req.on('close', () => {
            procesoEventEmitter.removeListener('proceso_event', sendEvent);
        });


    } catch (err) {
        res.json({ status: err.status, message: err.message })

    }
})

module.exports.routerAppTv = routerAppTv;
