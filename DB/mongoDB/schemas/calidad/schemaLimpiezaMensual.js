const mongoose = require("mongoose");
const { Schema } = mongoose;

const conn = mongoose.createConnection(process.env.MONGODB_PROCESO);

const elementoSchema = new Schema({
    status: Boolean,
    observaciones: String,
    responsable: { type: Schema.Types.ObjectId, ref: "Usuarios" },
    createdAt: { type: Date, default: Date.now },
}, { _id: false })

const recepcionSchema = new Schema({
    piso: elementoSchema,
    estibas_plasticas: elementoSchema,
    anjeos: elementoSchema,
    vigas: elementoSchema,
    muelles: elementoSchema,
    cuarto_desverdizado: elementoSchema,
    tanque: elementoSchema,
    soporte: elementoSchema,
    oficina: elementoSchema,
    estibadores: elementoSchema,
    tanque_inmersion: elementoSchema,
    banda: elementoSchema,
    filtro: elementoSchema,
    canecas: elementoSchema,
    cortinas: elementoSchema
}, { _id: false })

const lavadoSchema = new Schema({
    paredes: elementoSchema,
    anjeos: elementoSchema,
    extractores: elementoSchema,
    rodillos_drench: elementoSchema,
    rodillos_lavado: elementoSchema,
    extractores_secado: elementoSchema
}, { _id: false })

const produccionSchema = new Schema({
    pisos: elementoSchema,
    ventiladores_tunel: elementoSchema,
    paredes_tunel: elementoSchema,
    ventiladores_piso: elementoSchema,
    rodillos_encerados: elementoSchema,
    cilindro: elementoSchema,
    clasificadora: elementoSchema,
    bandejas: elementoSchema,
    soportes: elementoSchema,
    extractores: elementoSchema,
    ajeos: elementoSchema,
    cuarto_insumos: elementoSchema,
    oficina: elementoSchema,
    filtros_desinfeccion: elementoSchema,
    canecas_residuos: elementoSchema,
    estibadores: elementoSchema,
    escaleras: elementoSchema,
    carritos: elementoSchema,
    herramientas: elementoSchema
}, { _id: false })

const pasillosSchema = new Schema({
    pisos: elementoSchema
}, { _id: false })

const cuartosFriosSchema = new Schema({
    cortinas: elementoSchema,
    muelle: elementoSchema,
    pisos: elementoSchema,
    ventiladores: elementoSchema
}, { _id: false })

const socialSchema = new Schema({
    lockers: elementoSchema,
    comedor: elementoSchema,
    nevera: elementoSchema,
    horno: elementoSchema,
    pisos: elementoSchema,
    paredes: elementoSchema,
    anjeos: elementoSchema,
    canecas: elementoSchema,
    exteriores: elementoSchema,
    comedor_exterior: elementoSchema
}, { _id: false })

const cartonSchema = new Schema({
    piso_estiba: elementoSchema,
    estibadores: elementoSchema
}, { _id: false })

const LimpiezaMensualSchema = new Schema({
    createdAt: { type: Date, default: Date.now() },
    responsable: { type: Schema.Types.ObjectId, ref: "Usuarios" },
    fechaFin: Date,
    fechaInicio: Date,
    ID: { type: String, require: true },
    formulario: { type: String, default: "Limpieza mensual" },
    recepcion: recepcionSchema,
    lavado: lavadoSchema,
    produccion: produccionSchema,
    pasillo: pasillosSchema,
    cuartosFrios: cuartosFriosSchema,
    social: socialSchema,
    carton: cartonSchema
})


const LimpiezaMensual = conn.model("limpiezaMensuale", LimpiezaMensualSchema);

module.exports.LimpiezaMensual = LimpiezaMensual;