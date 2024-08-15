const mongoose = require("mongoose");
const { Cargo } = require("./schemaCargos");
const { Schema } = mongoose;

const conn = mongoose.createConnection(process.env.MONGODB_SISTEMA);


const usuariosSchema = new Schema({
    usuario: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    cargo: { type: Schema.Types.ObjectId, ref: Cargo },
    email: String,
    nombre: String,
    apellido: String,
    genero: String,
    fechaNacimiento: Date,
    createdAt: { type: Date, default: Date.now },
    updateAt: { type: Date, default: Date.now },
    estado: Boolean,
    direccion: String,
    telefono: String
});

const Usuarios = conn.model("usuario", usuariosSchema);

module.exports.Usuarios = Usuarios;
