import mongoose from "mongoose";
const { Schema } = mongoose;


export const defineSeriales = async (conn) => {

    const SerialesSchema = new Schema({
        name: { type: String, required: true, unique: true },
        serial: { type: Number, required: true }
    });

    const seriales = conn.model("seriale", SerialesSchema);
    return seriales
}
