import cron from 'node-cron';
import { IndicadoresAPIRepository } from '../../server/api/IndicadoresAPI.js';
// import { ProcesoRepository } from '../../server/api/Proceso.mjs';
import { VariablesDelSistema } from '../../server/Class/VariablesDelSistema.js';
import { FormulariosCalidadRepository } from '../../server/Class/FormulariosCalidad.js';
import { InventariosRepository } from '../../server/api/inventarios.js';


export function initCronJobs() {

    //terminacion de turno
    cron.schedule('59 4 * * *', async () => {
        await InventariosRepository.snapshot_inventario_descartes();
        await IndicadoresAPIRepository.reiniciarValores_proceso();

    });

    //nuevos datos diarios
    cron.schedule('1 5 * * *', async () => {
        await InventariosRepository.crear_snapshot_inventario_descartes();
        await IndicadoresAPIRepository.post_indicadores_eficiencia_operativa_registro();

        const inicio = new Date().setHours(0, 0, 0, 0);
        const fin = new Date().setHours(23, 59, 59, 59);
        const codigo = await VariablesDelSistema.generar_codigo_informe_calidad()

        await FormulariosCalidadRepository.crear_formulario_limpieza_diaria(
            codigo, inicio, fin
        )
        await VariablesDelSistema.incrementar_codigo_informes_calidad();
    });

}
