import cron from 'node-cron';
import { tipoFrutaCache } from '../../server/cache/tipoFruta.js';


export function initCronCache() {
    cron.schedule('*/45 * * * *', async () => {
        console.log('[CRON] Iniciando refresco de cache tipoFruta...');
        try {
            await tipoFrutaCache.cargar();
            console.log('[CRON] Cache tipoFruta actualizado con éxito');
        } catch (err) {
            console.error('[CRON] Error actualizando cache tipoFruta:', err.message);
        }
    });
}