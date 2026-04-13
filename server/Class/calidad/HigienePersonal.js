import { db } from "../../../DB/mongoDB/config/init.js";
import { BaseRepository } from "../base/BaseRepository.js";

export class HigienePersonalRepository extends BaseRepository {
    static get model() { return db.HigienePersonal; }
    static modelName = 'higienepersonals';
}