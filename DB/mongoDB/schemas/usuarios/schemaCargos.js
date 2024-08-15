const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const conn = mongoose.createConnection(process.env.MONGODB_SISTEMA);

const permisosSchema = new Schema({
    any: {
        type: Map,
        of: String
    },
}, { _id: false, strict: false });

const ventanaSchema = new Schema({
    titulo: String,
    permisos: permisosSchema,
    _id: String
});

const seccionSchema = new Schema({
    any: {
        type: Map,
        of: ventanaSchema
    },
}, { _id: false, strict: false });

const cargoSchema = new Schema({
    Cargo: String,
    createdAt: { type: Date, default: Date.now },
    "Inventario y Logística": seccionSchema,
    Calidad: seccionSchema,
    Sistema: seccionSchema,
    Indicadores: seccionSchema,
    Proceso: seccionSchema,
    Comercial: seccionSchema,
    "Gestión de cuentas": seccionSchema,
    Rol: Number,

});


const Cargo = conn.model("Cargo", cargoSchema);

module.exports.Cargo = Cargo;