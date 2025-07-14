import mongoose from "mongoose";
const { Schema } = mongoose;

export const defineAuditLogsLoteEF8 = async (conn) => {

    const AuditLogSchema = new Schema({
        coleccion: String,
        documentId: mongoose.Schema.Types.ObjectId,
        operation: String,
        user: String,
        action: String,
        timestamp: { type: Date, default: Date.now },
        changes: [{
            field: String,
            before: mongoose.Schema.Types.Mixed,
            after: mongoose.Schema.Types.Mixed
        }],
    }, { timestamps: true });


    // Crear índice TTL explícitamente
    AuditLogSchema.index({ createdAt: 1 }, { expireAfterSeconds: 2 * 365 * 24 * 60 * 60 });


    const AuditLogs = conn.model("AuditLogEF8", AuditLogSchema);
    return AuditLogs

}



