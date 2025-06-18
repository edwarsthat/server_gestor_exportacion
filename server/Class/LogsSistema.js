import fs from "fs";
import path from "path";
import { db } from "../../DB/mongoDB/config/init.js";

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
}