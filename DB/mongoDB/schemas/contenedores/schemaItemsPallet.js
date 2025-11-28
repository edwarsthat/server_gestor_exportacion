import mongoose from "mongoose";
import { makeAuditPlugin } from "../utils/auditPLug.js";
const { Schema } = mongoose;

export const defineItemPallet = async (conn, AuditLog) => {


    const auditPlugin = makeAuditPlugin({ collectionName: 'ItemPallet', AuditLogs: AuditLog });


    const itemPalletSchema = new Schema({
        pallet: { type: Schema.Types.ObjectId, ref: 'Pallet', required: true, index: true },
        contenedor: { type: Schema.Types.ObjectId, ref: 'Contenedor', required: true, index: true },
        lote: {
            type: Schema.Types.ObjectId,
            required: true,
            refPath: 'loteType',
            index: true
        },
        loteType: {
            type: String,
            required: true,
            default: 'Lote',
            enum: ['Lote', 'loteMaquila']
        },
        tipoCaja: String,
        calibre: String,
        calidad: { type: Schema.Types.ObjectId, ref: 'calidades', index: true, required: false },
        fecha: { type: Date, index: true },
        tipoFruta: { type: Schema.Types.ObjectId, ref: 'tipoFrutas', required: true, index: true },
        SISPAP: { type: Boolean, default: false },
        GGN: { type: Boolean, default: false },
        kilos: Number,
        user: { type: Schema.Types.ObjectId, ref: 'usuario' },
        cajas: { type: Number, default: 0 },
    });

    itemPalletSchema.index({ contenedor: 1, pallet: 1 });
    itemPalletSchema.index({ pallet: 1, lote: 1 });

    itemPalletSchema.plugin(auditPlugin);


    const ItemPallet = conn.model('ItemPallet', itemPalletSchema);
    return ItemPallet;
}
