import mongoose from "mongoose";
const { Schema } = mongoose;


export const defineDescartes = async (conn) => {

    const descartesSchema = new Schema({
        _id: { type: Schema.Types.ObjectId, required: true, auto: true },
        nombre: { type: String, required: true },
        descripcion: { type: String, required: true },
        inventario: { type: Boolean, required: true, default: false },
        seccion: { type: String, required: true },
    })

    const descartes = conn.model("descartes", descartesSchema);
    return descartes

}
