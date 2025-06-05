import { db } from "../DB/mongoDB/config/init.js";
import { PostError } from "./ConnectionErrors.js";

export class HandleErrors {
    static async addError(error, user = '', action = '') {
        /**
 * Funcion que agrega un error a la base de datos lote de mongoDB
 * 
 * @param {object} error - el error que se desea guardar
 * @param {string} user - el usuario que cometio el error
 * @param {string} action - la accion en la que se cometio el error si fue en una peticion 
 *                           de los metodos del proceso
 */
        try {
            const errorObj = {
                name: error.name,
                message: error.message,
                stack: error.stack,
                code: error.code,
                action: action,
                user: user
            }
            const err = new db.Errores(errorObj);
            await err.save();


        } catch (err) {
            throw new PostError(409, `Error agregando el error xD ${err.message}`);
        }
    }
}

