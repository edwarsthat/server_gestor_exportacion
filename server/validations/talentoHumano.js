import { z } from "zod";
import { objectIdString, base64String, requiredSafeString, bufferData, safeString, optionalSafeString } from "./utils/validationFunctions.js";

export class TalentoHumanoValidations {
    static post_talentoHumano_personal_cargarCedula() {
        return z.object({
            action: z.string().min(1, "La acción es obligatoria"),
            cedula: bufferData("cedula").optional(),
            cedulaFrente: bufferData("cedulaFrente").optional(),
            cedulaTrasera: bufferData("cedulaTrasera").optional(),
        })
    }
    static post_talentoHumano_cargos_ingresoCargo() {
        return z.object({
            nombre: z.string().min(1, "El nombre es obligatorio"),
            areasAcceso: z.array(z.string()).min(1, "Al menos una área de acceso es obligatoria"),
            color: z.string().min(1, "El color es obligatorio"),
        })
    }
    static post_talentoHumano_personal_ingresoPersonal() {
        return z.object({
            data: z.object({
                identificacion: z.string().min(1, "La identificación es obligatoria"),
                cargo: objectIdString("cargo"),
                vinilo: z.boolean(),
            }),
            foto: bufferData("foto"),
            cedula: bufferData("cedula").optional(),
            cedulaFrente: bufferData("cedulaFrente").optional(),
            cedulaTrasera: bufferData("cedulaTrasera").optional(),
            action: requiredSafeString("action"),
        }).superRefine((val, ctx) => {
            const hasCedula = val.cedula !== undefined;
            const hasFrontalTrasera = val.cedulaFrente !== undefined && val.cedulaTrasera !== undefined;
            if (!hasCedula && !hasFrontalTrasera) {
                ctx.addIssue({
                    code: z.ZodIssueCode.custom,
                    message: "Se requiere 'cedula' o ambos 'cedulaFrente' y 'cedulaTrasera'",
                });
            }
        })
    }
    static put_talentoHumano_dotacion_carnets_generar_temporal() {
        return z.object({
            data: z.array(z.string().regex(/^[0-9a-fA-F]{24}$/, "ID de carnet no válido")).min(1, "Se requiere al menos un ID"),
            action: z.string().min(1, "La acción es obligatoria"),
        })
    }
    static put_talentoHumano_upload_document() {
        return z.object({
            _id: objectIdString("_id"),
            action: requiredSafeString("action"),
            typeDoc: z.enum(["foto", "cedula"], {
                errorMap: () => ({ message: "El tipo de documento debe ser 'foto' o 'cedula'" })
            }),
            file: z.union([base64String("file"), bufferData("file")]),
        })
    }
    static put_talentoHumano_personal() {
        return z.object({
            _id: objectIdString("_id"),
            action: requiredSafeString("action"),
            data: z.object({
                nombre: safeString("nombre").optional(),
                apellido: safeString("apellidO").optional(),
                identificacion: safeString("identificacion").optional(),
                tipoDocumento: safeString("tipoDocumento").optional(),
                tipoSangre: safeString("tipoSangre").optional(),
                cargo: objectIdString("cargo").optional(),
                estado: z.boolean().optional(),
                // Campos sociodemográficos
                genero: optionalSafeString("genero"),
                nacionalidad: optionalSafeString("nacionalidad"),
                fechaNacimiento: optionalSafeString("fechaNacimiento"),
                raza: optionalSafeString("raza"),
                eps: optionalSafeString("eps"),
                pension: optionalSafeString("pension"),
                cesantias: optionalSafeString("cesantias"),
                celular: optionalSafeString("celular"),
                correo: optionalSafeString("correo"),
                escolaridad: optionalSafeString("escolaridad"),
                tituloObtenido: optionalSafeString("tituloObtenido"),
                departamento: optionalSafeString("departamento"),
                municipio: optionalSafeString("municipio"),
                tipoVivienda: optionalSafeString("tipoVivienda"),
                direccion: optionalSafeString("direccion"),
                strato: optionalSafeString("strato"),
                personasACargo: z.number().int().nonnegative().optional(),
                vulnerabilidad: optionalSafeString("vulnerabilidad"),
                orientacionSexual: optionalSafeString("orientacionSexual"),
                pertenenciaEtnica: optionalSafeString("pertenenciaEtnica"),
                contactoEmergenciaNombre: optionalSafeString("contactoEmergenciaNombre"),
                contactoEmergenciaTelefono: optionalSafeString("contactoEmergenciaTelefono"),
                contactoEmergenciaParentesco: optionalSafeString("contactoEmergenciaParentesco"),
                tieneVehiculo: z.boolean().optional(),
                estadoCivil: optionalSafeString("estadoCivil"),
                fecha_formulario_sociodemografico: z.string().datetime({ offset: true }).optional(),
            }).refine(obj => Object.keys(obj).length > 0, {
                message: "Se debe enviar al menos un campo para actualizar"
            }),
        })
    }
    static post_talentoHumano_newCarnet_final() {
        return z.object({
            personalId: objectIdString("personalId"),
            vinilo: z.boolean(),
            action: requiredSafeString("action"),
        })
    }
}