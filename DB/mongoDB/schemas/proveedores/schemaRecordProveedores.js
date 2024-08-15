const mongoose = require("mongoose");
const { Schema } = mongoose;

const conn = mongoose.createConnection(process.env.MONGODB_PROCESO);


const HistorialProveedoresSchema = new Schema({
    operacionRealizada: String,
    user: String,
    documento: Object,
    createdAt: { type: Date, expires: '2y', default: Date.now }
}, { timestamps: true });


const recordProveedor = conn.model("recordProveedor", HistorialProveedoresSchema);


module.exports.recordProveedor = recordProveedor;
