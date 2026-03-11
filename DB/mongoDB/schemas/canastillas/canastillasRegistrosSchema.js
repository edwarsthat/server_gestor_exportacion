import mongoose from "mongoose";
const { Schema } = mongoose;

export const defineRegistroCanastillas = async (conn) => {

    const cantidadSchema = new Schema({
        propias: { type: Number, default: 0 },
        prestadas: { type: Number, default: 0 },
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
        usuario: { type: Schema.Types.ObjectId, ref: 'usuario' },
        referencia: String,
        tipoMovimiento: {
            type: String,
            enum: {
                values: ['ingreso', 'salida', 'traslado', 'retiro', 'cancelado', 'creacion'],
                message: '{VALUE} no es un tipo de registro válido'
            }
        },
        estado: String,
        remitente: String,
        destinatario: String,
        motivo_devolucion: String,
        motivo_retiro_inventario: String
    })

    const Precios = conn.model("canastilla", canastillasRegistrosSchema);
    return Precios;
}

