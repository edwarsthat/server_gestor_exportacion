
const mongoose = require("mongoose");
const { Schema } = mongoose;

const conn = mongoose.createConnection(process.env.MONGODB_SISTEMA);

const VolanteCalidadSchema = new Schema({
    tipoFruta: String,
    unidades: Number,
    defectos: Number,
    fecha: { type: Date, default: Date.now() },
    operario: { type: Schema.Types.ObjectId, ref: "Usuarios" },
    responsable: { type: Schema.Types.ObjectId, ref: "Usuarios" },
});

const VolanteCalidad = conn.model("VolanteCalidad", VolanteCalidadSchema);

module.exports.VolanteCalidad = VolanteCalidad;