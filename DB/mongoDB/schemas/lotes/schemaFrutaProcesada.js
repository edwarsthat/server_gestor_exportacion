import mongoose from "mongoose";
const { Schema } = mongoose;

export const defineFrutaProcesada = async (conn) => {

    const FrutaProcesadaSchema = new Schema({
        loteId: {
            type: Schema.Types.ObjectId,
            required: true,
            refPath: 'loteType'
        },
        loteType: {
            type: String,
            required: true,
            enum: ['Lote', 'loteMaquila']
        },
        fechaProcesamiento: { type: Date, default: Date.now },
        tipoFruta: { type: Schema.Types.ObjectId, ref: 'tipoFrutas' },
        predio: { type: Schema.Types.ObjectId, ref: 'Proveedor' },
        promedio: Number,
        canastillas: Number,
        detalles: Object,
        createdAt: { type: Date, default: Date.now },
        user: { type: Schema.Types.ObjectId, ref: 'usuario' },
    }, { timestamps: true });

    const FrutaProcesadaModel = conn.model("frutaProcesada", FrutaProcesadaSchema);
    return FrutaProcesadaModel;
}