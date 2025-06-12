import mongoose from "mongoose";
const { Schema } = mongoose;

export const defineAuditLogs = async (conn) => {

    const AuditLogSchema = new Schema({
        coleccion: String,
        documentId: mongoose.Schema.Types.ObjectId,
        operation: String,
        user: String,
        action: String,
        timestamp: { type: Date, default: Date.now },
        oldValue: mongoose.Schema.Types.Mixed,
        newValue: mongoose.Schema.Types.Mixed,
        changes: [{
            field: String,
            before: mongoose.Schema.Types.Mixed,
            after: mongoose.Schema.Types.Mixed
        }],
        description: String
    }, { timestamps: true });


    // Crear índice TTL explícitamente
    AuditLogSchema.index({ createdAt: 1 }, { expireAfterSeconds: 2 * 365 * 24 * 60 * 60 });


    const AuditLogs = conn.model("AuditLog", AuditLogSchema);
    return AuditLogs

}



