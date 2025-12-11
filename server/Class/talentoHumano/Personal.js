import { db } from "../../../DB/mongoDB/config/init.js";
import { PostError } from "../../../Error/ConnectionErrors.js";

export class PersonalRepository {
    static async addPersonal(data, opts = {}) {
        const { session, user, action } = opts;
        try {
            const personal = new db.Personal(data);
            personal._user = user;
            const saved = await personal.save({ session, action });
            return saved;
        } catch (err) {
            throw new PostError(409, `Error agregando personal ${err.message}`);
        }
    }
}
