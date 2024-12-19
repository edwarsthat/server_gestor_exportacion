const mongoose = require("mongoose");
const { Schema } = mongoose;

const defineLotes = async (conn) => {

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

  const inspeccionIngresoSchema = new Schema({
    any: {
      type: Map,
      of: String
    },
    fecha: { type: Date, default: Date.now }

  }, { _id: false, strict: false });


  const calidadSchema = new Schema({
    inspeccionIngreso: inspeccionIngresoSchema,
    calidadInterna: calidadInternaSchema,
    clasificacionCalidad: clasificacionCalidadSchema,
    fotosCalidad: fotosCalidadSchema,

  }, { _id: false });

  const descarteLavadoSchema = new Schema({
    descarteGeneral: { type: Number, default: 0 },
    pareja: { type: Number, default: 0 },
    balin: { type: Number, default: 0 },
    descompuesta: { type: Number, default: 0 },
    piel: { type: Number, default: 0 },
    hojas: { type: Number, default: 0 },
  }, { _id: false });


  const descarteEnceradoSchema = new Schema({
    descarteGeneral: { type: Number, default: 0 },
    pareja: { type: Number, default: 0 },
    balin: { type: Number, default: 0 },
    extra: { type: Number, default: 0 },
    descompuesta: { type: Number, default: 0 },
    suelo: { type: Number, default: 0 },
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

  const contenedorDetalleSchema = new Schema({
    "1": Number,
    "15": Number,
    "2": Number
  })

  const exportacionDetalladaSchema = new Schema({
    any: {
      type: Map,
      of: contenedorDetalleSchema
    },
  }, { _id: false })

  const precioLoteSchema = new Schema({
    "1": Number,
    "15": Number,
    "2": Number,
    frutaNacional: Number,
    descarte: Number,
    zumex: Number,
    combinado: Number,
  }, { _id: false })



  const dataSchema = new Schema({

    aprobacionComercial: { type: Boolean, default: false }, //es la aprobacion antes de enviarlo a contabilidad
    calidad: calidadSchema,
    calidad1: { type: Number, default: 0 },
    calidad15: { type: Number, default: 0 },
    calidad2: { type: Number, default: 0 },
    canastillas: String,
    canastillas_estimadas: Number,
    clasificacionCalidad: { type: String, default: "N/A" },
    contenedores: [String],
    descarteEncerado: descarteEnceradoSchema,
    descarteLavado: descarteLavadoSchema,
    deshidratacion: { type: Number, default: 100 },
    desverdizado: desverdizadoSchema,
    directoNacional: { type: Number, default: 0 },
    enf: { type: String },
    exportacionDetallada: exportacionDetalladaSchema,
    fecha_creacion: { type: Date, default: () => new Date() },
    fecha_estimada_llegada: { type: Date },
    fechaIngreso: { type: Date },
    fecha_ingreso_patio: { type: Date },
    fecha_salida_patio: { type: Date },
    fecha_ingreso_inventario: { type: Date },
    fechaProceso: { type: Date },
    fecha_finalizado_proceso: { type: Date },
    frutaNacional: { type: Number, default: 0 },
    flag_is_favorita: { type: Boolean, default: false },
    flag_balin_free: { type: Boolean, default: false },
    historialDescarte: mongoose.Types.ObjectId,
    informeEnviado: { type: Boolean, default: false },
    infoSalidaDirectoNacional: salidaDirectoNacionalSchema,
    kilos_estimados: Number,
    kilos: Number,
    kilosReprocesados: { type: Number, default: 0 },
    kilosVaciados: { type: Number, default: 0 },
    kilosGGN: { type: Number, default: 0 },
    numeroPrecintos: Number,
    numeroRemision: String,
    not_pass: Boolean,
    observaciones: String,
    placa: String,
    precio: precioLoteSchema,
    predio: { type: Schema.Types.ObjectId, ref: 'Proveedor' },
    promedio: Number,
    rendimiento: { type: Number, default: 0 },
    tipoFruta: String,

  }, { versionKey: '__v' });

  const Lotes = conn.model("Lote", dataSchema);
  return Lotes;

}
module.exports.defineLotes = defineLotes;