import mongoose from "mongoose";
const { Schema } = mongoose;

export const definePaises = async (conn) => {
    const PaisSchema = new Schema({
        nombre: { type: String, required: true, unique: true },
        codigo: { type: String, required: true, unique: true },
        activo: { type: Boolean, default: true }
    });

    const Paises = conn.model("c", PaisSchema);
    return Paises;
}