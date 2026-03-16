import mongoose from "mongoose";
const { Schema } = mongoose;

export const defineControlLimpiezaEPP = async (conn) => {

    const ControlLimpiezaEPPSchema = new Schema({

        fecha: {
            type: Date,
            required: true
        },

        codigoCareta: {
            type: String,
            required: true,
            trim: true
        },

        estadoCareta: {
            type: String,
            enum: ["Bueno", "Regular", "Malo"],
            required: true
        },

         tipoLimpieza: {        // NUEVO
        type: String,
        enum: ["Superficial", "Profunda"],
        required: true
        },

        retiroCartuchos: {     // NUEVO
            type: String,
            enum: ["Si", "No"],
            required: true
        },

        limpiezaRealizada: {
            type: Boolean,
            required: true
        },

        cargo: {               // NUEVO
        type: String,
        trim: true
        },

        observaciones: {
            type: String,
            trim: true,
            default: ""
        },

        responsable: {
            type: String,
            required: true,
            trim: true
        },

        usuario: {
            type: Schema.Types.ObjectId,
            ref: "usuario",
            required: true
        },

        activo: {
            type: Boolean,
            default: true
        }

    }, {
        timestamps: true
    });

    ControlLimpiezaEPPSchema.index({ fecha: -1 });

    const ControlLimpiezaEPP = conn.model(
        "ControlLimpiezaEPP",
        ControlLimpiezaEPPSchema
    );

    return ControlLimpiezaEPP;
};