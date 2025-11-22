import mongoose from "mongoose";
const { Schema } = mongoose;

export const defineHistorialDespachoDescarte = async (conn) => {

    const RegistroSchema = new Schema({
        fecha: { type: Date, default: () => new Date() },
        cliente: { type: Schema.Types.ObjectId, ref: 'ClientesNacionale' },
        user: { type: Schema.Types.ObjectId, ref: 'usuario' },
        placa: String,
        nombreConductor: String,
        telefono: String,
        cedula: String,
        remision: String,
        tipoFruta: String,
        kilos: Number,
        descartes: { type: Map, of: Number, default: {} },
    });


    RegistroSchema.pre('findOneAndUpdate', async function (next) {
        try {
            // Guardamos el documento original (ANTES)
            const docToUpdate = await this.model.findOne(this.getQuery());
            this._oldValue = docToUpdate ? docToUpdate.toObject() : null;
            next();
        } catch (err) {
            next(err);
        }
    });


    const historialDespachoDescarte = conn.model("historialDespachoDescarte", RegistroSchema);
    return historialDespachoDescarte;
}

