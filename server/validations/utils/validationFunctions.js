import { z } from 'zod';

const getErrorMessages = (zodError) => {
    const errors = {}
    zodError.errors.forEach(err => {
        const path = err.path[0]
        errors[path] = err.message
    })
    return errors
}

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

export {
    getErrorMessages,
    safeString,
    optionalSafeString
}