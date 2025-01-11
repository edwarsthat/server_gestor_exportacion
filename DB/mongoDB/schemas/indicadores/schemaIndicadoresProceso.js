const mongoose = require("mongoose");
const { Schema } = mongoose;

const defineIndicadores = async (conn) => {

    const IndicadoresSchema = Schema({
        fecha_creacion: { type: Date, default: () => new Date() },
        kilos_procesador: Number,
        meta_kilos_procesados: Number,
        total_horas_hombre: Number,
        tipo_fruta: String
    })

    const Indicadores = conn.model("indicadore", IndicadoresSchema);
    return Indicadores;
}

module.exports.defineIndicadores = defineIndicadores