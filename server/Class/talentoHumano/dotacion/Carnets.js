import { db } from "../../../../DB/mongoDB/config/init.js";
import { BaseRepository } from "../../base/BaseRepository.js";

export class TalentoHumanoDotacionCarnetsRepository extends BaseRepository {
    static get model() { return db.Carnet; }
    static modelName = 'Carnet';
}