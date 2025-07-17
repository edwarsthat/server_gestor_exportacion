import { registrarPasoLog } from "../api/helper/logs.js";
import { Seriales } from "../Class/Seriales.js";

export class dataService {
    static async get_ef8_serial(fecha = null, logId) {
        const EF8 = await Seriales.get_seriales("EF8-");
        if (!EF8 || EF8.length === 0) {
            throw new Error("No se encontraron registros de EF8");
        }
        if (EF8.length > 1) {
            throw new Error("Se encontraron múltiples registros de EF8, se esperaba uno solo");
        }
        if (!EF8[0].serial || typeof EF8[0].serial !== 'number') {
            throw new Error("El campo 'serial' no es un número o no existe en el registro de EF8");
        }
        if (fecha) {
            fecha = new Date(fecha);
            if (isNaN(fecha.getTime())) {
                throw new Error("Fecha inválida proporcionada");
            }
        } else {
            fecha = new Date();
        }
        let year = fecha.getFullYear().toString().slice(-2);
        let month = String(fecha.getMonth() + 1).padStart(2, "0");
        let enf;
        if (EF8[0].serial < 10) {
            enf = EF8[0].name + year + month + "0" + EF8[0].serial;
        } else {
            enf = EF8[0].name + year + month + EF8[0].serial;
        }

        if (logId) {
            await registrarPasoLog(logId, "dataService.get_ef8_serial", "Completado");
        }

        return enf;
    }
    static async modificar_ef8_serial(serial, logId = null) {
        await Seriales.modificar_seriales(
            { name: "EF8-" },
            { $set: { serial: serial } },
        )

        if (logId) {
            await registrarPasoLog(logId, "dataService.modificar_ef8_serial", "Completado");
        }
    }
    static async get_ef1_serial(fecha = null, logId) {
        const EF1 = await Seriales.get_seriales("EF1-");
        if (!EF1 || EF1.length === 0) {
            throw new Error("No se encontraron registros de EF1");
        }
        if (EF1.length > 1) {
            throw new Error("Se encontraron múltiples registros de EF8, se esperaba uno solo");
        }
        if (!EF1[0].serial || typeof EF1[0].serial !== 'number') {
            throw new Error("El campo 'serial' no es un número o no existe en el registro de EF8");
        }
        if (fecha) {
            fecha = new Date(fecha);
            if (isNaN(fecha.getTime())) {
                throw new Error("Fecha inválida proporcionada");
            }
        } else {
            fecha = new Date();
        }
        let year = fecha.getFullYear().toString().slice(-2);
        let month = String(fecha.getMonth() + 1).padStart(2, "0");
        let enf;
        if (EF1[0].serial < 10) {
            enf = EF1[0].name + year + month + "0" + EF1[0].serial;
        } else {
            enf = EF1[0].name + year + month + EF1[0].serial;
        }

        if (logId) {
            await registrarPasoLog(logId, "dataService.get_ef8_serial", "Completado");
        }

        return enf;
    }
    static async modificar_ef1_serial(serial, logId = null) {
        await Seriales.modificar_seriales(
            { name: "EF1-" },
            { $set: { serial: serial } },
        )

        if (logId) {
            await registrarPasoLog(logId, "dataService.modificar_ef1_serial", "Completado");
        }
    }
}