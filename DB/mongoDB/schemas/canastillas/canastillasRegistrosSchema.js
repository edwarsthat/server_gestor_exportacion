import mongoose from "mongoose";
const { Schema } = mongoose;

export const defineRegistroCanastillas = async (conn) => {

    const cantidadSchema = new Schema({
        propias: { type: Number, default: 0 },
        prestadas: [
            {
                cantidad: Number,
                propietario: String
            }
        ]
    }, { _id: false })

    const canastillasRegistrosSchema = new Schema({
        fecha_envio: { type: Date },
        fecha_recibido: { type: Date },
        fecha_devolucion: { type: Date },
        fecha_recepcionDevolucion: { type: Date },
        createdAt: { type: Date, default: () => new Date() },
        destino: String,
        origen: String,
        cantidad: cantidadSchema,
        observaciones: String,
        usuario: {
            id: { type: String, required: true},
            user: { type: String, required: true },
        },
        referencia: String,
        tipoMovimiento: String,
        estado: String,
        remitente: String,
        destinatario: String,
        motivo_devolucion: String,
        motivo_retiro_inventario: String
    })

    const Precios = conn.model("canastilla", canastillasRegistrosSchema);
    return Precios;
}

