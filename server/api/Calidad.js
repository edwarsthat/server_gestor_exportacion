import { CalidadLogicError } from "../../Error/logicLayerError.js";
import { procesoEventEmitter } from "../../events/eventos.js";
import { ConstantesDelSistema } from "../Class/ConstantesDelSistema.js";
import { ContenedoresRepository } from "../Class/Contenedores.js";
import { FormulariosCalidadRepository } from "../Class/FormulariosCalidad.js";
import { LotesRepository } from "../Class/Lotes.js";
import { UsuariosRepository } from "../Class/Usuarios.js";
import { VariablesDelSistema } from "../Class/VariablesDelSistema.js";
import fs from 'fs';
import path from 'path';
import { filtroFechaInicioFin } from "./utils/filtros.js";
import { RecordModificacionesRepository } from "../archive/ArchivoModificaciones.js";
import { CalidadValidationsRepository } from "../validations/calidad.js";
import { z } from "zod";

import { fileURLToPath } from 'url';
import { CalidadService } from "../services/calidad.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const tipoFormulariosCalidadPath = path.join(__dirname, '../../constants/formularios_calidad.json')
export class CalidadRepository {

    //#region historial calidad
    static async get_calidad_historial_calidadInterna(req) {
        try {
            const { data: datos } = req
            const { page } = datos;
            const resultsPerPage = 50;
            const query = {
                enf: { $regex: '^E', $options: 'i' },
                "calidad.calidadInterna": { $exists: true },
            }
            const lotes = await LotesRepository.getLotes({
                query: query,
                skip: (page - 1) * resultsPerPage,
                sort: { "calidad.calidadInterna.fecha": -1 },
                select: { enf: 1, tipoFruta: 1, calidad: 1, __v: 1 },
                limit: resultsPerPage
            })
            return lotes
        } catch (err) {
            if (err.status === 522) {
                throw err
            }
            throw new CalidadLogicError(471, `Error ${err.type}: ${err.message}`)
        }
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

            if (err.status === 524) {
                throw err
            }
            throw new CalidadLogicError(471, `Error ${err.type}: ${err.message}`)

        }
    }
    static async put_calidad_historial_calidadInterna(req) {
        try {
            const { data: datos, user } = req
            const { action, _id, __v, data } = datos
            await LotesRepository.modificar_lote(
                _id,
                data,
                action,
                user._id,
                __v
            )
        } catch (err) {
            if (err.status === 524) {
                throw err
            }
            throw new CalidadLogicError(471, `Error ${err.type}: ${err.message}`)
        }
    }
    static async get_calidad_historial_clasificacionDescarte(req) {
        try {
            const { data } = req
            const { page } = data;
            const resultsPerPage = 50;
            const query = {
                enf: { $regex: '^E', $options: 'i' },
                "calidad.clasificacionCalidad": { $exists: true },
            }
            const lotes = await LotesRepository.getLotes({
                query: query,
                skip: (page - 1) * resultsPerPage,
                sort: { "calidad.clasificacionCalidad.fecha": -1 },
                select: { enf: 1, tipoFruta: 1, calidad: 1, __v: 1 },
                limit: resultsPerPage
            })
            return lotes
        } catch (err) {
            if (err.status === 522) {
                throw err
            }
            throw new CalidadLogicError(471, `Error ${err.type}: ${err.message}`)
        }
    }
    static async put_calidad_historial_clasficacionDescarte(req) {
        try {
            const { data: datos, user } = req
            const { action, _id, __v, data } = datos
            await LotesRepository.modificar_lote(
                _id,
                data,
                action,
                user,
                __v
            )
        } catch (err) {
            if (err.status === 524) {
                throw err
            }
            throw new CalidadLogicError(471, `Error ${err.type}: ${err.message}`)
        }
    }
    //#endregion
    //#region informes
    static async get_calidad_informes_lotesInformesProveedor(req) {
        try {
            const { data: datos } = req
            const { page } = datos;
            const resultsPerPage = 50;
            const query = {
                enf: { $regex: '^E', $options: 'i' }
            }
            const lotes = await LotesRepository.getLotes({
                query: query,
                skip: (page - 1) * resultsPerPage,
                select: {
                    enf: 1,
                    tipoFruta: 1,
                    calidad: 1,
                    __v: 1,
                    deshidratacion: 1,
                    kilos: 1,
                    contenedores: 1,
                    calidad1: 1,
                    calidad15: 1,
                    calidad2: 1,
                    descarteEncerado: 1,
                    descarteLavado: 1,
                    directoNacional: 1,
                    frutaNacional: 1,
                    fechaIngreso: 1,
                    fecha_ingreso_patio: 1,
                    fecha_salida_patio: 1,
                    fecha_ingreso_inventario: 1,
                    fecha_creacion: 1,
                    fecha_estimada_llegada: 1,
                    precio: 1,
                    aprobacionComercial: 1,
                    aprobacionProduccion: 1,
                    exportacionDetallada: 1,
                    observaciones: 1,
                    flag_is_favorita: 1,
                    flag_balin_free: 1,
                    fecha_aprobacion_produccion:1,
                    fecha_aprobacion_comercial:1

                },
                limit: resultsPerPage,
                populate: [
                    { path: 'predio', select: 'PREDIO ICA DEPARTAMENTO GGN precio' },
                    { path: 'precio', select: '1 2 15 frutaNacional descarte' }
                ]

            })
            return lotes
        } catch (err) {
            if (err.status === 522) {
                throw err
            }
            throw new CalidadLogicError(471, `Error ${err.type}: ${err.message}`)
        }
    }
    static async get_calidad_informes_imagenDefecto(req) {
        try {
            const { data: datos } = req
            const { data } = datos
            const response = await LotesRepository.obtener_imagen_lote_calidad(data)
            return response
        } catch (err) {
            if (err.status === 525) {
                throw err
            }
            throw new CalidadLogicError(471, `Error ${err.type}: ${err.message}`)
        }

    }
    static async get_calidad_informes_observacionesCalidad() {
        try {
            const response = await VariablesDelSistema.obtener_observaciones_calidad();
            return response
        } catch (err) {
            if (err.status === 522) {
                throw err
            }
            throw new CalidadLogicError(471, `Error ${err.type}: ${err.message}`)
        }
    }
    static async get_calidad_informes_contenedoresLote(req) {
        try {
            const { data: datos } = req
            const { data } = datos
            const response = await ContenedoresRepository.get_Contenedores_sin_lotes({
                ids: data,
                select: { infoContenedor: 1, numeroContenedor: 1 }
            });
            return response
        } catch (err) {
            if (err.status === 522) {
                throw err
            }
            throw new CalidadLogicError(471, `Error ${err.type}: ${err.message}`)
        }
    }
    static async get_calidad_informes_informeProveedor_numeroElementos() {
        try {
            const filtro = {
                enf: { $regex: '^E', $options: 'i' },
            }
            const numeroContenedores = await LotesRepository.get_numero_lotes(filtro)
            return numeroContenedores

        } catch (err) {
            if (err.status === 524) {
                throw err
            }
            throw new CalidadLogicError(471, `Error ${err.type}: ${err.message}`)
        }
    }
    static async put_calidad_informes_loteFinalizarInforme(req) {
        try {
            const { data, user: userInfo } = req
            const { _id, action, precio, contenedores } = data
            const { user } = userInfo


            const exportacion = {}
            const lote = await LotesRepository.getLotes({ ids: [_id] })
            const contenedoresData = await ContenedoresRepository.get_Contenedores_sin_lotes({
                ids: contenedores,
            })
            const numeroCont = contenedoresData.length;
            for (let nCont = 0; nCont < numeroCont; nCont++) {
                const contActual = contenedoresData[nCont].toObject();
                const numeroPallets = contActual.pallets.length;

                // return
                for (let nPallets = 0; nPallets < numeroPallets; nPallets++) {
                    const palletActual = contActual.pallets[nPallets].get('EF1')
                    const numeroItems = palletActual.length
                    if (numeroItems <= 0) continue

                    for (let nItems = 0; nItems < numeroItems; nItems++) {
                        const itemActual = palletActual[nItems]
                        if (itemActual.lote === _id) {
                            if (!Object.prototype.hasOwnProperty.call(exportacion, contActual._id)) {
                                exportacion[contActual._id] = {}
                            }
                            if (!Object.prototype.hasOwnProperty.call(exportacion[contActual._id], itemActual.calidad)) {
                                exportacion[contActual._id][itemActual.calidad] = 0
                            }
                            const mult = Number(itemActual.tipoCaja.split('-')[1].replace(",", "."))
                            const kilos = mult * itemActual.cajas

                            exportacion[contActual._id][itemActual.calidad] += kilos
                        }
                    }
                }
            }
            let query
            if (typeof precio === 'object') {
                query = {
                    precio: precio,
                    aprobacionProduccion: true,
                    fecha_finalizado_proceso: new Date()
                }
            } else {
                query = {
                    aprobacionProduccion: true,
                    fecha_finalizado_proceso: new Date()
                }
            }

            let setCont = new Set()
            Object.keys(exportacion).forEach(cont => {
                Object.keys(exportacion[cont]).forEach(calidad => {
                    let llave = calidad
                    if (calidad === "1.5") {
                        llave = "15"
                    }
                    query[`exportacionDetallada.any.${cont}.${llave}`] = exportacion[cont][calidad]
                    setCont.add(cont)
                })
            })
            const contArr = [...setCont]

            const arrayDelete = contArr.filter(cont => lote[0].contenedores.includes(cont))
            query.contenedores = arrayDelete

            // await LotesRepository.modificar_lote_proceso(_id, query, action, user)

            await LotesRepository.actualizar_lote(
                { _id },
                query,
                { new: true, user: user, action: action }
            );
        } catch (err) {
            if (err.status === 523 || err.status === 522) {
                throw err
            }
            throw new CalidadLogicError(471, `Error ${err.type}: ${err.message}`)
        }

    }
    static async put_calidad_informes_aprobacionComercial(req) {
        try {
            const { data, user } = req;
            const { _id, action } = data;

            const lote = await LotesRepository.getLotes({ ids: [_id] })

            if (!lote || lote.length === 0) {
                throw new CalidadLogicError(404, "Lote no encontrado.");
            }

            const newLote = lote[0].toObject();
            newLote.aprobacionComercial = true
            newLote.fecha_aprobacion_comercial = new Date()
            // Actualizar contenedor con pallets modificados
            await LotesRepository.actualizar_lote(
                { _id },
                {
                    $set: {
                        aprobacionComercial: true,
                        fecha_aprobacion_comercial: new Date()
                    }
                },
                { new: true, user: user, action: action }
            );

            // Registrar modificación Contenedores
            await RecordModificacionesRepository.post_record_contenedor_modification(
                action,
                user,
                {
                    modelo: "Lotes",
                    documentoId: _id,
                    descripcion: `Se dio aprobacion comercial`,
                },
                lote[0],
                newLote,
                { _id, action }
            );

            return true

        } catch (err) {
            console.log(err)
            if (err.status === 523 || err.status === 522) {
                throw err
            }
            const mensaje = err && err.message ? err.message : JSON.stringify(err);
            throw new CalidadLogicError(471, `Error al aprobar comercialmente: ${mensaje}`);

        }
    }
    static async put_calidad_informe_noPagarBalinLote(req) {
        try {
            const { data, user } = req
            const { _id, action } = data

            const lote = await LotesRepository.getLotes({ ids: [_id] })

            const query = { flag_balin_free: !lote[0].flag_balin_free };

            await LotesRepository.modificar_lote_proceso(
                _id, query, action, user
            )
        } catch (err) {
            if (err.status === 523 || err.status === 522) {
                throw err
            }
            throw new CalidadLogicError(471, `Error ${err.type}: ${err.message}`)
        }
    }
    //#endregion
    //#region ingresos calidad
    static async get_calidad_ingresos_clasificacionDescarte() {
        try {
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
        } catch (err) {
            if (err.status === 522) {
                throw err
            }
            throw new CalidadLogicError(471, `Error ${err.type}: ${err.message}`)
        }
    }
    static async put_calidad_ingresos_clasificacionDescarte(req) {
        try {
            CalidadValidationsRepository.put_calidad_ingresos_clasificacionDescarte().parse(req.data);
            const user = req.user._id;
            const { action, data, _id } = req.data;
            const query = {
                ...data,
                'calidad.clasificacionCalidad.fecha': new Date(),
                $inc: {
                    __v: 1
                }
            }
            await LotesRepository.modificar_lote_proceso(_id, query, action, user);
        } catch (err) {
            if (err.status === 523 || err.status === 522) {
                throw err
            }
            if (err instanceof z.ZodError) {
                const errores = err.errors.map(e => `${e.path[0]}: ${e.message}`).join(" | ")
                throw new CalidadLogicError(480, `Error de validación: ${errores}`)
            }
            throw new CalidadLogicError(471, `Error ${err.type}: ${err.message}`)
        }
    }
    static async get_calidad_ingresos_calidadInterna() {
        try {
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
        } catch (err) {
            if (err.status === 522) {
                throw err
            }
            throw new CalidadLogicError(471, `Error ${err.type}: ${err.message}`)
        }
    }
    static async put_calidad_ingresos_calidadInterna(req) {
        try {
            const { data: datos, user } = req
            const { _id, data, action } = datos
            await LotesRepository.modificar_lote_proceso(_id, data, action, user.user);
            procesoEventEmitter.emit("server_event", {
                action: "calidad_interna",
                data: {}
            });
        } catch (err) {
            if (err.status === 523) {
                throw err
            }
            throw new CalidadLogicError(471, `Error ${err.type}: ${err.message}`)
        }
    }
    static async get_calidad_ingresos_inspeccionFruta() {
        try {
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
        } catch (err) {
            if (err.status === 522) {
                throw err
            }
            throw new CalidadLogicError(471, `Error ${err.type}: ${err.message}`)
        }
    }
    static async put_calidad_ingresos_inspeccionFruta(req) {
        try {
            const user = req.user.user;
            const { action, data, _id } = req.data;

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
        } catch (err) {
            if (err.status === 523 || err.status === 526) {
                throw err
            }
            throw new CalidadLogicError(471, `Error ${err.type}: ${err.message}`)
        }

    }
    static async get_calidad_ingresos_operariosVolanteCalidad() {
        try {
            const usuarios = await UsuariosRepository.get_users({
                query: { estado: true, cargo: "66bfbd0e281360363ce25dfc" }
            });
            return usuarios
        } catch (err) {
            if (err.status === 522) {
                throw err
            }
            throw new CalidadLogicError(471, `Error ${err.type}: ${err.message}`)
        }
    }
    static async post_calidad_ingresos_volanteCalidad(req) {
        try {
            const user = req.user
            const { data } = req.data
            const volante_calidad = {
                ...data,
                responsable: user._id
            }
            await UsuariosRepository.add_volante_calidad(volante_calidad)
        } catch (err) {
            if (err.status === 521) {
                throw err
            }
            throw new CalidadLogicError(471, `Error ${err.type}: ${err.message}`)
        }
    }
    static async get_calidad_ingresos_higienePersonal() {
        try {
            const usuarios = await UsuariosRepository.get_users({
                query: {
                    estado: true,
                    $or: [
                        { cargo: "66bfbd0e281360363ce25dfc" },
                        { cargo: "66bf8a99281360363ce252be" },
                        { cargo: "66bf8ab6281360363ce252c7" },
                        { cargo: "66bf8ad5281360363ce252d0" },
                        { cargo: "66bf8e40281360363ce25353" },
                        { cargo: "66c513dcb7dca1eebff39a96" }
                    ]
                },
                getAll: true,
            });
            return usuarios
        } catch (err) {
            if (err.status === 522) {
                throw err
            }
            throw new CalidadLogicError(471, `Error ${err.type}: ${err.message}`)
        }
    }
    static async post_calidad_ingresos_higienePersonal(req) {
        try {
            const { user } = req
            const { data } = req.data
            const higienePersonal = {
                ...data,
                responsable: user._id
            }
            await UsuariosRepository.add_higiene_personal(higienePersonal)
        } catch (err) {
            if (err.status === 521) {
                throw err
            }
            throw new CalidadLogicError(471, `Error ${err.type}: ${err.message}`)
        }
    }
    static async get_calidad_ingresos_tiposFormularios() {
        try {
            const dataJSON = fs.readFileSync(tipoFormulariosCalidadPath);
            const data = JSON.parse(dataJSON);
            return data;

        } catch (err) {
            if (err.status === 522) {
                throw err
            }
            throw new CalidadLogicError(471, `Error ${err.type}: ${err.message}`)
        }
    }
    static async post_calidad_ingresos_crearFormulario(req) {
        try {
            const user = req.user._id
            const { data } = req.data;
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
        } catch (err) {
            if (err.status === 506) {
                throw err
            }
            throw new CalidadLogicError(471, `Error ${err.type}: ${err.message}`)
        }
    }
    static async get_calidad_ingresos_formulariosCalidad() {
        try {
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
        } catch (err) {
            if (err.status === 522) {
                throw err
            }
            throw new CalidadLogicError(471, `Error ${err.type}: ${err.message}`)
        }
    }
    static async put_calidad_ingresos_formulariosCalidad(req) {
        try {
            const user = req.user._id
            const { tipoFormulario, _id, area, data } = req.data

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
        } catch (err) {
            if (err.status === 523) {
                throw err
            }
            throw new CalidadLogicError(471, `Error ${err.type}: ${err.message}`)
        }
    }
    //#endregion
    //#region formulario
    static async get_calidad_formulario_volanteCalidad(req) {
        try {
            const { tipoFruta, fechaInicio, fechaFin } = req.data;
            let query = {}

            query = filtroFechaInicioFin(fechaInicio, fechaFin, query, "fecha")

            if (tipoFruta !== '') {
                query.tipoFruta = tipoFruta
            }

            const volanteCalidad = await UsuariosRepository.obtener_volante_calidad({
                query: query
            });
            return volanteCalidad
        } catch (err) {
            if (err.status === 522) {
                throw err
            }
            throw new CalidadLogicError(471, `Error ${err.type}: ${err.message}`)
        }
    }
    static async get_calidad_formulario_higienePersonal(req) {
        try {
            const { tipoFruta, fechaInicio, fechaFin } = req.data;
            let query = {}

            query = filtroFechaInicioFin(fechaInicio, fechaFin, query, "fecha")

            if (tipoFruta !== '') {
                query.tipoFruta = tipoFruta
            }

            const volanteCalidad = await UsuariosRepository.obtener_formularios_higiene_personal({
                query: query
            });
            return volanteCalidad
        } catch (err) {
            if (err.status === 522) {
                throw err
            }
            throw new CalidadLogicError(471, `Error ${err.type}: ${err.message}`)
        }
    }
    static async get_calidad_formulario_limpiezaDiaria(req) {
        try {
            const { page } = req.data
            const resultsPerPage = 30;
            const limpieza_diaria = await FormulariosCalidadRepository.get_formularios_calidad_limpieza_diaria({
                skip: (page - 1) * resultsPerPage,
                limit: resultsPerPage,
                sort: { createdAt: -1 }
            })
            return limpieza_diaria
        } catch (err) {
            if (err.status === 522) {
                throw err
            }
            throw new CalidadLogicError(471, `Error ${err.type}: ${err.message}`)
        }
    }
    static async get_calidad_formulario_limpiezaDiaria_numeroElementos() {
        try {
            const count = await FormulariosCalidadRepository.get_calidad_formulario_limpiezaDiaria_numeroElementos()
            return count
        } catch (err) {
            if (err.status === 524) {
                throw err
            }
            throw new CalidadLogicError(471, `Error ${err.type}: ${err.message}`)
        }
    }
    static async get_calidad_formulario_limpiezaMensual(req) {
        try {
            const { page } = req.data
            const resultsPerPage = 30;
            const limpieza_diaria = await FormulariosCalidadRepository.get_formularios_calidad_limpieza_mensual({
                skip: (page - 1) * resultsPerPage,
                limit: resultsPerPage,
                sort: { createdAt: -1 }
            })
            return limpieza_diaria
        } catch (err) {
            if (err.status === 522) {
                throw err
            }
            throw new CalidadLogicError(471, `Error ${err.type}: ${err.message}`)
        }
    }
    static async get_calidad_formulario_limpiezaMensual_numeroElementos() {
        try {
            const count = await FormulariosCalidadRepository.get_calidad_formularios_limpiezaMensual_numeroElementos()
            return count
        } catch (err) {
            if (err.status === 524) {
                throw err
            }
            throw new CalidadLogicError(471, `Error ${err.type}: ${err.message}`)
        }
    }
    static async get_calidad_formulario_controlPlagas(req) {
        try {
            const { page } = req.data
            const resultsPerPage = 30;
            const limpieza_diaria = await FormulariosCalidadRepository.get_formularios_calidad_control_plagas({
                skip: (page - 1) * resultsPerPage,
                limit: resultsPerPage,
                sort: { createdAt: -1 }
            })
            return limpieza_diaria
        } catch (err) {
            if (err.status === 522) {
                throw err
            }
            throw new CalidadLogicError(471, `Error ${err.type}: ${err.message}`)
        }
    }
    static async get_calidad_formulario_controlPlagas_numeroElementos() {
        try {
            const count = await FormulariosCalidadRepository.get_calidad_formularios_controlPlagas_numeroElementos()
            return count
        } catch (err) {
            if (err.status === 524) {
                throw err
            }
            throw new CalidadLogicError(471, `Error ${err.type}: ${err.message}`)
        }
    }
    //#region reclamaciones
    static async get_calidad_reclamaciones_contenedores(req) {
        try {
            const { data } = req
            const { page } = data;
            const resultsPerPage = 50;

            const formularios = await ContenedoresRepository.get_Contenedores_sin_lotes({
                skip: (page - 1) * resultsPerPage,
                limit: resultsPerPage,
                select: {
                    numeroContenedor: 1,
                    infoContenedor: 1,
                    reclamacionCalidad: 1
                },
                query: {
                    reclamacionCalidad: { $exists: true },
                }
            })
            return formularios

        } catch (err) {
            if (err.status === 524) {
                throw err
            }
            throw new CalidadLogicError(471, `Error ${err.type}: ${err.message}`)
        }
    }
    static async get_calidad_reclamaciones_contenedores_numeroElementos() {
        try {
            const count = await ContenedoresRepository.obtener_cantidad_contenedores({
                reclamacionCalidad: { $exists: true }
            })
            return count
        } catch (err) {
            if (err.status === 524) {
                throw err
            }
            throw new CalidadLogicError(471, `Error ${err.type}: ${err.message}`)
        }
    }
    static async get_calidad_reclamaciones_contenedores_obtenerArchivo(req) {
        try {
            const { data } = req
            const { url } = data

            CalidadValidationsRepository.get_calidad_reclamaciones_contenedores_obtenerArchivo().parse(data)
            const response = await CalidadService.obtenerArchivoReclamacionCliente(url)
            return response
        } catch (err) {
            if (err instanceof z.ZodError) {
                const errores = err.errors.map(e => `${e.path[0]}: ${e.message}`).join(" | ")
                throw new CalidadLogicError(471, `Error de validación: ${errores}`)
            }
            throw new CalidadLogicError(471, `Error ${err.type}: ${err.message}`)
        }

    }
    //#endregion

    //#endregion
    static async get_info_formulario_inspeccion_fruta() {
        const formulario = await ConstantesDelSistema.get_info_formulario_inspeccion_fruta()
        return formulario
    }
    //!numero de elementos
    static async get_calidad_formularios_higienePersonal_numeroElementos() {
        const count = await FormulariosCalidadRepository.get_calidad_formularios_higienePersonal_numeroElementos()
        return count
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



}
