import mongoose from "mongoose";
const { Schema } = mongoose;

export const defineInventarioDescarte = async (conn) => {


    const InventarioDescarteSchema = new Schema({
        fecha: { type: Date, default: () => new Date() },
        inventario: { type: Map, of: Number, default: {} },
        kilos_ingreso: { type: Map, of: Number, default: {} },
        kilos_salida: { type: Map, of: Number, default: {} },
    })

    const InvetariosDescarte = conn.model("inventarioDescarte", InventarioDescarteSchema);
    return InvetariosDescarte;
}

