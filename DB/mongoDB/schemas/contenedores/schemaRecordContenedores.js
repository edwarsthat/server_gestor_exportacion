import mongoose from "mongoose";
const { Schema } = mongoose;

export const defineRecordContenedores = async (conn) => {

  const HistorialContenedoresSchema = new Schema({
    operacionRealizada: String,
    user: String,
    documento: Object,
    fecha: { type: Date, default: Date.now },
    createdAt: { type: Date, expires: '2y', default: Date.now }
  }, { timestamps: true });


  const recordContenedores = conn.model("recordContenedor", HistorialContenedoresSchema);
  return recordContenedores

};

