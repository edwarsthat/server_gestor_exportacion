import mongoose from "mongoose";
const { Schema } = mongoose;

export const defineIndicadores = async (conn) => {
    const kilosExportacionSchema = new Schema(
        {},
        {
            _id: false,
            strict: false, // necesario para permitir claves dinámicas
            typePojoToMixed: false // opcional: evita conversión automática a Mixed
        }
    );

    kilosExportacionSchema.add(
        new Map([
            [
                String, // Nivel 1: tipoFruta
                new Map([
                    [
                        String, // Nivel 2: calidad
                        new Map([
                            [String, Number] // Nivel 3: calibre -> valor numérico
                        ])
                    ]
                ])
            ]
        ])
    );

    const kilosProcesadosSchema = new Schema(
        {}, // sin campos definidos
        {
            _id: false,
            strict: false // para permitir claves dinámicas en la raíz
        }
    );

    // Declaramos el Map a nivel raíz
    kilosProcesadosSchema.add(
        new Map([[String, Number]])
    );

    const IndicadoresSchema = new Schema({
        fecha_creacion: { type: Date, default: () => new Date() },
        kilos_procesados: kilosProcesadosSchema,
        kilos_vaciados: kilosProcesadosSchema,
        kilos_exportacion: kilosExportacionSchema,
        meta_kilos_procesados: { type: Number, default: 0 },
        meta_kilos_procesados_hora: { type: Number, default: 0 },
        kilos_meta_hora: { type: Number, default: 0 },
        duracion_turno_horas: { type: Number, default: 0 },
        // total_horas_hombre: { type: Number, default: 0 },

    })

    const Indicadores = conn.model("indicadore", IndicadoresSchema);
    return Indicadores;
}

