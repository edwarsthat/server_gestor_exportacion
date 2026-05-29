
import mongoose from "mongoose";
import { makeAuditPlugin } from "../utils/auditPLug.js";
const { Schema } = mongoose;

export const defineLotes = async (conn, AuditLog) => {

  const calidadInternaSchema = new Schema({
    acidez: Number,
    brix: Number,
    ratio: Number,
    peso: Number,
    zumo: Number,
    user: { type: Schema.Types.ObjectId, ref: 'usuario' },
    semillas: Boolean,
    calidad: { type: Schema.Types.ObjectId, ref: 'calidades' },
    fecha: { type: Date, default: Date.now }
  }, { _id: false });

  const clasificacionCalidadSchema = new Schema({
    any: {
      type: Map,
      of: String
    },
    fecha: { type: Date, default: Date.now },
    user: { type: Schema.Types.ObjectId, ref: 'usuario' },

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

  const salidaDirectoNacionalSchema = new Schema({
    placa: String,
    nombreConductor: String,
    telefono: String,
    cedula: String,
    remision: String,
    canastillas: Number,
    user: { type: Schema.Types.ObjectId, ref: 'usuario' },
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
    descartes: { type: Map, of: Number, default: {} },
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
    //Tarifa aplicada congelada para este lote
    tarifaCongelada: { type: Number, default: null },
    fleteCompuestoId: { 
        type: Schema.Types.ObjectId, 
        ref: "FleteCompuesto", 
        default: null 
    },
    esFleteCompuesto: { 
        type: Boolean, 
        default: false 
    },
    observacionesTF: { type: String, default: "" },

    //Override manual SOLO para este lote
    // overrideTarifa: {
    //   valor: { type: Number },
    //   motivo: { type: String },
    //   fecha: { type: Date },
    //   usuario: { type: Schema.Types.ObjectId, ref: 'usuario' }
    // },
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
    user: { type: Schema.Types.ObjectId, ref: 'usuario' },

  }, { versionKey: '__v' });

  // Hook de lógica de negocio: modificar aprobacionProduccion según la acción
  dataSchema.pre('findOneAndUpdate', async function () {
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

  });

  // Aplicar plugin de auditoría
  dataSchema.plugin(makeAuditPlugin({
    collectionName: 'Lote',
    AuditLogs: AuditLog
  }));

  const Lotes = conn.model("Lote", dataSchema);
  return Lotes;

}
