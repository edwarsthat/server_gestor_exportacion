import mongoose from "mongoose";
const { Schema } = mongoose;

export const defineSchemaAreasFisicas = async (conn,) => {

    const areasFisicasSchema = new Schema({
        nombre: { type: String, required: true },
        sede: { type: String, required: true },
    })

    const AreasFisicas = conn.model("areasFisicas", areasFisicasSchema);

    return AreasFisicas

}

