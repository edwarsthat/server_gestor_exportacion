import { TalentoHumanoDotacionCarnetsRepository } from "../../../Class/talentoHumano/dotacion/Carnets.js";
import { LogsRepository } from "../../../Class/LogsSistema.js";
import { registrarPasoLog } from "../../helper/logs.js";
import { ErrorTalentHumanoLogicHandlers } from "../../utils/errorsHandlers.js";
import { db } from "../../../../DB/mongoDB/config/init.js";
import { Seriales } from "../../../Class/Seriales.js";

export class DotacionCarnetsControllerRepository {
    static async post_talentoHumano_dotacion_carnets(req) {
        const { user } = req
        const { action, tipo } = req.data
        let log

        log = await LogsRepository.create({
            user: user._id,
            action: action,
            acciones: [{ paso: "Inicio de la función", status: "Iniciado", timestamp: new Date() }]
        })

        const session = await db.Carnet.db.startSession();

        try {

            await session.withTransaction(async () => {

                const serial = await Seriales.get_seriales("Carnet", session)

                if (!serial || serial.length === 0) {
                    throw new Error("No se encontró el serial Carnet")
                }
                const carnet = serial[0]
                await registrarPasoLog(log._id, "Éxito", "Completado", "Serial encontrado");

                await TalentoHumanoDotacionCarnetsRepository.post_data({ type: tipo, serialNumber: carnet.serial }, { user })
                await registrarPasoLog(log._id, "Éxito", "Completado", "Dotación ingresar carnet completada exitosamente");

                await Seriales.modificar_seriales({ _id: carnet._id }, { serial: carnet.serial + 1 }, { session })
                await registrarPasoLog(log._id, "Éxito", "Completado", "Serial actualizado exitosamente");

            })

        } catch (err) {
            console.error(`[ERROR][${new Date().toISOString()}]`, err);
            await ErrorTalentHumanoLogicHandlers(err, log)
        } finally {
            await session.endSession();
            await registrarPasoLog(log._id, "Finalizado", "Completado", "Función completada exitosamente");
        }
    }
    static async get_talentoHumano_dotacion_carnets(req) {

        const { page, filtro } = req.data
        const resultsPerPage = 25;

        if (!filtro.tokenHash) {
            filtro.tokenHash = null
        } else {
            delete filtro.tokenHash
        }

        const query = { ...filtro }
        if (query.type === "TODOS") {
            delete query.type
        }
        if (query.status === "TODOS") {
            delete query.status
        }

        try {
            const data = await TalentoHumanoDotacionCarnetsRepository.get_data(
                { query, limit: resultsPerPage, skip: (page - 1) * resultsPerPage },
            )
            return data
        } catch (err) {
            console.error(`[ERROR][${new Date().toISOString()}]`, err);
            await ErrorTalentHumanoLogicHandlers(err)
        }
    }
    static async get_talentoHumano_dotacion_carnets_count(req) {

        try {
            const filtro = req.data.filtro

            if (!filtro.tokenHash) {
                filtro.tokenHash = null
            } else {
                delete filtro.tokenHash
            }
            const query = { ...filtro }
            if (query.type === "TODOS") {
                delete query.type
            }
            if (query.status === "TODOS") {
                delete query.status
            }
            const data = await TalentoHumanoDotacionCarnetsRepository.get_numero_registros(query)
            return data
        } catch (error) {
            console.error(`[ERROR][${new Date().toISOString()}]`, error);
            await ErrorTalentHumanoLogicHandlers(error)
        }
    }
}