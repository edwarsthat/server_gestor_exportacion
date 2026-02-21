import { db } from "../../DB/mongoDB/config/init.js";
import { BaseRepository } from "./base/BaseRepository.js";



export class TurnoDatarepository extends BaseRepository {
    static get model() { return db.TurnoData; }
    static modelName = 'TurnoData';

}

