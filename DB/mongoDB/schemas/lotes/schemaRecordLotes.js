const mongoose = require("mongoose");
const { Schema } = mongoose;

const conn = mongoose.createConnection(process.env.MONGODB_PROCESO);


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

// Opcional: Verificar índices después de crear el modelo
// recordLotes.collection.getIndexes((err, indexes) => {
//   if (err) console.error(err);
//   console.log(indexes);
// });


module.exports.recordLotes = recordLotes;

