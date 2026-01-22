import { registrarPasoLog } from "../api/helper/logs.js";

export async function GlobalControllerErrorHandler(error, log = null) {
    const status = error.status || 500;
    const message = error.message || "Error inesperado";
    const type = error.type || "System";

    if (log?._id) {
        await registrarPasoLog(log._id, "Error", "Fallido", `[${type}] ${message}`);
    }

    throw { status, message, type };
}