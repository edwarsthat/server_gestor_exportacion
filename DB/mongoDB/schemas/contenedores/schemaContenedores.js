import mongoose from "mongoose";
import { makeAuditPlugin } from "../utils/auditPLug.js";
const { Schema } = mongoose;

export const defineContenedores = async (conn, AuditLog) => {

  const auditPlugin = makeAuditPlugin({ collectionName: 'Contenedor', AuditLogs: AuditLog });

  const insumosSchema = new Schema({
    any: {
      type: Map,
      of: Number
    },
    flagInsumos: { type: Boolean, default: false }
  }, { _id: false, strict: false })

  const calidadContenedorSchema = new Schema({
    parametros: { type: Map, of: String },
    calibres: [String],
    _id: { type: Schema.Types.ObjectId, ref: "calidades" },
  }, { _id: true });

  const tipoCajaSchema = new Schema({
    tipo: String,
    pesoNeto: Number,
    cantidadCajas: Number,
    pallets: Number,
  }, { _id: false });

  const infoContenedorSchema = new Schema({
    clienteInfo: { type: Schema.Types.ObjectId, ref: "Cliente" },
    createdAt: { type: Date, default: () => new Date() },
    fechaCreacion: Date,
    fechaInicio: Date,
    fechaInicioReal: Date,
    fechaFinalizado: Date,
    fechaEstimadaCargue: Date,
    fechaSalida: Date,
    ultimaModificacion: Date,
    tipoFruta: [{ type: Schema.Types.ObjectId, ref: 'tipoFrutas' }],
    tipoCajaData: [tipoCajaSchema],
    calidadData: [calidadContenedorSchema],
    tipoCaja: [String],
    calidad: [{ type: Schema.Types.ObjectId, ref: 'calidades' }],
    calibres: [String],
    cerrado: Boolean,
    observaciones: String,
    desverdizado: Boolean,
    urlInforme: String,
    cajasTotal: Number,
    maquila: Boolean,
    semana: Number,
    anno: Number,
    GGN: Boolean,
    ICA: Boolean,
    pais_destino: { type: Schema.Types.ObjectId, ref: "Pais" },

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
    medidas: criteriosSchema,
    fecha: { type: Date, default: () => new Date() },
    usuario: { type: Schema.Types.ObjectId, ref: "Usuarios" },
  }, { _id: false });

  const schemaInfoMula = new Schema({
    transportadora: String,
    nit: String,
    placa: String,
    trailer: String,
    conductor: String,
    cedula: String,
    celular: String,
    temperatura: String,
    precinto: String,
    datalogger_id: String,
    flete: Number,
    marca: String,
    fecha: { type: Date, default: () => new Date() },
  }, { _id: false });

  const schemaInfoExportacion = new Schema({
    puerto: String,
    naviera: String,
    agencia: String,
    expt: String,
    fecha: { type: Date, default: () => new Date() },
  }, { _id: false })

  const reclamacionSchema = new Schema({
    responsable: String,
    Cargo: String,
    telefono: String,
    cliente: String,
    fechaArribo: String,
    contenedor: String,
    correo: String,
    kilos: Number,
    cajas: Number,
    fechaDeteccion: Date,
    moho_encontrado: String,
    moho_permitido: String,
    golpes_encontrado: String,
    golpes_permitido: String,
    frio_encontrado: String,
    frio_permitido: String,
    maduracion_encontrado: String,
    maduracion_permitido: String,
    otroDefecto: String,
    observaciones: String,
    archivosSubidos: [String],
    fecha: { type: Date, default: () => new Date() }

  }, { _id: false })



  const listaEmpaqueSchema = new Schema({
    numeroContenedor: { type: Number, unique: true, sparse: true },
    ordenCompra: { type: Number, unique: true, index: true, required: true },
    totalKilos: Number,
    totalCajas: Number,
    pallets: Number,
    infoContenedor: infoContenedorSchema,
    infoTractoMula: schemaInfoMula,
    infoExportacion: schemaInfoExportacion,
    insumosData: insumosSchema,
    inspeccion_mula: inspeccionMulasSchema,
    reclamacionCalidad: reclamacionSchema,
    registrosSalidas: [{ type: Schema.Types.ObjectId, ref: "salidaVehiculo" }],
    user: { type: Schema.Types.ObjectId, ref: 'usuario' },
    cancelado: { type: Boolean, default: false, index: true }
  });

  listaEmpaqueSchema.index({ "infoContenedor.fechaInicio": 1 });

  listaEmpaqueSchema.plugin(auditPlugin);

  const Contenedores = conn.model("Contenedor", listaEmpaqueSchema);
  return Contenedores;
}
