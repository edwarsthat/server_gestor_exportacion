import mongoose from "mongoose";
const { Schema } = mongoose;

export const defineSchemaCargosPersonal = async (conn,) => {

    const cargosPersonalSchema = new Schema({
        nombre: { type: String, required: true },
    })

    const CargosPersonal = conn.model("cargosPersonal", cargosPersonalSchema);

    return CargosPersonal

}

