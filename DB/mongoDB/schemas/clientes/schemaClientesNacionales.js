
import mongoose from "mongoose";
const { Schema } = mongoose;

export const defineClientesNacionales = async (conn) => {

    const ClienteNacionalSchema = new Schema({
        codigo: { type: String, unique: true, required: true },
        cliente: { type: String, unique: true, required: true },
        ubicacion: String,
        canastillas: Number,
        createdAt: { type: Date, default: () => new Date() }
    });

    const Clientes = conn.model("ClientesNacionale", ClienteNacionalSchema);
    return Clientes
}

