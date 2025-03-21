const mongoose = require("mongoose");
const { Schema } = mongoose;

const defineCrearElemento = async (conn) => {

    const HistorialCreacionSchema = new Schema({
        accion: { type: String, required: true }, // Ej: "CREACION_ELEMENTO"

        usuario: {
            id: { type: Schema.Types.ObjectId, required: true, ref: 'User' },
            user: { type: String, required: true },
        },

        // Registro del documento creado
        documento: {
            modelo: { type: String, required: true },
            documentoId: { type: Schema.Types.ObjectId, required: true, refPath: 'documento.modelo' },
            descripcion: { type: String },

            snapshot: { type: Schema.Types.Mixed }
        },

        detallesOperacion: { type: Schema.Types.Mixed },

        fecha: { type: Date, default: Date.now, required: true },
        createdAt: { type: Date, expires: '2y', default: Date.now },
    }, { timestamps: true });

    const recordCreacion = conn.model("recordCreacion", HistorialCreacionSchema);
    return recordCreacion;
};

module.exports.defineCrearElemento = defineCrearElemento;
