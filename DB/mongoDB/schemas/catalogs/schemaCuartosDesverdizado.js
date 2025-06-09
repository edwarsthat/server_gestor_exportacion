import mongoose from "mongoose";
const { Schema } = mongoose;


export const defineCuartosdesverdizado = async (conn) => {

    const CuartoDesverdizadoSchema = new Schema({
        nombre: { type: String, required: true },
    });

    const CuartoDesverdizado = conn.model("DesverdizadoCuarto", CuartoDesverdizadoSchema);
    return CuartoDesverdizado

}
