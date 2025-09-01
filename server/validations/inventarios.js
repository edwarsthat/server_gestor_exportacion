import { z } from "zod";
import { safeString, optionalSafeString } from "./utils/validationFunctions.js";

const ACCIONES_VALIDAS = ["ingreso", "salida", "traslado", "retiro", "cancelado"];
// const validKeyRegex = /^(descarteEncerado|descarteLavado|frutaNacional).*/;

export class InventariosValidations {
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
            tipoFruta: z.string().min(1, "El tipo de fruta es obligatorio"),
            "descarteLavado:descarteGeneral": z.string()
                .refine(val => val === "" || !isNaN(parseInt(val)), "Debe ser un número válido")
                .refine(val => val === "" || parseInt(val) >= 0, "No puede ser un número negativo")
                .refine(val => val === "" || Number.isInteger(Number(val)), "No se permiten números decimales"),
            "descarteLavado:pareja": z.string()
                .refine(val => val === "" || !isNaN(parseInt(val)), "Debe ser un número válido")
                .refine(val => val === "" || parseInt(val) >= 0, "No puede ser un número negativo")
                .refine(val => val === "" || Number.isInteger(Number(val)), "No se permiten números decimales"),
            "descarteLavado:balin": z.string()
                .refine(val => val === "" || !isNaN(parseInt(val)), "Debe ser un número válido")
                .refine(val => val === "" || parseInt(val) >= 0, "No puede ser un número negativo")
                .refine(val => val === "" || Number.isInteger(Number(val)), "No se permiten números decimales"),
            "descarteEncerado:descarteGeneral": z.string()
                .refine(val => val === "" || !isNaN(parseInt(val)), "Debe ser un número válido")
                .refine(val => val === "" || parseInt(val) >= 0, "No puede ser un número negativo")
                .refine(val => val === "" || Number.isInteger(Number(val)), "No se permiten números decimales"),
            "descarteEncerado:pareja": z.string()
                .refine(val => val === "" || !isNaN(parseInt(val)), "Debe ser un número válido")
                .refine(val => val === "" || parseInt(val) >= 0, "No puede ser un número negativo")
                .refine(val => val === "" || Number.isInteger(Number(val)), "No se permiten números decimales"),
            "descarteEncerado:balin": z.string()
                .refine(val => val === "" || !isNaN(parseInt(val)), "Debe ser un número válido")
                .refine(val => val === "" || parseInt(val) >= 0, "No puede ser un número negativo")
                .refine(val => val === "" || Number.isInteger(Number(val)), "No se permiten números decimales"),
            "descarteEncerado:extra": z.string()
                .refine(val => val === "" || !isNaN(parseInt(val)), "Debe ser un número válido")
                .refine(val => val === "" || parseInt(val) >= 0, "No puede ser un número negativo")
                .refine(val => val === "" || Number.isInteger(Number(val)), "No se permiten números decimales"),
            "descarteEncerado:suelo": z.string()
                .refine(val => val === "" || !isNaN(parseInt(val)), "Debe ser un número válido")
                .refine(val => val === "" || parseInt(val) >= 0, "No puede ser un número negativo")
                .refine(val => val === "" || Number.isInteger(Number(val)), "No se permiten números decimales"),
            "descarteEncerado:frutaNacional": z.string()
                .refine(val => val === "" || !isNaN(parseInt(val)), "Debe ser un número válido")
                .refine(val => val === "" || parseInt(val) >= 0, "No puede ser un número negativo")
                .refine(val => val === "" || Number.isInteger(Number(val)), "No se permiten números decimales"),
        })

    }
    static get_inventarios_historialProcesado_frutaProcesada() {
        return z.object({
            action: z.literal('get_inventarios_historialProcesado_frutaProcesada'),
            fechaInicio: z.union([
                z.literal(''),
                z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'El formato de fecha debe ser YYYY-MM-DD'),
            ]),
            fechaFin: z.union([
                z.literal(''),
                z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'El formato de fecha debe ser YYYY-MM-DD'),
            ]),
        })
    }
    static put_inventarios_historialProcesado_modificarHistorial() {
        return z.object({
            action: z.literal("put_inventarios_historialProcesado_modificarHistorial"),
            kilosVaciados: z.number().lt(0),
            inventario: z.number().gt(0),
            _id: z.string().refine((val) => /^[0-9a-fA-F]{24}$/.test(val), "El _id debe ser un ObjectId válido de MongoDB"),
            historialLote: z.object({
                kilosHistorial: z.number({ invalid_type_error: "kilosHistorial debe ser un número" }).lt(0, "el numero debe ser negativo"),
                __vHistorial: z.number().gte(0),
                _idRecord: z.string().refine((val) => /^[0-9a-fA-F]{24}$/.test(val), "El _id debe ser un ObjectId válido de MongoDB"),
            })
        })
    }
    static get_inventarios_lotes_infoLotes() {
        return z.object({
            _id: z.string().refine((val) => /^[0-9a-fA-F]{24}$/.test(val), "El _id debe ser un ObjectId válido de MongoDB").optional(),
            EF: safeString(),
            GGN: z.boolean(),
            action: z.literal("get_inventarios_lotes_infoLotes"),
            buscar: safeString(),
            fechaFin: z.union([
                z.literal(''),
                z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'El formato de fecha debe ser YYYY-MM-DD'),
            ]),
            fechaInicio: z.union([
                z.literal(''),
                z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'El formato de fecha debe ser YYYY-MM-DD'),
            ]),
            proveedor: safeString(),
            tipoFecha: safeString(),
            tipoFruta: safeString(),
            all: z.boolean(),

        })
    }
    static put_inventarios_historiales_ingresoFruta_modificar() {
        return z.object({
            enf: z.string().min(1, "El codigo del lote no puede ir vacio").optional(),
            predio: z.string().min(1, "Debe seleccionar un predio").optional(),
            canastillas: z.number()
                .lte(0, "Debe ingresar un número mayor o igual a cero")
                .refine(val => !isNaN(val), { message: "Debe ser un número válido" }).optional(),
            kilos: z.number()
                .lte(0, "Debe ingresar un número mayor o igual a cero")
                .refine(val => !isNaN(val), { message: "Debe ser un número válido" }).optional(),

            tipoFruta: z.string().min(1, "Se debe seleccionar un tipo de fruta").optional(),
            observaciones: z.string().optional().optional(),
            placa: z.string().min(1, "La placa es obligatoria").optional(),
            fecha_ingreso_inventario: z.string()
                .min(1, "La fecha estimada de llegada es obligatoria")
                .refine(val => !isNaN(Date.parse(val)), {
                    message: "La fecha no es válida",
                }).optional(),
            GGN: z.string().min(1, "El GGN es obligatorio").transform(val => val === "true").optional(),
        })
    }
    static put_inventarios_historiales_ingresoFruta_modificar_EF8() {
        return z.object({
            enf: z.string().min(1, "El codigo del lote no puede ir vacio"),
            predio: z.string().min(1, "Debe seleccionar un predio"),
            canastillas: z.string({ required_error: "Campo obligatorio" })
                .min(1, "Debe ingresar un número")
                .transform(val => Number(val))
                .refine(val => !isNaN(val), { message: "Debe ser un número válido" })
                .refine(val => val >= 0, { message: "Debe ser mayor o igual a 0" }),
            balin: z
                .string()
                .optional()
                .transform(val => val === undefined ? undefined : Number(val))
                .refine(val => val === undefined || !isNaN(val), { message: "Los kilos deben ser un número válido" }),
            pareja: z
                .string()
                .optional()
                .transform(val => val === undefined ? undefined : Number(val))
                .refine(val => val === undefined || !isNaN(val), { message: "Los kilos deben ser un número válido" }),
            descarteGeneral: z
                .string()
                .optional()
                .transform(val => val === undefined ? undefined : Number(val))
                .refine(val => val === undefined || !isNaN(val), { message: "Los kilos deben ser un número válido" }),

            tipoFruta: z.string().min(1, "Se debe seleccionar un tipo de fruta"),
            observaciones: z.string().optional(),
            placa: z.string().min(1, "La placa es obligatoria"),
            fecha_ingreso_inventario: z.string()
                .min(1, "La fecha estimada de llegada es obligatoria")
                .refine(val => !isNaN(Date.parse(val)), {
                    message: "La fecha no es válida",
                }),
        })
    }
    static put_inventarios_frutaDescarte_despachoDescarte() {
        return z.object({
            data: z.object({
                cliente: z.string().refine((val) => /^[0-9a-fA-F]{24}$/.test(val), "El _id debe ser un ObjectId válido de MongoDB"),
                placa: z.string()
                    .length(6, "La placa debe tener exactamente 6 caracteres")
                    .regex(/^[A-Z]{3}[0-9]{3}$/, "La placa debe tener 3 letras seguidas de 3 números"),
                nombreConductor: z.string().min(1, "El nombre del conductor es obligatorio"),
                telefono: z.string().min(1, "El teléfono es obligatorio"),
                cedula: z.string().min(1, "La cédula es obligatoria"),
                remision: z.string().min(1, "La remisión es obligatoria"),
                kilos: z.number().min(1, "Los kilos deben ser mayores a 0"),
            }),
            inventario: z.object({
                tipoFruta: z.string().min(1, "El tipo de fruta es obligatorio"),
                "descarteLavado:descarteGeneral": z.string()
                    .refine(val => val === "" || !isNaN(parseInt(val)), "Debe ser un número válido")
                    .refine(val => val === "" || parseInt(val) >= 0, "No puede ser un número negativo")
                    .refine(val => val === "" || Number.isInteger(Number(val)), "No se permiten números decimales"),
                "descarteLavado:pareja": z.string()
                    .refine(val => val === "" || !isNaN(parseInt(val)), "Debe ser un número válido")
                    .refine(val => val === "" || parseInt(val) >= 0, "No puede ser un número negativo")
                    .refine(val => val === "" || Number.isInteger(Number(val)), "No se permiten números decimales"),
                "descarteLavado:balin": z.string()
                    .refine(val => val === "" || !isNaN(parseInt(val)), "Debe ser un número válido")
                    .refine(val => val === "" || parseInt(val) >= 0, "No puede ser un número negativo")
                    .refine(val => val === "" || Number.isInteger(Number(val)), "No se permiten números decimales"),
                "descarteEncerado:descarteGeneral": z.string()
                    .refine(val => val === "" || !isNaN(parseInt(val)), "Debe ser un número válido")
                    .refine(val => val === "" || parseInt(val) >= 0, "No puede ser un número negativo")
                    .refine(val => val === "" || Number.isInteger(Number(val)), "No se permiten números decimales"),
                "descarteEncerado:pareja": z.string()
                    .refine(val => val === "" || !isNaN(parseInt(val)), "Debe ser un número válido")
                    .refine(val => val === "" || parseInt(val) >= 0, "No puede ser un número negativo")
                    .refine(val => val === "" || Number.isInteger(Number(val)), "No se permiten números decimales"),
                "descarteEncerado:balin": z.string()
                    .refine(val => val === "" || !isNaN(parseInt(val)), "Debe ser un número válido")
                    .refine(val => val === "" || parseInt(val) >= 0, "No puede ser un número negativo")
                    .refine(val => val === "" || Number.isInteger(Number(val)), "No se permiten números decimales"),
                "descarteEncerado:extra": z.string()
                    .refine(val => val === "" || !isNaN(parseInt(val)), "Debe ser un número válido")
                    .refine(val => val === "" || parseInt(val) >= 0, "No puede ser un número negativo")
                    .refine(val => val === "" || Number.isInteger(Number(val)), "No se permiten números decimales"),
                "descarteEncerado:suelo": z.string()
                    .refine(val => val === "" || !isNaN(parseInt(val)), "Debe ser un número válido")
                    .refine(val => val === "" || parseInt(val) >= 0, "No puede ser un número negativo")
                    .refine(val => val === "" || Number.isInteger(Number(val)), "No se permiten números decimales"),
                "descarteEncerado:frutaNacional": z.string()
                    .refine(val => val === "" || !isNaN(parseInt(val)), "Debe ser un número válido")
                    .refine(val => val === "" || parseInt(val) >= 0, "No puede ser un número negativo")
                    .refine(val => val === "" || Number.isInteger(Number(val)), "No se permiten números decimales"),
            })
        })
    }
    static post_inventarios_frutaDescarte_frutaDescompuesta() {
        return z.object({
            data: z.object({
                razon: z.string()
                    .min(1, "La razón es obligatoria")
                    .max(1000, "La razón no puede exceder los 1000 caracteres")
                    .refine(
                        (val) => !/[<>$]|javascript:|data:|vbscript:/.test(val),
                        "El texto contiene caracteres no permitidos"
                    ),
                comentario_adicional: z.string()
                    .max(1000, "El comentario no puede exceder los 1000 caracteres")
                    .refine(
                        (val) => !/[<>$]|javascript:|data:|vbscript:/.test(val),
                        "El texto contiene caracteres no permitidos"
                    )
                    .optional()
                    .default("")
            }),
            inventario: z.object({
                tipoFruta: z.string().min(1, "El tipo de fruta es obligatorio"),
                "descarteLavado:descarteGeneral": z.string()
                    .refine(val => val === "" || !isNaN(parseInt(val)), "Debe ser un número válido")
                    .refine(val => val === "" || parseInt(val) >= 0, "No puede ser un número negativo")
                    .refine(val => val === "" || Number.isInteger(Number(val)), "No se permiten números decimales"),
                "descarteLavado:pareja": z.string()
                    .refine(val => val === "" || !isNaN(parseInt(val)), "Debe ser un número válido")
                    .refine(val => val === "" || parseInt(val) >= 0, "No puede ser un número negativo")
                    .refine(val => val === "" || Number.isInteger(Number(val)), "No se permiten números decimales"),
                "descarteLavado:balin": z.string()
                    .refine(val => val === "" || !isNaN(parseInt(val)), "Debe ser un número válido")
                    .refine(val => val === "" || parseInt(val) >= 0, "No puede ser un número negativo")
                    .refine(val => val === "" || Number.isInteger(Number(val)), "No se permiten números decimales"),
                "descarteEncerado:descarteGeneral": z.string()
                    .refine(val => val === "" || !isNaN(parseInt(val)), "Debe ser un número válido")
                    .refine(val => val === "" || parseInt(val) >= 0, "No puede ser un número negativo")
                    .refine(val => val === "" || Number.isInteger(Number(val)), "No se permiten números decimales"),
                "descarteEncerado:pareja": z.string()
                    .refine(val => val === "" || !isNaN(parseInt(val)), "Debe ser un número válido")
                    .refine(val => val === "" || parseInt(val) >= 0, "No puede ser un número negativo")
                    .refine(val => val === "" || Number.isInteger(Number(val)), "No se permiten números decimales"),
                "descarteEncerado:balin": z.string()
                    .refine(val => val === "" || !isNaN(parseInt(val)), "Debe ser un número válido")
                    .refine(val => val === "" || parseInt(val) >= 0, "No puede ser un número negativo")
                    .refine(val => val === "" || Number.isInteger(Number(val)), "No se permiten números decimales"),
                "descarteEncerado:extra": z.string()
                    .refine(val => val === "" || !isNaN(parseInt(val)), "Debe ser un número válido")
                    .refine(val => val === "" || parseInt(val) >= 0, "No puede ser un número negativo")
                    .refine(val => val === "" || Number.isInteger(Number(val)), "No se permiten números decimales"),
                "descarteEncerado:suelo": z.string()
                    .refine(val => val === "" || !isNaN(parseInt(val)), "Debe ser un número válido")
                    .refine(val => val === "" || parseInt(val) >= 0, "No puede ser un número negativo")
                    .refine(val => val === "" || Number.isInteger(Number(val)), "No se permiten números decimales"),
                "descarteEncerado:frutaNacional": z.string()
                    .refine(val => val === "" || !isNaN(parseInt(val)), "Debe ser un número válido")
                    .refine(val => val === "" || parseInt(val) >= 0, "No puede ser un número negativo")
                    .refine(val => val === "" || Number.isInteger(Number(val)), "No se permiten números decimales"),
            })
        })
    }
    static put_inventarios_historiales_despachoDescarte() {
        return z.object({
            cliente: safeString(),
            nombreConductor: safeString(),
            telefono: safeString(),
            cedula: safeString(),
            remision: safeString(),
            tipoFruta: safeString(),
            kilos: z.string()
                .refine(val => val === "" || !isNaN(parseInt(val)), "Debe ser un número válido")
                .refine(val => val === "" || parseInt(val) >= 0, "No puede ser un número negativo")
                .refine(val => val === "" || Number.isInteger(Number(val)), "No se permiten números decimales"),
            "descarteLavado.descarteGeneral": z.string().refine((val) => val === "N/A" || (!isNaN(Number(val)) && Number(val) >= 0 && Number.isInteger(Number(val))), {
                message: "Debe ser un número entero positivo o N/A"
            }),
            "descarteLavado.pareja": z.string().refine((val) => val === "N/A" || (!isNaN(Number(val)) && Number(val) >= 0 && Number.isInteger(Number(val))), {
                message: "Debe ser un número entero positivo o N/A"
            }),
            "descarteLavado.balin": z.string().refine((val) => val === "N/A" || (!isNaN(Number(val)) && Number(val) >= 0 && Number.isInteger(Number(val))), {
                message: "Debe ser un número entero positivo o N/A"
            }),
            "descarteEncerado.descarteGeneral": z.string().refine((val) => val === "N/A" || (!isNaN(Number(val)) && Number(val) >= 0 && Number.isInteger(Number(val))), {
                message: "Debe ser un número entero positivo o N/A"
            }),
            "descarteEncerado.pareja": z.string().refine((val) => val === "N/A" || (!isNaN(Number(val)) && Number(val) >= 0 && Number.isInteger(Number(val))), {
                message: "Debe ser un número entero positivo o N/A"
            }),
            "descarteEncerado.balin": z.string().refine((val) => val === "N/A" || (!isNaN(Number(val)) && Number(val) >= 0 && Number.isInteger(Number(val))), {
                message: "Debe ser un número entero positivo o N/A"
            }),
            "descarteEncerado.extra": z.string().refine((val) => val === "N/A" || (!isNaN(Number(val)) && Number(val) >= 0 && Number.isInteger(Number(val))), {
                message: "Debe ser un número entero positivo o N/A"
            }),
            "descarteEncerado.suelo": z.string().refine((val) => val === "N/A" || (!isNaN(Number(val)) && Number(val) >= 0 && Number.isInteger(Number(val))), {
                message: "Debe ser un número entero positivo o N/A"
            }),
            "descarteEncerado.frutaNacional": z.string().refine((val) => val === "N/A" || (!isNaN(Number(val)) && Number(val) >= 0 && Number.isInteger(Number(val))), {
                message: "Debe ser un número entero positivo o N/A"
            })
        })
    }
    static put_inventarios_registros_fruta_descompuesta() {
        return z.object({
            tipoFruta: safeString(),
            razon: safeString(),
            comentario_adicional: safeString(),
            kilos: z.string()
                .refine(val => val === "" || !isNaN(parseInt(val)), "Debe ser un número válido")
                .refine(val => val === "" || parseInt(val) >= 0, "No puede ser un número negativo")
                .refine(val => val === "" || Number.isInteger(Number(val)), "No se permiten números decimales"),
            "descarteLavado.descarteGeneral": z.string().refine((val) => val === "N/A" || (!isNaN(Number(val)) && Number(val) >= 0 && Number.isInteger(Number(val))), {
                message: "Debe ser un número entero positivo o N/A"
            }),
            "descarteLavado.pareja": z.string().refine((val) => val === "N/A" || (!isNaN(Number(val)) && Number(val) >= 0 && Number.isInteger(Number(val))), {
                message: "Debe ser un número entero positivo o N/A"
            }),
            "descarteLavado.balin": z.string().refine((val) => val === "N/A" || (!isNaN(Number(val)) && Number(val) >= 0 && Number.isInteger(Number(val))), {
                message: "Debe ser un número entero positivo o N/A"
            }),
            "descarteEncerado.descarteGeneral": z.string().refine((val) => val === "N/A" || (!isNaN(Number(val)) && Number(val) >= 0 && Number.isInteger(Number(val))), {
                message: "Debe ser un número entero positivo o N/A"
            }),
            "descarteEncerado.pareja": z.string().refine((val) => val === "N/A" || (!isNaN(Number(val)) && Number(val) >= 0 && Number.isInteger(Number(val))), {
                message: "Debe ser un número entero positivo o N/A"
            }),
            "descarteEncerado.balin": z.string().refine((val) => val === "N/A" || (!isNaN(Number(val)) && Number(val) >= 0 && Number.isInteger(Number(val))), {
                message: "Debe ser un número entero positivo o N/A"
            }),
            "descarteEncerado.extra": z.string().refine((val) => val === "N/A" || (!isNaN(Number(val)) && Number(val) >= 0 && Number.isInteger(Number(val))), {
                message: "Debe ser un número entero positivo o N/A"
            }),
            "descarteEncerado.suelo": z.string().refine((val) => val === "N/A" || (!isNaN(Number(val)) && Number(val) >= 0 && Number.isInteger(Number(val))), {
                message: "Debe ser un número entero positivo o N/A"
            }),
            "descarteEncerado.frutaNacional": z.string().refine((val) => val === "N/A" || (!isNaN(Number(val)) && Number(val) >= 0 && Number.isInteger(Number(val))), {
                message: "Debe ser un número entero positivo o N/A"
            })
        })
    }
    static put_inventarios_frutaSinProcesar_desverdizado() {
        return z.object({
            desverdizado: z.object({
                canastillas: z.coerce.number({
                    invalid_type_error: "Debe ser un número",
                }).int("No se permiten decimales").min(1, "Debe ser mayor o igual a 1"),
                _id: z.string().min(1, "El cuarto desverdizado es obligatorio"),
            }),
            _id: z.string().refine((val) => /^[0-9a-fA-F]{24}$/.test(val), "El _id debe ser un ObjectId válido de MongoDB"),
            action: z.string()
        })
    }
    static put_inventarios_frutaDesverdizando_parametros() {
        return z.object({
            _id: z.string().refine((val) => /^[0-9a-fA-F]{24}$/.test(val), "El _id debe ser un ObjectId válido de MongoDB"),
            action: z.string(),
            data: z.object({
                temperatura: z.string()
                    .min(1, "Temperatura es requerida")
                    .refine(val => /^-?\d+(\.\d+)?$/.test(val), {
                        message: "Debe ser un número válido"
                    })
                    .refine(val => Math.abs(parseFloat(val)) <= 1_000_000, {
                        message: "El número no debe superar el millón"
                    }),

                etileno: z.string()
                    .min(1, "Etileno es requerido")
                    .refine(val => /^-?\d+(\.\d+)?$/.test(val), {
                        message: "Debe ser un número válido"
                    })
                    .refine(val => Math.abs(parseFloat(val)) <= 1_000_000, {
                        message: "El número no debe superar el millón"
                    }),

                carbono: z.string()
                    .min(1, "Dióxido es requerido")
                    .refine(val => /^-?\d+(\.\d+)?$/.test(val), {
                        message: "Debe ser un número válido"
                    })
                    .refine(val => Math.abs(parseFloat(val)) <= 1_000_000, {
                        message: "El número no debe superar el millón"
                    }),

                humedad: z.string()
                    .min(1, "Humedad es requerida")
                    .refine(val => /^-?\d+(\.\d+)?$/.test(val), {
                        message: "Debe ser un número válido"
                    })
                    .refine(val => Math.abs(parseFloat(val)) <= 1_000_000, {
                        message: "El número no debe superar el millón"
                    }),
                fecha: safeString()
            })
        })
    }
    static put_inventarios_frutaDesverdizado_finalizar() {
        return z.object({
            _id: z.string().refine((val) => /^[0-9a-fA-F]{24}$/.test(val), "El _id debe ser un ObjectId válido de MongoDB"),
            cuarto: z.string().refine((val) => /^[0-9a-fA-F]{24}$/.test(val), "El _id debe ser un ObjectId válido de MongoDB"),
            action: z.literal("put_inventarios_frutaDesverdizado_finalizar")
        })
    }
    static put_inventarios_frutaDesverdizado_mover() {
        return z.object({
            _id: z.string().refine((val) => /^[0-9a-fA-F]{24}$/.test(val), "El _id debe ser un ObjectId válido de MongoDB"),
            cuarto: z.string().refine((val) => /^[0-9a-fA-F]{24}$/.test(val), "El _id debe ser un ObjectId válido de MongoDB"),
            action: z.literal("put_inventarios_frutaDesverdizado_mover"),
            data: z.object({
                destino: z.string().min(1, "El destino es obligatorio"),
                cantidad: z.coerce.number({
                    invalid_type_error: "Debe ser un número",
                }).int("No se permiten decimales").min(1, "Debe ser mayor o igual a 1"),
            })
        })
    }
    static set_inventarios_inventario() {
        return z.object({
            "descarteLavado:descarteGeneral": z.string().refine((val) => val === "N/A" || (!isNaN(Number(val)) && Number(val) >= 0 && Number.isInteger(Number(val))), {
                message: "Debe ser un número entero positivo o N/A"
            }),
            "descarteLavado:pareja": z.string().refine((val) => val === "N/A" || (!isNaN(Number(val)) && Number(val) >= 0 && Number.isInteger(Number(val))), {
                message: "Debe ser un número entero positivo o N/A"
            }),
            "descarteLavado:balin": z.string().refine((val) => val === "N/A" || (!isNaN(Number(val)) && Number(val) >= 0 && Number.isInteger(Number(val))), {
                message: "Debe ser un número entero positivo o N/A"
            }),
            "descarteEncerado:descarteGeneral": z.string().refine((val) => val === "N/A" || (!isNaN(Number(val)) && Number(val) >= 0 && Number.isInteger(Number(val))), {
                message: "Debe ser un número entero positivo o N/A"
            }),
            "descarteEncerado:pareja": z.string().refine((val) => val === "N/A" || (!isNaN(Number(val)) && Number(val) >= 0 && Number.isInteger(Number(val))), {
                message: "Debe ser un número entero positivo o N/A"
            }),
            "descarteEncerado:balin": z.string().refine((val) => val === "N/A" || (!isNaN(Number(val)) && Number(val) >= 0 && Number.isInteger(Number(val))), {
                message: "Debe ser un número entero positivo o N/A"
            }),
            "descarteEncerado:extra": z.string().refine((val) => val === "N/A" || (!isNaN(Number(val)) && Number(val) >= 0 && Number.isInteger(Number(val))), {
                message: "Debe ser un número entero positivo o N/A"
            }),
            "descarteEncerado:suelo": z.string().refine((val) => val === "N/A" || (!isNaN(Number(val)) && Number(val) >= 0 && Number.isInteger(Number(val))), {
                message: "Debe ser un número entero positivo o N/A"
            }),
            "descarteEncerado:frutaNacional": z.string().refine((val) => val === "N/A" || (!isNaN(Number(val)) && Number(val) >= 0 && Number.isInteger(Number(val))), {
                message: "Debe ser un número entero positivo o N/A"
            })
        })
    }
    static post_inventarios_EF8() {
        return z.object({
            predio: z.string().min(1, "El predio es obligatorio"),
            tipoFruta: z.string().min(1, "El tipo de fruta es obligatorio"),
            descarteGeneral: z
                .string()
                .optional()
                .transform(val => val === undefined || val === "" ? 0 : Number(val))
                .refine(val => !isNaN(val), { message: "Debe ser un número válido" })
                .refine(val => val >= 0, { message: "Debe ser mayor o igual a 0" }),
            pareja: z
                .string()
                .optional()
                .transform(val => val === undefined || val === "" ? 0 : Number(val))
                .refine(val => !isNaN(val), { message: "Debe ser un número válido" })
                .refine(val => val >= 0, { message: "Debe ser mayor o igual a 0" }),
            balin: z
                .string()
                .optional()
                .transform(val => val === undefined || val === "" ? 0 : Number(val))
                .refine(val => !isNaN(val), { message: "Debe ser un número válido" })
                .refine(val => val >= 0, { message: "Debe ser mayor o igual a 0" }),
            canastillasPropias: z
                .string()
                .optional()
                .transform(val => Number(val))
                .refine(val => !isNaN(val), { message: "Debe ser un número válido" })
                .refine(val => val >= 0, { message: "Debe ser mayor o igual a 0" }),
            canastillasPrestadas: z
                .string()
                .optional()
                .transform(val => Number(val))
                .refine(val => !isNaN(val), { message: "Debe ser un número válido" })
                .refine(val => val >= 0, { message: "Debe ser mayor o igual a 0" }),
            canastillasVaciasPropias: z
                .string()
                .optional()
                .transform(val => val === undefined || val === "" ? 0 : Number(val))
                .refine(val => !isNaN(val), { message: "Debe ser un número válido" })
                .refine(val => val >= 0, { message: "Debe ser mayor o igual a 0" }),
            canastillasVaciasPrestadas: z
                .string()
                .optional()
                .transform(val => val === undefined || val === "" ? 0 : Number(val))
                .refine(val => !isNaN(val), { message: "Debe ser un número válido" })
                .refine(val => val >= 0, { message: "Debe ser mayor o igual a 0" }),
            fecha_ingreso_inventario: z.string()
                .min(1, "La fecha de ingreso es obligatoria")
                .refine(val => !isNaN(Date.parse(val)), {
                    message: "La fecha no es válida",
                }),
            placa: z
                .string()
                .min(1, "La placa es obligatoria")
                .regex(/^[A-Z]{3}\d{3}$/, "La placa debe tener 3 letras seguidas de 3 números (ej. ABC123)")
                .transform(val => val.toUpperCase())

        });
    }
}
