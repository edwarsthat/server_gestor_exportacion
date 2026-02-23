import { dashboardEventEmitter } from '../../events/eventos.js';
import { EventsService } from '../services/events.js';

export class EventsController {

    static emit(tipo, datos) {
        dashboardEventEmitter.emit('dashboard_update', { tipo, datos });
    }

    static async emitSnapshot() {
        const snapshot = await EventsController.getSnapshot();
        dashboardEventEmitter.emit('dashboard_update', snapshot);
    }

    static async getSnapshot() {
        let out = {};
        const resultados = await Promise.allSettled([
            EventsService._snapshotPredioProcesando(),
            EventsService._snapshotHoraInicioTurno(),
            EventsService._snapshotIndicadores(),
        ]);

        resultados
            .filter(r => r.status === 'fulfilled' && r.value !== null)
            .forEach(r => { out = { ...out, ...r.value }; });

        return out;
    }

}
