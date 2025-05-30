const mongoose = require("mongoose");
const { Schema } = mongoose;

const defineFrutaDescompuesta = async (conn, AuditLog) => {

    const frutaDescompuestaSchema = new Schema({
        kilos_total: Number,
        createdAt: { type: Date, default: () => new Date() },
        user: String,
        razon: String,
        comentario_adicional: String,
        tipo_fruta: { type: String, required: true }
    });

    frutaDescompuestaSchema.post('save', async function (doc) {
        try {
            await AuditLog.create({
                collection: 'frutaDescompuesta',
                documentId: doc._id,
                operation: 'create',
                user: doc._user,
                action: "put_inventarios_frutaDescarte_despachoDescarte",
                newValue: doc,
                description: 'Creación de despacho descarte'
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

