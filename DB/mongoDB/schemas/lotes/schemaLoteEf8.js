import mongoose from "mongoose";
const { Schema } = mongoose;


export const defineLoteEf8 = async (conn) => {

    const LoteEf8Schema = new Schema({
        balin: { type: Number, default: 0 },
        canastillas: { type: Number, default: 0 },
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
        tipoFruta: String,
        user: {
            type: Schema.Types.ObjectId,
            ref: 'usuario',
            required: true
        },

    });

    const loteEf8Schema = conn.model("Loteef8", LoteEf8Schema);
    return loteEf8Schema

}
