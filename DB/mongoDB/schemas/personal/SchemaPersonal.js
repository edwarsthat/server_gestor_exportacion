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
        fechaVencimiento: { type: Date, required: true },
        tipoSangre: { type: String },
        linkQr: { type: String },
        estado: { type: Boolean, default: true },
        accessToken: { type: String, required: true, unique: true },
    })

    personalSchema.index(
        { SKU: 1, cargo: 1 },
        { name: 'idx_sku_cargo' }
    );
    personalSchema.index(
        { accessToken: 1, estado: 1 },
        { name: 'idx_accessToken_estado' }
    );

    const Personal = conn.model("personal", personalSchema);

    return Personal

}

