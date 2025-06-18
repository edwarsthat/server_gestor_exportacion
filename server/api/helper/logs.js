import { LogsRepository } from "../../Class/LogsSistema.js";

export async function registrarPasoLog(logId, paso, status, detalle = null) {
    const actionObj = { paso, status, timestamp: new Date() };
    if (detalle) actionObj.detalle = detalle;
    await LogsRepository.actualizar(
        { _id: logId },
        { $push: { acciones: actionObj } }
    );
}