import mongoose from "mongoose";
const { Schema } = mongoose;

export const defineAuditInventarioDescarte = async (conn) => {

    const AuditInventarioDescarte2Schema = new Schema({
        documentId: { type: Schema.Types.ObjectId, ref: 'inventarioDescarte2' },
        operation: String,
        user: String,
        action: String,
        timestamp: { type: Date, default: Date.now },
        description: String
    }, { timestamps: true });

    // Crear índice TTL explícitamente
    AuditInventarioDescarte2Schema.index({ createdAt: 1 }, { expireAfterSeconds: 2 * 365 * 24 * 60 * 60 });

    const AuditInventarioDescarte2 = conn.model("AuditInventarioDescarte2", AuditInventarioDescarte2Schema);
    return AuditInventarioDescarte2
}
