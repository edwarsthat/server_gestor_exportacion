import mongoose from "mongoose";
const { Schema } = mongoose;

function diffObjects(obj1, obj2, path = "") {
  const changes = [];
  const keys = new Set([...Object.keys(obj1 || {}), ...Object.keys(obj2 || {})]);
  for (const key of keys) {
    const fullPath = path ? `${path}.${key}` : key;
    const val1 = obj1 ? obj1[key] : undefined;
    const val2 = obj2 ? obj2[key] : undefined;

    // Si ambos son arrays
    if (Array.isArray(val1) && Array.isArray(val2)) {
      const maxLen = Math.max(val1.length, val2.length);
      for (let i = 0; i < maxLen; i++) {
        const arrPath = `${fullPath}[${i}]`;
        if (i >= val1.length) {
          // Elemento añadido
          changes.push({ field: arrPath, before: undefined, after: val2[i] });
        } else if (i >= val2.length) {
          // Elemento eliminado
          changes.push({ field: arrPath, before: val1[i], after: undefined });
        } else if (typeof val1[i] === "object" && typeof val2[i] === "object" && val1[i] && val2[i]) {
          changes.push(...diffObjects(val1[i], val2[i], arrPath));
        } else if (val1[i] !== val2[i]) {
          changes.push({ field: arrPath, before: val1[i], after: val2[i] });
        }
      }
    }
    // Si ambos son objetos (pero no arrays)
    else if (
      val1 && typeof val1 === "object" &&
      val2 && typeof val2 === "object"
    ) {
      changes.push(...diffObjects(val1, val2, fullPath));
    }
    // Si son diferentes
    else if (val1 !== val2) {
      changes.push({ field: fullPath, before: val1, after: val2 });
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
    createdAt: { type: Date, default: () => new Date() },
    fechaCreacion: Date,
    fechaInicio: Date,
    fechaInicioReal: Date,
    fechaFinalizado: Date,
    fechaEstimadaCargue: Date,
    fechaSalida: Date,
    ultimaModificacion: Date,
    tipoFruta: [String],
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

  const entregaPrecintoSchema = new Schema({
    entrega: String,
    recibe: String,
    createdAt: { type: Date, default: () => new Date() },
    fechaEntrega:  Date,
    fotos: [String],
    user: String,
    observaciones: String
  }, { _id: false });
  

  const listaEmpaqueSchema = new Schema({
    numeroContenedor: Number,
    pallets: [{ type: Map, of: subSchema }],
    infoContenedor: infoContenedorSchema,
    infoTractoMula: schemaInfoMula,
    infoExportacion: schemaInfoExportacion,
    insumosData: insumosSchema,
    inspeccion_mula: inspeccionMulasSchema,
    reclamacionCalidad: reclamacionSchema,
    entregaPrecinto: entregaPrecintoSchema,
  });

  listaEmpaqueSchema.index({ reclamacionCalidad: 1, entregaPrecinto:1 });

  // Middleware to update `ultimaModificacion` field
  listaEmpaqueSchema.post('save', async function (doc) {
    try {
      await AuditLog.create({
        collection: 'Lote',
        documentId: doc._id,
        operation: 'create',
        user: doc._user,
        action: "crearo contenedor",
        newValue: doc,
        description: 'Creación de contenedor'
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
      console.error('Error guardando auditoría:', err);

      next(err);
    }
  });

  listaEmpaqueSchema.post('findOneAndUpdate', async function (res) {
    try {
      // res es el nuevo documento, this._oldValue es el viejo
      if (this._oldValue && res) {
        const cambios = diffObjects(this._oldValue, res.toObject());
        console.log('Cambios detectados:', cambios);
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
