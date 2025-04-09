const { db } = require("../../DB/mongoDB/config/init");
const { ConnectionDBError } = require("../../Error/ConnectionErrors");

class CanastillasRepository {

    static async post_registro(data) {
        try {
            const registro = new db.RegistrosCanastillas(data);
            const saveregistro = await registro.save();
            return saveregistro
        } catch (err) {
            throw new ConnectionDBError(521, `Canastillas -> ${err.message}`);
        }
    }
}

module.exports.CanastillasRepository = CanastillasRepository 