const mongoose = require("mongoose");
const { Clientes } = require("../clientes/schemaClientes");
const { Lotes } = require("../lotes/schemaLotes");

const { Schema } = mongoose;

const conn = mongoose.createConnection(process.env.MONGODB_PROCESO);

const insumosSchema = new Schema({
  any: {
    type: Map,
    of: Number
  },
  flagInsumos: { type: Boolean, default: false }
}, { _id: false, strict: false })

const listaLiberarPalletSchema = new Schema(
  {
    rotulado: Boolean,
    paletizado: Boolean,
    enzunchado: Boolean,
    estadoCajas: Boolean,
    estiba: Boolean,
  },
  { _id: false },
);

const settingsSchema = new Schema(
  {
    tipoCaja: String,
    calidad: String,
    calibre: String,
  },
  { _id: false },
);

const EF1Schema = new Schema({
  _id: { type: Schema.Types.ObjectId, auto: true },
  lote: { type: Schema.Types.ObjectId, ref: Lotes },
  cajas: Number,
  tipoCaja: String,
  calibre: Number,
  calidad: Number,
  fecha: Date,
  tipoFruta: String
});

const subSchema = new Schema(
  {
    settings: settingsSchema,
    EF1: [{ type: Map, of: EF1Schema }],
    listaLiberarPallet: listaLiberarPalletSchema,
  },
  { _id: false },
);

const infoContenedorSchema = new Schema({
  clienteInfo: { type: Schema.Types.ObjectId, ref: Clientes },
  fechaCreacion: Date,
  fechaInicio: Date,
  fechaInicioReal: Date,
  fechaFinalizado: Date,
  fechaEstimadaCargue: Date,
  fechaSalida: Date,
  ultimaModificacion: Date,
  tipoFruta: String,
  tipoCaja: [String],
  calidad: [String],
  sombra: String,
  defecto: String,
  mancha: String,
  verdeManzana: String,
  cerrado: Boolean,
  observaciones: String,
  desverdizado: Boolean,
  calibres: [String],
  urlInforme: String,
  cajasTotal: Number,
  RrtoEstimado: String,
});

const criteriosSchema = new Schema({
  cumple: Boolean,
  observaciones: String
},
  { _id: false });

const inspeccionMulasSchema = new Schema({
  funcionamiento: criteriosSchema,
  temperatura: criteriosSchema,
  talanquera: criteriosSchema,
  dannos: criteriosSchema,
  sellos_puertas: criteriosSchema,
  materiales: criteriosSchema,
  reparaciones: criteriosSchema,
  limpio: criteriosSchema,
  plagas: criteriosSchema,
  olores: criteriosSchema,
  insumos: criteriosSchema,
  medidas: criteriosSchema
});

const schemaInfoMula = new Schema({
  numeroPrecinto: String,
  empresaTransportadora: String,
  placa: String,
  trailer: String,
  nombreSia: String,
  temperatura: String,
  naviera: String,
  puerto: String,
  conductor: String,
  cedula: String,
  telefono: String,
  modelo: String,
  marca: String,
  criterios: inspeccionMulasSchema,
});

const listaEmpaqueSchema = new Schema({
  numeroContenedor: Number,
  pallets: [{ type: Map, of: subSchema }],
  infoContenedor: infoContenedorSchema,
  infoTractoMula: schemaInfoMula,
  insumosData: insumosSchema
});

// Middleware to update `ultimaModificacion` field
listaEmpaqueSchema.pre("save", function (next) {
  this.infoContenedor.ultimaModificacion = new Date();
  next();
});

listaEmpaqueSchema.pre("updateOne", function (next) {
  this.set({ "infoContenedor.ultimaModificacion": new Date() });
  next();
});

listaEmpaqueSchema.pre("findOneAndUpdate", function (next) {
  this.set({ "infoContenedor.ultimaModificacion": new Date() });
  next();
});

listaEmpaqueSchema.pre("findByIdAndUpdate", function (next) {
  this.set({ "infoContenedor.ultimaModificacion": new Date() });
  next();
});

const Contenedores = conn.model("Contenedor", listaEmpaqueSchema);

module.exports.Contenedores = Contenedores;
