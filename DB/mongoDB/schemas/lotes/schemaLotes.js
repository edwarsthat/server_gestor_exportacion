const mongoose = require("mongoose");
// const { recordLotes } = require("./schemaRecordLotes");
const { Proveedores } = require("../proveedores/schemaProveedores");
const { Schema } = mongoose;

const conn = mongoose.createConnection(process.env.MONGODB_PROCESO);


const calidadInternaSchema = new Schema({
  acidez: Number,
  brix: Number,
  ratio: Number,
  peso: Number,
  zumo: Number,
  fecha: { type: Date, default: Date.now }
}, { _id: false });

const clasificacionCalidadSchema = new Schema({
  acaro: Number,
  alsinoe: Number,
  dannosMecanicos: Number,
  deshidratada: Number,
  division: Number,
  escama: Number,
  frutaMadura: Number,
  frutaVerde: Number,
  fumagina: Number,
  grillo: Number,
  herbicida: Number,
  mancha: Number,
  melanosis: Number,
  oleocelosis: Number,
  piel: Number,
  sombra: Number,
  trips: Number,
  wood: Number,
  nutrientes: Number,
  antracnosis: Number,
  frutaRajada: Number,
  ombligona: Number,
  despezonada: Number,
  variegacion: Number,
  verdeManzana: Number,
  otrasPlagas: Number,
  fecha: { type: Date, default: Date.now }

}, { _id: false });

const fotosCalidadSchema = new Schema({
  any: {
    type: Map,
    of: String
  },
  fechaIngreso: { type: Date, default: Date.now }
}, { _id: false, strict: false });

const calidadSchema = new Schema({
  calidadInterna: calidadInternaSchema,
  clasificacionCalidad: clasificacionCalidadSchema,
  fotosCalidad: fotosCalidadSchema
}, { _id: false });

const descarteLavadoSchema = new Schema({
  descarteGeneral: { type: Number, default: 0 },
  pareja: { type: Number, default: 0 },
  balin: { type: Number, default: 0 },
  descompuesta: { type: Number, default: 0 },
  piel: { type: Number, default: 0 },
  hojas: { type: Number, default: 0 },
}, { _id: false });

const descarteLavadoInventarioSchema = new Schema({
  descarteGeneral: { type: Number, default: 0 },
  pareja: { type: Number, default: 0 },
  balin: { type: Number, default: 0 },
}, { _id: false });

const descarteEnceradoSchema = new Schema({
  descarteGeneral: { type: Number, default: 0 },
  pareja: { type: Number, default: 0 },
  balin: { type: Number, default: 0 },
  extra: { type: Number, default: 0 },
  descompuesta: { type: Number, default: 0 },
  suelo: { type: Number, default: 0 },
}, { _id: false });

const descarteEnceradoInventarioSchema = new Schema({
  descarteGeneral: { type: Number, default: 0 },
  pareja: { type: Number, default: 0 },
  balin: { type: Number, default: 0 },
  extra: { type: Number, default: 0 },
  suelo: { type: Number, default: 0 },
}, { _id: false });

const inventarioSchema = new Schema({
  inventario: { type: Number, default: 0 },
  descarteEncerado: descarteEnceradoInventarioSchema,
  descarteLavado: descarteLavadoInventarioSchema
}, { _id: false });

const salidaDirectoNacionalSchema = new Schema({
  placa: String,
  nombreConductor: String,
  telefono: String,
  cedula: String,
  remision: String
});

const ParametroSchema = new mongoose.Schema({
  fecha: { type: Date, default: Date.now },
  temperatura: Number,
  etileno: Number,
  carbono: Number,
  humedad: Number
}, { _id: false });

const desverdizadoSchema = new Schema({
  canastillasIngreso: { type: Number, default: 0 },
  kilosIngreso: { type: Number, default: 0 },
  cuartoDesverdizado: { type: String, default: "" },
  fechaIngreso: { type: Date, default: new Date() },
  fechaFinalizar: Date,
  desverdizando: Boolean,
  canastillasSalida: { type: Number, default: 0 },
  parametros: [ParametroSchema],
  fechaProcesado: Date,
});

const dataSchema = new Schema({
  enf: { type: String, require: true },
  predio: { type: Schema.Types.ObjectId, ref: Proveedores },
  fechaIngreso: { type: Date, default: Date.now },
  canastillas: String,
  tipoFruta: String,
  observaciones: String,
  numeroRemision: String,
  numeroPrecintos: Number,
  clasificacionCalidad: { type: String, default: "N/A" },
  urlBascula: String,
  kilos: Number,
  placa: String,
  kilosVaciados: { type: Number, default: 0 },
  promedio: Number,
  rendimiento: { type: Number, default: 0 },
  deshidratacion: { type: Number, default: 100 },
  calidad: calidadSchema,
  descarteLavado: descarteLavadoSchema,
  descarteEncerado: descarteEnceradoSchema,
  directoNacional: { type: Number, default: 0 },
  frutaNacional: { type: Number, default: 0 },
  desverdizado: desverdizadoSchema,
  historialDescarte: mongoose.Types.ObjectId,
  informeEnviado: { type: Boolean, default: false },
  urlInformeCalidad: String,
  infoSalidaDirectoNacional: salidaDirectoNacionalSchema,
  contenedores: [String],
  calidad1: { type: Number, default: 0 },
  calidad15: { type: Number, default: 0 },
  calidad2: { type: Number, default: 0 },
  kilosReprocesados: { type: Number, default: 0 },
  inventarioActual: inventarioSchema, //es un dato provicional
}, { versionKey: '__v' });

const Lotes = conn.model("Lote", dataSchema);

module.exports.Lotes = Lotes;