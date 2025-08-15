import mongoose from "mongoose";
const { Schema } = mongoose;

export const definePrecios = async (conn) => {

    const calidadesSchema = new Schema({
        _id: { type: Schema.Types.ObjectId, required: true, auto: true },
        nombre: { type: String, required: true },
        descripcion: { type: String, required: true },
        precio: { type: Number, required: true },
    })

    const PreciosSchema = new Schema({
        fecha: { type: Date, default: () => new Date() },
        tipoFruta: String,
        exportacion: { type: Map, of: Number },
        frutaNacional: { type: Number, default: 0 },
        descarte: { type: Number, default: 0 },
        predios: [String],
        calidades: [calidadesSchema],
        week: Number,
        year: Number,
        comentario: String
    })

    const Precios = conn.model("precio", PreciosSchema);
    return Precios;
}

