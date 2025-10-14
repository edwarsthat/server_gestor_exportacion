import mongoose from "mongoose";
import { diffObjects } from "../utils/utils.js";
const { Schema } = mongoose;


export const defineLoteEf8 = async (conn, AuditLog) => {

    const LoteEf8Schema = new Schema({
        balin: { type: Number, default: 0 },
        canastillas: { type: Number, default: 0 },
        canastillasPrestadas: { type: Number, default: 0 },
        descarteGeneral: { type: Number, default: 0 },
        enf: { type: String },
        fecha_creacion: { type: Date, default: () => new Date() },
        fecha_ingreso_inventario: { type: Date },
        numeroPrecintos: Number,
        numeroRemision: String,
        observaciones: String,
        pareja: { type: Number, default: 0 },
        placa: String,
        predio: { type: Schema.Types.ObjectId, ref: 'Proveedor' },
        precio: { type: Schema.Types.ObjectId, ref: 'precio' },
        promedio: Number,
        tipoFruta: { type: Schema.Types.ObjectId, ref: 'tipoFrutas' },
        user: { type: String, required: true },
        registroCanastillas: { type: Schema.Types.ObjectId, ref: 'canastilla' },
        createdAt: { type: Date, default: () => new Date() },

    });


    LoteEf8Schema.pre('findOneAndUpdate', async function (next) {
        const docToUpdate = await this.model.findOne(this.getQuery());
        this._oldValue = docToUpdate ? docToUpdate.toObject() : null;
        next();
    });

    LoteEf8Schema.post('findOneAndUpdate', async function (res) {
        try {
            if (this._oldValue && res) {
                // Solo los cambios, no el pergamino completo
                const cambios = diffObjects(this._oldValue, res.toObject());
                if (cambios.length > 0) {
                    await AuditLog.create({
                        collection: 'Lote',
                        documentId: res._id,
                        operation: 'update',
                        user: this.options.user, // Pasar el usuario como opción
                        action: this.options.action, // Pasar la acción como opción
                        changes: cambios, // Aquí los cambios puntuales
                        description: 'Actualización de lote'
                    });
                }
            }
        } catch (err) {
            console.error('Error guardando auditoría:', err);
        }
    });

    const loteEf8Schema = conn.model("Loteef8", LoteEf8Schema);
    return loteEf8Schema

}
