const { LotesRepository } = require("../Class/Lotes");
const { VariablesDelSistema } = require("../Class/VariablesDelSistema");

class CalidadRepository {
    //#region  GET
    static async get_lotes_clasificacion_descarte() {
        const haceUnMes = new Date();
        haceUnMes.setMonth(haceUnMes.getMonth() - 1);
        const query = {
            'calidad.clasificacionCalidad': { $exists: false },
            enf: { $regex: '^E', $options: 'i' },
            fechaIngreso: { $gte: new Date(haceUnMes) }
        }
        const select = { enf: 1, calidad: 1, tipoFruta: 1, __v: 1 }
        const lotes = await LotesRepository.getLotes({ query: query, select: select })
        return lotes
    }
    static async obtener_observaciones_calidad() {
        const response = await VariablesDelSistema.obtener_observaciones_calidad();
        return response
    }
    static async obtener_imagen_lote_calidad(req) {
        const { data } = req
        const response = await LotesRepository.obtener_imagen_lote_calidad(data)
        return response
    }

    // #region PUT
    static async put_lotes_clasificacion_descarte(req, user) {
        const { action, data, _id } = req;
        const query = {
            ...data,
            'calidad.clasificacionCalidad.fecha': new Date(),
            $inc: {
                __v: 1
            }
        }
        await LotesRepository.modificar_lote_proceso(_id, query, action, user);
    }
}

module.exports.CalidadRepository = CalidadRepository
