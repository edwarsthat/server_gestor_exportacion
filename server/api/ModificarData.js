const { procesoEventEmitter } = require("../../events/eventos")
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
    static async put_inventarioLogistica_frutaSinProcesar_modificar_canastillas(req) {
        const { _id, canastillas } = req
        await VariablesDelSistema.ingresarInventario(_id, canastillas)
        procesoEventEmitter.emit("server_event", {
            section: "inventario_fruta_sin_procesar",
            action: "modificar_inventario",
            data: {}
        });

    }
}

module.exports.ModificarRepository = ModificarRepository