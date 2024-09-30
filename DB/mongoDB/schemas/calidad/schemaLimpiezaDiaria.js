const mongoose = require("mongoose");
const { Usuarios } = require("../usuarios/schemaUsuarios");
const { Schema } = mongoose;

const conn = mongoose.createConnection(process.env.MONGODB_PROCESO);

const elementoSchema = new Schema({
    status: Boolean,
    observaciones: String,
    createdAt: { type: Date, default: Date.now() },
    responsable: { type: Schema.Types.ObjectId, ref: Usuarios },
}, { _id: false })

const laboratorioSchema = new Schema({
    meson: elementoSchema,
    utensilios: elementoSchema,
    cajon: elementoSchema,
    piso: elementoSchema,
    paredes: elementoSchema
}, { _id: false })

const almacenamientoSchema = new Schema({
    pisos: elementoSchema,
    paredes: elementoSchema,
    estibadores: elementoSchema,
    malla: elementoSchema
}, { _id: false })

const socialSchema = new Schema({
    mesones: elementoSchema,
    microondas: elementoSchema,
    vestieres: elementoSchema

}, { _id: false })

const recepcionSchema = new Schema({
    tanque: elementoSchema,
    muelles: elementoSchema,
    estibadores: elementoSchema
}, { _id: false })

const lavadoSchema = new Schema({
    rodillos_lavado: elementoSchema,
    paredes: elementoSchema,
    piso: elementoSchema,
    rodillos_tunel: elementoSchema,
    estructura_equipo: elementoSchema,
    desbalinadora: elementoSchema
}, { _id: false })

const procesoSchema = new Schema({
    rodillos_tunel: elementoSchema,
    modulo: elementoSchema,
    rodillo_cera: elementoSchema,
    rodillos_clasificadora: elementoSchema,
    bandejas: elementoSchema,
    pisos: elementoSchema,
    paredes: elementoSchema,
    estibadores: elementoSchema,
    herramientas: elementoSchema,
    basculas: elementoSchema
}, { _id: false })

const insumosSchema = new Schema({
    estanteria: elementoSchema,
    piso: elementoSchema,
    paredes: elementoSchema,
    orden: elementoSchema
}, { _id: false })

const servicioSchema = new Schema({
    sanitarios: elementoSchema,
    lavamanos: elementoSchema,
    basura: elementoSchema,
    piso: elementoSchema,
    paredes: elementoSchema
}, { _id: false })

const comunesSchema = new Schema({
    alrededores: elementoSchema,
    cuarto_residuos: elementoSchema
}, { _id: false })

const LimpiezaDiariaSchema = new Schema({
    createdAt: { type: Date, default: Date.now() },
    responsable: { type: Schema.Types.ObjectId, ref: Usuarios },
    fechaFin: Date,
    fechaInicio: Date,
    ID: { type: String, require: true },
    formulario: { type: String, default: "Limpieza diaría" },
    laboratorio: laboratorioSchema,
    almacenamiento: almacenamientoSchema,
    social: socialSchema,
    recepcion: recepcionSchema,
    lavado: lavadoSchema,
    proceso: procesoSchema,
    insumos: insumosSchema,
    servicios: servicioSchema,
    comunes: comunesSchema
});

const LimpiezaDiaria = conn.model("limpiezaDiaria", LimpiezaDiariaSchema);

module.exports.LimpiezaDiaria = LimpiezaDiaria;