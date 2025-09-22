import mongoose from "mongoose";
const { Schema } = mongoose;

export const defineAuditInventariosSimples = async (conn) => {

    const AuditLogsInventariosSimplesSchema = new Schema({
        documentId: { type: Schema.Types.ObjectId, ref: 'InventarioSimple' },
        operation: String,
        user: String,
        action: String,
        timestamp: { type: Date, default: Date.now },
        description: String
    }, { timestamps: true });


    // Crear índice TTL explícitamente
    AuditLogsInventariosSimplesSchema.index({ createdAt: 1 }, { expireAfterSeconds: 2 * 365 * 24 * 60 * 60 });


    const AuditInventariosSimples = conn.model("AuditInventariosSimples", AuditLogsInventariosSimplesSchema);
    return AuditInventariosSimples
}
