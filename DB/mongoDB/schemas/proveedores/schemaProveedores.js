
const mongoose = require("mongoose");
const { Schema } = mongoose;

const conn = mongoose.createConnection(process.env.MONGODB_PROCESO);


const LimonPrecioSchema = new Schema({
  1: Number,
  15: Number,
  2: Number,
  descarte: Number,
  combinado: Number,
})

const NaranjaPrecioSchema = new Schema({
  "1": Number,
  "15": Number,
  "2": Number,
  descarte: Number,
  zumex: Number,
})

const PrecioSchema = new Schema({
  Limon: LimonPrecioSchema,
  Naranja: NaranjaPrecioSchema,
  fecha: { type: Date, default: Date.now }
});


const PredioSchema = new Schema({
  PREDIO: { type: String, required: true },
  ICA: String,
  "CODIGO INTERNO": { type: String, required: true },
  GGN: String,
  "FECHA VENCIMIENTO GGN": String,
  N: Boolean,
  L: Boolean,
  M: Boolean,
  PROVEEDORES: String,
  DEPARTAMENTO: String,
  urlArchivos: [String],
  activo: { type: Boolean, required: true, default: true },
  precio: PrecioSchema,
  SISPAP: { type: Boolean, default: false },
  alt: { type: Schema.Types.ObjectId, ref: 'Proveedor' }
});



const Proveedores = conn.model("Proveedor", PredioSchema);

module.exports.Proveedores = Proveedores;