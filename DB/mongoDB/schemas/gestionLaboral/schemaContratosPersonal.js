// import mongoose from "mongoose";

// const gestionLaboralSchema = new mongoose.Schema(
//   {
//     nombre: {
//       type: String,
//       required: true,
//       trim: true
//     },
//     dependencia: {
//       type: String,
//       required: true
//     },
//     cargo: {
//       type: mongoose.Schema.Types.ObjectId,
//       ref: "cargosPersonal",
//       required: true
//     },
//     salario: {
//       type: Number,
//       required: true
//     },
//     fechaIngreso: {
//       type: Date,
//       required: true
//     },
//     mesCumpleanos: {
//       type: Number,
//       min: 1,
//       max: 12
//     },
//     diaCumpleanos: {
//       type: Number,
//       min: 1,
//       max: 31
//     },
//     tipoContrato: {
//       type: String,
//       required: true
//     },
//     periodoPruebaHasta: {
//       type: Date
//     },
//     proximaRenovacion: {
//       type: Date
//     },
//     estadoActual: {
//       type: Boolean,
//       default: true
//     },
//     cambioCarnet: {
//       type: Date
//     }
//   },
//   {
//     timestamps: true
//   }
// );

// export default mongoose.model(
//   "gestionLaboral",
//   gestionLaboralSchema
// );

import mongoose from "mongoose";

const ContratoPersonalSchema = new mongoose.Schema({

    nombre: {
        type: String,
        required: true
    },

    cedula: {
        type: String,
        required: true
    },

    dependencia: {
        type: String,
        required: true
    },

    cargo: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "CargosPersonal"
    },

    salario: {
        type: Number
    },

    fechaIngreso: {
        type: Date,
        required: true
    },

    tipoContrato: {
        type: String,
        required: true
    },

    proximaRenovacion: {
        type: Date
    },

    estadoActual: {
        type: Boolean,
        default: true
    },

    observaciones: {
        type: String
    }

}, {
    timestamps: true
});

export default mongoose.model("ContratosPersonal", ContratoPersonalSchema);