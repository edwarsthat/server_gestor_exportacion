

const { db } = require("../../DB/mongoDB/config/init");
const { ConnectionDBError } = require("../../Error/ConnectionErrors");

class RecordCreacionesRepository {
    static async post_record_creaciones(
        action,
        user,
        documento,
        snapshot,
        detalles
    ) {
        /**
         * Registra un registro de creación de un documento en la base de datos.
         *
         * @param {String} action - Tipo de acción realizada (por ejemplo, "creacion_lote").
         * @param {Object} user - Objeto del usuario que realiza la creación. Debe incluir al menos las propiedades:
         *                        - _id: Identificador único del usuario.
         *                        - user: Nombre o identificador del usuario.
         * @param {Object} documento - Objeto que representa el documento creado. Se espera que contenga:
         *                             - modelo: Nombre del modelo o colección al que pertenece el documento.
         *                             - _id: Identificador único del documento.
         * @param {Object} snapshot - Copia del documento en el momento de la creación, que sirve como registro histórico.
         * @param {Object} detalles - Información adicional específica sobre la operación de creación.
         *
         * @returns {Promise<void>} - Promesa que se resuelve una vez que el registro de creación ha sido guardado.
         *
         * @throws {ConnectionDBError} - Se lanza un error en caso de que ocurra un fallo durante el proceso de guardado.
         */
        try {
            let record = new db.RecordCreacion({
                accion: action,
                usuario: {
                    id: user._id,
                    user: user.user
                },
                documento: {
                    modelo: documento.modelo,
                    documentoId: documento._id,

                    snapshot: snapshot

                },

                detallesOperacion: detalles,

            });

            await record.save();
        } catch (err) {
            throw new ConnectionDBError(610, `Err${err.name} ${err.message}`);
        }
    }

}

module.exports.RecordCreacionesRepository = RecordCreacionesRepository
