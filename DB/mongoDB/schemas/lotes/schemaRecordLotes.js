const mongoose = require("mongoose");
const { Schema } = mongoose;

const defineRecordLotes = async (conn) => {


  const HistorialLotesSchema = new Schema({
    operacionRealizada: String,
    user: String,
    documento: Object,
    fecha: { type: Date, default: Date.now },
    createdAt: { type: Date, default: Date.now }
  }, { timestamps: true });


  // Crear índice TTL explícitamente
  HistorialLotesSchema.index({ createdAt: 1 }, { expireAfterSeconds: 2 * 365 * 24 * 60 * 60 });


  const recordLotes = conn.model("recordLote", HistorialLotesSchema);
  return recordLotes

}

module.exports.defineRecordLotes = defineRecordLotes;

