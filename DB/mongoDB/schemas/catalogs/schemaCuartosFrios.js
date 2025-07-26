import mongoose from "mongoose";
const { Schema } = mongoose;


export const defineCuartosFrios = async (conn) => {

    const CuartoFrioSchema = new Schema({
        nombre: { type: String, required: true },
    });

    const CuartoFrio = conn.model("FrioCuarto", CuartoFrioSchema);
    return CuartoFrio

}
