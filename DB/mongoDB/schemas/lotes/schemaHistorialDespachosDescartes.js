const mongoose = require("mongoose");
const { Schema } = mongoose;

const defineHistorialDespachoDescarte = async (conn) => {

    const descarteLavadoSchema = new Schema({
        descarteGeneral: Number,
        pareja: Number,
        Balin: Number
    }, { _id: false });

    const descarteEnceradoSchema = new Schema({
        descarteGeneral: Number,
        pareja: Number,
        Balin: Number,
        extra: Number,
        suelo: Number
    }, { _id: false });

    const tipoDescartesSchema = new Schema({
        descarteLavado: descarteLavadoSchema,
        descarteEncerado: descarteEnceradoSchema,
    });

    const RegistroSchema = new Schema({
        fecha: { type: Date, default: Date.now() },
        cliente: String,
        placa: String,
        nombreConductor: String,
        telefono: String,
        cedula: String,
        remision: String,
        tipoFruta: String,
        user: String,
        kilos: tipoDescartesSchema,
        lotesDespachados: [Schema.Types.Mixed]
    });

    const historialDespachoDescarte = conn.model("historialDespachoDescarte", RegistroSchema);
    return historialDespachoDescarte;
}

module.exports.defineHistorialDespachoDescarte = defineHistorialDespachoDescarte;