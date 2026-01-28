import mongoose from "mongoose";
import { makeAuditPlugin } from "../utils/auditPLug.js";
const { Schema } = mongoose;

export const defineSchemaPersonal = async (conn, auditLog) => {

    const auditPlugin = makeAuditPlugin({ collectionName: 'personal', AuditLogs: auditLog });

    const personalSchema = new Schema({
        SKU: { type: Number, required: true, unique: true },
        nombre: { type: String, required: true },
        cargo: { type: Schema.Types.ObjectId, ref: 'cargosPersonal' },
        identificacion: { type: String, required: true, unique: true },
        tipoDocumento: { type: String, required: true },
        foto: { type: String },
        tipoSangre: { type: String },
        urlIdentificacion: { type: String, required: true },
        urlFotoCarnet: { type: String, required: true },
        estado: { type: Boolean, required: true, default: true },
        carnet: { type: Schema.Types.ObjectId, ref: 'carnet', default: null },
    })

    personalSchema.index(
        { SKU: 1, cargo: 1 },
        { name: 'idx_sku_cargo' }
    );
    personalSchema.index(
        { carnet: 1 },
        { name: 'idx_carnet' }
    );

    personalSchema.plugin(auditPlugin);

    const Personal = conn.model("personal", personalSchema);

    return Personal

}

