const { UploaAWSRepository } = require("../../aws/lambda/upload")
const { RecordLotesRepository } = require("../archive/ArchiveLotes")
const { LotesRepository } = require("../Class/Lotes")
const { VariablesDelSistema } = require("../Class/VariablesDelSistema")

class ModificarRepository {
    static async modificar_ingreso_lote(req, user) {
        const { action, data, _idLote, _idRecord, __v } = req
        await LotesRepository.modificar_lote_proceso(
            _idLote,
            data,
            action,
            user
        )
        const query = {}
        Object.keys(data).forEach(item => {
            query[`documento.${item}`] = data[item]
        })
        await RecordLotesRepository.modificarRecord(
            _idRecord,
            query,
            __v
        )
        //se mira si el lote esta en el inventario
        const esta_en_inventario = await VariablesDelSistema.get_item_inventario(_idLote)
        //si esta se modifica el inventario en la nube
        if (esta_en_inventario) {
            // se mira que datos se modificaron
            const lote = await LotesRepository.getLotes({ ids: [_idLote] })
            const dataChange = {}
            Object.keys(data).forEach(item => {
                if (item !== 'canastillas') {
                    dataChange[item] = lote[0][item]
                }
            })
            await UploaAWSRepository.modificar_item_inventario_fruta_sin_procesar(lote[0], dataChange)
        }
    }
    static async modificar_calidad_interna_lote(req, user) {
        const { action, _id, __v, data } = req
        await LotesRepository.modificar_lote(
            _id,
            data,
            action,
            user,
            __v
        )
    }
    static async modificar_clasificacion_descarte_lote(req, user) {
        const { action, _id, __v, data } = req
        await LotesRepository.modificar_lote(
            _id,
            data,
            action,
            user,
            __v
        )
    }
}

module.exports.ModificarRepository = ModificarRepository