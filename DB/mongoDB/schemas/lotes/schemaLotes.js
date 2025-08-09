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
import { diffObjects } from "../utils/utils.js";
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
    calidad: { type: String, default: "N/A" },
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
    cuartoDesverdizado: [String],
    fechaIngreso: { type: Date, default: () => new Date() },
    fechaFinalizar: Date,
    desverdizando: Boolean,
    parametros: [ParametroSchema],
    fechaProcesado: Date,
  }, { _id: false });

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

  const exportacionSchema = new Schema(
    {},
    {
      _id: false,
      strict: false
    }
  )

  exportacionSchema.add(
    new Map([
      [
        String, // Nivel 1: contenedor
        new Map([
          [
            String, // Nivel 2: calidad
            new Map([[String, Number]])
          ]
        ])
      ]
    ])
  );

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
    exportacionDetallada: exportacionDetalladaSchema,
    exportacion: exportacionSchema,
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
    user: String,

    calidad1: { type: Number, default: 0 },
    calidad15: { type: Number, default: 0 },
    calidad2: { type: Number, default: 0 },

  }, { versionKey: '__v' });



  dataSchema.pre('findOneAndUpdate', async function (next) {
    const update = this.getUpdate();
    const docToUpdate = await this.model.findOne(this.getQuery());
    this._oldValue = docToUpdate ? docToUpdate.toObject() : null;

    // let newKilos = 0
    // const actions = ["put_proceso_aplicaciones_descarteLavado", "put_proceso_aplicaciones_descarteEncerado"]
    if (
      this.options.action !== "put_calidad_informes_aprobacionComercial" &&
      this.options.action !== "put_calidad_informes_loteFinalizarInforme" &&
      this.options.action !== "put_comercial_precios_precioLotes" &&
      this.options.action !== "put_comercial_registroPrecios_proveedores_comentario" &&
      this.options.action !== "post_comercial_precios_add_precio" &&
      this.options.action !== "put_comercial_precios_proveedores_precioFijo" &&
      this.options.action !== "put_comercial_precios_precioLotes"
    ) {

      update.aprobacionProduccion = false

    }
    next();
  });

  dataSchema.post('findOneAndUpdate', async function (res) {
    try {
      if (this._oldValue && res) {
        // Solo los cambios, no el pergamino completo
        const cambios = diffObjects(this._oldValue, res.toObject());
        if (cambios.length > 0) {
          await AuditLog.create({
            collection: 'Lote',
            documentId: res._id,
            operation: 'update',
            user: this.options.user, // Pasar el usuario como opción
            action: this.options.action, // Pasar la acción como opción
            changes: cambios, // Aquí los cambios puntuales
            description: 'Actualización de lote'
          });
        }
      }
    } catch (err) {
      console.error('Error guardando auditoría:', err);
    }
  });

  dataSchema.post('save', async function (doc) {
    try {
      await AuditLog.create({
        collection: 'Lote',
        documentId: doc._id,
        operation: 'create',
        user: doc._user,
        action: "crearLote",
        newValue: doc,
        description: 'Creación de lote'
      });
    } catch (err) {
      console.error('Error guardando auditoría:', err);
    }
  });

  dataSchema.pre('findOneAndDelete', async function (next) {
    const docToDelete = await this.model.findOne(this.getQuery());
    this._oldValue = docToDelete ? docToDelete.toObject() : null;
    next();
  });

  dataSchema.post('findOneAndDelete', async function (res) {
    try {
      await AuditLog.create({
        collection: 'Lote',
        documentId: res._id,
        operation: 'delete',
        user: this.options.user,
        oldValue: this._oldValue,
        description: 'Eliminación de lote'
      });
    } catch (err) {
      console.error('Error guardando auditoría:', err);
    }
  });

  const Lotes = conn.model("Lote", dataSchema);
  return Lotes;

}
