
const { db } = require("../../DB/mongoDB/config/init");
const { ConnectionDBError } = require("../../Error/ConnectionErrors");

class RecordModificacionesRepository {
    static async post_record_contenedor_modification(
        action,
        user,
        documentosAfectados, // Ahora se espera un array de documentos afectados
        oldData,
        newData,
        detalles
    ) {
        /**
         * Registra una modificación sobre uno o varios documentos en la base de datos.
         * 
         * @param {String} action - Tipo de acción realizada (ej: ACTUALIZACION, CREACION, ELIMINACION).
         * @param {Object} user - Objeto del usuario que realiza la modificación.
         * @param {String} modelo - Nombre del modelo (colección) de los documentos afectados.
         * @param {Array} documentosAfectados - Array de objetos que describen cada documento afectado.
         *        Cada objeto debe contener: modelo, documentoId y descripción.
         * @param {Object} oldData - Estado anterior del documento (antes de la modificación).
         * @param {Object} newData - Estado actualizado del documento (después de la modificación).
         * @param {Object} detalles - Detalles adicionales específicos sobre la operación realizada.
         *
         * @returns {Promise<void>} - Promesa que resuelve al guardar el registro.
         */
        try {
            let record = new db.RecordModificacion({
                accion: action,  // Ejemplo: "ACTUALIZACION_MULTIPLE_LOTES"
                usuario: {
                    id: user._id,
                    user: user.user
                },
                documentosAfectados: documentosAfectados,
                cambios: {
                    antes: oldData,
                    despues: newData
                },
                detallesOperacion: detalles
            });

            await record.save();
        } catch (err) {
            throw new ConnectionDBError(610, `Err${err.name} ${err.message}`);
        }
    }

    static async post_record_modification(
        action,
        user,
        documentosAfectados, // Ahora se espera un array de documentos afectados
        oldData,
        newData,
        detalles
    ) {
        /**
         * Registra una modificación sobre uno o varios documentos en la base de datos.
         * 
         * @param {String} action - Tipo de acción realizada (ej: ACTUALIZACION, CREACION, ELIMINACION).
         * @param {Object} user - Objeto del usuario que realiza la modificación.
         * @param {String} modelo - Nombre del modelo (colección) de los documentos afectados.
         * @param {Array} documentosAfectados - Array de objetos que describen cada documento afectado.
         *        Cada objeto debe contener: modelo, documentoId y descripción.
         * @param {Object} oldData - Estado anterior del documento (antes de la modificación).
         * @param {Object} newData - Estado actualizado del documento (después de la modificación).
         * @param {Object} detalles - Detalles adicionales específicos sobre la operación realizada.
         *
         * @returns {Promise<void>} - Promesa que resuelve al guardar el registro.
         */
        try {
            let record = new db.RecordModificacion({
                accion: action,  // Ejemplo: "ACTUALIZACION_MULTIPLE_LOTES"
                usuario: {
                    id: user._id,
                    user: user.user
                },
                documentosAfectados: documentosAfectados,
                cambios: {
                    antes: oldData,
                    despues: newData
                },
                detallesOperacion: detalles
            });

            await record.save();
        } catch (err) {
            throw new ConnectionDBError(610, `Err${err.name} ${err.message}`);
        }
    }
}

module.exports.RecordModificacionesRepository = RecordModificacionesRepository
