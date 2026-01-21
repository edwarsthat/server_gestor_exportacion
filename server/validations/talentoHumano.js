import { z } from "zod";

export class TalentoHumanoValidations {
    static post_talentoHumano_personal_cargarCedula() {
        return z.object({
            action: z.string().min(1, "La acción es obligatoria"),
            cedula: z.string().optional(),
            cedulaFrente: z.object({
                url: z.string(),
            }).optional(),
            cedulaTrasera: z.object({
                url: z.string(),
            }).optional(),
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
            nombre: z.string().min(1, "El nombre es obligatorio"),
            identificacion: z.string().min(1, "La identificación es obligatoria"),
            tipoDocumento: z.string().min(1, "El tipo de documento es obligatorio"),
            tipoSangre: z.string().min(1, "El tipo de sangre es obligatorio"),
            cargo: z.string().min(1, "El cargo es obligatorio"),
        })
    }
    static put_talentoHumano_dotacion_carnets_generar_temporal() {
        return z.object({
            data: z.string().regex(/^[0-9a-fA-F]{24}$/, "ID de carnet no válido"),
            action: z.string().min(1, "La acción es obligatoria"),
        })
    }
}