import mongoose from "mongoose";
const { Schema } = mongoose;

export const defineIndicadores = async (conn) => {

  // strict: false permite claves dinámicas en cualquier nivel
  // Los schema.add con Map no eran válidos y se eliminan
  const kilosExportacionSchema = new Schema({}, {
    _id: false,
    strict: false
  });

  const kilosProcesadosSchema = new Schema({}, {
    _id: false,
    strict: false
  });

  const IndicadoresSchema = new Schema({
    fecha_creacion: { type: Date, default: () => new Date() },
    kilos_procesados: kilosProcesadosSchema,
    kilos_vaciados: kilosProcesadosSchema,
    kilos_exportacion: kilosExportacionSchema,
    kilos_meta_hora: { type: Number, default: 0 },
    duracion_turno_horas: { type: Number, default: 0 },
  });

  const Indicadores = conn.model("indicadore", IndicadoresSchema);
  return Indicadores;
};