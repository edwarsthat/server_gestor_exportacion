import mongoose from "mongoose";
const { Schema } = mongoose;

export const defineFleteCompuesto = async (conn) => {
    const FleteCompuestoSchema = new Schema({
        codigoGrupo: { 
            type: String, 
            unique: true, 
            required: true 
        }, // Ej: FC-2026-0001
        placa: { 
            type: String, 
            required: true 
        },
        // Guardamos los IDs de los lotes (EFs) que se agruparon
        lotes: [{ 
            type: Schema.Types.ObjectId, 
            ref: "Lotes" 
        }],
        distribucion: [{               
            loteId: { type: Schema.Types.ObjectId, ref: "Lotes" },
            kilos: { type: Number },
            proporcion: { type: Number },
            totalFlete: { type: Number }
            }],
        tarifaAplicada: { type: Number, required: true },
        kilosTotales: { type: Number, required: true },
        kilosFacturables: { type: Number, required: true },
        recargoPredios: { type: Number, default: 0 },
        totalFlete: { type: Number, required: true },
        activo: { 
            type: Boolean, 
            default: true 
        }
    }, {
        timestamps: true 
    });

    // Índice para búsquedas rápidas por placa
    FleteCompuestoSchema.index({ placa: 1, createdAt: -1 });

    const FleteCompuesto = conn.model("FleteCompuesto", FleteCompuestoSchema);
    return FleteCompuesto;
}