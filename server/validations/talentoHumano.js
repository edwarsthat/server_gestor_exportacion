import { z } from "zod";

export class TalentoHumanoValidations {
    static post_talentoHumano_personal_ingresoPersonal() {
        return z.object({
            nombre: z.string({ required_error: "El nombre es requerido" }).min(1, "El nombre no puede estar vacío"),
            cargo: z.string({ required_error: "El cargo es requerido" }).regex(/^[0-9a-fA-F]{24}$/, "El cargo debe ser un ID válido"),
            identificacion: z.string({ required_error: "La identificación es requerida" }).min(1, "La identificación no puede estar vacía"),
            tipoIdentificacion: z.string({ required_error: "El tipo de identificación es requerido" }).min(1, "El tipo de identificación no puede estar vacío"),
        })
    }
    static post_talentoHumano_cargos_ingresoCargo() {
        return z.object({
            nombre: z.string().min(1, "El nombre es obligatorio"),
            areasAcceso: z.array(z.string()).min(1, "Al menos una área de acceso es obligatoria"),
        })
    }
    static post_talentoHumano_personal_ingresoPersonal() {
        return z.object({
            nombre: z.string().min(1, "El nombre es obligatorio"),
            identificacion: z.string().min(1, "La identificación es obligatoria"),
            tipoIdentificacion: z.string().min(1, "El tipo de identificación es obligatorio"),
            tipoSangre: z.string().min(1, "El tipo de sangre es obligatorio"),
            cargo: z.string().min(1, "El cargo es obligatorio"),
        })
    }
}