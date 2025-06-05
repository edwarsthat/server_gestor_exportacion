// const { generadoresEF } = require("../utils/diccionarios");
import { generadoresEF } from '../utils/diccionarios.js';

async function generarCodigoEF(ef, fecha) {
    const key = ef.substring(0, 3); // Solo los primeros 3 chars
    const generador = await generadoresEF[key];
    if (!generador) {
        throw new Error(`Error código no válido de EF: ${ef}`);
    }
    return generador(fecha);
}

export {
    generarCodigoEF
}
