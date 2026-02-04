import { db } from "../../../DB/mongoDB/config/init.js";
import { BaseRepository } from "../base/BaseRepository.js";

export class PersonalRepository extends BaseRepository {
    static get model() { return db.Personal; }
    static modelName = 'Personal';
}
