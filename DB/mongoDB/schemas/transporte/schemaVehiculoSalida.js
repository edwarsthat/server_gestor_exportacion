import mongoose from "mongoose";
const { Schema } = mongoose;

export const defineVehiculoSalida = async (conn, audit) => {

    const entregaPrecintoSchema = new Schema({
        entrega: String,
        recibe: String,
        createdAt: { type: Date, default: () => new Date() },
        fechaEntrega: Date,
        fotos: [String],
        user: String,
        observaciones: String
    }, { _id: false });

    const vehiculoSalidaSchema = new Schema({
        tipoVehiculo: String,
        codigo: String,
        placa: String,
        conductor: String,
        cedula: String,
        celular: String,
        precinto: [String],
        flete: Number,
        unidadCarga: String,
        pesoEstimado: Number,
        user: String,
        tipoSalida: String,
        transportadora: String,
        nit: String,
        trailer: String,
        temperatura: String,
        datalogger_id: String,
        marca: String,
        contenedor: { type: Schema.Types.ObjectId, ref: "Contenedor", required: false },
        fecha: { type: Date, default: () => new Date() },
        entregaPrecinto: entregaPrecintoSchema
    });

    // Middleware para registrar creación de documentos
    vehiculoSalidaSchema.post('save', async function (doc) {
        try {
            if (audit && this.isNew) {
                await audit.create({
                    documentId: doc._id,
                    operation: 'CREATE',
                    user: doc.user || 'Sistema',
                    action: 'Creación de registro',
                    description: `Vehículo creado: ${doc.placa || 'N/A'} - ${doc.codigo || 'N/A'}`
                });
            }
        } catch (error) {
            console.error('Error al crear auditoría de creación:', error);
        }
    });

    // Middleware para registrar actualizaciones
    vehiculoSalidaSchema.pre('findOneAndUpdate', async function (next) {
        try {
            if (audit) {
                const docToUpdate = await this.model.findOne(this.getQuery());
                if (docToUpdate) {
                    this._auditDoc = docToUpdate.toObject();
                }
            }
            next();
        } catch (error) {
            console.error('Error en pre-update audit:', error);
            next();
        }
    });

    vehiculoSalidaSchema.post('findOneAndUpdate', async function (doc) {
        try {
            if (audit && doc && this._auditDoc) {
                const changes = [];
                const fieldsToCompare = [
                    'tipoVehiculo', 'codigo', 'placa', 'conductor', 'cedula',
                    'celular', 'precinto', 'flete', 'unidadCarga', 'pesoEstimado',
                    'tipoSalida', 'transportadora', 'nit', 'trailer', 'temperatura',
                    'datalogger_id', 'marca', 'contenedor', 'fecha', 'entregaPrecinto'
                ];

                fieldsToCompare.forEach(field => {
                    const oldValue = this._auditDoc[field];
                    const newValue = doc[field];

                    if (JSON.stringify(oldValue) !== JSON.stringify(newValue)) {
                        changes.push(`${field}: ${JSON.stringify(oldValue)} → ${JSON.stringify(newValue)}`);
                    }
                });

                if (changes.length > 0) {
                    await audit.create({
                        documentId: doc._id,
                        operation: 'UPDATE',
                        user: doc.user || this.getUpdate().$set?.user || 'Sistema',
                        action: 'Actualización de registro',
                        description: `Cambios realizados: ${changes.join(', ')}`
                    });
                }
            }
        } catch (error) {
            console.error('Error al crear auditoría de actualización:', error);
        }
    });

    // Middleware para registrar eliminaciones
    vehiculoSalidaSchema.pre(['deleteOne', 'findOneAndDelete'], async function (next) {
        try {
            if (audit) {
                const docToDelete = await this.model.findOne(this.getQuery());
                if (docToDelete) {
                    this._auditDeleteDoc = docToDelete.toObject();
                }
            }
            next();
        } catch (error) {
            console.error('Error en pre-delete audit:', error);
            next();
        }
    });

    vehiculoSalidaSchema.post(['deleteOne', 'findOneAndDelete'], async function () {
        try {
            if (audit && this._auditDeleteDoc) {
                await audit.create({
                    documentId: this._auditDeleteDoc._id,
                    operation: 'DELETE',
                    user: 'Sistema',
                    action: 'Eliminación de registro',
                    description: `Vehículo eliminado: ${this._auditDeleteDoc.placa || 'N/A'} - ${this._auditDeleteDoc.codigo || 'N/A'}`
                });
            }
        } catch (error) {
            console.error('Error al crear auditoría de eliminación:', error);
        }
    });

    const vehiculoSalida = conn.model("salidaVehiculo", vehiculoSalidaSchema);
    return vehiculoSalida;
}
