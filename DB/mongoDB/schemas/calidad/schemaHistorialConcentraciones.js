import mongoose from "mongoose";
const { Schema } = mongoose;

export const defineHistorialConcentraciones = async (conn) => {

    const HistorialConcentracionesSchema = new Schema({
        // Fecha y hora del registro
        fecha: {
            type: Date,
            required: true
        },
        // Kilos procesados (puede ser 0)
        kilosProcesados: {
            type: Number,
            required: true,
            min: 0
        },
        // Referencia al tipo de fruta
        tipoFruta: {
            type: Schema.Types.ObjectId,
            ref: "TipoFrutas",
            required: true
        },
        // Concentración en PPM (string para permitir letras y números)
        concentracionPPM: {
            type: String,
            required: true,
            trim: true
        },
        // Observaciones opcionales
        observaciones: {
            type: String,
            required: false,
            trim: true,
            default: ""
        },
        // Responsable del registro
        responsable: {
            type: String,
            required: true,
            trim: true
        },
        // Usuario que hizo el registro (automático del sistema)
        usuario: {
            type: Schema.Types.ObjectId,
            ref: "Usuario",
            required: true
        },
        // Estado del registro
        activo: {
            type: Boolean,
            default: true
        }
    }, {
        timestamps: true  // createdAt y updatedAt automáticos
    });

    // Índices para mejorar las búsquedas
    HistorialConcentracionesSchema.index({ fecha: -1 });
    HistorialConcentracionesSchema.index({ tipoFruta: 1 });

    const HistorialConcentraciones = conn.model("HistorialConcentraciones", HistorialConcentracionesSchema);
    return HistorialConcentraciones;
}

// import mongoose from "mongoose";
// const { Schema } = mongoose;

// export const defineHistorialConcentraciones = async (conn) => {

//     const HistorialConcentracionesSchema = new Schema({
//         // Fecha y hora del registro
//         fecha: {
//             type: Date,
//             required: true
//         },
//         // Kilos procesados (puede ser 0)
//         kilosProcesados: {
//             type: Number,
//             required: true,
//             min: 0
//         },
//         // Referencia al tipo de fruta
//         tipoFruta: {
//             type: Schema.Types.ObjectId,
//             ref: "TipoFruta",
//             required: true
//         },
//         // Concentración en PPM (string para permitir letras y números)
//         concentracionPPM: {
//             type: String,
//             required: true,
//             trim: true
//         },
//         // Observaciones opcionales
//         observaciones: {
//             type: String,
//             required: false,
//             trim: true,
//             default: ""
//         },
//         // Responsable del registro
//         responsable: {
//             type: Schema.Types.ObjectId,
//             ref: "Personal",
//             required: true
//         },
//         // Usuario que hizo el registro (automático del sistema)
//         usuario: {
//             type: Schema.Types.ObjectId,
//             ref: "Usuario",
//             required: true
//         },
//         // Estado del registro
//         activo: {
//             type: Boolean,
//             default: true
//         }
//     }, {
//         timestamps: true  // createdAt y updatedAt automáticos
//     });

//     // Índices para mejorar las búsquedas
//     HistorialConcentracionesSchema.index({ fecha: -1 });
//     HistorialConcentracionesSchema.index({ tipoFruta: 1 });
//     HistorialConcentracionesSchema.index({ responsable: 1 });

//     const HistorialConcentraciones = conn.model("HistorialConcentraciones", HistorialConcentracionesSchema);
//     return HistorialConcentraciones;
// }