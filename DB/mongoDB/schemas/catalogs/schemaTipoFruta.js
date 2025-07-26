import mongoose from "mongoose";
const { Schema } = mongoose;


export const defineTipoFrutas = async (conn) => {

    const TipoFrutaSchema = new Schema({
        tipoFruta: { type: String, required: true, unique: true, },
        valorPromedio: { type: Number, required: true, default: 19 },
        defectos: [String],
        rengoDeshidratacionPositiva: { type: Number, required: true, default: 2 },
        rengoDeshidratacionNegativa: { type: Number, required: true, default: -1 },
        calibres: [String],
        createdAt: { type: Date, default: () => new Date() }
    });

    const tipoFrutas = conn.model("tipoFrutas", TipoFrutaSchema);
    return tipoFrutas

}
