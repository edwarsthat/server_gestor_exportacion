import { db } from "../../DB/mongoDB/config/init.js";
import { ConnectionDBError } from "../../Error/ConnectionErrors.js";


export class RecordContenedoresRepository {
    static async post_record_contenedor_modification(
        action,
        user,
        id,
        descripcion,
        oldData,
        data,
        detalles
    ) {
        /**
 * Registra una modificación sobre un documento en la colección "Contenedores".
 * 
 * @param {String} action - Tipo de acción realizada (ej: ACTUALIZACION, CREACION, ELIMINACION).
 * @param {Object} user - Objeto del usuario que realiza la modificación.
 * @param {mongoose.ObjectId} id - ID del documento afectado.
 * @param {String} descripcion - Descripción breve sobre la operación o documento afectado.
 * @param {Object} oldData - Estado anterior del documento (antes de la modificación).
 * @param {Object} newData - Estado actualizado del documento (después de la modificación).
 * @param {Object} detalles - Detalles adicionales específicos sobre la operación realizada.
 *
 * @returns {Promise<void>} - Promesa que resuelve al guardar el registro.
 */
        try {
            let record = new db.recordContenedores({
                accion: action,  // Ejemplo: "ACTUALIZACION_PALET_EF1"
                usuario: {
                    id: user._id,
                    user: user.user
                },
                documentoAfectado: {
                    modelo: 'Contenedores',
                    documentoId: id,
                    descripcion: descripcion,
                },
                cambios: {
                    antes: oldData,
                    despues: data
                },
                detallesOperacion: detalles
            });

            await record.save();
        } catch (err) {
            throw new ConnectionDBError(610, `Err${err.name} ${err.message}`);
        }
    }
}
