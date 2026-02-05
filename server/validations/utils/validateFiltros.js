import { z } from 'zod';
import { optionalSafeString } from './validationFunctions.js';

/**
 * Schema base para los filtros comunes utilizados en las peticiones de exportación.
 * Todos los campos son opcionales o permiten strings vacíos para facilitar su uso en filtros.
 */
export const filtroSchema = z.object({
    tipoFruta: optionalSafeString('tipoFruta'),
    tipoLote: optionalSafeString('tipoLote'),
    fechaInicio: z.union([
        z.literal(''),
        z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'El formato de fechaInicio debe ser YYYY-MM-DD'),
    ]).optional(),
    fechaFin: z.union([
        z.literal(''),
        z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'El formato de fechaFin debe ser YYYY-MM-DD'),
    ]).optional(),
    GGN: z.boolean().optional(),
    buscar: optionalSafeString('buscar'),
    proveedor: optionalSafeString('proveedor'),
    tipoFecha: optionalSafeString('tipoFecha'),
    EF: optionalSafeString('EF'),
    cuartoDesverdizado: optionalSafeString('cuartoDesverdizado'),
    divisionTiempo: optionalSafeString('divisionTiempo'),
    all: z.boolean().optional(),
    areaSeleccion: optionalSafeString('areaSeleccion'),
    activo: z.boolean().optional(),
    descarte: optionalSafeString('descarte'),
    enInventario: z.boolean().optional(),
});

/**
 * Valida un objeto que contiene una propiedad 'filtro'.
 * @param {Object} data - Datos a validar.
 * @returns {Object} Datos validados.
 */
export const validateFiltros = (data) => {
    return z.object({
        filtro: filtroSchema
    }).parse(data);
};
