import mongoose from "mongoose";
const { Schema } = mongoose;

export const defineHistorialConcentraciones = async (conn) => {

    const HistorialConcentracionesSchema = new Schema({
        // Fecha y hora del registro
        fecha: {
            type: Date,
            required: true
        },
        // Kilos procesados (puede ser 0)
        kilosProcesados: {
            type: Number,
            required: true,
            min: 0
        },
        // Referencia al tipo de fruta
        tipoFruta: {
            type: Schema.Types.ObjectId,
            ref: "tipoFrutas",
            required: true
        },
        // Concentración en PPM (string para permitir letras y números)
        concentracionPPM: {
            type: String,
            required: false,
            trim: true
        },
        //tipo de formulario: FOR-18 (ácido) o FOR-20(fungicida)
        tipo: {
            type: String,
            enum: ["acido_peracetico", "fungicida"],
            required: true,
            default: "acido_peracetico"
        },
        //solo fungicida: cantidadde producto en ml
        cantidadProductoML: {
            type: Number,
            required: false,
            min: 0
        },
        // Observaciones opcionales
        observaciones: {
            type: String,
            required: false,
            trim: true,
            default: ""
        },
        // Responsable del registro
        responsable: {
            type: String,
            required: true,
            trim: true
        },
        // Usuario que hizo el registro (automático del sistema)
        usuario: {
            type: Schema.Types.ObjectId,
            ref: "usuario",
            required: true
        },
        //verificacion (solo perfiles con permiso), null = pendeinte
        fechaVerificacion: {
            type: Date,
            default: null
        },
        verificadoPor: {
            type: Schema.Types.ObjectId,
            ref: "usuario",
            default: null
        },
        // Estado del registro
        activo: {
            type: Boolean,
            default: true
        }
    }, {
        timestamps: true  // createdAt y updatedAt automáticos
    });

    // Índices para mejorar las búsquedas
    HistorialConcentracionesSchema.index({ fecha: -1 });
    HistorialConcentracionesSchema.index({ tipoFruta: 1 });
    HistorialConcentracionesSchema.index({ tipo: 1, fecha: -1 });

    const HistorialConcentraciones = conn.model("HistorialConcentraciones", HistorialConcentracionesSchema);
    return HistorialConcentraciones;
}
