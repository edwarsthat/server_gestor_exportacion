import mongoose from "mongoose";
const { Schema } = mongoose;


export const defineTipoFrutas = async (conn) => {

    const TipoFrutaSchema = new Schema({
        tipoFruta: { type: String, required: true, unique: true, },
        valorPromedio: { type: Number, required: true, default: 19 },
        defectos: [String],
        rengoDeshidratacionPositiva: Number,
        rengoDeshidratacionNegativa: Number,
        createdAt: { type: Date, default: () => new Date() }
    });

    const tipoFrutas = conn.model("tipoFrutas", TipoFrutaSchema);
    return tipoFrutas

}
