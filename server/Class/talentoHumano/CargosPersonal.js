import { db } from "../../../DB/mongoDB/config/init.js";
import { BaseRepository } from "../base/BaseRepository.js";

export class CargosPersonalRepository extends BaseRepository {
    static get model() { return db.CargosPersonal; }
    static modelName = 'CargosPersonal';
}