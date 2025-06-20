import { z } from "zod";

export class IndicadoresValidations {
    static put_indicadores_operaciones_eficienciaOperativa() {
        return z.object({
            duracion_turno_horas: z.string().min(1, { message: "Duración del turno es requerida" })
                .refine(value => !isNaN(Number(value)), { message: "Duración del turno debe ser un número" }),
            kilos_meta_hora: z.string().min(1, { message: "Kilos meta procesados es requerido" })
                .refine(value => !isNaN(Number(value)), { message: "Kilos meta procesados debe ser un número" }),
        })
    }
}