import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { procesoEventEmitter } from '../../events/eventos.js';
import { SistemaRepository } from '../api/Sistema.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export const routerAppTv = express.Router();

routerAppTv.get("/", (req, res) => {
    console.log("asdasd")
    res.sendFile(path.join(
        __dirname,
        '..', '..',
        'public',
        'appTv',
        'index.html'));
});

routerAppTv.get("/get_data_proceso", async (req, res) => {
    try {
        const response = await SistemaRepository.get_sistema_proceso_dataProceso()
        res.json({ status: 200, message: 'Ok', data: response })
    } catch (err) {
        res.json({ status: err.status, message: err.message })
    }
});
routerAppTv.get("/obtener_hora_inicio", async (req, res) => {
    try {
        console.log(req.method)
        const response = await SistemaRepository.get_sistema_proceso_inicioHoraProceso()
        res.json({ status: 200, message: 'Ok', data: response })
    } catch (err) {
        res.json({ status: err.status, message: err.message })
    }
});

routerAppTv.get("/set_inicio", async (req, res) => {
    try {
        const data = await SistemaRepository.put_sistema_proceso_inicioHoraProceso();
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
