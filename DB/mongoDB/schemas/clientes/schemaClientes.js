import mongoose from "mongoose";
const { Schema } = mongoose;

export const defineClientes = async (conn) => {
  const PaisDestinoSchema = new Schema({
    codigo: { type: Schema.Types.ObjectId, ref: 'Pais' },
    requiereGGN: { type: Boolean, default: false }
  }, { _id: false });

  const ClienteSchema = new Schema({
    CLIENTE: String,
    PAIS_DESTINO: [PaisDestinoSchema],
    CODIGO: { type: Number, required: true, unique: true },
    CORREO: String,
    DIRECCIÓN: String,
    ID: String,
    TELEFONO: String,
    activo: Boolean
  });

  const Clientes = conn.model("Cliente", ClienteSchema);
  return Clientes;
}