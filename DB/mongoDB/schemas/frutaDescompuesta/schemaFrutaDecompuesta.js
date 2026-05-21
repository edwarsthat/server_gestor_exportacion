import mongoose from "mongoose";
const { Schema } = mongoose;

export const defineFrutaDescompuesta = async (conn) => {


    const frutaDescompuestaSchema = new Schema({
        kilos: Number,
        canastillas: Number,
        createdAt: { type: Date, default: () => new Date() },
        user: { type: Schema.Types.ObjectId, ref: 'usuario' },
        razon: String,
        comentario_adicional: String,
        tipoFruta: { type: Schema.Types.ObjectId, ref: 'tipoFrutas' },
        descartes: { type: Map, of: Number, default: {} },
    });

    frutaDescompuestaSchema.pre('findOneAndUpdate', async function () {
        try {
            // Guardamos el documento original (ANTES)
            const docToUpdate = await this.model.findOne(this.getQuery());
            this._oldValue = docToUpdate ? docToUpdate.toObject() : null;
        } catch (err) {
            return err
        }
    });

    return conn.model("frutaDescompuesta", frutaDescompuestaSchema);
}
