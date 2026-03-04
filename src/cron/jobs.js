import cron from 'node-cron';
import { IndicadoresAPIRepository } from '../../server/api/IndicadoresAPI.js';
// import { ProcesoRepository } from '../../server/api/Proceso.mjs';
import { FormulariosCalidadRepository } from '../../server/Class/FormulariosCalidad.js';
import { InventariosRepository } from '../../server/api/inventarios.js';
import { TurnosService } from '../../server/services/proceso/turnos.js';
import { dataService } from '../../server/services/data.js';
import { Seriales } from '../../server/Class/Seriales.js';


export function initCronJobs() {

    //terminacion de turno
    cron.schedule('59 4 * * *', async () => {
        try { await InventariosRepository.snapshot_inventario_descartes(); }
        catch (err) { console.error('[cron 04:59] snapshot_inventario_descartes:', err.message); }

        try { await TurnosService.finalizarTurno(); }
        catch (err) { console.error('[cron 04:59] finalizarTurno:', err.message); }
    });

    //nuevos datos diarios
    cron.schedule('0 5 * * *', async () => {
        try { await InventariosRepository.crear_snapshot_inventario_descartes(); }
        catch (err) { console.error('[cron 05:01] crear_snapshot_inventario_descartes:', err.message); }

        try { await IndicadoresAPIRepository.post_indicadores_eficiencia_operativa_registro(); }
        catch (err) { console.error('[cron 05:01] post_indicadores_eficiencia_operativa_registro:', err.message); }

        try { await TurnosService.crearTurno(); }
        catch (err) { console.error('[cron 05:01] crearTurno:', err.message); }

        try {
            const inicio = new Date().setHours(0, 0, 0, 0);
            const fin = new Date().setHours(23, 59, 59, 59);
            const codigo = await dataService.get_formatoCalidad_serial({});
            await FormulariosCalidadRepository.crear_formulario_limpieza_diaria(codigo, inicio, fin);
            await Seriales.modificar_seriales({ name: "CA-" }, { $inc: { serial: 1 } });
        } catch (err) { console.error('[cron 05:01] formulario_limpieza_diaria:', err.message); }
    });

}
