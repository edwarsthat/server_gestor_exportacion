import { z } from "zod";
import { objectIdString, requiredSafeString } from "./utils/validationFunctions.js";

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
            pesoParametro: z.string()
                .min(1, "Peso Parámetro es requerido")
                .refine((val) => !isNaN(Number(val)), "Peso Parámetro debe ser un número válido")
                .refine((val) => Number(val) > 0, "Peso Parámetro debe ser mayor a 0"),
            pesoReal: z.string()
                .min(1, "Peso Real es requerido")
                .refine((val) => !isNaN(Number(val)), "Peso Real debe ser un número válido")
                .refine((val) => Number(val) > 0, "Peso Real debe ser mayor a 0"),
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
    static put_calidad_ingresos_calidadInterna() {

        // Helper: string numérica (float) requerida
        const numericString = z
            .string()
            .trim()
            .min(1, { message: 'Requerido' })
            .refine((v) => !Number.isNaN(Number(v)) && Number.isFinite(Number(v)), {
                message: 'Debe ser un número válido',
            })

        // Variantes con reglas adicionales
        const nonZeroNumericString = numericString.refine((v) => parseFloat(v) !== 0, {
            message: 'No puede ser 0',
        })

        const positiveNumericString = numericString.refine((v) => parseFloat(v) > 0, {
            message: 'Debe ser mayor que 0',
        })

        return z
            .object({
                acidez1: nonZeroNumericString,
                acidez2: nonZeroNumericString,
                acidez3: nonZeroNumericString,
                brix1: positiveNumericString,
                brix2: positiveNumericString,
                brix3: positiveNumericString,
                peso: numericString,
                zumo: numericString,
                calidad: z.string().trim().min(1, { message: 'Requerido' }),
                semillas: z.enum(['true', 'false']),
            })
            .superRefine((data, ctx) => {
                const peso = parseFloat(data.peso)
                const zumo = parseFloat(data.zumo)
                if (!Number.isNaN(peso) && !Number.isNaN(zumo) && zumo > peso) {
                    ctx.addIssue({
                        code: z.ZodIssueCode.custom,
                        path: ['zumo'],
                        message: 'Zumo no puede ser mayor que peso',
                    })
                }
            })
    }
    static post_calidad_ingresos_crearFormulario() {
        const dateString = z
            .string()
            .regex(/^\d{4}-\d{2}-\d{2}$/, "La fecha debe tener el formato YYYY-MM-DD")
            .refine((val) => !isNaN(Date.parse(val)), "Fecha inválida");

        return z.object({
            data: z.object({
                tipoSeleccionado: z.enum(
                    ['limpieza_diaria', 'limpieza_mensual', 'control_plagas'],
                    { errorMap: () => ({ message: "El tipo seleccionado debe ser: limpieza_diaria, limpieza_mensual o control_plagas" }) }
                ),
                fechaInicio: dateString,
                fechaFin: dateString,
            }).refine(
                (data) => new Date(data.fechaFin) >= new Date(data.fechaInicio),
                { message: "La fecha de fin no puede ser anterior a la fecha de inicio", path: ["fechaFin"] }
            )
        });
    }
    static put_calidad_ingresos_formulariosCalidad() {
        const elementoSchema = z.object({
            status: z.boolean(),
            observaciones: z.string(),
        });

        return z.object({
            _id: objectIdString("_id"),
            tipoFormulario: z.enum(
                ['limpieza_diaria', 'limpieza_mensual', 'control_plagas'],
                { errorMap: () => ({ message: "El tipoFormulario debe ser: limpieza_diaria, limpieza_mensual o control_plagas" }) }
            ),
            area: requiredSafeString("area"),
            data: z.record(z.string(), elementoSchema)
                .refine((obj) => Object.keys(obj).length > 0, "El campo data no puede estar vacío"),
        });
    }

    //NUEVO JP
    static post_calidad_formulario_historialConcentraciones() {
        return z.object({
            data: z.object({
                fecha: z.string()
                    .min(1, "Fecha y hora son obligatorias")
                    .refine((val) => !isNaN(Date.parse(val)), "Fecha inválida"),

                kilosProcesados: z.number()
                    .min(0, "Los kilos procesados deben ser mayor o igual a 0")
                    .refine((val) => !isNaN(val), "Kilos procesados debe ser un número válido"),

                tipoFruta: z.string()
                    .min(1, "Tipo de fruta es obligatorio")
                    .refine((val) => /^[0-9a-fA-F]{24}$/.test(val), "El tipoFruta debe ser un ObjectId válido de MongoDB"),

                concentracionPPM: z.string()
                    .trim()
                    .min(1, "Concentración PPM es obligatoria"),

                observaciones: z.string()
                    .trim()
                    .optional()
                    .default(""),

                responsable: z.string()
                    .trim()
                    .min(1, "Responsable es obligatorio")
            })
        });
    }

    static put_calidad_formulario_historialConcentraciones() {
        return z.object({
            data: z.object({
                _id: z.string()
                    .refine((val) => /^[0-9a-fA-F]{24}$/.test(val), "El _id debe ser un ObjectId válido de MongoDB"),

                updateData: z.object({
                    fecha: z.string()
                        .refine((val) => !isNaN(Date.parse(val)), "Fecha inválida")
                        .optional(),

                    kilosProcesados: z.number()
                        .min(0, "Los kilos procesados deben ser mayor o igual a 0")
                        .optional(),

                    tipoFruta: z.string()
                        .refine((val) => /^[0-9a-fA-F]{24}$/.test(val), "El tipoFruta debe ser un ObjectId válido de MongoDB")
                        .optional(),

                    concentracionPPM: z.string()
                        .trim()
                        .min(1, "Concentración PPM es obligatoria")
                        .optional(),

                    observaciones: z.string()
                        .trim()
                        .optional(),

                    responsable: z.string().trim().min(1, "Responsable es obligatorio").optional()
                }).refine((data) => Object.keys(data).length > 0, {
                    message: "Debe proporcionar al menos un campo para actualizar"
                })
            })
        });
    }

    static delete_calidad_formulario_historialConcentraciones() {
        return z.object({
            _id: z.string()
                .refine((val) => /^[0-9a-fA-F]{24}$/.test(val), "El _id debe ser un ObjectId válido de MongoDB")
        });
    }
    //-----------------------------------------------------------------------------------------------------------------------------------
    //Control Limpieza EPP
    static post_calidad_formulario_controlLimpiezaEPP() {
        return z.object({
            data: z.object({
                fecha: z.string()
                    .min(1, "La fecha es obligatoria")
                    .refine((val) => !isNaN(Date.parse(val)), "Fecha inválida"),

                area: z.string().trim().min(1, "El área es obligatoria"),

                responsable: z.string().trim().min(1, "El responsable es obligatorio"),

                elementos: z.record(
                    z.string(),
                    z.object({
                        status: z.boolean(),
                        observaciones: z.string().optional().default("")
                    })
                )
            })
        });
    }
}

