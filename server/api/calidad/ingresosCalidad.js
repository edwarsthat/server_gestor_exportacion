import { formularios_calidad } from "../../../constants/formularios_calidad.js";
import { executeQueryTask, executeTransactionalTask } from "../../utils/wrappers.js";

export class IngresosCalidadController {
    static async get_data_ingresos_tiposFormularios() {
        return await executeQueryTask(() => {
            return formularios_calidad;
        });
    }
    static async post_calidad_ingresos_crearFormulario(req) {

        const { user } = req
        if (!user || !user._id) throw new Error("Usuario no autenticado")


        console.log("Data recibida para crear formulario de calidad:", req.data);
        await executeTransactionalTask(req, async (session, log) => {

            const { data } = req.data;
            const { tipoSeleccionado, fechaInicio, fechaFin } = data;
            // const codigo = await VariablesDelSistema.generar_codigo_informe_calidad()

            // switch (tipoSeleccionado) {
            //     case 'limpieza_diaria':
            //         await FormulariosCalidadRepository.crear_formulario_limpieza_diaria(
            //             codigo, fechaInicio, fechaFin
            //         )
            //         break;
            //     case 'limpieza_mensual':
            //         await FormulariosCalidadRepository.crear_formulario_limpieza_mensual(
            //             codigo, fechaInicio, fechaFin, user
            //         )
            //         break;
            //     case 'control_plagas':
            //         await FormulariosCalidadRepository.crear_formulario_control_plagas(
            //             codigo, fechaInicio, fechaFin, user
            //         )
            //         break;
            //     default:
            //         throw new Error("Error en el switch de creacion de formulario calidad")
            // }
            // await VariablesDelSistema.incrementar_codigo_informes_calidad()
        });
    }
}
