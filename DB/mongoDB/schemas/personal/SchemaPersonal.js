import mongoose from "mongoose";
const { Schema } = mongoose;

export const defineSchemaPersonal = async (conn) => {

    const personalSchema = new Schema({
        SKU: { type: String, required: true, unique: true },
        nombre: { type: String, required: true },
        cargo: { type: Schema.Types.ObjectId, ref: 'cargosPersonal' },
        identificacion: { type: String, required: true },
        tipoIdentificacion: { type: String, required: true },
        foto: { type: String },
        tipoSangre: { type: String },
        carnet: { type: Schema.Types.ObjectId, ref: 'carnet' },
    })

    personalSchema.index(
        { SKU: 1, cargo: 1 },
        { name: 'idx_sku_cargo' }
    );
    personalSchema.index(
        { carnet: 1 },
        { name: 'idx_carnet' }
    );

    const Personal = conn.model("personal", personalSchema);

    return Personal

}

