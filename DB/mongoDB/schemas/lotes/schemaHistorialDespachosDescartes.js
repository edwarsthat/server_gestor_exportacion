const mongoose = require("mongoose");
const { Schema } = mongoose;

const defineHistorialDespachoDescarte = async (conn, AuditLog) => {

    const RegistroSchema = new Schema({
        fecha: { type: Date, default: () => new Date() },
        cliente: String,
        placa: String,
        nombreConductor: String,
        telefono: String,
        cedula: String,
        remision: String,
        tipoFruta: String,
        user: String,
        kilos: Number
    });

    RegistroSchema.post('save', async function (doc) {
        try {
            await AuditLog.create({
                collection: 'historialDespachoDescarte',
                documentId: doc._id,
                operation: 'create',
                user: doc._user,
                action: "post_inventarios_frutaDescarte_frutaDescompuesta",
                newValue: doc,
                description: 'Creación de registro fruta descompuesta'
            });
        } catch (err) {
            console.error('Error guardando auditoría:', err);
        }
    });

    RegistroSchema.pre('findOneAndUpdate', async function (next) {
        try {
            // Guardamos el documento original (ANTES)
            const docToUpdate = await this.model.findOne(this.getQuery());
            this._oldValue = docToUpdate ? docToUpdate.toObject() : null;
            next();
        } catch (err) {
            next(err);
        }
    });

    RegistroSchema.post('findOneAndUpdate', async function (res) {
        try {

            await AuditLog.create({
                collection: 'historialDespachoDescarte',
                documentId: res?._id,
                operation: 'update',
                user: this.options?.user,        // Asegúrate de pasar estas options al llamar findOneAndUpdate
                action: this.options?.action,
                oldValue: this._oldValue,
                newValue: res ? res.toObject() : null,
                description: 'Actualización de historial despacho fruta descarte'
            });
        } catch (err) {
            console.error('Error guardando auditoría:', err);
        }
    });

    const historialDespachoDescarte = conn.model("historialDespachoDescarte", RegistroSchema);
    return historialDespachoDescarte;
}

module.exports.defineHistorialDespachoDescarte = defineHistorialDespachoDescarte;