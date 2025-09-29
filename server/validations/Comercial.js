import { z } from "zod";

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
    static val_proveedores_informacion_post_put_data(data) {
        //Validaciones
        const requiredFieldsAll = [
            "CODIGO INTERNO",
            "PREDIO",
            "ICA.code",
            "ICA.tipo_fruta",
            "ICA.fechaVencimiento",
            "GGN.code",
            "GGN.fechaVencimiento",
            "GGN.paises",
            "GGN.tipo_fruta",
            "nit_facturar",
            "razon_social",
            "propietario",
            "telefono_propietario",
            "correo_informes",
            "contacto_finca",
            "telefono_predio",
            "tipo_fruta",
            "activo",
            "SISPAP",
            "departamento",
            "municipio"
        ];
        const requiredFields = [
            "CODIGO INTERNO",
            "PREDIO",
            "ICA.code",
            "ICA.tipo_fruta",
            "ICA.fechaVencimiento",
            "nit_facturar",
            "razon_social",
            "propietario",
            "telefono_propietario",
            "correo_informes",
            "contacto_finca",
            "telefono_predio",
        ];

        requiredFields.forEach((field) => {
            if (!data[field] || data[field] === "") {
                throw new Error(`El campo ${field} es obligatorio.`)
            }

            if (field === "CODIGO INTERNO") {
                data[field] = Number(data[field])
                if (isNaN(data[field])) {
                    throw new Error(`El campo ${field} debe ser un numero.`)
                }
            }
        });

        Object.keys(data).forEach((key) => {
            if (!requiredFieldsAll.includes(key)) {
                throw new Error(`El campo ${key} no es permitido.`);
            }
        });
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
                if (typeof data[key] !== "string") {
                    throw new Error(`El filtro ${key} debe ser de tipo string`)
                }
            }
            if (key === "fechaInicio" || key === "fechaFin") {
                if (typeof data[key] !== "string") {
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
            cliente: z.string().min(1, "Cliente es requerido"),
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
            cliente: z.string().min(1, "El cliente es obligatorio"),
            numeroContenedor: z.string().min(1, "El número de contenedor es obligatorio")
                .refine(val => !isNaN(Number(val)) && Number(val) > 0, "El número de contenedor debe ser un número válido mayor a cero"),
            tipoFruta: z.array(z.string()).min(1, "Debe seleccionar al menos un tipo de fruta"),
            fechaInicioProceso: z.string().min(1, "La fecha de inicio de proceso es obligatoria"),
            fechaEstimadaCargue: z.string().min(1, "La fecha estimada de cargue es obligatoria"),
            calidad: z.array(z.string()).min(1, "Debe seleccionar al menos una opción de calidad"),
            calibres: z.array(z.string()).min(1, "Debe seleccionar al menos un calibre"),
            tipoCaja: z.array(z.string()).min(1, "Debe seleccionar al menos un tipo de caja"),
            sombra: z.string().optional(),
            defecto: z.string().optional(),
            mancha: z.string().optional(),
            verdeManzana: z.string().optional(),
            numeroPallets: z.string().min(1, "El número de pallets es obligatorio")
                .refine(val => !isNaN(Number(val)) && Number(val) > 0, "El número de pallets debe ser un número válido mayor a cero"),
            cajasTotal: z.string().min(1, "El total de cajas es obligatorio")
                .refine(val => !isNaN(Number(val)) && Number(val) > 0, "El total de cajas debe ser un número válido mayor a cero"),
            RTO: z.string().optional(),
            observaciones: z.string().min(1, "Las observaciones son obligatorias")
        })
    }
}
