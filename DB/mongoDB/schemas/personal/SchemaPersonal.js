import mongoose from "mongoose";
import { makeAuditPlugin } from "../utils/auditPLug.js";
const { Schema } = mongoose;

export const defineSchemaPersonal = async (conn, auditLog) => {

    const auditPlugin = makeAuditPlugin({ collectionName: 'personal', AuditLogs: auditLog });

    const personalSchema = new Schema({
        PE: { type: Number, required: true, unique: true },
        nombre: { type: String, required: true },
        apellido: { type: String, required: true },
        cargo: { type: Schema.Types.ObjectId, ref: 'cargosPersonal' },
        identificacion: { type: String, required: true, unique: true },
        tipoDocumento: { type: String },
        foto: { type: String },
        tipoSangre: { type: String },
        urlFotoCarnet: { type: String },
        estado: { type: Boolean, required: true, default: true },
        carnet: { type: Schema.Types.ObjectId, ref: 'carnet', default: null },

        // Encuesta socioeconómica
        genero: { type: String },
        nacionalidad: { type: String },
        fechaNacimiento: { type: String },
        raza: { type: String },
        eps: { type: String },
        pension: { type: String },
        cesantias: { type: String },
        celular: { type: String },
        correo: { type: String },
        escolaridad: { type: String },
        tituloObtenido: { type: String },
        departamento: { type: String },
        municipio: { type: String },
        tipoVivienda: { type: String },
        direccion: { type: String },
        estrato: { type: String },
        personasACargo: { type: Number },
        vulnerabilidad: { type: String },
        orientacionSexual: { type: String },
        pertenenciaEtnica: { type: String },
        contactoEmergenciaNombre: { type: String },
        contactoEmergenciaTelefono: { type: String },
        contactoEmergenciaParentesco: { type: String },
        tieneVehiculo: { type: Boolean },
        estadoCivil: { type: String },
        fecha_formulario_sociodemografico: { type: Date },

        // Informacion familiar
        nombre_conyugue: { type: String },
        apellido_conyugue: { type: String },
        telefono_conyugue: { type: String },
        tiempo_conviviendo: { type: Number },
        tiene_hijos: { type: Boolean },
        cuantos_hijos: { type: Number },
        edad_hijos: { type: [Number] },

        // Dotacion
        camisa: { type: String },
        pantalon: { type: String },
        calzado: { type: String },
    })

    personalSchema.index(
        { PE: 1, cargo: 1 },
        { name: 'idx_pe_cargo' }
    );
    personalSchema.index(
        { carnet: 1 },
        { name: 'idx_carnet' }
    );

    personalSchema.plugin(auditPlugin);

    const Personal = conn.model("personal", personalSchema);

    return Personal

}

