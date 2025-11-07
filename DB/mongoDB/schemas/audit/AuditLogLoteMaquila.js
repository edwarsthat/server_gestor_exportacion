import mongoose from "mongoose";
const { Schema } = mongoose;

export const defineAuditLoteMaquila = async (conn) => {

    const AuditLoteMaquilaSchema = new Schema({
        documentId: { type: Schema.Types.ObjectId, ref: 'loteMaquila' },
        operation: String,
        user: String,
        action: String,
        timestamp: { type: Date, default: Date.now },
        description: String
    }, { timestamps: true });


    // Crear índice TTL explícitamente
    AuditLoteMaquilaSchema.index({ createdAt: 1 }, { expireAfterSeconds: 2 * 365 * 24 * 60 * 60 });


    const AuditLoteMaquila = conn.model("AuditLoteMaquila", AuditLoteMaquilaSchema);
    return AuditLoteMaquila
}
