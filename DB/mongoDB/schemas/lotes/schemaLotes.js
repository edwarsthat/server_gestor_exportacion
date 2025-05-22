/**
 * @file Esquema y modelo de datos para los lotes de fruta en MongoDB (Celifrut).
 *
 * @summary
 * Este módulo define el modelo de datos de los lotes, centralizando toda la información relevante para la trazabilidad,
 * control de calidad, descartes, fechas, contenedores, aprobaciones y parámetros de procesamiento de cada lote.
 *
 * @description
 * Incluye subesquemas para calidad interna, inspección, descartes, desverdizado, exportación detallada y más.
 * El modelo resultante permite registrar, consultar y auditar el ciclo de vida completo de un lote desde su ingreso hasta su salida.
 *
 * @module DB/mongoDB/schemas/lotes/schemaLotes
 */


const mongoose = require("mongoose");
const { Schema } = mongoose;

/**
 * Define el modelo de datos para los lotes en el sistema.
 *
 * Este esquema centraliza toda la información relevante de un lote, incluyendo calidad, descartes, fechas, contenedores asociados,
 * aprobaciones, parámetros de desverdizado, exportación detallada, historial y más. Permite el registro y trazabilidad completa
 * de cada lote desde su ingreso hasta su procesamiento y salida.
 *
 * @param {Object} conn - Conexión activa de Mongoose donde se registrará el modelo.
 * @returns {Object} Modelo de Lote registrado en la conexión proporcionada.
 *
 * @see https://mongoosejs.com/docs/models.html
 */
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
    any: {
      type: Map,
      of: String
    },
    fecha: { type: Date, default: Date.now }

  }, { _id: false, strict: false });

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



  const dataSchema = new Schema({

    aprobacionComercial: { type: Boolean, default: false }, //es la aprobacion antes de enviarlo a contabilidad
    aprobacionProduccion: { type: Boolean, default: false }, //es la aprobacion antes de aprobacion comercial
    calidad: calidadSchema,
    calidad1: { type: Number, default: 0 },
    calidad15: { type: Number, default: 0 },
    calidad2: { type: Number, default: 0 },
    canastillas: { type: Number, default:0},
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
    fecha_aprobacion_produccion: { type: Date },
    fecha_aprobacion_comercial: { type: Date },
    frutaNacional: { type: Number, default: 0 },
    flag_balin_free: { type: Boolean, default: true },
    GGN: { type: Boolean, default: false },
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
    precio: { type: Schema.Types.ObjectId, ref: 'precio' },
    predio: { type: Schema.Types.ObjectId, ref: 'Proveedor' },
    promedio: Number,
    rendimiento: { type: Number, default: 0 },
    tipoFruta: String,

  }, { versionKey: '__v' });

  const Lotes = conn.model("Lote", dataSchema);
  return Lotes;

}

module.exports.defineLotes = defineLotes;