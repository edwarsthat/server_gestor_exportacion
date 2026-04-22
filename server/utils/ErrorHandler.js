import { registrarPasoLog } from "../api/helper/logs.js";
import { ZodError } from "zod";

export class AppError extends Error {
    constructor(status, message) {
        super();
        this.name = "AppError";
        this.status = status;
        this.message = message;
        this.type = status >= 500 ? "System" : "Logic";
    }
}

/**
 * Formatea los errores de Zod en un mensaje legible
 * @param {ZodError} zodError - Error de validación de Zod
 * @returns {string} Mensaje formateado
 */
function formatZodError(zodError) {
    const errors = zodError.errors || zodError.issues || [];

    if (errors.length === 0) {
        return "Error de validación";
    }

    if (errors.length === 1) {
        const err = errors[0];
        const field = err.path.join('.') || 'valor';
        return `${field}: ${err.message}`;
    }

    // Múltiples errores: agrupar por campo
    const formattedErrors = errors.map(err => {
        const field = err.path.join('.') || 'valor';
        return `• ${field}: ${err.message}`;
    });

    return `Errores de validación:\n${formattedErrors.join('\n')}`;
}

export async function GlobalControllerErrorHandler(error, log = null) {
    let status = error.status || 500;
    let message = error.message || "Error inesperado";
    let type = error.type || "System";

    if (error instanceof ZodError || error.name === 'ZodError') {
        status = 400;
        type = "Validation";
        message = formatZodError(error);
    }

    if (log?._id) {
        await registrarPasoLog(log._id, "Error", "Fallido", `[${type}] ${message}`);
    }

    // Errores >= 500 pueden tener detalles internos — se reemplaza el mensaje antes de enviarlo al cliente
    const clientMessage = status >= 500 ? "Error interno del servidor" : message;

    throw { status, message: clientMessage, type };
}