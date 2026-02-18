import { z } from "zod";
import { requiredSafeString, safeString, optionalSafeString, objectIdString } from "./utils/validationFunctions.js";

export class ComercialValidationsRepository {
    static val_comercial_proveedores_informacion_proveedores_cantidad_datos(filtro) {
        // 1) Verificar que solo contenga llaves válidas
        const validKeys = ["SISPAP", "PREDIO", "GGN.code"];
        for (const key of Object.keys(filtro)) {
            if (!validKeys.includes(key)) {
                throw new Error(`La propiedad "${key}" no está permitida en el filtro.`);
            }
        }
        // 2) Verificar tipos de dato
        if (filtro.SISPAP !== undefined && typeof filtro.SISPAP !== "boolean") {
            throw new Error(`La propiedad "SISPAP" debe ser de tipo booleano.`);
        }
        if (filtro.PREDIO !== undefined && typeof filtro.PREDIO !== "string") {
            throw new Error(`La propiedad "PREDIO" debe ser de tipo string.`);
        }
        if (filtro["GGN.code"] !== undefined && typeof filtro["GGN.code"] !== "string") {
            throw new Error(`La propiedad "GGN.code" debe ser de tipo string.`);
        }
    }
    static query_comercial_proveedores_informacion_proveedores_cantidad_datos(filtro) {
        const query = {}

        //se crea el query
        // 1. Si tenemos SISPAP, hacemos un match exacto:
        if (filtro.SISPAP !== undefined) {
            query.SISPAP = filtro.SISPAP;
        }

        // 2. Si tenemos PREDIO, creamos una expresión regular para que busque parcial (case-insensitive)
        if (filtro.PREDIO) {
            query.PREDIO = { $regex: filtro.PREDIO, $options: "i" };
        }

        // 3. Si tenemos "GGN.code", hacemos lo mismo que con PREDIO
        if (filtro["GGN.code"]) {
            query["GGN.code"] = { $regex: filtro["GGN.code"], $options: "i" };
        }

        return query
    }
    static val_proveedores_informacion_post_put_data() {
        return z.object({
            // Campos obligatorios
            PREDIO: requiredSafeString("PREDIO"),
            "ICA.code": requiredSafeString("ICA.code"),
            "ICA.fechaVencimiento": z.string()
                .min(1, "El campo ICA.fechaVencimiento es obligatorio")
                .refine(val => !isNaN(Date.parse(val)), "La fecha de vencimiento ICA no es válida"),
            "ICA.tipo_fruta": z.array(z.any())
                .min(1, "Debe seleccionar al menos un tipo de fruta en ICA"),
            nit_facturar: requiredSafeString("nit_facturar"),
            razon_social: requiredSafeString("razon_social"),
            propietario: requiredSafeString("propietario"),

            // Campos opcionales
            SISPAP: z.boolean({ message: "El campo SISPAP debe ser un booleano" }).optional(),
            activo: z.boolean({ message: "El campo activo debe ser un booleano" }).optional(),
            "GGN.code": optionalSafeString("GGN.code"),
            "GGN.fechaVencimiento": z.string()
                .optional()
                .refine(val => {
                    if (val === undefined || val === null || val.trim() === '') return true;
                    return !isNaN(Date.parse(val));
                }, "La fecha de vencimiento GGN no es válida"),
            "GGN.tipo_fruta": z.array(z.any()).optional(),
            "GGN.paises": z.array(z.any()).optional(),
            telefono_propietario: optionalSafeString("telefono_propietario"),
            correo_informes: z.string()
                .optional()
                .refine(val => {
                    if (val === undefined || val === null || val.trim() === '') return true;
                    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val);
                }, "El correo de informes no es válido"),
            contacto_finca: optionalSafeString("contacto_finca"),
            telefono_predio: optionalSafeString("telefono_predio"),
            departamento: optionalSafeString("departamento"),
            municipio: optionalSafeString("municipio"),
            flete: z.any().nullable().optional(),
            tipo_fruta: z.record(z.any()).optional(),
        }).strict();
    }
    static val_get_sys_proveedores(data) {
        const valoresValidos = ['activos', 'all'];

        if (!valoresValidos.includes(data)) {
            throw new Error("Error en los parametros de entrada de la funcion para obtener proveedores");
        }

    }
    static val_post_comercial_precios_add_precio() {
        const nonNeg = z.coerce.number().min(0, { message: "Debe ser un número mayor o igual a 0" });

        return z.object({
            tipoFruta: z.string().trim().min(1, "Campo requerido"),

            // números (acepta "123" o 123 y te entrega number)
            frutaNacional: nonNeg,
            descarte: nonNeg,

            // week y year: aceptan number o string, y te los entrego como string
            week: z.union([z.string(), z.number()]).transform(v => String(v).trim()).pipe(
                z.string().min(1, "Campo requerido")
            ),
            year: z.union([z.string(), z.number()]).transform(v => String(v).trim()),

            // predios: puede llegar como "A,B" o ["A","B"] — normalizamos a string[]
            predios: z.union([
                z.string().transform(s => s.split(",").map(x => x.trim()).filter(Boolean)),
                z.array(z.string())
            ]).default([]),

            // comentario opcional
            comentario: z.string().optional().default(""),
        })
        // Elige una:
        // .strict()       // rechaza campos desconocidos
        // .passthrough()  // deja pasar campos extra sin validar
    }
    static val_post_comercial_precios_add_precio_lote(data) {

        if (!Object.prototype.hasOwnProperty.call(data, "enf"))
            throw new Error("Ingrese un EF")
        if (data.enf === '')
            throw new Error("Ingrese un EF")

    }
    static val_get_comercial_precios_registros_filtro(data) {
        const filtrosTypes = ["fechaInicio", "fechaFin", "tipoFruta2", "proveedor"]
        for (const key in data) {
            if (!filtrosTypes.includes(key)) {
                throw new Error(`El filtro ${key} no es permitido`)
            }

            if (key === "tipoFruta2") {
                const value = Reflect.get(data, key)
                if (typeof value !== "string") {
                    throw new Error(`El filtro ${key} debe ser de tipo string`)
                }
            }
            if (key === "fechaInicio" || key === "fechaFin") {
                const value = Reflect.get(data, key)
                if (typeof value !== "string") {
                    throw new Error(`El filtro ${key} debe ser una fecha válida en formato string`);
                }
            }

        }
    }
    static val_post_comercial_clienteNacional() {
        return z.object({
            cliente: z.string().min(1, "El nombre del cliente es obligatorio.")
                .regex(/^[A-Za-zÁÉÍÓÚÜÑáéíóúüñ0-9\s]+$/, "Solo se permiten letras y números."),
            ubicacion: z.string().min(1, "La ubicación es obligatoria.")
                .regex(/^[A-Za-zÁÉÍÓÚÜÑáéíóúüñ0-9\s]+$/, "Solo se permiten letras y números."),
            canastillas: z.union([z.string(), z.number()])
                .transform(val => parseInt(val, 10))
                .refine(val => !isNaN(val) && val >= 0, "La cantidad de canastillas debe ser un número entero mayor o igual a 0.")
        })
    }
    static put_comercial_clientes_clienteNacional() {
        return z.object({
            cliente: z.string()
                .min(1, "El nombre del cliente es obligatorio.")
                .regex(/^[A-Za-zÁÉÍÓÚÜÑáéíóúüñ0-9\s]+$/, "Solo se permiten letras y números."),
            ubicacion: z.string()
                .min(1, "La ubicación es obligatoria.")
                .regex(/^[A-Za-zÁÉÍÓÚÜÑáéíóúüñ0-9\s]+$/, "Solo se permiten letras y números."),
            canastillas: z.coerce.number().min(1, "La cantidad de canastillas debe ser mayor a 0.")

        })
    }
    static put_comercial_reclamacionCalidad_contenedor() {
        return z.object({
            responsable: z.string().min(1, "Responsable es requerido"),
            Cargo: z.string().min(1, "Cargo es requerido"),
            telefono: z.string().optional(), // You could add regex if you want to validate phone numbers
            git: z.string().min(1, "Cliente es requerido"),
            fechaArribo: z.string().refine(val => !isNaN(Date.parse(val)), "Fecha Arribo inválida"),
            contenedor: z.string().optional(),
            correo: z.string().email("Correo inválido"),
            kilos: z.coerce.number().min(0, "Kilos debe ser un número positivo"),
            cajas: z.coerce.number().min(0, "Cajas debe ser un número positivo"),
            fechaDeteccion: z.string().refine(val => !isNaN(Date.parse(val)), "Fecha Detección inválida"),
            moho_encontrado: z.string().optional(),
            moho_permitido: z.string().optional(),
            golpes_encontrado: z.string().optional(),
            golpes_permitido: z.string().optional(),
            frio_encontrado: z.string().optional(),
            frio_permitido: z.string().optional(),
            maduracion_encontrado: z.string().optional(),
            maduracion_permitido: z.string().optional(),
            otroDefecto: z.string().optional(),
            observaciones: z.string().optional(),
            archivosSubidos: z.array(z.string()).optional(),
            fecha: z.date().optional(), // default will be set in your DB schema
        })
    }
    static post_comercial_contenedor() {
        return z.object({
            action: z.literal("post_comercial_contenedor"),
            data: z.object({
                clienteInfo: objectIdString("clienteInfo"),
                paisDestino: objectIdString("paisDestino"),
                GGN: z.boolean({ message: "El campo GGN debe ser un booleano" }),
                numeroContenedor: requiredSafeString("numeroContenedor")
                    .pipe(z.string().refine(
                        val => !isNaN(Number(val)) && Number(val) > 0,
                        "El número de contenedor debe ser un número válido mayor a cero"
                    )),
                tipoFruta: z.array(objectIdString("tipoFruta"))
                    .min(1, "Debe seleccionar al menos un tipo de fruta"),
                fechaInicioProceso: z.string()
                    .min(1, "La fecha de inicio de proceso es obligatoria")
                    .refine(val => !isNaN(Date.parse(val)), "La fecha de inicio de proceso no es válida"),
                fechaEstimadaCargue: z.string()
                    .min(1, "La fecha estimada de cargue es obligatoria")
                    .refine(val => !isNaN(Date.parse(val)), "La fecha estimada de cargue no es válida"),
                calidad: z.array(objectIdString("calidad"))
                    .min(1, "Debe seleccionar al menos una opción de calidad"),
                calibres: z.array(safeString("calibres").pipe(z.string().min(1, "El calibre no puede estar vacío")))
                    .min(1, "Debe seleccionar al menos un calibre"),
                tipoCaja: z.array(safeString("tipoCaja").pipe(z.string().min(1, "El tipo de caja no puede estar vacío")))
                    .min(1, "Debe seleccionar al menos un tipo de caja"),
                sombra: optionalSafeString("sombra"),
                defecto: optionalSafeString("defecto"),
                mancha: optionalSafeString("mancha"),
                verdeManzana: optionalSafeString("verdeManzana"),
                cajasTotal: requiredSafeString("cajasTotal")
                    .pipe(z.string().refine(
                        val => !isNaN(Number(val)) && Number(val) > 0,
                        "El total de cajas debe ser un número válido mayor a cero"
                    )),
                rtoEstimado: optionalSafeString("rtoEstimado"),
                observaciones: optionalSafeString("observaciones"),
                maquila: z.boolean({ message: "El campo maquila debe ser un booleano" }),
            })
        })
    }
    static post_comercial_clientes() {
        return z.object({
            action: z.literal("post_comercial_clientes"),
            data: z.object({
                CLIENTE: requiredSafeString("CLIENTE"),
                CORREO: z.string()
                    .min(1, "El campo CORREO es obligatorio")
                    .email("El campo CORREO debe ser un correo válido"),
                DIRECCIÓN: requiredSafeString("DIRECCIÓN"),
                PAIS_DESTINO: z.array(
                    z.object({
                        codigo: objectIdString("codigo"),
                        requiereGGN: z.boolean({ message: "El campo requiereGGN debe ser un booleano" })
                    })
                ).min(1, "Debe seleccionar al menos un país de destino"),
                TELEFONO: safeString("TELEFONO")
                    .pipe(z.string().min(1, "El campo TELEFONO es obligatorio")),
                ID: safeString("ID")
                    .pipe(z.string().min(1, "El campo ID es obligatorio")),
            })
        })
    }
    static put_comercial_clientes() {
        return z.object({
            _id: objectIdString("_id"),
            action: z.literal("put_comercial_clientes"),
            data: z.object({
                CLIENTE: requiredSafeString("CLIENTE"),
                CORREO: z.string()
                    .min(1, "El campo CORREO es obligatorio")
                    .email("El campo CORREO debe ser un correo válido"),
                DIRECCIÓN: requiredSafeString("DIRECCIÓN"),
                PAIS_DESTINO: z.array(
                    z.object({
                        codigo: objectIdString("codigo"),
                        requiereGGN: z.boolean({ message: "El campo requiereGGN debe ser un booleano" })
                    })
                ).min(1, "Debe seleccionar al menos un país de destino"),
                TELEFONO: safeString("TELEFONO")
                    .pipe(z.string().min(1, "El campo TELEFONO es obligatorio")),
                ID: safeString("ID")
                    .pipe(z.string().min(1, "El campo ID es obligatorio")),
            })
        })
    }
}
