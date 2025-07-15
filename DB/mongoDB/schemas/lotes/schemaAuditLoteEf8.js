import mongoose from "mongoose";
const { Schema } = mongoose;

export const defineAuditLogsLoteEF8 = async (conn) => {

    const ChangeSchema = new Schema({
        field: String,
        before: mongoose.Schema.Types.Mixed,
        after: mongoose.Schema.Types.Mixed
    }, { _id: false });
    
    const AuditLogSchema = new Schema({
        coleccion: String,
        documentId: mongoose.Schema.Types.ObjectId,
        operation: String,
        user: String,
        action: String,
        timestamp: { type: Date, default: Date.now },
        changes: [ChangeSchema],
    }, { timestamps: true });


    // Crear índice TTL explícitamente
    AuditLogSchema.index({ createdAt: 1 }, { expireAfterSeconds: 2 * 365 * 24 * 60 * 60 });


    const AuditLogs = conn.model("AuditLogEF8", AuditLogSchema);
    return AuditLogs

}



