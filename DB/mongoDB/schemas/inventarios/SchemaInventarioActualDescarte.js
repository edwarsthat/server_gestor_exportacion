import mongoose from "mongoose";
const { Schema } = mongoose;

/**
 * Schema para el inventario actual de fruta descarte
 * Mantiene el control de kilos disponibles por lote y tipo de descarte
 */
export const defineInventarioActualDescarte = async (conn) => {

    const InventarioActualDescarteSchema = new Schema({
        fechaIngreso: {
            type: Date,
            required: true,
            default: () => new Date(),
            index: true
        },
        lote: {
            type: Schema.Types.ObjectId,
            required: true,
            refPath: 'loteType'
        },
        loteType: {
            type: String,
            required: true,
            trim: true,
            enum: {
                values: ['Lote', 'loteMaquila', 'Loteef8'],
                message: '{VALUE} no es un tipo de registro válido'
            },
            default: 'Lote'
        },
        tipoFruta: {
            type: Schema.Types.ObjectId,
            ref: "tipoFrutas",
            required: true,
            index: true
        },
        area: {
            type: String,
            required: true,
            uppercase: true,
            trim: true,
            enum: {
                values: ['ENCERADO', 'LAVADO'],
                message: '{VALUE} no es una ubicación válida'
            }
        },
        tipoDescarte: {
            type: Schema.Types.ObjectId,
            ref: "descartes",
            required: true
        },
        kilosIniciales: {
            type: Number,
            required: true,
            min: [0, 'Los kilos iniciales no pueden ser negativos'],
            validate: {
                validator: function (v) {
                    return v > 0;
                },
                message: 'Los kilos iniciales deben ser mayores a 0'
            }
        },
        kilosActuales: {
            type: Number,
            required: true,
            min: [0, 'Los kilos actuales no pueden ser negativos'],
            validate: {
                validator: function (v) {
                    if (this && typeof this.getUpdate === 'function') {
                        const update = this.getUpdate();
                        const newKilosIniciales = update?.$set?.kilosIniciales ?? update?.kilosIniciales;
                        if (newKilosIniciales !== undefined) return v <= newKilosIniciales;
                        return true;
                    }
                    return v <= this.kilosIniciales;
                },
                message: 'Los kilos actuales no pueden exceder los kilos iniciales'
            }
        },
        canastillasIniciales: {
            type: Number,
            required: true,
            min: [0, 'Las canastillas iniciales no pueden ser negativas'],
            validate: {
                validator: function (v) {
                    return v >= 0;
                },
                message: 'Las canastillas iniciales deben ser mayores o iguales a 0'
            }
        },
        canastillasActuales: {
            type: Number,
            required: true,
            min: [0, 'Las canastillas actuales no pueden ser negativas'],
            validate: {
                validator: function (v) {
                    if (this && typeof this.getUpdate === 'function') {
                        const update = this.getUpdate();
                        const newCanastillasIniciales = update?.$set?.canastillasIniciales ?? update?.canastillasIniciales;
                        if (newCanastillasIniciales !== undefined) return v <= newCanastillasIniciales;
                        return true;
                    }
                    return v <= this.canastillasIniciales;
                },
                message: 'Las canastillas actuales no pueden exceder las canastillas iniciales'
            }
        },
        estado: {
            type: String,
            required: true,
            uppercase: true,
            trim: true,
            enum: {
                values: ['ACTIVO', 'AGOTADO', 'TRANSFERIDO'],
                message: '{VALUE} no es un estado válido'
            },
            default: 'ACTIVO',
            index: true
        },
        fechaActualizacion: {
            type: Date,
            default: () => new Date()
        },
        user: {
            type: Schema.Types.ObjectId,
            ref: "usuario",
            required: true
        },
        observaciones: {
            type: String,
            trim: true,
            maxlength: [500, 'Las observaciones no pueden exceder 500 caracteres']
        }

    }, {
        timestamps: true,
        versionKey: '__v'
    });

    InventarioActualDescarteSchema.index(
        { lote: 1, tipoDescarte: 1, tipoFruta: 1, loteType: 1, area: 1 },
        {
            unique: true,
            name: 'idx_inventario_unico'
        }
    );

    InventarioActualDescarteSchema.index(
        { estado: 1, fechaIngreso: -1 },
        { name: 'idx_estado_fecha' }
    );

    InventarioActualDescarteSchema.index(
        { area: 1, tipoFruta: 1, estado: 1 },
        { name: 'idx_area_tipofruta' }
    );

    InventarioActualDescarteSchema.index(
        { kilosActuales: 1, estado: 1 },
        { name: 'idx_kilos_estado' }
    );

    InventarioActualDescarteSchema.pre('save', function (next) {
        this.fechaActualizacion = new Date();

        if (this.kilosActuales === 0 && this.estado === 'ACTIVO') {
            this.estado = 'AGOTADO';
        }

        if (this.isNew && this.kilosActuales === undefined) {
            this.kilosActuales = this.kilosIniciales;
        }

        next();
    });

    InventarioActualDescarteSchema.pre('findOneAndUpdate', function (next) {
        this.set({ fechaActualizacion: new Date() });
        next();
    });

    InventarioActualDescarteSchema.virtual('kilosConsumidos').get(function () {
        return this.kilosIniciales - this.kilosActuales;
    });

    InventarioActualDescarteSchema.set('toJSON', { virtuals: true });
    InventarioActualDescarteSchema.set('toObject', { virtuals: true });

    const InventariosActualDescarte = conn.model("inventarioActualDescarte", InventarioActualDescarteSchema);
    return InventariosActualDescarte;
}

