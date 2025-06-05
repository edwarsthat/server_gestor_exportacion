import mongoose from "mongoose";
const { Schema } = mongoose;

export const defineRecordProveedor = async (conn) => {


    const HistorialProveedoresSchema = new Schema({
        operacionRealizada: String,
        user: String,
        documento: Object,
        createdAt: { type: Date, expires: '2y', default: Date.now }
    }, { timestamps: true });


    const recordProveedor = conn.model("recordProveedor", HistorialProveedoresSchema);
    return recordProveedor;
}

