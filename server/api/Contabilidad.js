// const { LotesRepository } = require("../Class/Lotes");
import { ContabilidadLogicError } from "../../Error/logicLayerError.js";
import { ContenedoresRepository } from "../Class/Contenedores.js";
import { LotesRepository } from "../Class/Lotes.js";
import mongoose from 'mongoose';

export class ContabilidadRepository {
    static async get_contabilidad_informes_calidad(req) {
        try {
            const { page } = req.data;
            const resultsPerPage = 50;
            const query = {
                enf: { $regex: '^E', $options: 'i' },
                aprobacionComercial: true,
                aprobacionProduccion: true,
            }
            const lotes = await LotesRepository.getLotes2({
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
                    canastillas: 1,
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
                    numeroRemision: 1,
                    observaciones: 1,
                    flag_is_favorita: 1,
                    flag_balin_free: 1,
                    fecha_finalizado_proceso: 1,
                    fecha_aprobacion_comercial: 1,
                    salidaExportacion: 1,

                },
                limit: resultsPerPage,
                populate: [
                    { path: 'predio', select: 'PREDIO ICA DEPARTAMENTO GGN precio' },
                    { path: 'precio', select: 'exportacion frutaNacional descarte' },
                    { path: 'salidaExportacion.contenedores', select: 'numeroContenedor' },
                    { path: 'tipoFruta' },
                ]
            })
            return lotes
        } catch (err) {
            if (err.status === 524) {
                throw err
            }
            throw new ContabilidadLogicError(475, `Error ${err.type}: ${err.message}`)
        }
    }
    static async get_contabilidad_informes_calidad_numeroElementos() {
        try {
            const query = {
                enf: { $regex: '^E', $options: 'i' },
                aprobacionComercial: true,
                aprobacionProduccion: true,
            }
            const response = await LotesRepository.get_numero_lotes(query)
            return response;
        } catch (err) {
            if (err.status === 524) {
                throw err
            }
            throw new ContabilidadLogicError(475, `Error ${err.type}: ${err.message}`)
        }
    }
    static async get_contabilidad_informesMaquila_calidad(req) {
        try {
            const { page } = req.data
            const resultsPerPage = 50;

            const lotes = await LotesRepository.getLotesMaquila({
                skip: (page - 1) * resultsPerPage,
                select: {
                    enf: 1,
                    calidad: 1,
                    tipoFruta: 1,
                    deshidratacion: 1,
                    kilos: 1,
                    canastillas: 1,
                    fecha_ingreso_inventario: 1,
                    fecha_creacion: 1,
                    aprobacionComercial: 1,
                    aprobacionProduccion: 1,
                    fecha_finalizado_proceso: 1,
                    fecha_aprobacion_comercial: 1,
                    aprobacionProduccion: 1,
                    aprobacionComercial: 1,
                },
                limit: resultsPerPage,
                skip: (page - 1) * resultsPerPage,
                populate: [
                    { path: 'predio', select: 'PREDIO ICA DEPARTAMENTO GGN precio' },
                    { path: 'precio', select: 'exportacion frutaNacional descarte' },
                    { path: 'salidaExportacion.contenedores', select: 'numeroContenedor' },
                    { path: 'tipoFruta' },
                ]

            })
            return lotes
        } catch (err) {
            if (err.status === 522) {
                throw err
            }
            throw new ContabilidadLogicError(471, `Error ${err.type}: ${err.message}`)
        }
    }
    static async get_contabilidad_informesMaquila_calidad_numeroElementos(req) {
        try {
            const { filtro = {} } = req.data
            const numeroContenedores = await LotesRepository.get_numero_lotes_maquila(filtro)
            return numeroContenedores

        } catch (err) {
            if (err.status === 524) {
                throw err
            }
            throw new ContabilidadLogicError(471, `Error ${err.type}: ${err.message}`)
        }
    }
    static async get_contabilidad_informeMaquila_loteMaquila_detalle(req) {
        try {
            const { _id } = req.data

            const pipeline = [
                {
                    '$match': {
                        'lote': new mongoose.Types.ObjectId(_id)
                    }
                }, {
                    '$group': {
                        '_id': {
                            'contenedor': '$contenedor',
                            'calidad': '$calidad'
                        },
                        'totalKilos': {
                            '$sum': '$kilos'
                        },
                        'count': {
                            '$sum': 1
                        }
                    }
                }, {
                    '$project': {
                        '_id': 0,
                        'contenedor': '$_id.contenedor',
                        'calidad': '$_id.calidad',
                        'totalKilos': 1,
                        'documentosAgrupados': '$count'
                    }
                }
            ];

            const populateOptions = [
                { path: 'calidad', select: 'nombre descripcion' },
                { path: 'contenedor', select: 'numeroContenedor infoContenedor.maquila' }
            ];


            const [lote, itemsExp] = await Promise.all([
                LotesRepository.getLotesMaquila({
                    ids: [_id],
                    populate: [
                        { path: 'predio', select: 'PREDIO GGN ICA' },
                        { path: 'tipoFruta', select: 'tipoFruta' },
                        { path: 'cliente', select: 'CLIENTE' },
                        { path: "user", select: "usuario nombre apellido" },
                        { path: 'salidaExportacion.contenedores', select: 'numeroContenedor' },
                        { path: 'precio', select: 'exportacion frutaNacional descarte' },

                    ]
                }),
                ContenedoresRepository.aggregateAndPopulate(pipeline, populateOptions)
            ])

            if (!lote || lote.length === 0) {
                throw new ContabilidadLogicError(404, "Lote no encontrado.");
            }

            return { lote: lote[0], itemsPallets: itemsExp }
        } catch (err) {
            if (err.status === 524) {
                throw err
            }
            throw new ContabilidadLogicError(471, `Error ${err.type}: ${err.message}`)
        }
    }
}
