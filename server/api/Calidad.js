const { CalidadError } = require("../../Error/CalidadError");
const { ProcessError } = require("../../Error/ProcessError");
const { procesoEventEmitter } = require("../../events/eventos");
const { ConstantesDelSistema } = require("../Class/ConstantesDelSistema");
const { FormulariosCalidadRepository } = require("../Class/FormulariosCalidad");
const { LotesRepository } = require("../Class/Lotes");
const { VariablesDelSistema } = require("../Class/VariablesDelSistema");
const fs = require('fs')
const path = require('path');

const tipoFormulariosCalidadPath = path.join(__dirname, '../../constants/formularios_calidad.json')
class CalidadRepository {
    //#region  GET
    //obtiene los datos de los formularios
    static async get_info_formulario_inspeccion_fruta() {
        const formulario = await ConstantesDelSistema.get_info_formulario_inspeccion_fruta()
        return formulario
    }
    static async get_lotes_clasificacion_descarte() {
        const haceUnMes = new Date();
        haceUnMes.setMonth(haceUnMes.getMonth() - 1);
        const query = {
            'calidad.clasificacionCalidad': { $exists: false },
            enf: { $regex: '^E', $options: 'i' },
            $or: [
                { fecha_ingreso_inventario: { $gte: new Date(haceUnMes) } },
                { fechaIngreso: { $gte: new Date(haceUnMes) } }
            ]

        }
        const select = { enf: 1, calidad: 1, tipoFruta: 1, __v: 1 }
        const lotes = await LotesRepository.getLotes({ query: query, select: select })
        return lotes
    }
    static async get_lotes_calidad_interna() {
        const haceUnMes = new Date();
        haceUnMes.setMonth(haceUnMes.getMonth() - 1);
        const query = {
            'calidad.calidadInterna': { $exists: false },
            enf: { $regex: '^E', $options: 'i' },
            $or: [
                { fecha_ingreso_inventario: { $gte: new Date(haceUnMes) } },
                { fechaIngreso: { $gte: new Date(haceUnMes) } }
            ]
        }
        const select = { enf: 1, calidad: 1, tipoFruta: 1, __v: 1 }
        const lotes = await LotesRepository.getLotes({ query: query, select: select })
        return lotes
    }
    static async get_calidad_ingresos_inspeccionFruta_lotes() {
        const haceUnMes = new Date();
        haceUnMes.setMonth(haceUnMes.getMonth() - 1);
        const query = {
            'calidad.inspeccionIngreso': { $exists: false },
            enf: { $regex: '^E', $options: 'i' },
            $or: [
                { fecha_ingreso_inventario: { $gte: new Date(haceUnMes) } },
                { fechaIngreso: { $gte: new Date(haceUnMes) } }
            ]
        }
        const select = { enf: 1, calidad: 1, tipoFruta: 1, __v: 1 }
        const lotes = await LotesRepository.getLotes({ query: query, select: select })
        return lotes
    }
    static async obtener_lotes_fotos_calidad() {
        const haceUnMes = new Date();
        const hoy = new Date();
        haceUnMes.setMonth(haceUnMes.getMonth() - 1);
        const hoyAM = hoy.setHours(0, 0, 0, 0);
        const hoyPM = hoy.setHours(23, 59, 59, 999);
        const lotes = await LotesRepository.getLotes({
            query: {
                $and: [
                    {
                        $or: [
                            { 'calidad.fotosCalidad': { $exists: false } },
                            { 'calidad.fotosCalidad.fechaIngreso': { $gte: new Date(hoyAM), $lt: new Date(hoyPM) } }
                        ]
                    },
                    { enf: { $regex: '^E', $options: 'i' } },
                ],
                $or: [
                    { fecha_ingreso_inventario: { $gte: new Date(haceUnMes) } },
                    { fechaIngreso: { $gte: new Date(haceUnMes) } }
                ]
            },
            select: { enf: 1 }
        });
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
        const now = new Date()

        const limpieza_diaria = await FormulariosCalidadRepository.get_formularios_calidad_limpieza_diaria({
            query: {
                $and: [
                    { fechaInicio: { $lte: now } },
                    { fechaFin: { $gt: now } }
                ]
            }
        })
        const limpieza_mensual = await FormulariosCalidadRepository.get_formularios_calidad_limpieza_mensual({
            query: {
                $and: [
                    { fechaInicio: { $lte: now } },
                    { fechaFin: { $gt: now } }
                ]
            }
        })

        const control_plagas = await FormulariosCalidadRepository.get_formularios_calidad_control_plagas({
            query: {
                $and: [
                    { fechaInicio: { $lte: now } },
                    { fechaFin: { $gt: now } }
                ]
            }
        })

        return [
            ...limpieza_diaria,
            ...limpieza_mensual,
            ...control_plagas
        ];
    }
    static async get_view_formularios_limpieza_diaria(req) {
        const { page } = req
        const resultsPerPage = 30;
        const limpieza_diaria = await FormulariosCalidadRepository.get_formularios_calidad_limpieza_diaria({
            skip: (page - 1) * resultsPerPage,
            limit: resultsPerPage,
            sort: { createdAt: -1 }
        })
        return limpieza_diaria

    }
    static async get_view_formularios_limpieza_mensual(req) {
        const { page } = req
        const resultsPerPage = 30;
        const limpieza_diaria = await FormulariosCalidadRepository.get_formularios_calidad_limpieza_mensual({
            skip: (page - 1) * resultsPerPage,
            limit: resultsPerPage,
            sort: { createdAt: -1 }
        })
        return limpieza_diaria

    }
    static async get_view_formularios_control_plagas(req) {
        const { page } = req
        const resultsPerPage = 30;
        const limpieza_diaria = await FormulariosCalidadRepository.get_formularios_calidad_control_plagas({
            skip: (page - 1) * resultsPerPage,
            limit: resultsPerPage,
            sort: { createdAt: -1 }
        })
        return limpieza_diaria

    }
    //!numero de elementos
    static async get_calidad_formularios_controlPlagas_numeroElementos() {
        const count = await FormulariosCalidadRepository.get_calidad_formularios_controlPlagas_numeroElementos()
        return count
    }
    static async get_calidad_formularios_limpiezaMensual_numeroElementos() {
        const count = await FormulariosCalidadRepository.get_calidad_formularios_limpiezaMensual_numeroElementos()
        return count
    }
    static async get_calidad_formularios_higienePersonal_numeroElementos() {
        const count = await FormulariosCalidadRepository.get_calidad_formularios_higienePersonal_numeroElementos()
        return count
    }
    static async get_calidad_historial_calidadInterna_numeroElementos() {
        try {
            const filtro = {
                enf: { $regex: '^E', $options: 'i' },
                "calidad.calidadInterna": { $exists: true },
            }
            const numeroContenedores = await LotesRepository.get_numero_lotes(filtro)
            return numeroContenedores

        } catch (err) {
            if (err.status === 508) {
                throw err
            } else {
                throw new CalidadError(440, `Error obteniendo numero de lotes con calidad interna --- ${err.message}`)
            }
        }
    }
    static async get_calidad_informes_calidad_informe_proveedor_numero_datos() {
        try {
            const filtro = {
                enf: { $regex: '^E', $options: 'i' },
            }
            const numeroContenedores = await LotesRepository.get_numero_lotes(filtro)
            return numeroContenedores

        } catch (err) {
            if (err.status === 508) {
                throw err
            } else {
                throw new CalidadError(440, `Error obteniendo numero de lotes con calidad interna --- ${err.message}`)
            }
        }
    }
    // #region PUT
    static async put_lotes_inspeccion_ingreso(req, user) {
        const { action, data, _id } = req;
        const formulario_data = await ConstantesDelSistema.get_info_formulario_inspeccion_fruta()
        let porcentageExportacion = 0
        let porcentajeDescarte = 0
        for (const [key, value] of Object.entries(data)) {
            const item = key.split('.')[2]
            if (
                item === 'exportacion1' ||
                item === 'exportacion15' ||
                item === 'exportacion2'
            ) {
                porcentageExportacion += value
            } else {
                if (formulario_data[item].porcentage < value) {
                    const query = {
                        ...data,
                        'calidad.inspeccionIngreso.fecha': new Date(),
                        not_pass: true,
                        $inc: {
                            __v: 1
                        }
                    }
                    await LotesRepository.modificar_lote_proceso(_id, query, action, user);
                    procesoEventEmitter.emit("server_event", {
                        action: "inspeccion_fruta",
                        data: {}
                    });
                    return
                }
                porcentajeDescarte += value
            }
        }

        if (porcentageExportacion <= porcentajeDescarte) {
            const query = {
                ...data,
                'calidad.inspeccionIngreso.fecha': new Date(),
                not_pass: true,
                $inc: {
                    __v: 1
                }
            }
            await LotesRepository.modificar_lote_proceso(_id, query, action, user);
            procesoEventEmitter.emit("server_event", {
                action: "inspeccion_fruta",
                data: {}
            });
            return
        }

        const query = {
            ...data,
            'calidad.inspeccionIngreso.fecha': new Date(),
            not_pass: false,
            $inc: {
                __v: 1
            }
        }
        await LotesRepository.modificar_lote_proceso(_id, query, action, user);

        procesoEventEmitter.emit("server_event", {
            action: "inspeccion_fruta",
            data: {}
        });

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
        procesoEventEmitter.emit("server_event", {
            action: "calidad_interna",
            data: {}
        });
    }
    static async add_item_formulario_calidad(req, user) {
        // const { tipoFormulario, _id, area, item, cumple, observaciones } = req
        const { tipoFormulario, _id, area, data } = req
        // const query = {
        //     [`${area}.${item}.status`]: cumple,
        //     [`${area}.${item}.observaciones`]: observaciones,
        //     [`${area}.${item}.responsable`]: user,
        // }
        let query = {}
        Object.keys(data).forEach(item => {

            query[`${area}.${item}.status`] = data[item].status
            query[`${area}.${item}.observaciones`] = data[item].observaciones
            query[`${area}.${item}.responsable`] = user

        })

        if (tipoFormulario === "Limpieza diaría") {
            await FormulariosCalidadRepository.modificar_limpieza_diaria(_id, query)
            return
        } else if (tipoFormulario === "Limpieza mensual") {
            await FormulariosCalidadRepository.modificar_limpieza_mensual(_id, query)
            return
        } else if (tipoFormulario === "Control de plagas") {
            await FormulariosCalidadRepository.modificar_control_plagas(_id, query)
            return
        }
    }
    static async lotes_derogar_lote(req) {
        const { data, user } = req

        const { _id, action, observaciones, clasificacionCalidad } = data;

        const query = {
            observaciones,
            clasificacionCalidad,
            not_pass: false
        }
        await LotesRepository.modificar_lote_proceso(
            _id, query, action, user
        )
        procesoEventEmitter.emit("server_event", {
            action: "derogar_lote",
            data: {}
        });

    }
    static async lotes_devolver_lote(req) {
        const { data, user } = req
        const { _id, canastillas, observaciones, action } = data

        const query = {
            observaciones: observaciones + " | Devuelto debido a la mala calidad de la fruta",
            "calidad.clasificacionCalidad.fecha": new Date(),
            "calidad.calidadInterna.fecha": new Date(),
            "calidad.fotosCalidad.fecha": new Date(),
        }
        await LotesRepository.modificar_lote_proceso(
            _id, query, action, user
        )
        await VariablesDelSistema.modificarInventario(_id, Number(canastillas));
        procesoEventEmitter.emit("server_event", {
            action: "derogar_lote",
            data: {}
        });

    }


    //#region POST
    static async crear_formulario_calidad(req, user) {
        const { data } = req;
        const { tipoSeleccionado, fechaInicio, fechaFin } = data;
        const codigo = await VariablesDelSistema.generar_codigo_informe_calidad()

        switch (tipoSeleccionado) {
            case 'limpieza_diaria':
                await FormulariosCalidadRepository.crear_formulario_limpieza_diaria(
                    codigo, fechaInicio, fechaFin
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
