import mongoose from "mongoose";
const { Schema } = mongoose;

export const definePallet = async (conn) => {

    const palletSchema = new Schema({
        numeroPallet: { type: Number, required: true },
        contenedor: { type: Schema.Types.ObjectId, ref: 'Contenedor', required: true, index: true },
        tipoCaja: String,
        calidad: { type: Schema.Types.ObjectId, ref: 'calidades', index: true, required: false },
        calibre: String,
        rotulado: { type: Boolean, default: false },
        paletizado: { type: Boolean, default: false },
        enzunchado: { type: Boolean, default: false },
        estadoCajas: { type: Boolean, default: false },
        estiba: { type: Boolean, default: false },
        finalizado: { type: Boolean, default: false },
        fechaFinalizado: Date,
        estado: { type: String, enum: ['abierto', 'cerrado', 'embarcado'], default: 'abierto', index: true },
        user: String,
        createdAt: { type: Date, default: Date.now }, 
    });

    palletSchema.index({ contenedor: 1, numeroPallet: 1 }, { unique: true });

    const Pallet = conn.model('Pallet', palletSchema);
    return Pallet;
}
