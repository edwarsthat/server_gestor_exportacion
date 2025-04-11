
const mongoose = require("mongoose");
const { Schema } = mongoose;

const defineClientesNacionales = async (conn) => {

    const ClienteNacionalSchema = new Schema({
        cliente: { type: String, unique: true },
        ubicacion: String,
        canastillas: Number,
        createdAt: { type: Date, default: () => new Date() }
    });

    const Clientes = conn.model("ClientesNacionale", ClienteNacionalSchema);
    return Clientes

}

module.exports.defineClientesNacionales = defineClientesNacionales;
