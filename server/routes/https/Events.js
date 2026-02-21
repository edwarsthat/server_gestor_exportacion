import express from 'express';
import { dashboardEventEmitter } from '../../../events/eventos.js';
import { EventsController } from '../../api/events.js';

export const routerEvents = express.Router();

// Clientes SSE conectados actualmente: Map<clienteId, res>
const clientes = new Map();

// Máximo de conexiones SSE simultáneas permitidas
const MAX_CONEXIONES = 10;

// Intervalo del heartbeat (ms) — mantiene la conexión viva en proxies y SmartTVs
const HEARTBEAT_MS = 30_000;

/**
 * GET /events/stream
 *
 * Endpoint SSE público para el dashboard/SmartTV.
 * Recibe eventos en tiempo real emitidos desde cualquier parte del servidor
 * a través de dashboardEventEmitter (via EventsController.emit).
 */
routerEvents.get('/stream', async (req, res) => {

    if (clientes.size >= MAX_CONEXIONES) {
        return res.status(503).json({ status: 503, message: 'Límite de conexiones SSE alcanzado' });
    }

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders();

    const clienteId = Date.now();

    // Envía un evento SSE a este cliente
    const enviar = (nombre, datos) => {
        res.write(`event: ${nombre}\n`);
        res.write(`data: ${JSON.stringify(datos)}\n\n`);
    };

    // Confirmar conexión
    enviar('conexion', { clienteId, ok: true });

    // Registrar cliente
    clientes.set(clienteId, enviar);
    console.log(`[SSE] Cliente conectado: ${clienteId} | IP: ${req.ip} | Activos: ${clientes.size}`);

    // Enviar estado actual al cliente recién conectado
    try {
        const snapshot = await EventsController.getSnapshot();
        enviar('snapshot', snapshot);
    } catch (err) {
        console.error('[SSE] Error al obtener snapshot inicial:', err.message);
    }

    // Heartbeat: comentario SSE vacío cada 30s para mantener la conexión viva
    const heartbeat = setInterval(() => {
        res.write(': ping\n\n');
    }, HEARTBEAT_MS);

    // Escuchar eventos del emitter y reenviarlos a este cliente
    const onDashboardUpdate = (snapshot) => {
        enviar('snapshot', snapshot);
    };
    dashboardEventEmitter.on('dashboard_update', onDashboardUpdate);

    // Limpiar al desconectar
    req.on('close', () => {
        clearInterval(heartbeat);
        dashboardEventEmitter.off('dashboard_update', onDashboardUpdate);
        clientes.delete(clienteId);
        console.log(`[SSE] Cliente desconectado: ${clienteId} | IP: ${req.ip} | Activos: ${clientes.size}`);
        res.end();
    });
});
