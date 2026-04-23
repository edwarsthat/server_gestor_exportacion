import { CargosPersonalRepository } from "../../Class/talentoHumano/CargosPersonal.js";
import { TalentoHumanoValidations } from "../../validations/talentoHumano.js";
import { registrarPasoLog } from "../helper/logs.js";
import { ErrorTalentHumanoLogicHandlers } from "../utils/errorsHandlers.js";
import { executeTransactionalTask, executeQueryTask } from "../../utils/wrappers.js";

export class CargosPersonalControllerRepository {
    static async get_talentoHumano_cargosPersonal_ingresoPersonal() {
        try {
            const data = await CargosPersonalRepository.get_data({})
            return data
        } catch (error) {
            console.error(`[ERROR][${new Date().toISOString()}]`, error);
            await ErrorTalentHumanoLogicHandlers(error)
        }
    }
    static async get_talentoHumano_cargos_registros(req) {
        return await executeQueryTask(async () => {
            const { page } = req.data
            const resultsPerPage = 25;

            const data = await CargosPersonalRepository.get_data({
                skip: (page - 1) * resultsPerPage,
                limit: resultsPerPage,
                populate: [
                    {
                        path: "areasAcceso",
                        select: "nombre"
                    },
                    {
                        path: "areasAccesoParcial",
                        select: "nombre"
                    }
                ]
            })
            return data
        });

    }
    static async get_talentoHumano_cargos_numeroRegistros() {
        try {
            const data = await CargosPersonalRepository.get_numero_registros({})
            return data
        } catch (error) {
            console.error(`[ERROR][${new Date().toISOString()}]`, error);
            await ErrorTalentHumanoLogicHandlers(error)
        }
    }
    static async post_talentoHumano_cargos_ingresoCargo(req) {
        const { user } = req
        await executeTransactionalTask(req, async (session, log) => {

            const parseData = TalentoHumanoValidations.post_talentoHumano_cargos_ingresoCargo().parse(req.data.data)
            const data = parseData
            await registrarPasoLog(log._id, "Validación de datos", "completado")

            await CargosPersonalRepository.post_data(data, { user: user._id, action: "post_talentoHumano_cargos_ingresoCargo" }, session)
            await registrarPasoLog(log._id, "Agregar cargo", "completado")

        });
    }
    static async put_talentoHumano_cargos_modificarCargo(req) {
        const { user } = req
        if (!user || !user._id) throw new Error("Usuario no autenticado")
        await executeTransactionalTask(req, async (session, log) => {
            const { _id } = req.data

            const parseData = TalentoHumanoValidations.post_talentoHumano_cargos_ingresoCargo().parse(req.data.data)
            const data = parseData
            await registrarPasoLog(log._id, "Validación de datos", "completado")

            await CargosPersonalRepository.actualizar_data({ _id: _id }, data, { user: user._id, action: "put_talentoHumano_cargos_modificarCargo" })
            await registrarPasoLog(log._id, "Modificar cargo", "completado")
        });
    }
}