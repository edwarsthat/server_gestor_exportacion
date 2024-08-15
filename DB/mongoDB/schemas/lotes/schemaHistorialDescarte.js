const mongoose = require("mongoose");
const { Schema } = mongoose;

const conn = mongoose.createConnection(process.env.MONGODB_PROCESO);

const DescarLavadoteSchema = new Schema(
  {
    balin: Number,
    pareja: Number,
    descarteGeneral: Number,
  },
  { _id: false },
);

const DescarEnceradoteSchema = new Schema(
  {
    balin: Number,
    pareja: Number,
    descarteGeneral: Number,
    extra: Number,
    suelo: Number
  },
  { _id: false },
);

const PredioSchema = new Schema(
  {
    descarteLavado: DescarLavadoteSchema,
    descarteEncerado: DescarEnceradoteSchema,
  },
  { _id: false, strict: false },
);

const RegistroSchema = new Schema({
  fecha: {type:Date, default:Date.now()},
  accion: String,
  cliente: String,
  placa: String,
  nombreConductor: String,
  telefono:String,
  cedula: String,
  remision: String,
  frutaSalida: PredioSchema,
  // predios: {
  //   type: Map,
  //   of: PredioSchema,
  // },
});

const historialDescarte = conn.model("historialDescarte", RegistroSchema);


module.exports.historialDescarte = historialDescarte;
