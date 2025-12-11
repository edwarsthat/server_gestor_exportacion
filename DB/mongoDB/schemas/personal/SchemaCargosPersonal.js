import mongoose from "mongoose";
const { Schema } = mongoose;

export const defineSchemaCargosPersonal = async (conn,) => {

    const cargosPersonalSchema = new Schema({
        nombre: { type: String, required: true, unique: true },
        areasAcceso: [{ type: Schema.Types.ObjectId, ref: 'areasFisicas' }],
    })

    const CargosPersonal = conn.model("cargosPersonal", cargosPersonalSchema);

    return CargosPersonal

}

