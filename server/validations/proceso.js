const { z } = require('zod');
const tiposFruta = require('../../constants/tipo_fruta.json');
const { getErrorMessages, safeString, optionalSafeString } = require('./utils/validationFunctions');

class ProcesoValidations {
    static async put_proceso_aplicaciones_listaEmpaque_agregarItem(data) {
        // Schema para validar item
        const itemSchema = z.object({
            cajas: z.number().int().positive(),
            lote: z.string().regex(/^[0-9a-fA-F]{24}$/),  // Validar ObjectId de MongoDB
            calidad: z.string().min(1),
            calibre: z.string(),
            tipoCaja: z.string(),
            tipoFruta: z.enum(tiposFruta, {
                errorMap: () => ({ message: `El tipo de fruta debe ser uno de los siguientes valores: ${tiposFruta.join(', ')}` })
            }),
            fecha: z.string(),
        });

        // Schema principal para validar req.data
        const schema = z.object({
            _id: z.string().regex(/^[0-9a-fA-F]{24}$/), // Validar ObjectId de MongoDB
            pallet: z.number().int().nonnegative(), // Número entero positivo o cero
            action: z.literal('put_proceso_aplicaciones_listaEmpaque_agregarItem'), // Valor exacto
            item: itemSchema // Schema anidado para el item
        });

        try {
            return schema.parse(data);
        } catch (error) {
            // Transformar errores de Zod en un formato más amigable
            const formattedErrors = getErrorMessages(error);

            throw new Error(`Validation error: ${JSON.stringify(formattedErrors)}`);
        }
    }
    static async put_proceso_aplicaciones_listaEmpaque_modificarItem_desktop(req) {
        const dataSchema = z.object({
            calidad: safeString('calidad').min(1),  // calidad es requerido y debe ser seguro
            calibre: optionalSafeString('calibre'),  // calibre es opcional pero debe ser seguro
            cajas: z.number().int().positive(),
            tipoCaja: safeString('tipo de caja')  // tipoCaja es requerido y debe ser seguro
        });

        const schema = z.object({
            _id: z.string().regex(/^[0-9a-fA-F]{24}$/),  // Validar ObjectId de MongoDB
            pallet: z.number().int().nonnegative(),
            seleccion: z.number().int().nonnegative(),
            data: dataSchema,
            action: z.literal('put_proceso_aplicaciones_listaEmpaque_modificarItem_desktop')
        });

        try {
            return schema.parse(req.data);
        } catch (error) {
            // Transformar errores de Zod en un formato más amigable
            const formattedErrors = getErrorMessages(error);
            throw new Error(`Validation error: ${JSON.stringify(formattedErrors)}`);
        }
    }
    static async put_proceso_aplicaciones_listaEmpaque_eliminarItems() {
        return z.object({
            _id: z.string().regex(/^[0-9a-fA-F]{24}$/),
            pallet: z.number().int().nonnegative(),
            seleccion: z.array(z.number().int().nonnegative()),
        })
    }
    static async put_proceso_aplicaciones_listaEmpaque_restarItem() {
        return z.object({
            _id: z.string().regex(/^[0-9a-fA-F]{24}$/),
            pallet: z.number().int().nonnegative(),
            seleccion: z.number().int().nonnegative(),
            cajas: z.number().int().positive(),
        })
    }
    static async put_proceso_aplicaciones_listaEmpaque_modificarItems() {
        return z.object({
            _id: z.string().regex(/^[0-9a-fA-F]{24}$/),
            pallet: z.number().int().nonnegative(),
            seleccion: z.array(z.number().int().nonnegative()),
            data: z.object({
                calibre: safeString(),
                calidad: safeString(),
                tipoCaja: safeString(),
            })
        })
    }
    static put_proceso_aplicaciones_descarteLavado() {
        return z.object({
            _id: z.string().regex(/^[0-9a-fA-F]{24}$/),
            data: z.object({
                descarteGeneral: z.number().nonnegative(),
                pareja: z.number().nonnegative(),
                descompuesta: z.number().nonnegative(),
                piel: z.number().nonnegative(),
                hojas: z.number().nonnegative(),
            })
        })
    }
    static put_proceso_aplicaciones_descarteEncerado() {
        return z.object({
            _id: z.string().regex(/^[0-9a-fA-F]{24}$/),
            data: z.object({
                descarteGeneral: z.number().nonnegative(),
                pareja: z.number().nonnegative(),
                balin: z.number().nonnegative(),
                descompuesta: z.number().nonnegative(),
                extra: z.number().nonnegative(),
                suelo: z.number().nonnegative(),
                frutaNacional: z.number().nonnegative()
            })
        })
    }
}

module.exports = ProcesoValidations;
