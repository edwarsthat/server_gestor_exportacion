import mongoose from "mongoose";
const { Schema } = mongoose;

export const defineAuditDescartes = async (conn) => {

    const descarteLavadoSchema = new Schema({
        descarteGeneral: { type: Number, default: 0 },
        pareja: { type: Number, default: 0 },
        balin: { type: Number, default: 0 },
        descompuesta: { type: Number, default: 0 },
        piel: { type: Number, default: 0 },
        hojas: { type: Number, default: 0 },
    }, { _id: false });


    const descarteEnceradoSchema = new Schema({
        descarteGeneral: { type: Number, default: 0 },
        pareja: { type: Number, default: 0 },
        balin: { type: Number, default: 0 },
        extra: { type: Number, default: 0 },
        descompuesta: { type: Number, default: 0 },
        suelo: { type: Number, default: 0 },
    }, { _id: false });


    const descarteIngresoSchema = new Schema({
        user: { type: String, required: true },
        userID: { type: mongoose.Schema.Types.ObjectId, required: true, ref: "usuario" },
        loteID: { type: mongoose.Schema.Types.ObjectId, required: true, ref: "lote" },
        enf: String,
        tipoFruta: String,
        descarteEncerado: descarteEnceradoSchema,
        descarteLavado: descarteLavadoSchema,
    }, { timestamps: true });


    // Crear índice TTL explícitamente
    descarteIngresoSchema.index({ createdAt: 1 }, { expireAfterSeconds: 2 * 365 * 24 * 60 * 60 });


    const ingresosDescarte = conn.model("ingresos_descarte", descarteIngresoSchema);
    return ingresosDescarte

}



