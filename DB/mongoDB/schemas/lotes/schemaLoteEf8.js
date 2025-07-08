import mongoose from "mongoose";
const { Schema } = mongoose;


export const defineLoteEf8 = async (conn) => {

    const LoteEf8Schema = new Schema({
        descarteGeneral: { type: Number, default: 0 },
        pareja: { type: Number, default: 0 },
        balin: { type: Number, default: 0 },
        enf: { type: String },
        fecha_creacion: { type: Date, default: () => new Date() },
        fecha_ingreso_inventario: { type: Date },
        numeroPrecintos: Number,
        numeroRemision: String,
        observaciones: String,
        placa: String,
        precio: { type: Schema.Types.ObjectId, ref: 'precio' },
        predio: { type: Schema.Types.ObjectId, ref: 'Proveedor' },
        promedio: Number,
        tipoFruta: String,
        user: {
            type: Schema.Types.ObjectId,
            ref: 'usuario',
            required: true
        },
    });

    const loteEf8Schema = conn.model("ef8Lote", LoteEf8Schema);
    return loteEf8Schema

}
