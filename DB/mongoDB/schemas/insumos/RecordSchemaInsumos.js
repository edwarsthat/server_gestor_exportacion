const mongoose = require("mongoose");
const { Schema } = mongoose;

const defineRecordTipoInsumos = async (conn) => {

    const RecordTipoInsumosSchema = new Schema({
        operacionRealizada: String,
        user: String,
        documento: Object,
        fecha: { type: Date, default: Date.now },
        createdAt: { type: Date, expires: '2y', default: Date.now }
    }, { timestamps: true });


    const recordTipoInsumos = conn.model("recordTipoInsumo", RecordTipoInsumosSchema);
    return recordTipoInsumos;

}

module.exports.defineRecordTipoInsumos = defineRecordTipoInsumos;
