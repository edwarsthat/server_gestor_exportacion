import mongoose from "mongoose";
const { Schema } = mongoose;

export const defineUser = async (conn) => {

    const usuariosSchema = new Schema({
        usuario: { type: String, required: true, unique: true },
        password: { type: String, required: true },
        cargo: { type: Schema.Types.ObjectId, ref: "Cargo" },
        email: String,
        nombre: String,
        apellido: String,
        genero: String,
        fechaNacimiento: Date,
        createdAt: { type: Date, default: Date.now },
        updateAt: { type: Date, default: Date.now },
        estado: Boolean,
        direccion: String,
        telefono: String,
        cedula: Number,
    });


    const Usuarios = conn.model("usuario", usuariosSchema);

    console.log("se creo user")

    return Usuarios

}

