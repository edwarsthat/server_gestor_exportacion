import mongoose from "mongoose";
import { makeAuditPlugin } from "../utils/auditPLug.js";
const { Schema } = mongoose;

export const defineLoteMaquila = async (conn, AuditLog) => {


    const auditPlugin = makeAuditPlugin({ collectionName: 'LoteMaquila', AuditLogs: AuditLog });

    const calidadInternaSchema = new Schema({
        acidez: Number,
        brix: Number,
        ratio: Number,
        peso: Number,
        zumo: Number,
        user: { type: Schema.Types.ObjectId, ref: 'usuario' },
        semillas: Boolean,
        calidad: { type: Schema.Types.ObjectId, ref: 'calidades' },
        fecha: { type: Date, default: Date.now }
    }, { _id: false });

    const clasificacionCalidadSchema = new Schema({
        any: {
            type: Map,
            of: String
        },
        fecha: { type: Date, default: Date.now }

    }, { _id: false, strict: false });

    const fotosCalidadSchema = new Schema({
        any: {
            type: Map,
            of: String
        },
        fechaIngreso: { type: Date, default: Date.now }
    }, { _id: false, strict: false });

    const inspeccionIngresoSchema = new Schema({
        any: {
            type: Map,
            of: String
        },
        fecha: { type: Date, default: Date.now }

    }, { _id: false, strict: false });


    const calidadSchema = new Schema({
        inspeccionIngreso: inspeccionIngresoSchema,
        calidadInterna: calidadInternaSchema,
        clasificacionCalidad: clasificacionCalidadSchema,
        fotosCalidad: fotosCalidadSchema,

    }, { _id: false });

    const salidaDirectoNacionalSchema = new Schema({
        placa: String,
        nombreConductor: String,
        telefono: String,
        cedula: String,
        remision: String,
        canastillas: Number,
        user: String,
        cliente: { type: Schema.Types.ObjectId, ref: 'ClientesNacionale' },
        fecha: { type: Date, default: () => new Date() },
        version: { type: Number, default: 1 },
    });

    const ParametroSchema = new mongoose.Schema({
        fecha: { type: Date, default: Date.now },
        temperatura: Number,
        etileno: Number,
        carbono: Number,
        humedad: Number
    }, { _id: false });

    const desverdizadoSchema = new Schema({
        canastillasIngreso: { type: Number, default: 0 },
        cuartoDesverdizado: [String],
        fechaIngreso: { type: Date, default: () => new Date() },
        fechaFinalizar: Date,
        desverdizando: Boolean,
        parametros: [ParametroSchema],
        fechaProcesado: Date,
    }, { _id: false });

    const salidaExportacionSchema = new Schema({
        kilosGGN: { type: Number, default: 0 },
        totalKilos: { type: Number, default: 0 },
        totalCajas: { type: Number, default: 0 },
        porCalidad: {
            type: Map,
            of: new Schema({
                kilos: { type: Number, default: 0 },
                cajas: { type: Number, default: 0 }
            }),
            default: {}
        },
        porCalibre: {
            type: Map,
            of: new Schema({
                kilos: { type: Number, default: 0 },
                cajas: { type: Number, default: 0 }
            }),
            default: {}
        },
        contenedores: [{ type: Schema.Types.ObjectId, ref: 'Contenedor' }]
    }, { _id: false, strict: false });


    const loteMaquilaSchema = new Schema({
        aprobacionComercial: { type: Boolean, default: false }, //es la aprobacion antes de enviarlo a contabilidad
        aprobacionProduccion: { type: Boolean, default: false }, //es la aprobacion antes de aprobacion comercial
        calidad: calidadSchema,
        canastillas: { type: Number, default: 0 },
        canastillas_estimadas: Number,
        cliente: { type: Schema.Types.ObjectId, ref: 'Cliente' },
        contenedores: [String],
        descartes: { type: Map, of: Number, default: {} },
        descartesDevueltos: { type: Map, of: Number, default: {} },
        descartesComprados: { type: Map, of: Number, default: {} },
        deshidratacion: { type: Number, default: 100 },
        desverdizado: desverdizadoSchema,
        enf: { type: String },
        fecha_creacion: { type: Date, default: () => new Date() },
        fecha_ingreso_inventario: { type: Date },
        fechaProceso: { type: Date },
        fecha_finalizado_proceso: { type: Date },
        fecha_aprobacion_produccion: { type: Date },
        fecha_aprobacion_comercial: { type: Date },
        finalizado: { type: Boolean, default: false },
        GGN: { type: Boolean, default: false },
        historialDescarte: mongoose.Types.ObjectId,
        informeEnviado: { type: Boolean, default: false },
        infoSalidaDirectoNacional: salidaDirectoNacionalSchema,
        kilos_estimados: Number,
        kilos: Number,
        kilosReprocesados: { type: Number, default: 0 },
        kilosVaciados: { type: Number, default: 0 },
        kilosProcesados: { type: Number, default: 0 },
        numeroPrecintos: Number,
        numeroRemision: String,
        not_pass: Boolean,
        observaciones: String,
        placa: String,
        precio: { type: Schema.Types.ObjectId, ref: 'precio' },
        predio: { type: Schema.Types.ObjectId, ref: 'Proveedor' },
        promedio: Number,
        salidaExportacion: salidaExportacionSchema,
        rendimiento: { type: Number, default: 0 },
        remisionSalida: String,
        tipoFruta: { type: Schema.Types.ObjectId, ref: 'tipoFrutas' },
        user: { type: Schema.Types.ObjectId, ref: 'usuario' },
    });

    loteMaquilaSchema.plugin(auditPlugin);

    const LoteMaquila = conn.model('loteMaquila', loteMaquilaSchema);
    return LoteMaquila;
}
