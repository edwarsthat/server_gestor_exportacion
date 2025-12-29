import mongoose from "mongoose";
const { Schema } = mongoose;

export const defineAuditPersonal = async (conn) => {

    const AuditPersonalSchema = new Schema({
        coleccion: String,
        documentId: { type: Schema.Types.ObjectId, ref: 'personal' },
        operation: String,
        user: { type: Schema.Types.ObjectId, ref: 'usuario' },
        action: String,
        oldValue: Schema.Types.Mixed,
        newValue: Schema.Types.Mixed,
        changes: [Schema.Types.Mixed],
        timestamp: { type: Date, default: Date.now },
        description: String
    }, { timestamps: true });


    // Crear índice TTL explícitamente
    AuditPersonalSchema.index({ createdAt: 1 }, { expireAfterSeconds: 2 * 365 * 24 * 60 * 60 });


    const AuditPersonal = conn.model("AuditPersonal", AuditPersonalSchema);
    return AuditPersonal
}   
