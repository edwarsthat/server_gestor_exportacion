const { z } = require('zod');
const { safeString, optionalSafeString } = require('./utils/validationFunctions');

const ACCIONES_VALIDAS = ["ingreso", "salida", "traslado", "retiro", "cancelado"];
const validKeyRegex = /^(descarteEncerado|descarteLavado|frutaNacional).*/;

class InventariosValidations {
    static post_inventarios_canastillas_registro() {
        return z.object({
            destino: safeString("destino"),
            origen: safeString("origen"),
            observaciones: optionalSafeString("observaciones"),
            fecha: safeString("fecha").refine(
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
            accion: safeString("accion")
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

        return true;
    }
    static post_inventarios_ingreso_lote() {
        return z.object({
            ef: safeString("ef")
                .refine(val => val.startsWith("EF1") || val.startsWith("EF8"), {
                    message: "EF debe comenzar con EF1 o EF8"
                }),

            fecha_estimada_llegada: safeString("fecha_estimada_llegada")
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

            tipoFruta: safeString("tipoFruta"),

            GGN: z.boolean("estado GGN faltante"),

            predio: safeString("predio"),

            observaciones: optionalSafeString("observaciones"),

            placa: z.string()
                .length(6, "La placa debe tener exactamente 6 caracteres")
                .transform(val => val.toUpperCase())
                .refine(
                    val => /^[A-Z]{3}[0-9]{3}$/.test(val),
                    "La placa debe tener 3 letras seguidas de 3 números"
                )
                .pipe(safeString("placa")),
        })
    }
    static put_inventarios_frutaDescarte_reprocesarFruta() {
        return z.object({
            _id: z.string().refine((val) => /^[0-9a-fA-F]{24}$/.test(val), "El _id debe ser un ObjectId válido de MongoDB"),
            query: z.record(
                z.string().regex(validKeyRegex, "La llave debe empezar con 'descarteEncerado', 'descarteLavado' o 'frutaNacional'."), // Schema para la LLAVE
                z.number()
            ),
            inventario: z.object({
                descarteEncerado: z.object({
                    balin: z.number().lte(0).optional(),
                    descarteGeneral: z.number().lte(0).optional(),
                    extra: z.number().lte(0).optional(),
                    frutaNacional: z.number().lte(0).optional(),
                    pareja: z.number().lte(0).optional(),
                    suelo: z.number().lte(0).optional(),
                }).refine(data => data.balin !== undefined || data.descarteGeneral !== undefined || data.extra !== undefined || data.frutaNacional !== undefined || data.pareja !== undefined || data.suelo !== undefined, "El objeto 'inventario' debe contener al menos 'balin', 'descarteGeneral', 'extra', 'frutaNacional', 'pareja' o 'suelo'."),
                descarteLavado: z.object({
                    balin: z.number().lte(0).optional(),
                    descarteGeneral: z.number().lte(0).optional(),
                    pareja: z.number().lte(0).optional(),
                }).refine(data => data.balin !== undefined || data.descarteGeneral !== undefined || data.pareja !== undefined, "El objeto 'inventario' debe contener al menos 'balin', 'descarteGeneral' o 'pareja'."),
            }).refine(data => data.descarteEncerado !== undefined || data.descarteLavado !== undefined, "El objeto 'inventario' debe contener al menos 'descarteEncerado' o 'descarteLavado'."),

        })

    }
}

module.exports.InventariosValidations = InventariosValidations