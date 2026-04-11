import mongoose from "mongoose";
const { Schema } = mongoose;

export const defineVolanteCalidad = async (conn) => {

    const VolanteCalidadSchema = new Schema({
       tipoFruta: { type: Schema.Types.ObjectId, ref: 'tipoFrutas', index: true },
        unidades: Number,
        pesoParametro: Number,
        pesoReal: Number,
        defectos: Number,
        calibre: String,
        fecha: { type: Date, default: () => Date.now() },
        operario: { type: Schema.Types.ObjectId, ref: "personal", index: true },
        responsable: { type: Schema.Types.ObjectId, ref: "usuario" },
    });

    const VolanteCalidad = conn.model("VolanteCalidad", VolanteCalidadSchema);
    return VolanteCalidad
}

