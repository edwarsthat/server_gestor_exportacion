const mongoose = require("mongoose");
const { Schema } = mongoose;

const defineRecordProveedor = async (conn) => {


    const HistorialProveedoresSchema = new Schema({
        operacionRealizada: String,
        user: String,
        documento: Object,
        createdAt: { type: Date, expires: '2y', default: Date.now }
    }, { timestamps: true });


    const recordProveedor = conn.model("recordProveedor", HistorialProveedoresSchema);
    return recordProveedor;
}

module.exports.defineRecordProveedor = defineRecordProveedor;
