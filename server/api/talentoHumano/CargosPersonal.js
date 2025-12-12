import { LogsRepository } from "../../Class/LogsSistema.js";
import { CargosPersonalRepository } from "../../Class/talentoHumano/CargosPersonal.js";
import { TalentoHumanoValidations } from "../../validations/talentoHumano.js";
import { registrarPasoLog } from "../helper/logs.js";
import { ErrorTalentHumanoLogicHandlers } from "../utils/errorsHandlers.js";

export class CargosPersonalControllerRepository {
    static async get_talentoHumano_cargosPersonal_ingresoPersonal() {
        try {
            const data = await CargosPersonalRepository.get_cargosPersonal({})
            return data
        } catch (error) {
            console.error(`[ERROR][${new Date().toISOString()}]`, error);
            await ErrorTalentHumanoLogicHandlers(error)
        }
    }
    static async get_talentoHumano_cargos_registros(req) {
        try {
            const { page } = req.data
            const resultsPerPage = 25;

            const data = await CargosPersonalRepository.get_cargosPersonal({
                skip: (page - 1) * resultsPerPage,
                limit: resultsPerPage,
                populate: {
                    path: "areasAcceso",
                    select: "nombre"
                }
            })
            return data
        } catch (error) {
            console.error(`[ERROR][${new Date().toISOString()}]`, error);
            await ErrorTalentHumanoLogicHandlers(error)
        }
    }
    static async get_talentoHumano_cargos_numeroRegistros() {
        try {
            const data = await CargosPersonalRepository.get_numero_registros_cargos({})
            return data
        } catch (error) {
            console.error(`[ERROR][${new Date().toISOString()}]`, error);
            await ErrorTalentHumanoLogicHandlers(error)
        }
    }
    static async post_talentoHumano_cargos_ingresoCargo(req) {
        const { user } = req
        const { action, data } = req.data
        let log
        log = await LogsRepository.create({
            user: user._id,
            action: action,
            acciones: [{ paso: "Inicio de la función", status: "Iniciado", timestamp: new Date() }]
        })
        try {
            TalentoHumanoValidations.post_talentoHumano_cargos_ingresoCargo().parse(data)
            await registrarPasoLog(log._id, "Validación de datos", "completado")

            await CargosPersonalRepository.addCargosPersonal(data, { user: user._id, action: action })
            await registrarPasoLog(log._id, "Agregar cargo", "completado")

        } catch (error) {
            console.error(`[ERROR][${new Date().toISOString()}]`, error);
            await ErrorTalentHumanoLogicHandlers(error)
        } finally {
            await registrarPasoLog(log._id, "Fin de la función", "completado")
        }
    }
    static async put_talentoHumano_cargos_modificarCargo(req) {
        const { user } = req
        const { action, data, _id } = req.data
        let log
        log = await LogsRepository.create({
            user: user._id,
            action: action,
            acciones: [{ paso: "Inicio de la función", status: "Iniciado", timestamp: new Date() }]
        })
        try {
            TalentoHumanoValidations.post_talentoHumano_cargos_ingresoCargo().parse(data)
            await registrarPasoLog(log._id, "Validación de datos", "completado")

            await CargosPersonalRepository.actualizar_cargo({ _id: _id }, data, { user: user._id, action: action })
            await registrarPasoLog(log._id, "Modificar cargo", "completado")
        } catch (error) {
            console.error(`[ERROR][${new Date().toISOString()}]`, error);
            await ErrorTalentHumanoLogicHandlers(error)
        }
    }
}