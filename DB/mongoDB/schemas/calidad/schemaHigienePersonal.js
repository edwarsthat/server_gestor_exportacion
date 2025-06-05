import mongoose from "mongoose";
const { Schema } = mongoose;

export const defineHigienePersonal = async (conn) => {

    const HigienePersonalSchema = new Schema({
        fecha: { type: Date, default: () => new Date() },
        operario: { type: Schema.Types.ObjectId, ref: "usuario" },
        responsable: { type: Schema.Types.ObjectId, ref: "usuario" },
        botas: Boolean,
        pantalon: Boolean,
        camisa: Boolean,
        tapaoidos: Boolean,
        cofia: Boolean,
        tapabocas: Boolean,
        uñas: Boolean,
        accesorios: Boolean,
        barba: Boolean,
        maquillaje: Boolean,
        salud: Boolean
    });

    const HigienePersonal = conn.model("HigienePersonal", HigienePersonalSchema);
    return HigienePersonal
}