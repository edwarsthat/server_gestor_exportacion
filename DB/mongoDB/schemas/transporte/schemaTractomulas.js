import mongoose from "mongoose";
const { Schema } = mongoose;

export const defineTractomulasSalida = async (conn) => {

    const TractomulasSalidaSchema = new Schema({
        codigo: String,
        transportadora: String,
        nit: String,
        placa: String,
        trailer: String,
        conductor: String,
        cedula: String,
        celular: String,
        temperatura: String,
        precinto: String,
        datalogger_id: String,
        flete: Number,
        marca: String,
        user: String,
        contenedor: { type: Schema.Types.ObjectId, ref: "Contenedor" },
        fecha: { type: Date, default: () => new Date() },
    });

    const tractomulasSalida = conn.model("tractomulasSalida", TractomulasSalidaSchema);
    return tractomulasSalida;
}

