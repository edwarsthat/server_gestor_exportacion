
const mongoose = require("mongoose");
const { Usuarios } = require("../usuarios/schemaUsuarios");
const { Schema } = mongoose;

const conn = mongoose.createConnection(process.env.MONGODB_SISTEMA);

const HigienePersonalSchema = new Schema({
    fecha: { type: Date, default: Date.now() },
    operario: { type: Schema.Types.ObjectId, ref: Usuarios },
    responsable: { type: Schema.Types.ObjectId, ref: Usuarios },
    botas: Boolean,
    pantalon: Boolean,
    camisa: Boolean,
    tapaoidos: Boolean,
    cofia: Boolean,
    tapabocas: Boolean,
    uñas: Boolean,
    accesorios: Boolean,
    barba: Boolean,
    maquillaje: Boolean,
    salud: Boolean
});

const HigienePersonal = conn.model("HigienePersonal", HigienePersonalSchema);

module.exports.HigienePersonal = HigienePersonal;