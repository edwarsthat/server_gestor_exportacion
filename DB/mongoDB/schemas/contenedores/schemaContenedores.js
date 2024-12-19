const mongoose = require("mongoose");

const { Schema } = mongoose;

const defineContenedores = async (conn) => {

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
    lote: { type: Schema.Types.ObjectId, ref: "Lote" },
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
    clienteInfo: { type: Schema.Types.ObjectId, ref: "Cliente" },
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

  const listaEmpaqueSchema = new Schema({
    numeroContenedor: Number,
    pallets: [{ type: Map, of: subSchema }],
    infoContenedor: infoContenedorSchema,
    infoTractoMula: schemaInfoMula,
    infoExportacion: schemaInfoExportacion,
    insumosData: insumosSchema,
    inspeccion_mula: inspeccionMulasSchema
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
  return Contenedores;
}

module.exports.defineContenedores = defineContenedores;
