
import mongoose from "mongoose";
const { Schema } = mongoose;

export const defineDeleteRecords = async (conn) => {

    const HistorialEliminacionSchema = new Schema({
        accion: { type: String, required: true }, // Ej: "ELIMINACION_ELEMENTO"

        usuario: {
            id: { type: Schema.Types.ObjectId, required: true, ref: 'User' },
            user: { type: String, required: true },
        },

        // Información del documento eliminado
        documento: {
            modelo: { type: String, required: true },
            documentoId: { type: Schema.Types.ObjectId, required: true, refPath: 'documento.modelo' },
            descripcion: { type: String },

            snapshot: { type: Schema.Types.Mixed, required: true }
        },

        detallesOperacion: { type: Schema.Types.Mixed },

        fecha: { type: Date, default: Date.now, required: true },
        createdAt: { type: Date, expires: '2y', default: Date.now },
    }, { timestamps: true });

    const recordDelete = conn.model("recordEliminado", HistorialEliminacionSchema);
    return recordDelete;
};

