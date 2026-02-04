// import mongoose from "mongoose";
// const { Schema } = mongoose;

// export const defineTarifaPredio = (conn) => {
//     if (!conn) {
//         throw new Error("❌ Mongo connection not provided to TarifaPredio");
//     }

//     const TarifaPredioSchema = new Schema({
//         predio: {
//             type: Schema.Types.ObjectId,
//             ref: "Proveedor",
//             required: true,
//             index: true
//         },
//         year: {
//             type: Number,
//             required: true,
//             index: true
//         },
//         tipo: {
//             type: String,
//             enum: ["FIJA", "KG"],
//             required: true
//         },
//         valor: {
//             type: Number,
//             required: true
//         },
//         activo: {
//             type: Boolean,
//             default: true
//         },
//         createdAt: {
//             type: Date,
//             default: Date.now
//         },
//         updatedAt: {
//             type: Date,
//             default: Date.now
//         }
//     }, {
//         collection: "tarifas_predio"
//     });

//   // 🔒 Un predio no puede tener 2 tarifas activas del mismo tipo en el mismo año
//     TarifaPredioSchema.index(
//         { predio: 1, year: 1, tipo: 1 },
//         { unique: true }
//     );

//     TarifaPredioSchema.pre("save", function (next) {
//         this.updatedAt = new Date();
//         next();
//     });

// //     export const TarifaPredio = mongoose.model(
// //     "TarifaPredio",
// //     TarifaPredioSchema
// // );

//     return conn.model("TarifaPredio", TarifaPredioSchema);
//     };


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