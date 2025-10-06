import mongoose from "mongoose";
const { Schema } = mongoose;

export const defineAuditRegistroExportacionVehiculo = async (conn) => {

    const AuditRegistroExportacionVehiculoSchema = new Schema({
        documentId: { type: Schema.Types.ObjectId, ref: 'salidaVehiculo' },
        operation: String,
        user: String,
        action: String,
        timestamp: { type: Date, default: Date.now },
        description: String
    }, { timestamps: true });


    // Crear índice TTL explícitamente
    AuditRegistroExportacionVehiculoSchema.index({ createdAt: 1 }, { expireAfterSeconds: 2 * 365 * 24 * 60 * 60 });


    const AuditRegistroExportacionVehiculo = conn.model("AuditRegistroExportacionVehiculo", AuditRegistroExportacionVehiculoSchema);
    return AuditRegistroExportacionVehiculo
}
