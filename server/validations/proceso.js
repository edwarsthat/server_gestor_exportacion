import { z } from 'zod';

import { getErrorMessages, safeString, optionalSafeString, requiredSafeString, objectIdString, base64String } from './utils/validationFunctions.js';

export class ProcesoValidations {
    static put_proceso_aplicaciones_listaEmpaque_agregarItem() {
        return z.object({
            action: z.literal('put_proceso_aplicaciones_listaEmpaque_agregarItem'),
            _id: objectIdString("_id"),
            pallet: objectIdString("pallet"),
            item: z.object({
                lote: objectIdString("lote"),
                cajas: z.number().int("Las cajas deben ser un número entero").positive("Las cajas deben ser mayor a cero"),
                tipoCaja: requiredSafeString("tipoCaja"),
                calibre: requiredSafeString("calibre"),
                calidad: objectIdString("calidad"),
                tipoFruta: objectIdString("tipoFruta"),
                fecha: z.string()
                    .min(1, "La fecha es obligatoria")
                    .refine(val => !isNaN(Date.parse(val)), "La fecha no tiene un formato válido"),
            })
        });
    }
    static put_proceso_aplicaciones_listaEmpaque_modificarItem_desktop() {

        try {
            return z.object({
                _id: z.string().regex(/^[0-9a-fA-F]{24}$/),  // Validar ObjectId de MongoDB
                pallet: z.number().int().nonnegative(),
                seleccion: z.number().int().nonnegative(),
                action: z.literal('put_proceso_aplicaciones_listaEmpaque_modificarItem_desktop'),
                data: z.object({
                    calidad: safeString('calidad'),  // calidad es requerido y debe ser seguro
                    calibre: optionalSafeString('calibre'),  // calibre es opcional pero debe ser seguro
                    cajas: z.number().int().positive(),
                    tipoCaja: safeString('tipo de caja')  // tipoCaja es requerido y debe ser seguro
                }),
            })
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
            seleccion: z.array(z.string().min(1)),
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
            seleccion: z.array(z.string().min(1)),
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
                descarteGeneral: z.number(),
                pareja: z.number(),
                descompuesta: z.number(),
                piel: z.number(),
                hojas: z.number(),
            })
        })
    }
    static put_proceso_aplicaciones_descarteEncerado() {
        return z.object({
            action: requiredSafeString("action"),
            registroFrutaProcesada: objectIdString("registroFrutaProcesada"),
            tipo: requiredSafeString("tipo"),
            data: z.object({
                descarte: z.string().min(1, "Seleccione un descarte"),
                canastillas: z.string().refine((val) => {
                    if (val === "") return true;
                    const num = Number(val);
                    return !isNaN(num) && num >= 0;
                }, "Las canastillas deben ser un número mayor o igual a 0").optional().or(z.literal("")),
                kilos: z.string().refine((val) => {
                    if (val === "") return true;
                    const num = Number(val);
                    return !isNaN(num) && num >= 0;
                }, "Los kilos deben ser un número mayor a 0").or(z.literal("")),
            })
        })
    }
    static put_proceso_pallet_eviarCuartoFrio() {
        return z.object({
            seleccion: z.array(z.string().min(1)),
            cuartoFrio: z.string().min(1)
        })
    }

    static post_proceso_aplicaciones_fotoCalidad() {
        return z.object({
            _id: objectIdString("_id"),
            fotoName: z.string().regex(/^[a-zA-Z0-9_-]+$/, 'Nombre de foto inválido'),
            foto: base64String("foto"),
        })
    }
}

