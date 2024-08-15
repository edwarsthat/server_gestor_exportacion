const mongoose = require("mongoose");
const { Schema } = mongoose;

const conn = mongoose.createConnection(process.env.MONGODB_PROCESO);


const HistorialContenedoresSchema = new Schema({
  operacionRealizada: String,
  user: String,
  documento: Object,
  fecha: {type: Date, default: Date.now},
  createdAt: { type: Date, expires: '2y', default: Date.now }
},{timestamps: true});


const recordContenedores = conn.model("recordContenedor", HistorialContenedoresSchema);


module.exports.recordContenedores = recordContenedores;
