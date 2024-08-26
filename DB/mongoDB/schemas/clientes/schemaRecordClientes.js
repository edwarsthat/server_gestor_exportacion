const mongoose = require("mongoose");
const { Schema } = mongoose;

const conn = mongoose.createConnection(process.env.MONGODB_PROCESO);


const HistorialClientesSchema = new Schema({
    operacionRealizada: String,
    user: String,
    documento: Object,
    createdAt: { type: Date, expires: '2y', default: Date.now }
}, { timestamps: true });


const recordClientes = conn.model("recordClientes", HistorialClientesSchema);


module.exports.recordClientes = recordClientes;
