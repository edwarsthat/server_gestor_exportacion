
const { db } = require("../../DB/mongoDB/config/init");
const { ConnectionDBError } = require("../../Error/ConnectionErrors");

class RecordModificacionesRepository {
    static async post_record_contenedor_modification(
        action,
        user,
        modelo,
        id,
        descripcion,
        oldData,
        data,
        detalles
    ) {
        /**
         * Registra una modificación sobre un documento en cualquier colección de la base de datos.
         * 
         * @param {String} action - Tipo de acción realizada (ej: ACTUALIZACION, CREACION, ELIMINACION).
         * @param {Object} user - Objeto del usuario que realiza la modificación.
         * @param {String} modelo - Nombre del modelo (colección) del documento afectado.
         * @param {mongoose.ObjectId} id - ID del documento afectado.
         * @param {String} descripcion - Descripción breve sobre la operación o documento afectado.
         * @param {Object} oldData - Estado anterior del documento (antes de la modificación).
         * @param {Object} newData - Estado actualizado del documento (después de la modificación).
         * @param {Object} detalles - Detalles adicionales específicos sobre la operación realizada.
         *
         * @returns {Promise<void>} - Promesa que resuelve al guardar el registro.
         */
        try {
            let record = new db.RecordModificacion({
                accion: action,  // Ejemplo: "ACTUALIZACION_PALET_EF1"
                usuario: {
                    id: user._id,
                    user: user.user
                },
                documentoAfectado: {
                    modelo: modelo,
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

module.exports.RecordModificacionesRepository = RecordModificacionesRepository
