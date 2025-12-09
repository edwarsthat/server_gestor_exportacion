import mongoose from "mongoose";
const { Schema } = mongoose;

export const defineHabilitarEstancia = async (conn) => {

    const HabilitarEstanciaSchema = new Schema({
        createdAt: { type: Date, default: () => new Date() },
        user: { type: mongoose.Schema.Types.ObjectId, ref: "usuarios" },
        lote: {
            type: Schema.Types.ObjectId,
            required: true,
            refPath: 'loteType'
        },
        loteType: {
            type: String,
            required: true,
            trim: true,
            enum: {
                values: ['Lote', 'loteMaquila', 'Loteef8'],
                message: '{VALUE} no es un tipo de registro válido'
            },
            default: 'Lote'
        },
        motivo: { type: String, required: true },
        justificacion: { type: String, required: true },
    })

    const habilidateEstancia = conn.model("habilitarEstancia", HabilitarEstanciaSchema);
    return habilidateEstancia;
}

