import mongoose from "mongoose";
const { Schema } = mongoose;

export const defineInventarioDescarte = async (conn) => {

    const InventarioDescarteSchema = new Schema({
        fecha: { type: Date, default: () => new Date() },
        inventario: { type: Object, default: {} },
        kilos_ingreso: { type: Object, default: {} },
        kilos_salida: { type: Object, default: {} },
    })

    const InvetariosDescarte = conn.model("inventarioDescarte", InventarioDescarteSchema);
    return InvetariosDescarte;
}

