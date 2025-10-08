import mongoose from "mongoose";
const { Schema } = mongoose;


export const defineCalidades = async (conn) => {

    const calidadesSchema = new Schema({
        _id: { type: Schema.Types.ObjectId, required: true, auto: true },
        nombre: { type: String, required: true },
        descripcion: { type: String, required: true },
        importancia: { type: Number, required: true },
        codContabilidad: { type: String, required: true },
        tipoFruta : { type: Schema.Types.ObjectId, ref: 'tipoFrutas', required: true, index: true },
    })

    const calidades = conn.model("calidades", calidadesSchema);
    return calidades

}
