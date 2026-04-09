import mongoose from "mongoose";
const { Schema } = mongoose;

export const defineOtrosFletes = async (conn) => {

    const OtrosFletesSchema = new Schema({

        fecha: {
            type: Date,
            required: true
        },

        destino: {
            type: String,
            required: true,
            trim: true
        },

        tipoFlete: {
            type: String,
            enum: [
                "Llevar Canastillas",
                "Traer Canastillas",
                "Traer Estibas",
                "Compras",
                "Otro"
            ],
            required: true
        },

        valorFlete: {
            type: Number,
            required: true
        },

        placa: {
            type: String,
            required: true,
            uppercase: true,
            trim: true
        },

        conductor: {
            type: String,
            required: true,
            trim: true
        },

        observaciones: {
            type: String,
            default: ""
        },

        semana: {
            type: Number
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

    const OtrosFletes = conn.model("OtrosFletes", OtrosFletesSchema);
    return OtrosFletes;
};