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

import mongoose from "mongoose";
import { makeAuditPlugin } from "../utils/auditPLug.js";
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


export const defineLotes = async (conn, AuditLog) => {

  const calidadInternaSchema = new Schema({
    acidez: Number,
    brix: Number,
    ratio: Number,
    peso: Number,
    zumo: Number,
    user: String,
    semillas: Boolean,
    calidad: { type: Schema.Types.ObjectId, ref: 'calidades' },
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
    remision: String,
    canastillas: Number,
    user: String,
    cliente: { type: Schema.Types.ObjectId, ref: 'ClientesNacionale' },
    fecha: { type: Date, default: () => new Date() },
    version: { type: Number, default: 1 },
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
    cuartoDesverdizado: [String],
    fechaIngreso: { type: Date, default: () => new Date() },
    fechaFinalizar: Date,
    desverdizando: Boolean,
    parametros: [ParametroSchema],
    fechaProcesado: Date,
  }, { _id: false });

  const salidaExportacionSchema = new Schema({
    kilosGGN: { type: Number, default: 0 },
    totalKilos: { type: Number, default: 0 },
    totalCajas: { type: Number, default: 0 },
    porCalidad: {
      type: Map,
      of: new Schema({
        kilos: { type: Number, default: 0 },
        cajas: { type: Number, default: 0 }
      }),
      default: {}
    },
    porCalibre: {
      type: Map,
      of: new Schema({
        kilos: { type: Number, default: 0 },
        cajas: { type: Number, default: 0 }
      }),
      default: {}
    },
    contenedores: [{ type: Schema.Types.ObjectId, ref: 'Contenedor' }]
  }, { _id: false, strict: false });

  const dataSchema = new Schema({

    aprobacionComercial: { type: Boolean, default: false }, //es la aprobacion antes de enviarlo a contabilidad
    aprobacionProduccion: { type: Boolean, default: false }, //es la aprobacion antes de aprobacion comercial
    calidad: calidadSchema,
    canastillas: { type: Number, default: 0 },
    canastillas_estimadas: Number,
    contenedores: [String],
    descarteEncerado: descarteEnceradoSchema,
    descarteLavado: descarteLavadoSchema,
    deshidratacion: { type: Number, default: 100 },
    desverdizado: desverdizadoSchema,
    directoNacional: { type: Number, default: 0 },
    enf: { type: String },
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
    //restriccion se activa luego de vacear el predio siguiente
    finalizado: { type: Boolean, default: false },
    GGN: { type: Boolean, default: false },
    historialDescarte: mongoose.Types.ObjectId,
    informeEnviado: { type: Boolean, default: false },
    infoSalidaDirectoNacional: salidaDirectoNacionalSchema,
    kilos_estimados: Number,
    kilos: Number,
    kilosReprocesados: { type: Number, default: 0 },
    kilosVaciados: { type: Number, default: 0 },
    kilosProcesados: { type: Number, default: 0 },
    numeroPrecintos: Number,
    numeroRemision: String,
    not_pass: Boolean,
    observaciones: String,
    placa: String,
    precio: { type: Schema.Types.ObjectId, ref: 'precio' },
    predio: { type: Schema.Types.ObjectId, ref: 'Proveedor' },
    promedio: Number,
    salidaExportacion: salidaExportacionSchema,
    rendimiento: { type: Number, default: 0 },
    tipoFruta: { type: Schema.Types.ObjectId, ref: 'tipoFrutas' },
    user: String,

  }, { versionKey: '__v' });

  // Hook de lógica de negocio: modificar aprobacionProduccion según la acción
  dataSchema.pre('findOneAndUpdate', async function (next) {
    const update = this.getUpdate();
    
    // Lista de acciones que NO deben resetear aprobacionProduccion
    const accionesExcluidas = [
      "put_calidad_informes_aprobacionComercial",
      "put_calidad_informes_loteFinalizarInforme",
      "put_comercial_precios_precioLotes",
      "put_comercial_registroPrecios_proveedores_comentario",
      "post_comercial_precios_add_precio",
      "put_comercial_precios_proveedores_precioFijo",
      "put_calidad_informe_noPagarBalinLote",
      "system:recalc_desh_rend"
    ];
    
    if (!accionesExcluidas.includes(this.options.action)) {
      console.log("Resetting aprobacionProduccion due to action:", this.options.action);
      if (!update.$set) {
        update.$set = {};
      }
      update.$set.aprobacionProduccion = false;
    }
    
    next();
  });

  // Aplicar plugin de auditoría
  dataSchema.plugin(makeAuditPlugin({ 
    collectionName: 'Lote', 
    AuditLogs: AuditLog 
  }));

  const Lotes = conn.model("Lote", dataSchema);
  return Lotes;

}
