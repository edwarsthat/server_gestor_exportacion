import { formularios_calidad, limpieza_diaria_campos, limpieza_mensual_campos, control_plagas_campos } from "../../../constants/formularios_calidad.js";
import { executeQueryTask, executeTransactionalTask } from "../../utils/wrappers.js";
import { CalidadValidationsRepository } from "../../validations/calidad.js";
import { dataService } from "../../services/data.js";
import { FormularioCalidadLimpiezaDiariaRepository, FormularioCalidadLimpiezaMensualRepository, FormularioCalidadControlPlagasRepository } from "../../Class/FormulariosCalidad.js";
import { Seriales } from "../../Class/Seriales.js";
import { registrarPasoLog } from "../helper/logs.js";

export class IngresosCalidadController {
    static async get_data_ingresos_tiposFormularios() {
        return await executeQueryTask(() => {
            return formularios_calidad;
        });
    }
    static async post_calidad_ingresos_crearFormulario(req) {
        const { user } = req
        if (!user || !user._id) throw new Error("Usuario no autenticado")

        await executeTransactionalTask(req, async (session, log) => {
            const parseData = CalidadValidationsRepository.post_calidad_ingresos_crearFormulario().parse(req.data);
            const { data } = parseData;
            const { tipoSeleccionado, fechaInicio, fechaFin } = data;
            const codigo = await dataService.get_formatoCalidad_serial({ session })
            await registrarPasoLog(log._id, "Serial CA obtenido", "Completado");

            switch (tipoSeleccionado) {
                case 'limpieza_diaria':
                    await FormularioCalidadLimpiezaDiariaRepository.post_data(
                        { ID: codigo, fechaInicio, fechaFin }, { session, user: user._id }
                    )
                    break;
                case 'limpieza_mensual':
                    await FormularioCalidadLimpiezaMensualRepository.post_data(
                        { ID: codigo, fechaInicio, fechaFin }, { session, user: user._id }
                    )
                    break;
                case 'control_plagas':
                    await FormularioCalidadControlPlagasRepository.post_data(
                        { ID: codigo, fechaInicio, fechaFin }, { session, user: user._id }
                    )
                    break;
                default:
                    throw new Error("Error en el switch de creacion de formulario calidad")
            }
            await registrarPasoLog(log._id, "Formulario de calidad creado", "Completado");

            await Seriales.modificar_seriales(
                { name: "CA-" },
                { $inc: { serial: 1 } },
                { session })
            await registrarPasoLog(log._id, "Serial CA incrementado", "Completado");

        });
    }
    static async get_calidad_ingresos_formulariosCalidad() {
        return await executeQueryTask(async () => {
            const now = new Date()
            const query = { fechaInicio: { $lte: now }, fechaFin: { $gt: now } }


            const [limpieza_diaria, limpieza_mensual, control_plagas] = await Promise.all([
                FormularioCalidadLimpiezaDiariaRepository.get_data({ query }),
                FormularioCalidadLimpiezaMensualRepository.get_data({ query }),
                FormularioCalidadControlPlagasRepository.get_data({ query }),
            ])

            return {
                formularios: [...limpieza_diaria, ...limpieza_mensual, ...control_plagas],
                areas: {
                    limpieza_diaria: limpieza_diaria_campos,
                    limpieza_mensual: limpieza_mensual_campos,
                    control_plagas: control_plagas_campos,
                    formularios_calidad
                }
            };
        })
    }
    static async put_calidad_ingresos_formulariosCalidad(req) {
        const { user } = req
        if (!user || !user._id) throw new Error("Error usuario no autentificado")

        await executeTransactionalTask(req, async (session, log) => {
            const parseData = CalidadValidationsRepository.put_calidad_ingresos_formulariosCalidad().parse(req.data)
            const { tipoFormulario, _id, area, data } = parseData

            const setQuery = Object.create(null);
            Object.keys(data).forEach(item => {
                Reflect.set(setQuery, `${area}.${item}.status`, Reflect.get(Reflect.get(data, item), 'status'));
                Reflect.set(setQuery, `${area}.${item}.observaciones`, Reflect.get(Reflect.get(data, item), 'observaciones'));
                Reflect.set(setQuery, `${area}.${item}.responsable`, user._id);
            })

            const filter = { _id }
            const update = { $set: setQuery }
            const options = { session }

            if (tipoFormulario === "limpieza_diaria") {
                await FormularioCalidadLimpiezaDiariaRepository.actualizar_data(filter, update, options)
            } else if (tipoFormulario === "limpieza_mensual") {
                await FormularioCalidadLimpiezaMensualRepository.actualizar_data(filter, update, options)
            } else if (tipoFormulario === "control_plagas") {
                await FormularioCalidadControlPlagasRepository.actualizar_data(filter, update, options)
            }

            await registrarPasoLog(log._id, "Formulario de calidad actualizado", "Completado")
        });
    }
}
