const mongoose = require("mongoose");
const { Schema } = mongoose;

const conn = mongoose.createConnection(process.env.MONGODB_PROCESO);
console.log("se creo la conecion de insumos")


const RecordTipoInsumosSchema = new Schema({
    operacionRealizada: String,
    user: String,
    documento: Object,
    fecha: { type: Date, default: Date.now },
    createdAt: { type: Date, expires: '2y', default: Date.now }
}, { timestamps: true });


const recordTipoInsumos = conn.model("recordTipoInsumo", RecordTipoInsumosSchema);


module.exports.recordTipoInsumos = recordTipoInsumos;
