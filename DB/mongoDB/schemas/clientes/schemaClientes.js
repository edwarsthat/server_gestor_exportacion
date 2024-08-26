
const mongoose = require("mongoose");
const { Schema } = mongoose;

const conn = mongoose.createConnection(process.env.MONGODB_PROCESO);

const ClienteSchema = new Schema({
  CLIENTE: String,
  PAIS_DESTINO: String,
  CODIGO: Number,
  CORREO: String,
  DIRECCIÓN: String,
  ID: String,
  TELEFONO: String,
  activo: Boolean
});

const Clientes = conn.model("Cliente", ClienteSchema);

module.exports.Clientes = Clientes;