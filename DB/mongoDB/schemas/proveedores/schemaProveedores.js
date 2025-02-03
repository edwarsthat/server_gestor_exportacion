
const mongoose = require("mongoose");
const { Schema } = mongoose;

const defineproveedores = async (conn) => {

  const LimonPrecioSchema = new Schema({
    "1": { type: Number, default: 0 },
    "15": { type: Number, default: 0 },
    "2": { type: Number, default: 0 },
    frutaNacional: { type: Number, default: 0 },
    descarte: { type: Number, default: 0 },
    combinado: { type: Number, default: 0 },
  }, { _id: false, strict: false })

  const NaranjaPrecioSchema = new Schema({
    "1": { type: Number, default: 0 },
    "15": { type: Number, default: 0 },
    "2": { type: Number, default: 0 },
    frutaNacional: { type: Number, default: 0 },
    descarte: { type: Number, default: 0 },
    zumex: { type: Number, default: 0 },
  }, { _id: false, strict: false })

  const PrecioSchema = new Schema({
    Limon: LimonPrecioSchema,
    Naranja: NaranjaPrecioSchema,
    fecha: { type: Date, default: Date.now }
  }, { _id: false, strict: false });

  const GGNSchema = new Schema({
    code: String,
    fechaVencimiento: Date,
    paises: [String],
    tipo_fruta: [String]
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
    // ICA: ICASchema,
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


    //Borrar datos
    ICA_temp: String,
    ICA: String,
    "FECHA VENCIMIENTO GGN": String,
    N: Boolean,
    L: Boolean,
    M: Boolean,
    alt: String
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

module.exports.defineproveedores = defineproveedores;