const { z } = require('zod')
class ComercialValidationsRepository {
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
    static val_post_comercial_precios_add_precio(data) {
        if (!Object.prototype.hasOwnProperty.call(data, "tipoFruta"))
            throw new Error("Ingrese un tipo de fruta")
        if (data.tipoFruta === '')
            throw new Error("Ingrese un tipo de fruta")
        if (!Object.prototype.hasOwnProperty.call(data, "week"))
            throw new Error("Ingrese la semana del año")
        if (data.tipoFruta === '')
            throw new Error("Ingrese la semana del año")

    }
    static val_post_comercial_precios_add_precio_lote(data) {

        if (!Object.prototype.hasOwnProperty.call(data, "enf"))
            throw new Error("Ingrese un EF")
        if (data.enf === '')
            throw new Error("Ingrese un EF")

    }
    static val_get_comercial_precios_registros_filtro(data) {
        const filtrosTypes = ["fechaInicio", "fechaFin", "tipoFruta", "proveedor"]
        for (const key in data) {
            if (!filtrosTypes.includes(key)) {
                throw new Error(`El filtro ${key} no es permitido`)
            }

            if (key === "tipoFruta") {
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
                .regex(/^[A-Za-zÁÉÍÓÚÜÑáéíóúüñ0-9\s]+$/, "Solo se permiten letras y números.")
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
}

module.exports.ComercialValidationsRepository = ComercialValidationsRepository