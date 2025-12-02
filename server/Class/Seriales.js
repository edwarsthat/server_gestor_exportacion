import { db } from "../../DB/mongoDB/config/init.js";
import { ErrorSeriales } from "../../Error/ConnectionErrors.js";

export class Seriales {
    static async get_seriales(serialName, session = null) {
        try {
            const registros = await db.Seriales.find({ name: serialName })
                .session(session)
                .exec();

            return registros

        } catch (err) {
            throw new ErrorSeriales(522, `Seriales -> ${err.message}`);

        }
    }
    static async modificar_seriales(filter, update, options = {}) {
        try {
            const finalOptions = {
                new: true,
                ...options,
            };
            const registros = await db.Seriales.findOneAndUpdate(filter, update, finalOptions);
            if (!registros) throw new ErrorSeriales(504, "Serial no encontrado");
            return registros

        } catch (err) {
            throw new ErrorSeriales(522, `Seriales -> ${err.message}`);
        }
    }
}