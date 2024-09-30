const { UploaAWSRepository } = require("../../aws/lambda/upload");
const { ProcessError } = require("../../Error/ProcessError");
const { FormulariosCalidadRepository } = require("../Class/FormulariosCalidad");
const { LotesRepository } = require("../Class/Lotes");
const { VariablesDelSistema } = require("../Class/VariablesDelSistema");
const fs = require('fs')
const path = require('path');

const tipoFormulariosCalidadPath = path.join(__dirname, '../../constants/formularios_calidad.json')
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
    static async obtener_tipos_formularios_calidad() {
        /**
     * Funcion que envia el tipod e formulario que esta en el archivo formularios_calidad.json
     * 
     * @throws - envia error 410 si hay algun error abriendo el archivo
     * 
     * @return {object} - Envia un objeto donde las keys son el _id del lote y el valor es la cantidad
     *                    de canastillas en el inventario
     */
        try {

            const dataJSON = fs.readFileSync(tipoFormulariosCalidadPath);
            const data = JSON.parse(dataJSON);
            return data;

        } catch (err) {
            throw new ProcessError(410, `Error Obteniendo tipo formularios calidad  ${err.message}`)
        }
    }
    static async get_formularios_calidad_creados() {

        const limpieza_diaria = await FormulariosCalidadRepository.get_formularios_calidad_creados()
        const limpieza_mensual = await FormulariosCalidadRepository.get_formularios_calidad_limpieza_mensual_creados()
        const control_plagas = await FormulariosCalidadRepository.get_formularios_calidad_control_plagas_creados()

        return [
            ...limpieza_diaria,
            ...limpieza_mensual,
            ...control_plagas
        ];
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
    static async add_item_formulario_calidad(req, user) {
        const { tipoFormulario, _id, area, item, cumple, observaciones } = req
        const query = {
            [`${area}.${item}.status`]: cumple,
            [`${area}.${item}.observaciones`]: observaciones,
            [`${area}.${item}.responsable`]: user,
        }

        if (tipoFormulario === "Limpieza diaría") {
            await FormulariosCalidadRepository.modificar_limpieza_diaria(_id, query)
            return
        } else if (tipoFormulario === "Limpieza mensual") {
            await FormulariosCalidadRepository.modificar_limpieza_mensual(_id, query)
            return
        } else if (tipoFormulario === "Control de plagas") {
            console.log("si entra a aqui")
            await FormulariosCalidadRepository.modificar_control_plagas(_id, query)
            return
        }
    }

    //#region POST
    static async crear_formulario_calidad(req, user) {
        const { data } = req;
        const { tipoSeleccionado, fechaInicio, fechaFin } = data;
        const codigo = await VariablesDelSistema.generar_codigo_informe_calidad()

        switch (tipoSeleccionado) {
            case 'limpieza_diaria':
                await FormulariosCalidadRepository.crear_formulario_limpieza_diaria(
                    codigo, fechaInicio, fechaFin, user
                )
                break;
            case 'limpieza_mensual':
                await FormulariosCalidadRepository.crear_formulario_limpieza_mensual(
                    codigo, fechaInicio, fechaFin, user
                )
                break;
            case 'control_plagas':
                await FormulariosCalidadRepository.crear_formulario_control_plagas(
                    codigo, fechaInicio, fechaFin, user
                )
                break;
            default:
                throw new Error("Error en el switch de creacion de formulario calidad")
        }



        await VariablesDelSistema.incrementar_codigo_informes_calidad()
    }
}

module.exports.CalidadRepository = CalidadRepository
