import mongoose from "mongoose";
const { Schema } = mongoose;

export const defineIndicadores = async (conn) => {

    const kilosExportacionSchema = new Schema({
        any: {
            type: Map,
            of: Number
        }
    }, { _id: false, strict: false });

    const IndicadoresSchema = new Schema({
        fecha_creacion: { type: Date, default: () => new Date() },
        kilos_procesados: { type: Number, default: 0 },
        kilos_vaciados: { type: Number, default: 0 },
        kilos_exportacion: kilosExportacionSchema,
        meta_kilos_procesados: { type: Number, default: 0 },
        meta_kilos_procesados_hora: { type: Number, default: 0 },
        total_horas_hombre: { type: Number, default: 0 },
        tipo_fruta: [String],
        kilos_meta_hora: { type: Number, default: 0 },
        duracion_turno_horas: { type: Number, default: 0 },
    })



    const Indicadores = conn.model("indicadore", IndicadoresSchema);
    return Indicadores;
}

