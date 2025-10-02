import mongoose from "mongoose";
const { Schema } = mongoose;

export const defineTractomulasSalida = async (conn) => {

    const TractomulasSalidaSchema = new Schema({
        codigo: String,
        placa: String,
        conductor: String,
        cedula: String,
        celular: String,
        precinto: [String],
        flete: Number,
        unidadCarga: String,
        pesoEstimado: Number,
        user: String,
        contenedor: { type: Schema.Types.ObjectId, ref: "Contenedor" },
        fecha: { type: Date, default: () => new Date() },
    });

    const tractomulasSalida = conn.model("tractomulasSalida", TractomulasSalidaSchema);
    return tractomulasSalida;
}
