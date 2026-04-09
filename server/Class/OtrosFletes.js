import { db } from "../../DB/mongoDB/config/init.js";

export class OtrosFletesRepository {

    static async getOtrosFletes(filtros = {}) {

        const query = { activo: true };

        if (filtros.fechaInicio || filtros.fechaFin) {
            query.fecha = {};
            if (filtros.fechaInicio) {
                query.fecha.$gte = new Date(filtros.fechaInicio);
            }
            if (filtros.fechaFin) {
                query.fecha.$lte = new Date(filtros.fechaFin);
            }
        }

        if (filtros.placa) {
            query.placa = { $regex: filtros.placa, $options: "i" };
        }

        if (filtros.tipoFlete) {
            query.tipoFlete = filtros.tipoFlete;
        }

        if (filtros.semana) {
            query.semana = Number(filtros.semana);
        }

        const data = await db.OtrosFletes.find(query)
            .populate("usuario", "nombre apellido")
            .sort({ fecha: -1 })
            .lean();

        return data;
    }

}