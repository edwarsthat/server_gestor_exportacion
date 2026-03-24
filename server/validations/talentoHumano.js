import { z } from "zod";
import { objectIdString, base64String, requiredSafeString, bufferData } from "./utils/validationFunctions.js";

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
                nombre: z.string().min(1, "El nombre es obligatorio"),
                identificacion: z.string().min(1, "La identificación es obligatoria"),
                tipoDocumento: z.string().min(1, "El tipo de documento es obligatorio"),
                tipoSangre: z.string().min(1, "El tipo de sangre es obligatorio"),
                cargo: z.string().min(1, "El cargo es obligatorio"),
                vinilo: z.boolean(),

            }),
            foto: bufferData("foto"),
            cedulaPath: requiredSafeString("cedulaPath"),
            action: requiredSafeString("action"),
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
}