const { db } = require("../../DB/mongoDB/config/init");
const { PostError, PutError, ConnectionDBError } = require("../../Error/ConnectionErrors");
const { ItemBussyError } = require("../../Error/ProcessError");

let bussyIds = new Set();


class TurnoDatarepository {
    static async add_turno() {
        try {

            const turno = new db.TurnoData({});
            const turnoSave = await turno.save();

            return turnoSave
        } catch (err) {
            throw new PostError(409, `Error agregando turno ${err.message}`);
        }
    }
    static async find_turno(options = {}) {
        try {
            const {
                ids = [],
                query = {},
                select = {}
            } = options;
            let Query = { ...query };

            if (ids.length > 0) {
                Query._id = { $in: ids };
            }
            const turnos = await db.TurnoData.find(Query)
                .select(select)
                .exec();

            return turnos
        } catch (err) {
            throw new ConnectionDBError(408, `Error obteniendo el Turno ${err.message}`);

        }
    }
    static async modificar_turno(id, query) {
        this.validateBussyIds(id)
        try {
            await db.TurnoData.findOneAndUpdate({ _id: id }, query);
        } catch (err) {
            throw new PutError(414, `Error al modificar el dato  ${err.message}`);
        } finally {
            bussyIds.delete(id);
        }
    }
    static validateBussyIds(id) {
        if (bussyIds.has(id)) throw new ItemBussyError(413, "Elemento no disponible por el momento");
        bussyIds.add(id)
    }
}

module.exports.TurnoDatarepository = TurnoDatarepository