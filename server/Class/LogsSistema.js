import fs from "fs";
import path from "path";
import { db } from "../../DB/mongoDB/config/init.js";
import { registrarPasoLog } from "../api/helper/logs.js";

function logErrorToFile(err, context = "") {
    const logPath = path.resolve(process.cwd(), "logs", "logs_errors.txt");
    const timestamp = new Date().toISOString();
    const msg = `[${timestamp}] ${context ? `[${context}]` : ""} ${err.stack || err}\n\n`;
    fs.mkdirSync(path.dirname(logPath), { recursive: true });
    fs.appendFileSync(logPath, msg);
}

export class LogsRepository {
    static async create(data) {
        try {
            const log = new db.Logs(data);
            const saveLote = await log.save();
            return saveLote
        } catch (err) {
            logErrorToFile(err, "LogsRepository.create");
            console.error("Error creating log:", err);
        }
    }
    static async actualizar(filter, update, options = {}) {
        try {
            const documentoActualizado = await db.Logs.findOneAndUpdate(
                filter,
                update,
                options,
            );
            return documentoActualizado;
        } catch (err) {
            logErrorToFile(err, "LogsRepository.actualizar");
            console.error("Error updating log:", err);
        }
    }
    static async createReporteIngresoDescarte(data, logID = null) {
        try {
            // Validar que los campos requeridos estén presentes
            if (!data.user || !data.userID) {
                throw new Error("Los campos 'user' y 'userID' son requeridos");
            }

            // Crear la estructura de datos con valores por defecto si no se proporcionan
            const reporteData = {
                user: data.user,
                userID: data.userID,
                descarteEncerado: {
                    descarteGeneral: data.descarteEncerado?.descarteGeneral || 0,
                    pareja: data.descarteEncerado?.pareja || 0,
                    balin: data.descarteEncerado?.balin || 0,
                    extra: data.descarteEncerado?.extra || 0,
                    descompuesta: data.descarteEncerado?.descompuesta || 0,
                    suelo: data.descarteEncerado?.suelo || 0,
                },
                descarteLavado: {
                    descarteGeneral: data.descarteLavado?.descarteGeneral || 0,
                    pareja: data.descarteLavado?.pareja || 0,
                    balin: data.descarteLavado?.balin || 0,
                    descompuesta: data.descarteLavado?.descompuesta || 0,
                    piel: data.descarteLavado?.piel || 0,
                    hojas: data.descarteLavado?.hojas || 0,
                }
            };

            const reporte = new db.IngresoDescartes(reporteData);
            const savedReporte = await reporte.save();

            if (logID) {
                await registrarPasoLog(logID, "LogsRepository.createReporteIngresoDescarte", "Completado");
            }
            return savedReporte;
        } catch (err) {
            logErrorToFile(err, "LogsRepository.createReporteIngresoDescarte");
            console.error("Error creating reporte ingreso descarte:", err);
            throw err;
        }
    }

    static async getReportesIngresoDescarte(filter = {}, options = {}) {
        try {
            const reportes = await db.IngresoDescartes.find(filter, null, options)
                .populate('userID', 'nombre email')
                .sort({ createdAt: -1 });
            return reportes;
        } catch (err) {
            logErrorToFile(err, "LogsRepository.getReportesIngresoDescarte");
            console.error("Error getting reportes ingreso descarte:", err);
            throw err;
        }
    }
}