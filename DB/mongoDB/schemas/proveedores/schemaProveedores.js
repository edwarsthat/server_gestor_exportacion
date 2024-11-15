
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
  "1": { type: Number, default: 0 },
  "15": { type: Number, default: 0 },
  "2": { type: Number, default: 0 },
  frutaNacional: { type: Number, default: 0 },
  descarte: { type: Number, default: 0 },
  zumex: { type: Number, default: 0 },
})

const PrecioSchema = new Schema({
  Limon: LimonPrecioSchema,
  Naranja: NaranjaPrecioSchema,
  fecha: { type: Date, default: Date.now }
});

const GGNSchema = new Schema({
  code: String,
  fechaVencimiento: Date,
  paises: [String]
})


const PredioSchema = new Schema({
  PREDIO: { type: String, required: true },
  ICA: String,
  "CODIGO INTERNO": { type: String, required: true },
  GGN: GGNSchema,
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

// Middleware pre-save para establecer alt = _id en la creación inicial
PredioSchema.pre('save', function (next) {
  if (this.isNew && !this.alt) {
    this.alt = this._id;
  }
  next();
});

const Proveedores = conn.model("Proveedor", PredioSchema);

module.exports.Proveedores = Proveedores;