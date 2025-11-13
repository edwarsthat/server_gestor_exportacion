import mongoose from "mongoose";
import { makeAuditPlugin } from "../utils/auditPLug.js";
const { Schema } = mongoose;

export const defineInventarioDescarte2 = async (conn, AuditLog) => {

    const auditPlugin = makeAuditPlugin({ collectionName: 'inventarioDescarte2', AuditLogs: AuditLog });

    const InventarioDescarte2Schema = new Schema({
        fecha: { type: Date, default: () => new Date() },
        lote: { type: Schema.Types.ObjectId, ref: "lotes", required: true },
        tipoFruta: { type: Schema.Types.ObjectId, ref: "tipoFruta", required: true },
        area: { type: String, required: true },
        tipoDescarte: { type: String, required: true },
        kilos: { type: Number, required: true, min: 0, default: 0 },
        tipo: { type: String, required: true },

    })

    InventarioDescarte2Schema.index({ lote: 1, tipoDescarte: 1, tipo: 1 }, { unique: true });

    InventarioDescarte2Schema.plugin(auditPlugin);

    const InventariosDescarte2 = conn.model("inventarioDescarte2", InventarioDescarte2Schema);
    return InventariosDescarte2;
}

