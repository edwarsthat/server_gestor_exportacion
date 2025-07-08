import { db } from "../../DB/mongoDB/config/init";
import { ErrorSeriales } from "../../Error/ConnectionErrors";

export class Seriales {
    static async get_seriales(serialName) {

        try {
            const registros = await db.Seriales.find({ name: serialName })
                .exec();

            return registros

        } catch (err) {
            throw new ErrorSeriales(522, `Seriales -> ${err.message}`);

        }
    }
}