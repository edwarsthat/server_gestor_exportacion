
const mongoose = require("mongoose");
const { Schema } = mongoose;

const defineClientesNacionales = async (conn) => {

    const ClienteNacionalSchema = new Schema({
        codigo: { type: Number, unique: true, required: true },
        cliente: { type: String, unique: true, required: true },
        ubicacion: String,
        canastillas: Number,
        createdAt: { type: Date, default: () => new Date() }
    });

    const Clientes = conn.model("ClientesNacionale", ClienteNacionalSchema);
    return Clientes

}

module.exports.defineClientesNacionales = defineClientesNacionales;
