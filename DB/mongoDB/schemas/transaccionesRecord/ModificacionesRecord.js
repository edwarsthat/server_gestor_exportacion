const mongoose = require("mongoose");
const { Schema } = mongoose;

const defineModificarElemento = async (conn) => {

    const HistorialModificacionSchema = new Schema({
        accion: { type: String, required: true }, // Ej: "ACTUALIZACION_PALET"

        usuario: {
            id: { type: Schema.Types.ObjectId, required: true, ref: 'User' },
            user: { type: String, required: true },
        },

        documentoAfectado: {
            modelo: { type: String, required: true },
            documentoId: { type: Schema.Types.ObjectId, required: true, refPath: 'documentoAfectado.modelo' },
            descripcion: { type: String },
        },

        cambios: {
            antes: { type: Schema.Types.Mixed, required: true },
            despues: { type: Schema.Types.Mixed, required: true },
        },

        detallesOperacion: { type: Schema.Types.Mixed },

        fecha: { type: Date, default: Date.now, required: true },
        createdAt: { type: Date, expires: '2y', default: Date.now },
    }, { timestamps: true });

    const recordModificacion = conn.model("recordModificacione", HistorialModificacionSchema);
    return recordModificacion;

};

module.exports.defineModificarElemento = defineModificarElemento;
