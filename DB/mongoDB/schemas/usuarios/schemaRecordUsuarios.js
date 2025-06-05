import mongoose from "mongoose";
const { Schema } = mongoose;
export const defineRecordusuario = async (conn) => {

    const HistorialUsuariosSchema = new Schema({
        operacionRealizada: String,
        user: String,
        documento: Object,
        fecha: { type: Date, default: Date.now },
        createdAt: { type: Date, expires: '2y', default: Date.now }
    }, { timestamps: true });


    const recordUsuario = conn.model("recordUsuario", HistorialUsuariosSchema);
    return recordUsuario

}

