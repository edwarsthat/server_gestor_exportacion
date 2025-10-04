import mongoose from "mongoose";
const { Schema } = mongoose;

export const defineVehiculoSalida = async (conn) => {

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
    });

    const vehiculoSalida = conn.model("salidaVehiculo", vehiculoSalidaSchema);
    return vehiculoSalida;
}
