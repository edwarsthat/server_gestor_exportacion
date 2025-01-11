
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
  })

  const NaranjaPrecioSchema = new Schema({
    "1": { type: Number, default: 0 },
    "15": { type: Number, default: 0 },
    "2": { type: Number, default: 0 },
    frutaNacional: { type: Number, default: 0 },
    descarte: { type: Number, default: 0 },
    zumex: { type: Number, default: 0 },
  })

  const PrecioSchema = new Schema({
    Limon: LimonPrecioSchema,
    Naranja: NaranjaPrecioSchema,
    fecha: { type: Date, default: Date.now }
  });

  const GGNSchema = new Schema({
    code: String,
    fechaVencimiento: Date,
    paises: [String],
    tipo_fruta: [String]
  })

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
    ICA: String,
    "CODIGO INTERNO": { type: String, required: true },
    GGN: GGNSchema,
    tipo_fruta: tipoFrutaSchema,
    PROVEEDORES: String,
    DEPARTAMENTO: String,
    urlArchivos: [String],
    activo: { type: Boolean, required: true, default: true },
    precio: PrecioSchema,
    SISPAP: { type: Boolean, default: false },

    telefono_predio: String,
    contacto_finca: String,
    correo_informes: String,
    telefono_propietario: String,
    propietario: String,
    razon_social: String,
    nit_facturar: String,

    // N: Boolean,
    // L: Boolean,
    // M: Boolean,
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