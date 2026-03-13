import mongoose from "mongoose";
const { Schema } = mongoose;
import { getRedisClient } from "../../../redis/init.js";

const incrementarClientesVersion = async () => {
  try {
    const cliente = await getRedisClient();
    await cliente.incr("clientesVersion");
  } catch (err) {
    console.error("[Redis] Error incrementando proveedoresVersion:", err.message);
  }
};

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
    activo: Boolean,
    user: { type: Schema.Types.ObjectId, ref: 'usuario' },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
  });

  ClienteSchema.post('save', incrementarClientesVersion);
  ClienteSchema.post('findOneAndUpdate', incrementarClientesVersion);
  ClienteSchema.post('updateMany', incrementarClientesVersion);

  const Clientes = conn.model("Cliente", ClienteSchema);
  return Clientes;
}