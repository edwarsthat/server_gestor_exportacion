import mongoose from "mongoose";
import { makeAuditPlugin } from "../utils/auditPLug.js";
const { Schema } = mongoose;

export const defineSchemaCargosPersonal = async (conn, auditLog) => {

    const auditPlugin = makeAuditPlugin({ collectionName: 'cargosPersonal', AuditLogs: auditLog });

    const cargosPersonalSchema = new Schema({
        nombre: { type: String, required: true, unique: true },
        areasAcceso: [{ type: Schema.Types.ObjectId, ref: 'areasFisicas' }],
        areasAccesoParcial: [{ type: Schema.Types.ObjectId, ref: 'areasFisicas' }],
        color: { type: String, required: true, enum: ["#7EBA27", "#FFCD00", "#F3930D"] },
    })

    cargosPersonalSchema.plugin(auditPlugin);

    const CargosPersonal = conn.model("cargosPersonal", cargosPersonalSchema);

    return CargosPersonal

}

