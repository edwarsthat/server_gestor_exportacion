import mongoose from "mongoose";
const { Schema } = mongoose;

export const defineItemPallet = async (conn) => {

    const itemPalletSchema = new Schema({
        pallet: { type: Schema.Types.ObjectId, ref: 'Pallet', required: true, index: true },
        contenedor: { type: Schema.Types.ObjectId, ref: 'Contenedor', required: true, index: true },
        lote: { type: Schema.Types.ObjectId, ref: 'Lote', required: true, index: true },
        tipoCaja: String,
        calibre: String,
        calidad: { type: Schema.Types.ObjectId, ref: 'calidades', index: true, required: false },
        fecha: { type: Date, index: true },
        tipoFruta: { type: Schema.Types.ObjectId, ref: 'tipoFrutas', required: true, index: true },
        SISPAP: { type: Boolean, default: false },
        GGN: { type: Boolean, default: false },
        kilos: Number,
        user: String,
        cajas: { type: Number, default: 0 },
    });

    itemPalletSchema.index({ contenedor: 1, pallet: 1 });
    itemPalletSchema.index({ pallet: 1, lote: 1 });

    const ItemPallet = conn.model('ItemPallet', itemPalletSchema);
    return ItemPallet;
}
