import { CalidadLogicError, ComercialLogicError, InventariosLogicError, ProcesoLogicError } from "../../../Error/logicLayerError.js";
import { TransporteError } from "../../../Error/TransporteErrors.js";
import { registrarPasoLog } from "../helper/logs.js";

export async function ErrorCalidadLogicHandlers(error, log) {
    try {
        // Log del error
        if (log && log._id) {
            await registrarPasoLog(log?._id, "Error", "Fallido", error.message);
        }
    } catch (logError) {
        console.error('CRÍTICO: Fallo al registrar el log del error principal.', logError);
        console.error('Error original que no se pudo registrar:', error);
    }
    if (error.status >= 500) {
        throw error
    }
    throw new CalidadLogicError(471, `Error ${error.type}: ${error.message}`)
}
export async function ErrorInventarioLogicHandlers(error, log) {
    try {
        // Log del error
        if (log && log._id) {
            await registrarPasoLog(log?._id, "Error", "Fallido", error.message);
        }
    } catch (logError) {
        console.error('CRÍTICO: Fallo al registrar el log del error principal.', logError);
        console.error('Error original que no se pudo registrar:', error);
    }
    if (error?.status >= 500) {
        throw error
    }
    throw new InventariosLogicError(472, `Error ${error?.type ?? 'Desconocido'}: ${error?.message ?? 'Sin mensaje'}`)
}
export async function ErrorComercialLogicHandlers(error, log) {
    try {
        // Log del error
        if (log && log._id) {
            await registrarPasoLog(log?._id, "Error", "Fallido", error.message);
        }
    } catch (logError) {
        console.error('CRÍTICO: Fallo al registrar el log del error principal.', logError);
        console.error('Error original que no se pudo registrar:', error);
    }
    if (error?.status >= 500) {
        throw error
    }
    throw new ComercialLogicError(472, `Error ${error?.type ?? 'Desconocido'}: ${error?.message ?? 'Sin mensaje'}`)
}
export async function ErrorProcesoLogicHandlers(error, log) {
    try {
        // Log del error
        if (log && log._id) {
            await registrarPasoLog(log?._id, "Error", "Fallido", error.message);
        }
    } catch (logError) {
        console.error('CRÍTICO: Fallo al registrar el log del error principal.', logError);
        console.error('Error original que no se pudo registrar:', error);
    }
    if (error?.status >= 500) {
        throw error
    }
    throw new ProcesoLogicError(472, `Error ${error?.type ?? 'Desconocido'}: ${error?.message ?? 'Sin mensaje'}`)
}
export async function ErrorTransporteLogicHandlers(error, log) {
    try {
        // Log del error
        if (log && log._id) {
            await registrarPasoLog(log?._id, "Error", "Fallido", error.message);
        }
    } catch (logError) {
        console.error('CRÍTICO: Fallo al registrar el log del error principal.', logError);
        console.error('Error original que no se pudo registrar:', error);
    }
    if (error?.status >= 500) {
        throw error
    }
    throw new TransporteError(472, `Error ${error?.type ?? 'Desconocido'}: ${error?.message ?? 'Sin mensaje'}`)
}