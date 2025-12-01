import mongoose from "mongoose";
const { Schema } = mongoose;


export const defineTipoFrutas = async (conn) => {

    const descarteGenetalSchema = new Schema({
        key: String,
        nombre: String,
        observaciones: String,
    }, { _id: false });

    const TipoFrutaSchema = new Schema({
        tipoFruta: { type: String, required: true, unique: true, },
        valorPromedio: { type: Number, required: true, default: 19 },
        defectos: [String],
        rengoDeshidratacionPositiva: { type: Number, required: true, default: 2 },
        rengoDeshidratacionNegativa: { type: Number, required: true, default: -1 },
        calibres: [String],
        codExportacion: String,
        codNacional: String,
        createdAt: { type: Date, default: () => new Date() },
        descartes: { type: [{ type: Schema.Types.ObjectId, ref: 'descartes', required: true }] },
        descartesGenerales: [descarteGenetalSchema],
    });

    const tipoFrutas = conn.model("tipoFrutas", TipoFrutaSchema);
    return tipoFrutas

}
