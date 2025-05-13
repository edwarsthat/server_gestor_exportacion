const { z } = require('zod');
const tiposFruta = require('../../constants/tipo_fruta.json');

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
        }); try {
            console.log('Tipos de fruta permitidos:', tiposFruta);
            console.log('Datos recibidos:', data);
            return schema.parse(data);
        } catch (error) {
            // Transformar errores de Zod en un formato más amigable
            const formattedErrors = getErrorMessages(error);

            throw new Error(`Validation error: ${JSON.stringify(formattedErrors)}`);
        }
    }
}


const getErrorMessages = (zodError) => {
    const errors = {}
    zodError.errors.forEach(err => {
        const path = err.path[0]
        errors[path] = err.message
    })
    return errors
}

module.exports = ProcesoValidations;
