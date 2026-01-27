import { procesoConn } from "../../DB/mongoDB/config/init.js";
import { registrarPasoLog } from "../api/helper/logs.js";
import { LogsRepository } from "../Class/LogsSistema.js";
import { GlobalControllerErrorHandler } from "./ErrorHandler.js";


export const executeTransactionalTask = async (req, taskLogic) => {
    let log;
    const { user, data } = req;
    const { action } = data;

    // 1. Verificamos que la conexión esté lista
    if (!procesoConn || procesoConn.readyState !== 1) {
        throw new Error("La conexión a la base de datos de proceso no está lista.");
    }

    // 2. Iniciamos la sesión desde la conexión exportada
    const session = await procesoConn.startSession();

    // 3. Log inicial (fuera de la transacción para que persista si esta falla)
    log = await LogsRepository.create({
        user: user,
        action: action || "Acción sin nombre",
        acciones: [{ paso: "Inicio de la función", status: "Iniciado", timestamp: new Date() }]
    });

    try {
        let result;
        // withTransaction maneja commit y abort automáticamente
        await session.withTransaction(async () => {
            // Ejecutamos la lógica que pasaste por parámetro
            result = await taskLogic(session, log);
        });

        return result;
    } catch (error) {
        console.error(`[ERROR TRANSACTION][${new Date().toISOString()}]`, error);
        await GlobalControllerErrorHandler(error, log, "executeTransactionalTask");
        throw error;
    } finally {
        // 4. Siempre cerramos la sesión
        await session.endSession();
        if (log?._id) {
            await registrarPasoLog(log._id, "Finalizó la función", "Completado").catch(console.error);
        }
    }
};
export const executeQueryTask = async (taskLogic) => {
    if (!procesoConn || procesoConn.readyState !== 1) {
        throw new Error("La conexión a la base de datos de proceso no está lista.");
    }
    try {
        return await taskLogic();
    } catch (error) {
        console.error(`[ERROR QUERY][${new Date().toISOString()}]`, error);
        await GlobalControllerErrorHandler(error);
        throw error;
    }
};