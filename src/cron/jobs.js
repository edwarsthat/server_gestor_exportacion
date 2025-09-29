import cron from 'node-cron';
import { IndicadoresAPIRepository } from '../../server/api/IndicadoresAPI.js';
// import { ProcesoRepository } from '../../server/api/Proceso.mjs';
import { VariablesDelSistema } from '../../server/Class/VariablesDelSistema.js';
import { FormulariosCalidadRepository } from '../../server/Class/FormulariosCalidad.js';
import { InventariosRepository } from '../../server/api/inventarios.js';


export function initCronJobs() {

    cron.schedule('47 10 * * *', async () => {
        await IndicadoresAPIRepository.post_indicadores_eficiencia_operativa_registro();

    });

    //Kilos procesados al finalizar el dia
    cron.schedule('0 5 * * *', async () => {
        const keysExportacion = await IndicadoresAPIRepository.sys_indicadores_ingresar_indicador();
        await IndicadoresAPIRepository.reiniciarValores_proceso(keysExportacion);
    });

    //snapshot del inventario descarte del dia
    cron.schedule('5 5 * * *', async () => {
        await InventariosRepository.snapshot_inventario_descartes();

    });

    cron.schedule("0 8 * * *", async () => {
        const inicio = new Date().setHours(0, 0, 0, 0);
        const fin = new Date().setHours(23, 59, 59, 59);
        const codigo = await VariablesDelSistema.generar_codigo_informe_calidad()

        await FormulariosCalidadRepository.crear_formulario_limpieza_diaria(
            codigo, inicio, fin
        )
        await VariablesDelSistema.incrementar_codigo_informes_calidad();

    });

}
