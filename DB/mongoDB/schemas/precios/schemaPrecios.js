
const mongoose = require("mongoose");
const { Schema } = mongoose;


const definePrecios = async (conn) => {

    const CalidadesExpSchema = new Schema({
        "1": { type: Number, default: 0 },
        "15": { type: Number, default: 0 },
        "2": { type: Number, default: 0 },
    }, { _id: false, strict: false })

    const CalidadesDescartesSchema = new Schema({
        frutaNacional: { type: Number, default: 0 },
        descarte: { type: Number, default: 0 },
        combinado: { type: Number, default: 0 },
    }, { _id: false, strict: false })

    const PreciosSchema = new Schema({
        fecha: { type: Date, default: () => new Date() },
        tipo_fruta: {
            fruta: String,
            listaEmpaque: {
                type: Map,
                of: CalidadesExpSchema
            },
            descartes: {
                type: Map,
                of: CalidadesDescartesSchema
            }
        }
    }, { strict: false })

    const Precios = conn.model("precio", PreciosSchema);
    return Precios;
}

module.exports.definePrecios = definePrecios
