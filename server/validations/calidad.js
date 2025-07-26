import { z } from "zod";

export class CalidadValidationsRepository {
    static put_calidad_ingresos_clasificacionDescarte() {
        return z.object({
            _id: z.string().refine((val) => /^[0-9a-fA-F]{24}$/.test(val), "El _id debe ser un ObjectId válido de MongoDB"),
            data: z.object({})
                .catchall(z.number().gt(0, "Debe ser un número mayor a 0").lte(1, "Debe ser un número menor o igual a 1"))
                .superRefine((obj, ctx) => {
                    const invalidKeys = Object.keys(obj).filter(key => !key.startsWith('calidad.clasificacionCalidad.'));
                    if (invalidKeys.length > 0) {
                        ctx.addIssue({
                            code: z.ZodIssueCode.custom,
                            message: `Las siguientes llaves son inválidas: ${invalidKeys.join(", ")}`,
                            path: [],
                        });
                    }

                    const suma = Object.values(obj).reduce((acc, val) => acc + val, 0);
                    if (Math.abs(suma - 1) > 0.001) {
                        ctx.addIssue({
                            code: z.ZodIssueCode.custom,
                            message: `La suma de los valores es ${suma}, debe ser igual a 1.`,
                            path: [],
                        });
                    }
                })
        })
    }
    static get_calidad_reclamaciones_contenedores_obtenerArchivo() {
        return z.string().regex(
            /^\/opt\/enterprise-projects\/sistema-operativo\/uploads\/clientes\/reclamos\/\d+_[a-f0-9-]+\.(png|jpg|pdf)$/,
            "La URL no sigue la estructura del destino soñado"
        )
    }
    static post_calidad_ingresos_volanteCalidad() {
        return z.object({
            operario: z.string().min(1, "Operario es requerido"),
            tipoFruta: z.string().min(1, "Tipo de fruta es requerido"),
            unidades: z.string()
                .min(1, "Unidades es requerido")
                .refine((val) => !isNaN(Number(val)), "Unidades debe ser un número válido")
                .refine((val) => Number(val) > 0, "Unidades debe ser mayor a 0"),
            defectos: z.string()
                .min(1, "Defectos es requerido")
                .refine((val) => !isNaN(Number(val)), "Defectos debe ser un número válido")
                .refine((val) => Number(val) >= 0, "Defectos debe ser mayor o igual a 0"),
            calibre: z.string().min(1, "Calibre es requerido")
        }).refine((data) => Number(data.unidades) > Number(data.defectos), {
            message: "Unidades debe ser mayor que defectos",
            path: ["unidades"]
        });
    }

}
