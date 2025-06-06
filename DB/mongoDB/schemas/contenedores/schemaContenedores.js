import mongoose from "mongoose";
const { Schema } = mongoose;

function diffObjects(obj1, obj2, path = "") {
  const changes = [];
  for (const key of new Set([...Object.keys(obj1), ...Object.keys(obj2)])) {
    const fullPath = path ? `${path}.${key}` : key;
    if (typeof obj1[key] === "object" && typeof obj2[key] === "object" && obj1[key] && obj2[key]) {
      changes.push(...diffObjects(obj1[key], obj2[key], fullPath));
    } else if (obj1[key] !== obj2[key]) {
      changes.push({ field: fullPath, before: obj1[key], after: obj2[key] });
    }
  }
  return changes;
}


export const defineContenedores = async (conn, AuditLog) => {

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
    tipoFruta: String,
    SISPAP: Boolean,
    GGN: Boolean,
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
    numeroContenedor: Number,
    pallets: [{ type: Map, of: subSchema }],
    infoContenedor: infoContenedorSchema,
    infoTractoMula: schemaInfoMula,
    infoExportacion: schemaInfoExportacion,
    insumosData: insumosSchema,
    inspeccion_mula: inspeccionMulasSchema,
    reclamacionCalidad: reclamacionSchema
  });

  listaEmpaqueSchema.index({ reclamacionCalidad: 1 });

  // Middleware to update `ultimaModificacion` field
  listaEmpaqueSchema.post('save', async function (doc) {
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
  listaEmpaqueSchema.pre('findOneAndUpdate', async function (next) {
    try {
      const docToUpdate = await this.model.findOne(this.getQuery());
      this._oldValue = docToUpdate ? docToUpdate.toObject() : null;
      next();
    } catch (err) {
      next(err);
    }
  });

  listaEmpaqueSchema.post('findOneAndUpdate', async function (res) {
    try {
      // res es el nuevo documento, this._oldValue es el viejo
      if (this._oldValue && res) {
        const cambios = diffObjects(this._oldValue, res.toObject());
        // Si hay cambios, guarda el log
        if (cambios.length > 0) {
          await AuditLog.create({
            collection: 'Contenedor',
            documentId: res._id,
            operation: 'update',
            user: this.options?.user,
            action: this.options?.action,
            date: new Date(),
            changes: cambios,
            description: 'Actualización parcial del contenedor'
          });
        }
      }
    } catch (err) {
      console.error('Error guardando auditoría:', err);
    }
  });

  const Contenedores = conn.model("Contenedor", listaEmpaqueSchema);
  return Contenedores;
}
