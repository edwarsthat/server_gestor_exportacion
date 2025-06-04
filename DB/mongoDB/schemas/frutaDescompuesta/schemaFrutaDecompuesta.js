const mongoose = require("mongoose");
const { Schema } = mongoose;

const defineFrutaDescompuesta = async (conn, AuditLog) => {

    const descarteLavadoSchema = new Schema({
        descarteGeneral: { type: Number, default: 0 },
        pareja: { type: Number, default: 0 },
        balin: { type: Number, default: 0 },
    }, { _id: false });

    const descarteEnceradoSchema = new Schema({
        descarteGeneral: { type: Number, default: 0 },
        pareja: { type: Number, default: 0 },
        balin: { type: Number, default: 0 },
        extra: { type: Number, default: 0 },
        suelo: { type: Number, default: 0 },
        frutaNacional: { type: Number, default: 0 },
    }, { _id: false });

    const frutaDescompuestaSchema = new Schema({
        kilos: Number,
        createdAt: { type: Date, default: () => new Date() },
        user: String,
        razon: String,
        comentario_adicional: String,
        tipoFruta: { type: String, required: true },
        descarteLavado: descarteLavadoSchema,
        descarteEncerado: descarteEnceradoSchema

    });

    frutaDescompuestaSchema.post('save', async function (doc) {
        try {
            await AuditLog.create({
                collection: 'frutaDescompuesta',
                documentId: doc._id,
                operation: 'create',
                user: doc._user,
                action: "put_inventarios_registros_fruta_descompuesta",
                newValue: doc,
                description: 'Creación de registro fruta descompuesta'
            });
        } catch (err) {
            console.error('Error guardando auditoría:', err);
        }
    });

    frutaDescompuestaSchema.pre('findOneAndUpdate', async function (next) {
        try {
            // Guardamos el documento original (ANTES)
            const docToUpdate = await this.model.findOne(this.getQuery());
            this._oldValue = docToUpdate ? docToUpdate.toObject() : null;
            next();
        } catch (err) {
            next(err);
        }
    });

    frutaDescompuestaSchema.post('findOneAndUpdate', async function (res) {
        try {

            await AuditLog.create({
                collection: 'frutaDescompuesta',
                documentId: res?._id,
                operation: 'update',
                user: this.options?.user,        // Asegúrate de pasar estas options al llamar findOneAndUpdate
                action: this.options?.action,
                oldValue: this._oldValue,
                newValue: res ? res.toObject() : null,
                description: 'Actualización registro fruta descompuesta'
            });
        } catch (err) {
            console.error('Error guardando auditoría:', err);
        }
    });
    return conn.model("frutaDescompuesta", frutaDescompuestaSchema);
}


module.exports.defineFrutaDescompuesta = defineFrutaDescompuesta;

