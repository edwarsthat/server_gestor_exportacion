const cron = require('node-cron');
const { IndicadoresAPIRepository } = require('../../server/api/IndicadoresAPI');
const { ProcesoRepository } = require('../../server/api/Proceso.mjs');
const { VariablesDelSistema } = require('../../server/Class/VariablesDelSistema');
const { FormulariosCalidadRepository } = require('../../server/Class/FormulariosCalidad');

function initCronJobs() {

    cron.schedule('10 5 * * *', async () => {
        await IndicadoresAPIRepository.post_indicadores_eficiencia_operativa_registro();

    });

    //Kilos procesados al finalizar el dia
    cron.schedule('0 5 * * *', async () => {
        await IndicadoresAPIRepository.sys_indicadores_eficiencia_operativa_kilos_procesados();
        await IndicadoresAPIRepository.sys_indicadores_eficiencia_fruta_kilos_procesados();
        await IndicadoresAPIRepository.sys_indicadores_eficiencia_fruta_kilos_vaciados();
        await ProcesoRepository.reiniciarValores_proceso();

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

module.exports.initCronJobs = initCronJobs