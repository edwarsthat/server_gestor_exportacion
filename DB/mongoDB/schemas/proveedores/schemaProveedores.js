
import mongoose from "mongoose";
const { Schema } = mongoose;

export const defineproveedores = async (conn) => {


  const PrecioSchema = new Schema({
    any: {
      type: Map,
      of: { type: Schema.Types.ObjectId, ref: 'precio' }
    },
  }, { _id: false, strict: false });

  const GGNSchema = new Schema({
    code: String,
    fechaVencimiento: Date,
    paises: [{ type: Schema.Types.ObjectId, ref: 'Pais' }],
    tipo_fruta: [String],
    activo: { type: Boolean, default: false },
  }, { _id: false, strict: false })


  const ICASchema = new Schema({
    code: String,
    tipo_fruta: [String],
    fechaVencimiento: Date
  }, { _id: false, strict: false })

  const frutaSchema = new Schema({
    arboles: Number,
    hectareas: Number,
  })


  const tipoFrutaSchema = new Schema({
    any: {
      type: Map,
      of: frutaSchema
    },
  }, { _id: false, strict: false });



  const PredioSchema = new Schema({
    PREDIO: { type: String, required: true },
    ICA: ICASchema,
    "CODIGO INTERNO": { type: Number, required: true, unique: true },
    GGN: GGNSchema,
    tipo_fruta: tipoFrutaSchema,
    PROVEEDORES: String,
    DEPARTAMENTO: String,
    urlArchivos: [String],
    activo: { type: Boolean, required: true, default: true },
    precio: PrecioSchema,
    SISPAP: { type: Boolean, default: true },
    telefono_predio: String,
    contacto_finca: String,
    correo_informes: String,
    telefono_propietario: String,
    propietario: String,
    razon_social: String,
    nit_facturar: String,
    precioFijo: Boolean,
    departamento: String,
    municipio: String,
    canastillas: Number,
    //Tarifa de flete fija (contabilidad). Jp
    flete: { type: Number, default: 0 },
    //Tarifas de flete por kg (contabilidad). Jp
    tarifaFleteKg: {
      type: Number,
      required: false,
      default: null
    },
    user: { type: Schema.Types.ObjectId, ref: 'usuario' },
  });

  // Middleware pre-save para establecer alt = _id en la creación inicial
  PredioSchema.pre('save', function (next) {
    if (this.isNew && !this.alt) {
      this.alt = this._id;
    }
    next();
  });

  const Proveedores = conn.model("Proveedor", PredioSchema);
  return Proveedores;
}