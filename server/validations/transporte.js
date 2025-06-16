import { z } from 'zod';

export class transporteValidations {
    static post_transporte_conenedor_entregaPrecinto() {
        return z.object({
            _id: z.string().refine((val) => /^[0-9a-fA-F]{24}$/.test(val), "El _id debe ser un ObjectId válido de MongoDB"),
            entrega: z.string().min(1, "El nombre de quien entrega es obligatorio"),
            recibe: z.string().min(1, "El nombre de quien recibe es obligatorio"),
            fechaEntrega: z.string()
                .min(1, "La fecha de entrega es obligatoria")
                .refine(val => !isNaN(Date.parse(val)), {
                    message: "La fecha no es válida",
                }),
            observaciones: z.string().optional(),
        })
    }
    static get_transporte_registros_entregaPrecintos_fotos() {
        return z.array(
            z.string().refine(
                val => val.startsWith('uploads\\fotos\\entrega_precinto_contenedor\\'),
                { message: "Ruta debe empezar con la carpeta correcta" }
            )
                // No puede tener ..\ o ../ en ningún lado
                .refine(
                    val => !val.includes('..\\') && !val.includes('../'),
                    { message: "Ruta contiene acceso inválido" }
                )
        )
    }
}