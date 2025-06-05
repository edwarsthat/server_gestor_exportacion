
import mongoose from "mongoose";
const { Schema } = mongoose;

export const defineTurnoData = async (conn) => {

    const dataStopSchema = new Schema({
        inicioPausa: Date,
        finalPausa: Date,
        Observacion: String,
    }, { _id: false, strict: false });

    const TurnoDataSchema = new Schema({
        horaInicio: { type: Date, default: Date.now },
        tiempoTrabajado: { type: Number, default: 0 },
        tiempoPausa: { type: Number, default: 0 },
        horaFin: Date,
        pausaProceso: [dataStopSchema],

    });


    const TurnoData = conn.model("turno", TurnoDataSchema);
    return TurnoData
}
