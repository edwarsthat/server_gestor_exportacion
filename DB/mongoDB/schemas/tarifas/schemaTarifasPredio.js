
import mongoose from "mongoose";
const { Schema } = mongoose;

export const defineTarifaPredio = async (conn) => {

    const TarifaPredioSchema = new Schema({
        // Referencia al proveedor/predio
        predio: {
            type: Schema.Types.ObjectId,
            ref: "Proveedor",
            required: true
        },
        // Año al que corresponde esta tarifa (ej: 2024, 2025)
        year: {
            type: Number,
            required: true
        },
        // Valor de la tarifa en COP
        valor: {
            type: Number,
            required: true
        },
        // Tipo de tarifa — FIJA por defecto, extensible a futuro
        tipo: {
            type: String,
            default: "FIJA",
            enum: ["FIJA", "KG"]
        },
        // Si está activa o fue anulada
        activo: {
            type: Boolean,
            default: true
        }
    }, {
        timestamps: true  // createdAt y updatedAt automáticos
    });

    // Índice único: no puede haber dos tarifas con mismo predio + año + tipo
    TarifaPredioSchema.index(
        { predio: 1, year: 1, tipo: 1 },
        { unique: true }
    );

    // Mismo patrón que todos los demás: conn.model()
    const TarifaPredio = conn.model("TarifaPredio", TarifaPredioSchema);
    return TarifaPredio;
}