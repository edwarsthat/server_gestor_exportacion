const mongoose = require("mongoose");
const { Usuarios } = require("../usuarios/schemaUsuarios");
const { Schema } = mongoose;

const conn = mongoose.createConnection(process.env.MONGODB_PROCESO);

const elementoSchema = new Schema({
    status: Boolean,
    observaciones: String,
    createdAt: { type: Date, default: Date.now },
    responsable: { type: Schema.Types.ObjectId, ref: Usuarios },
}, { _id: false })

const controlSchema = new Schema({
    exteriores: elementoSchema,
    contenedores_basura_limpios: elementoSchema,
    areas_limpias_libres_de_residuos: elementoSchema,
    ausencia_animales_domesticos: elementoSchema,
    rejillas_drenajes_sifones: elementoSchema,
    ventanas_vidrios_ajeos: elementoSchema,
    puertas: elementoSchema,
    mallas_proteccion: elementoSchema,
    espacios_equipos: elementoSchema,
    sotano: elementoSchema
}, { _id: false })

const ceboSchema = new Schema({
    consumo: elementoSchema
}, { _id: false })

const hallazgosSchema = new Schema({
    roedores: elementoSchema,
    cucarachas: elementoSchema,
    hormigas: elementoSchema,
    insectos: elementoSchema,
    excremento: elementoSchema,
    sonidos: elementoSchema,
    huellas: elementoSchema,
    madrigueras: elementoSchema,
    olores: elementoSchema,
    pelos: elementoSchema,
    manchas_orina: elementoSchema,
    otras_plagas: elementoSchema
}, { _id: false })

const ControlPlagasSchema = new Schema({
    createdAt: { type: Date, default: Date.now() },
    responsable: { type: Schema.Types.ObjectId, ref: Usuarios },
    fechaFin: Date,
    fechaInicio: Date,
    ID: { type: String, require: true },
    formulario: { type: String, default: "Control de plagas" },
    control: controlSchema,
    cebo: ceboSchema,
    hallazgos: hallazgosSchema
})

const ControlPlagas = conn.model("controlPlaga", ControlPlagasSchema);

module.exports.ControlPlagas = ControlPlagas;