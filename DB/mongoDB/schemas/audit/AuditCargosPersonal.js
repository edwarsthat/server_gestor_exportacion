import mongoose from "mongoose";
const { Schema } = mongoose;

export const defineAuditCargosPersonal = async (conn) => {



    const AuditCargosPersonalSchema = new Schema({
        coleccion: String,
        documentId: { type: Schema.Types.ObjectId, ref: 'cargosPersonal' },
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
    AuditCargosPersonalSchema.index({ createdAt: 1 }, { expireAfterSeconds: 2 * 365 * 24 * 60 * 60 });


    const AuditCargosPersonal = conn.model("AuditCargosPersonal", AuditCargosPersonalSchema);
    return AuditCargosPersonal
}   
