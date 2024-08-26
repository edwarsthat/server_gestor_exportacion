const { UploaAWSRepository } = require("../../aws/lambda/upload");
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
    static async get_lotes_calidad_interna() {
        const haceUnMes = new Date();
        haceUnMes.setMonth(haceUnMes.getMonth() - 1);
        const query = {
            'calidad.calidadInterna': { $exists: false },
            enf: { $regex: '^E', $options: 'i' },
            fechaIngreso: { $gte: new Date(haceUnMes) }
        }
        const select = { enf: 1, calidad: 1, tipoFruta: 1, __v: 1 }
        const lotes = await LotesRepository.getLotes({ query: query, select: select })
        return lotes
    }
    static async get_lotes_inspeccion_ingreso() {
        const haceUnMes = new Date();
        haceUnMes.setMonth(haceUnMes.getMonth() - 1);
        const query = {
            'calidad.inspeccionIngreso': { $exists: false },
            enf: { $regex: '^E', $options: 'i' },
            fechaIngreso: { $gte: new Date(haceUnMes) }
        }
        const select = { enf: 1, calidad: 1, tipoFruta: 1, __v: 1 }
        const lotes = await LotesRepository.getLotes({ query: query, select: select })
        return lotes
    }
    // #region PUT
    static async put_lotes_inspeccion_ingreso(req, user) {
        const { action, data, _id } = req;
        const query = {
            ...data,
            'calidad.inspeccionIngreso.fecha': new Date(),
            $inc: {
                __v: 1
            }
        }
        await LotesRepository.modificar_lote_proceso(_id, query, action, user);
    }
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
    static async ingresoCalidadInterna(req, user) {
        const { _id, data, action } = req
        await LotesRepository.modificar_lote_proceso(_id, data, action, user);

        const esta_en_inventario = await VariablesDelSistema.get_item_inventario(_id)

        if (esta_en_inventario) {
            await UploaAWSRepository.modificar_item_inventario_fruta_sin_procesar(
                { _id: _id },
                { clasificacionCalidad: data.clasificacionCalidad }
            )
        }
    }
}

module.exports.CalidadRepository = CalidadRepository
