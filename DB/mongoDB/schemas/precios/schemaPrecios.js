
const mongoose = require("mongoose");
const { Schema } = mongoose;


const definePrecios = async (conn) => {

    const PreciosSchema = new Schema({
        fecha: { type: Date, default: () => new Date() },
        tipoFruta: String,
        "1": { type: Number, default: 0 },
        "15": { type: Number, default: 0 },
        "2": { type: Number, default: 0 },
        frutaNacional: { type: Number, default: 0 },
        descarte: { type: Number, default: 0 },
        predios: [String],
        week: Number,
        year: Number,
        comentario: String
    })

    const Precios = conn.model("precio", PreciosSchema);
    return Precios;
}

module.exports.definePrecios = definePrecios
