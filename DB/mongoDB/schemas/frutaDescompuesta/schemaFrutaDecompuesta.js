const mongoose = require("mongoose");
const { Schema } = mongoose;

const defineFrutaDescompuesta = async (conn) => {

    const frutaDescompuestaSchema = new Schema({
        kilos_total: Number,
        createdAt: { type: Date, default: () => new Date() },
        user: String,
        razon: String,
        comentario_adicional: String,
        tipo_fruta: String
    });


    return conn.model("frutaDescompuesta", frutaDescompuestaSchema);
}


module.exports.defineFrutaDescompuesta = defineFrutaDescompuesta;

