import mongoose from "mongoose";
const { Schema } = mongoose;

export const defineInventarioMovimientosDescarte = async (conn) => {

    const InventarioActualDescarteMovimientoSchema = new Schema({
        fecha: { type: Date, default: () => new Date() },
        registroDescarte: { type: Schema.Types.ObjectId, ref: "inventarioActualDescarte", required: true },
        tipoMovimiento: { type: String, required: true },
        kilos: { type: Number, required: true, default: 0 },
        fechaMovimiento: { type: Date, default: () => new Date() },
        user: { type: Schema.Types.ObjectId, ref: "usuario", required: true },
        destino: { type: String, required: true },
        tipoRegistro: {
            type: String,
            required: true,
            trim: true,
            enum: {
                values: ['Lote', 'loteMaquila', 'Loteef8'],
                message: '{VALUE} no es un tipo de registro válido'
            },
            default: 'Lote'
        },
    })

    // Índice compuesto para queries comunes (sin unique)
    InventarioActualDescarteMovimientoSchema.index({
        registroDescarte: 1,
        fechaMovimiento: -1
    });

    // Índice para reportes por tipo y fecha
    InventarioActualDescarteMovimientoSchema.index({
        tipoMovimiento: 1,
        fechaMovimiento: -1
    });

    const InventariosMovimientoDescarte = conn.model("inventarioMovimientoDescarte", InventarioActualDescarteMovimientoSchema);
    return InventariosMovimientoDescarte;
}

