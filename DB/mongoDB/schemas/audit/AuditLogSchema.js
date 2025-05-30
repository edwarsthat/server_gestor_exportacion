const mongoose = require("mongoose");
const { Schema } = mongoose;

const defineAuditLogs = async (conn) => {


    const AuditLogSchema  = new Schema({
        collection: String,
        documentId: mongoose.Schema.Types.ObjectId,
        operation: String,
        user: String,
        action: String,
        timestamp: { type: Date, default: Date.now },
        oldValue: mongoose.Schema.Types.Mixed,
        newValue: mongoose.Schema.Types.Mixed,
        description: String
    }, { timestamps: true });


    // Crear índice TTL explícitamente
    AuditLogSchema.index({ createdAt: 1 }, { expireAfterSeconds: 2 * 365 * 24 * 60 * 60 });


    const AuditLogs = conn.model("AuditLog", AuditLogSchema);
    return AuditLogs

}

module.exports.defineAuditLogs = defineAuditLogs;

