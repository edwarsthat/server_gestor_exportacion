import { z } from 'zod';

const getErrorMessages = (zodError) => {
    const errors = Object.create(null)
    zodError.errors.forEach(err => {
        const path = err.path[0]
        Reflect.set(errors, path, err.message)
    })
    return errors
}


// Función auxiliar para validar strings seguros
const requiredSafeString = (fieldName) =>
    z.string()
        .min(1, `El campo ${fieldName} es obligatorio`)
        .refine(val =>
            typeof val === 'string' &&
            !val.includes('$') &&
            !val.includes('{') &&
            !val.includes('}') &&
            !val.includes('<script'),
            `El campo ${fieldName} contiene caracteres no permitidos.`
        );

// Función auxiliar para validar strings seguros
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

// Función auxiliar para validar strings opcionales seguros
const optionalSafeString = (campo) =>
    z.string()
        .optional()
        .refine(val => {
            // si viene como string vacío, lo ignoramos
            if (val === undefined || val.trim() === '') return true;
            return !val.includes('$') && !val.includes('{') && !val.includes('}') && !val.includes('<script');
        }, {
            message: `El ${campo} debe ser una cadena de texto válida y no contener caracteres especiales.`
        });

const base64String = (fieldName) =>
    z.string()
        .refine(val => {
            if (!val) return false;
            // Regex básica para validar formato data:image/...;base64,... o simplemente base64
            // eslint-disable-next-line security/detect-unsafe-regex
            const base64Regex = /^([A-Za-z0-9+/]{4})*([A-Za-z0-9+/]{3}=|[A-Za-z0-9+/]{2}==)?$/;
            const parts = val.split(',');
            const base64Data = parts.length > 1 ? parts[1] : parts[0];
            return base64Regex.test(base64Data);
        }, `El campo ${fieldName} debe ser un base64 válido.`);

const objectIdString = (fieldName) =>
    z.string()
        .refine(val => /^[0-9a-fA-F]{24}$/.test(val), {
            message: `El campo ${fieldName} debe ser un ObjectId válido.`
        });

const bufferData = (fieldName) =>
    z.any()
        .refine(val => Buffer.isBuffer(val) || val instanceof ArrayBuffer || val instanceof Uint8Array, {
            message: `El campo ${fieldName} debe ser un Buffer o ArrayBuffer válido.`
        });

export {
    getErrorMessages,
    safeString,
    optionalSafeString,
    base64String,
    objectIdString,
    requiredSafeString,
    bufferData
}