import { procesoEventEmitter, talentoHumanoEventEmitter } from "../../events/eventos.js";

let initialized = false;

function bridge(emitter, event, io) {
    emitter.on(event, (data) => {
        try {
            io.emit(event, data);
        } catch (error) {
            console.error(`Error en ${event}:`, error);
        }
    });
}

export function eventLisener({ io }) {
    if (initialized) return;
    initialized = true;
    bridge(procesoEventEmitter, 'predio_vaciado', io);
    bridge(procesoEventEmitter, 'listaempaque_update', io);
    bridge(procesoEventEmitter, 'status_proceso', io);
    bridge(procesoEventEmitter, 'server_event', io);
    talentoHumanoEventEmitter.on('generacion_carnets', (data) => {
        try {
            io.to(`job_${data.jobId}`).emit('generacion_carnets', data);
            if (data.type === 'error' || data.type === 'done') {
                io.socketsLeave(`job_${data.jobId}`);
            }
        } catch (error) {
            console.error('Error en generacion_carnets:', error);
        }
    });
}