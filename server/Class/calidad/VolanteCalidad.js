import { db } from "../../../DB/mongoDB/config/init.js";
import { BaseRepository } from "../base/BaseRepository.js";

export class VolanteCalidadRepository extends BaseRepository {
    static get model() { return db.VolanteCalidad; }
    static modelName = 'volantecalidads';
}