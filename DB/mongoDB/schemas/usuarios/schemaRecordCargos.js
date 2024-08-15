const mongoose = require("mongoose");
const { Schema } = mongoose;

const conn = mongoose.createConnection(process.env.MONGODB_SISTEMA);


const HistorialCargoSchema = new Schema({
    operacionRealizada: String,
    user: String,
    documento: Object,
    fecha: { type: Date, default: Date.now },
    createdAt: { type: Date, expires: '2y', default: Date.now }
}, { timestamps: true });


const recordCargo = conn.model("recordCargo", HistorialCargoSchema);


module.exports.recordCargo = recordCargo;

