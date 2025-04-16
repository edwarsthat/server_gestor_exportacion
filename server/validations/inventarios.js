const { z } = require('zod')

const ACCIONES_VALIDAS = ["ingreso", "salida", "traslado", "retiro", "cancelado"];

class InventariosValidations {
    static post_inventarios_canastillas_registro() {
        return z.object({
            destino: safeString("destino"),
            origen: safeString("origen"),
            observaciones: z.string().optional().refine(
                val => val === undefined || (typeof val === 'string' && val.length < 500 && !val.includes('<script')),
                'Las observaciones no deben contener scripts maliciosos.'
            ),
            fecha: z.string().refine(
                fecha => !isNaN(new Date(fecha).getTime()),
                'La fecha no tiene un formato válido.'
            ),
            canastillas: z
                .string()
                .transform(val => Number(val))
                .refine(val => !isNaN(val), { message: "Las canastillas deben ser un numero valido" })
                .refine(val => val >= 0, { message: "Las canastillas deben ser positivas" }),
            canastillasPrestadas: z
                .string()
                .transform(val => Number(val))
                .refine(val => !isNaN(val), { message: "Las canastillas prestadas deben ser un numero valido" })
                .refine(val => val >= 0, { message: "Las canastillas prestadas deben ser positivas" }),
            accion: z.string()
                .transform(accion => accion.trim().toLowerCase())
                .refine(
                    accion => ACCIONES_VALIDAS.includes(accion),
                    accion => ({
                        message: `La acción '${accion}' no es válida. Usa: ${ACCIONES_VALIDAS.join(", ")}`
                    })
                ),
            remitente: optionalSafeString("remitente"),
            destinatario: optionalSafeString("destinatario"),
        });
    }
    static validarFiltroBusquedaFechaPaginacion(data) {
        const { filtro, page } = data;
        const { fechaInicio, fechaFin } = filtro

        // Validar que page exista y sea un entero >= 1
        if (!Number.isInteger(page) || page < 1) {
            throw new Error('El número de página debe ser un entero mayor o igual a 1.');
        }

        // Validar que fechaInicio y fechaFin (si existen) sean strings válidos y representen fechas
        if (fechaInicio !== undefined) {
            if (typeof fechaInicio !== 'string' || fechaInicio.trim() === '') {
                throw new Error('fechaInicio debe ser una cadena de texto no vacía si se proporciona.');
            }

            const fechaValida = new Date(fechaInicio);
            if (isNaN(fechaValida.getTime())) {
                throw new Error('fechaInicio no tiene un formato de fecha válido.');
            }
        }

        if (fechaFin !== undefined) {
            if (typeof fechaFin !== 'string' || fechaFin.trim() === '') {
                throw new Error('fechaFin debe ser una cadena de texto no vacía si se proporciona.');
            }

            const fechaValida = new Date(fechaFin);
            if (isNaN(fechaValida.getTime())) {
                throw new Error('fechaFin no tiene un formato de fecha válido.');
            }
        }

        // Validar que fechaInicio no sea posterior a fechaFin (si ambos existen)
        if (fechaInicio && fechaFin) {
            const inicio = new Date(fechaInicio);
            const fin = new Date(fechaFin);

            if (inicio > fin) {
                throw new Error('fechaInicio no puede ser posterior a fechaFin.');
            }
        }

        return true; // Si llega hasta acá, está limpio como el historial de un político recién electo.
    }
    static post_inventarios_ingreso_lote() {
        return z.object({
            ef: z.string()
                .min(1, "EF es obligatorio")
                .refine(val => val.startsWith("EF1") || val.startsWith("EF8"), {
                    message: "EF debe comenzar con EF1 o EF8"
                }),

            fecha_estimada_llegada: z.string()
                .refine(val => !isNaN(Date.parse(val)), {
                    message: "La fecha estimada de llegada no es válida"
                }),

            kilos: z.coerce.number()
                .gt(0, "Los kilos no pueden ser cero")
                .transform(val => Number(val)),


            canastillas: z.coerce.number()
                .gt(0, "Las canastillas no pueden ser cero"),

            promedio: z.coerce.number()
                .min(17, "Los kilos no corersponden a las canastillas")
                .max(25, "Los kilos no corersponden a las canastillas"),

            tipoFruta: z.string().min(1, "El tipo de fruta es obligatorio"),

            predio: z.string().min(1, "El predio es obligatorio"),

            // otros campos opcionales o ignorados por ahora
        })
    }
}

const safeString = (fieldName) =>
    z.string()
        .refine(val =>
            typeof val === 'string' &&
            !val.includes('$') &&
            !val.includes('{') &&
            !val.includes('}') &&
            !val.includes('<script'),
            `El campo ${fieldName} contiene caracteres no permitidos.`
        );
const optionalSafeString = (campo) =>
    z.string()
        .optional()
        .refine(val => {
            // si viene como string vacío, lo ignoramos
            if (val === undefined || val.trim() === '') return true;
            return !val.includes('$') && !val.includes('{');
        }, {
            message: `El ${campo} debe ser una cadena de texto válida y no contener caracteres especiales.`
        })


module.exports.InventariosValidations = InventariosValidations