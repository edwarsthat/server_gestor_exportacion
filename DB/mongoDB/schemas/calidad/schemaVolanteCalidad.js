
const mongoose = require("mongoose");
const { Schema } = mongoose;

const defineVolanteCalidad = async (conn) => {

    const VolanteCalidadSchema = new Schema({
        tipoFruta: String,
        unidades: Number,
        defectos: Number,
        fecha: { type: Date, default: () => Date.now() },
        operario: { type: Schema.Types.ObjectId, ref: "usuario" },
        responsable: { type: Schema.Types.ObjectId, ref: "usuario" },
    });

    const VolanteCalidad = conn.model("VolanteCalidad", VolanteCalidadSchema);
    return VolanteCalidad
}

module.exports.defineVolanteCalidad = defineVolanteCalidad;