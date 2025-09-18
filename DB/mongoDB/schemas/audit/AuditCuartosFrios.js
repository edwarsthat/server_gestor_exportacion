import mongoose from "mongoose";
const { Schema } = mongoose;

export const defineAuditCuartosFrios = async (conn) => {

    const AuditLogsCuartosFriosSchema = new Schema({
        documentId: { type: Schema.Types.ObjectId, ref: 'FrioCuarto' },
        operation: String,
        user: String,
        action: String,
        timestamp: { type: Date, default: Date.now },
        description: String
    }, { timestamps: true });


    // Crear índice TTL explícitamente
    AuditLogsCuartosFriosSchema.index({ createdAt: 1 }, { expireAfterSeconds: 2 * 365 * 24 * 60 * 60 });


    const AuditCuartosFrios = conn.model("AuditCuartosFrios", AuditLogsCuartosFriosSchema);
    return AuditCuartosFrios
}
