import { db } from "../../DB/mongoDB/config/init.js";
import { PostError, PutError, ConnectionDBError } from "../../Error/ConnectionErrors.js";
import { ItemBussyError } from "../../Error/ProcessError.js";
import { BaseRepository } from "./base/BaseRepository.js";


let bussyIds = new Set();

export class TurnoDatarepository extends BaseRepository {
    static get model() { return db.TurnoData; }
    static modelName = 'TurnoData';

}

