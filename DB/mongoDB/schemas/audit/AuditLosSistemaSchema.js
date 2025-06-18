import mongoose from "mongoose";
const { Schema } = mongoose;

export const defineAuditSistemaLogs = async (conn) => {

    const AuditLogSchema = new Schema({
        user: { type: Schema.Types.ObjectId, ref: 'usuario' },
        action: String,
        timestamp: { type: Date, default: Date.now },
        acciones: [{
            paso: String,
            status: String,
            timestamp: { type: Date, default: Date.now },
            detalle: String
        }],
    }, { timestamps: true });


    // Crear índice TTL explícitamente
    AuditLogSchema.index({ createdAt: 1 }, { expireAfterSeconds: 2 * 365 * 24 * 60 * 60 });


    const AuditLogs = conn.model("AuditSistemLog", AuditLogSchema);
    return AuditLogs

}



