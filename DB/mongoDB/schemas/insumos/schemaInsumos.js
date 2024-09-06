const mongoose = require("mongoose");
const { Schema } = mongoose;

const conn = mongoose.createConnection(process.env.MONGODB_PROCESO);


const InsumosSchema = new Schema({
    codigo: { type: String, require: true, unique: true },
    insumo: String,
    medida: String,
    alias: { type: String, require: true, unique: true },
    tipo: String,
    fecha: { type: Date, default: Date.now }
}, { timestamps: true });


const Insumos = conn.model("insumo", InsumosSchema);


module.exports.Insumos = Insumos;
