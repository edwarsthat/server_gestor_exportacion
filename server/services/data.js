import { registrarPasoLog } from "../api/helper/logs.js";
import { Seriales } from "../Class/Seriales.js";

export class dataService {
    static async get_ef8_serial(fecha = null, logId, session = null) {
        const EF8 = await Seriales.get_seriales("EF8-", session);
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
    static async get_ef1_serial(fecha = null) {
        const EF1Docs = await Seriales.get_seriales("EF1-");
        if (!EF1Docs || EF1Docs.length === 0) {
            throw new Error("No se encontraron registros de EF1");
        }
        if (EF1Docs.length > 1) {
            throw new Error("Se encontraron múltiples registros de EF1, se esperaba uno solo");
        }
        const EF1 = EF1Docs[0];
        if (!Number.isFinite(EF1.serial) || EF1.serial < 0) {
            throw new Error("El campo 'serial' no es un número válido en el registro de EF1");
        }
        if (!EF1.name || typeof EF1.name !== 'string') {
            throw new Error("El campo 'name' no existe o no es válido");
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
        if (EF1.serial < 10) {
            enf = EF1.name + year + month + "0" + EF1.serial;
        } else {
            enf = EF1.name + year + month + EF1.serial;
        }

        return enf;
    }
    static async get_ef10_serial(fecha = null, logId) {
        const EF10 = await Seriales.get_seriales("EF10-");
        if (!EF10 || EF10.length === 0) {
            throw new Error("No se encontraron registros de EF10");
        }
        if (EF10.length > 1) {
            throw new Error("Se encontraron múltiples registros de EF1, se esperaba uno solo");
        }
        if (!EF10[0].serial || typeof EF10[0].serial !== 'number') {
            throw new Error("El campo 'serial' no es un número o no existe en el registro de EF10");
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
        if (EF10[0].serial < 10) {
            enf = EF10[0].name + year + month + "0" + EF10[0].serial;
        } else {
            enf = EF10[0].name + year + month + EF10[0].serial;
        }


        if (logId) {
            await registrarPasoLog(logId, "dataService.get_ef10_serial", "Completado");
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
    static async get_Celifrut_serial(session = null) {
        const idCelifrut = await Seriales.modificar_seriales(
            { name: "Celifrut-" },
            { $inc: { serial: 1 } },
            { new: false, session }
        );
        if (!idCelifrut.serial || typeof idCelifrut.serial !== 'number') {
            throw new Error("El campo 'serial' no es un número o no existe en el registro de idCelifrut");
        }
        return idCelifrut.name + idCelifrut.serial;
    }
    static async get_formatoCalidad_serial(options = {}) {
        let { fecha = null, session = null } = options;
        const CADocs = await Seriales.get_seriales("CA-", session);
        if (!CADocs || CADocs.length === 0) {
            throw new Error("No se encontraron registros de CA");
        }
        if (CADocs.length > 1) {
            throw new Error("Se encontraron múltiples registros de CA, se esperaba uno solo");
        }
        const CA = CADocs[0];
        if (!Number.isFinite(CA.serial) || CA.serial < 0) {
            throw new Error("El campo 'serial' no es un número válido en el registro de CA");
        }
        if (!CA.name || typeof CA.name !== 'string') {
            throw new Error("El campo 'name' no existe o no es válido");
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
        let codigo;
        if (CA.serial < 10) {
            codigo = CA.name + year + month + "0" + CA.serial;
        } else {
            codigo = CA.name + year + month + CA.serial;
        }

        return codigo;
    }
    static async modificar_formatoCalidad_serial(serial, logId = null) {
        await Seriales.modificar_seriales(
            { name: "CA-" },
            { $set: { serial: serial } },
        )

        if (logId) {
            await registrarPasoLog(logId, "dataService.modificar_formatoCalidad_serial", "Completado");
        }
    }
}