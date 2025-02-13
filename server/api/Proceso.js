const { iniciarRedisDB } = require("../../DB/redis/init");
const { ProcessError } = require("../../Error/ProcessError");
const { procesoEventEmitter } = require("../../events/eventos");
const { RecordLotesRepository } = require("../archive/ArchiveLotes");
const { ContenedoresRepository } = require("../Class/Contenedores");
const { DespachoDescartesRepository } = require("../Class/DespachoDescarte");
const { LotesRepository } = require("../Class/Lotes");
const { ProveedoresRepository } = require("../Class/Proveedores");
const { VariablesDelSistema } = require("../Class/VariablesDelSistema");
const { startOfDay, parse, endOfDay } = require('date-fns');
const calidadFile = require('../../constants/calidad.json');
const { insumos_contenedor } = require("../functions/insumos");
const { InsumosRepository } = require("../Class/Insumos");

const path = require('path');
const fs = require("fs");

const { have_lote_GGN_export, is_finish_lote } = require("../controllers/validations");
const { FrutaDescompuestaRepository } = require("../Class/FrutaDescompuesta");
// const { getRustConnectionProceso } = require("../../DB/controllers/proceso");


class ProcesoRepository {

    // #region GET
    static async get_inventarios_ingresos_ef1() {
        //rust
        // console.time("Duración de miFuncion");

        // const rustConnectionProceso = getRustConnectionProceso()
        // const enf_request = {
        //     action: "generar_ef1",
        //     collection: "variables_del_sistema",
        //     data: {}
        // }
        // const enf_json = await rustConnectionProceso.sendMessage(enf_request)
        // const response = JSON.parse(enf_json)
        // const enf = response.VariablesDelSistema.enf
        // console.log(enf)
        // console.timeEnd("Duración de miFuncion");
        // return enf

        //JS
        console.time("Duración de miFuncion");
        const enf = await VariablesDelSistema.generarEF1();
        console.timeEnd("Duración de miFuncion");
        return enf
    }
    static async get_inventarios_ingresos_ef8() {
        const enf = await VariablesDelSistema.generarEF8();
        return enf
    }
    static async get_predio_Proceso_Descarte() {
        const data = await VariablesDelSistema.obtenerEF1Descartes();
        return data
    }
    static async obtener_inventario_descartes() {
        const inventario = await VariablesDelSistema.obtener_inventario_descartes();
        const ids = inventario.map(item => item._id);
        // Obtener todos los lotes primero
        const lotes = await LotesRepository.getLotes({
            ids: ids,
            select: { enf: 1, tipoFruta: 1 },
            limit: ids.length
        });

        let resultado = [];
        // Crear un mapa de lotes para una búsqueda más rápida
        const lotesMap = lotes.reduce((map, lote) => {
            map[lote._id.toString()] = lote;
            return map;
        }, {});

        // Luego, mapear el inventario utilizando los lotes completos
        for (let i = 0; i < inventario.length; i++) {
            const lote = lotesMap[inventario[i]._id];

            let descarte;
            if (inventario[i].descarteEncerado !== undefined) {
                descarte = { descarteGeneral: 0, pareja: 0, balin: 0, extra: 0, suelo: 0 };
            }

            if (inventario[i].descarteLavado !== undefined) {
                descarte = { descarteGeneral: 0, pareja: 0, balin: 0 };
            }
            resultado.push({
                ...lote?.toJSON(),
                fecha: inventario[i].fecha,
                descarteEncerado: inventario[i].descarteEncerado ? inventario[i].descarteEncerado : descarte,
                descarteLavado: inventario[i].descarteLavado ? inventario[i].descarteLavado : descarte,
            })
        }


        return resultado;
    }
    static async get_ingresos_lotes(data) {
        const { page } = data;
        const query = {
            operacionRealizada: "crearLote"
        }
        const resultsPerPage = 50;
        const lotes = await RecordLotesRepository.getRecordLotes({
            query: query,
            skip: (page - 1) * resultsPerPage,
            limit: resultsPerPage,

        });
        const proveedoresids = lotes.map(lote => lote.documento.predio);
        const proveedoresSet = new Set(proveedoresids)
        const proveedoresArr = [...proveedoresSet]

        const proveedores = await ProveedoresRepository.get_proveedores({
            ids: proveedoresArr
        })

        const result = lotes.map(lote => {
            const proveedor = proveedores.find(proveedor =>
                proveedor._id.toString() === lote.documento.predio.toString()
            );

            if (proveedor) {
                delete lote.documento.predio0
                lote.documento.predio = {}
                lote.documento.predio.PREDIO = proveedor.PREDIO;
                lote.documento.predio._id = proveedor._id;
                return lote
            } else {
                return lote
            }
        })
        return result;
    }
    static async getInventario() {

        //Rust

        // console.time("Duración de miFuncion getInventario");

        // const rustConnectionProceso = getRustConnectionProceso()

        // const inventoryRequest = {
        //     action: "get_inventario",
        //     collection: "variables_del_sistema",
        //     data: {}
        // }
        // const inventarioJSON = await rustConnectionProceso.sendMessage(inventoryRequest)


        // const inventario = JSON.parse(inventarioJSON)
        // console.log(inventario)
        // const inventarioKeys = Object.keys(inventario.VariablesDelSistema)


        // const lotes = await LotesRepository.getLotes({
        //     ids: inventarioKeys,
        //     select: {
        //         __v: 1,
        //         clasificacionCalidad: 1,
        //         nombrePredio: 1,
        //         fecha_ingreso_patio: 1,
        //         fecha_salida_patio: 1,
        //         fecha_ingreso_inventario: 1,
        //         fecha_creacion: 1,
        //         fecha_estimada_llegada: 1,
        //         observaciones: 1,
        //         tipoFruta: 1,
        //         promedio: 1,
        //         enf: 1,
        //         kilosVaciados: 1,
        //         not_pass: 1
        //     }
        // });

        // // se agrega las canastillas en inventario
        // const resultado = inventarioKeys.map(id => {
        //     const lote = lotes.find(lote => lote._id.toString() === id.toString());

        //     if (lote) {
        //         return {
        //             ...lote.toObject(),
        //             inventario: inventario.VariablesDelSistema[id]
        //         }
        //     }
        //     return null
        // }).filter(item => item !== null);

        // const query_lotes_camino = {
        //     fecha_ingreso_inventario: { $exists: false },
        //     fechaIngreso: { $exists: false },
        // }

        // const lotes_camino = await LotesRepository.getLotes({
        //     query: query_lotes_camino,
        //     select: {
        //         fecha_ingreso_patio: 1,
        //         fecha_salida_patio: 1,
        //         fecha_ingreso_inventario: 1,
        //         fecha_creacion: 1,
        //         fecha_estimada_llegada: 1,
        //         __v: 1,
        //         clasificacionCalidad: 1,
        //         nombrePredio: 1,
        //         observaciones: 1,
        //         tipoFruta: 1,
        //         kilosVaciados: 1,
        //         kilos_estimados: 1,
        //         canastillas_estimadas: 1
        //     }
        // })

        // console.timeEnd("Duración de miFuncion getInventario");


        // return [...resultado, ...lotes_camino]


        //JS SERVER

        const inventario = await VariablesDelSistema.getInventario();
        const inventarioKeys = Object.keys(inventario)


        const lotes = await LotesRepository.getLotes({
            ids: inventarioKeys,
            select: {
                __v: 1,
                clasificacionCalidad: 1,
                nombrePredio: 1,
                fecha_ingreso_patio: 1,
                fecha_salida_patio: 1,
                fecha_ingreso_inventario: 1,
                fecha_creacion: 1,
                fecha_estimada_llegada: 1,
                observaciones: 1,
                tipoFruta: 1,
                promedio: 1,
                enf: 1,
                kilosVaciados: 1,
                not_pass: 1
            }
        });

        // se agrega las canastillas en inventario
        const resultado = inventarioKeys.map(id => {
            const lote = lotes.find(lote => lote._id.toString() === id.toString());

            if (lote) {
                return {
                    ...lote.toObject(),
                    inventario: inventario[id]
                }
            }
            return null
        }).filter(item => item !== null);

        const query_lotes_camino = {
            fecha_ingreso_inventario: { $exists: false },
            fechaIngreso: { $exists: false },
        }

        const lotes_camino = await LotesRepository.getLotes({
            query: query_lotes_camino,
            select: {
                fecha_ingreso_patio: 1,
                fecha_salida_patio: 1,
                fecha_ingreso_inventario: 1,
                fecha_creacion: 1,
                fecha_estimada_llegada: 1,
                __v: 1,
                clasificacionCalidad: 1,
                nombrePredio: 1,
                observaciones: 1,
                tipoFruta: 1,
                kilosVaciados: 1,
                kilos_estimados: 1,
                canastillas_estimadas: 1
            }
        })

        return [...resultado, ...lotes_camino]
    }
    static async getInventario_orden_vaceo() {
        //JS
        //se obtiene los datos del inventario
        const inventario = await VariablesDelSistema.getInventario();
        const inventarioKeys = Object.keys(inventario)

        // se obtiene el inventario de desverdizado
        const InvDes = await VariablesDelSistema.getInventarioDesverdizado();
        const InvDesKeys = Object.keys(InvDes);

        const arrLotesKeys = inventarioKeys.concat(InvDesKeys);
        const setLotesKeys = new Set(arrLotesKeys);
        const lotesKeys = [...setLotesKeys];

        const lotes = await LotesRepository.getLotes({
            ids: lotesKeys,
            query: {
                $or: [
                    { not_pass: false },
                    { not_pass: { $exists: false } }
                ]
            },
            select: {
                __v: 1,
                clasificacionCalidad: 1,
                nombrePredio: 1,
                fechaIngreso: 1,
                observaciones: 1,
                tipoFruta: 1,
                promedio: 1,
                enf: 1,
                kilosVaciados: 1,
                directoNacional: 1,
                desverdizado: 1,
                fecha_ingreso_inventario: 1,
                "calidad.inspeccionIngreso": 1,
            }
        });

        const resultado = lotesKeys.map(id => {
            const lote = lotes.find(lote => lote._id.toString() === id.toString());

            if (lote && lote.desverdizado && lote.desverdizado.fechaFinalizar) {
                return {
                    ...lote.toObject(),
                    inventario: InvDes[id]
                }
            } else if (lote && lote.desverdizado && !lote.desverdizado.fechaFinalizar) {
                return null
            } else if (lote) {
                return {
                    ...lote.toObject(),
                    inventario: inventario[id]
                }
            }
            return null
        }).filter(item => item !== null);
        return resultado


        //RUST
        //se obtiene los datos del inventario
        // const rustConnectionProceso = getRustConnectionProceso()
        // const inventoryRequest = {
        //     action: "get_inventario",
        //     collection: "variables_del_sistema",
        //     data: {}
        // }
        // const inventarioJSON = await rustConnectionProceso.sendMessage(inventoryRequest)
        // const inventario = JSON.parse(inventarioJSON)
        // console.log(inventario)
        // const inventarioKeys = Object.keys(inventario.VariablesDelSistema)

        // // se obtiene el inventario de desverdizado
        // const InvDes = await VariablesDelSistema.getInventarioDesverdizado();
        // const InvDesKeys = Object.keys(InvDes);

        // const arrLotesKeys = inventarioKeys.concat(InvDesKeys);
        // const setLotesKeys = new Set(arrLotesKeys);
        // const lotesKeys = [...setLotesKeys];

        // const lotes = await LotesRepository.getLotes({
        //     ids: lotesKeys,
        //     query: {
        //         $or: [
        //             { not_pass: false },
        //             { not_pass: { $exists: false } }
        //         ]
        //     },
        //     select: {
        //         __v: 1,
        //         clasificacionCalidad: 1,
        //         nombrePredio: 1,
        //         fechaIngreso: 1,
        //         observaciones: 1,
        //         tipoFruta: 1,
        //         promedio: 1,
        //         enf: 1,
        //         kilosVaciados: 1,
        //         directoNacional: 1,
        //         desverdizado: 1,
        //         fecha_ingreso_inventario: 1,
        //         "calidad.inspeccionIngreso": 1,
        //     }
        // });

        // const resultado = lotesKeys.map(id => {
        //     const lote = lotes.find(lote => lote._id.toString() === id.toString());

        //     if (lote && lote.desverdizado && lote.desverdizado.fechaFinalizar) {
        //         return {
        //             ...lote.toObject(),
        //             inventario: InvDes[id]
        //         }
        //     } else if (lote && lote.desverdizado && !lote.desverdizado.fechaFinalizar) {
        //         return null
        //     } else if (lote) {
        //         return {
        //             ...lote.toObject(),
        //             inventario: inventario.VariablesDelSistema[id]
        //         }
        //     }
        //     return null
        // }).filter(item => item !== null);
        // return resultado

    }
    static async getInventarioDesverdizado() {
        const InvDes = await VariablesDelSistema.getInventarioDesverdizado();
        const InvDesKeys = Object.keys(InvDes);
        const lotes = await LotesRepository.getLotes({
            ids: InvDesKeys,
            select: { promedio: 1, enf: 1, desverdizado: 1, kilosVaciados: 1, __v: 1 },
            sort: { "desverdizado.fechaIngreso": -1 }
        });
        //se agrega las canastillas en inventario
        const resultado = InvDesKeys.map(id => {
            const lote = lotes.find(lote => lote._id.toString() === id.toString());
            if (lote) {
                return {
                    ...lote.toObject(),
                    inventarioDesverdizado: InvDes[id]
                }
            }
            return null
        }).filter(item => item !== null);
        return resultado
    }
    static async obtenerHistorialLotes(data) {
        const { fechaInicio, fechaFin } = data
        const query = {
            operacionRealizada: 'vaciarLote'
        }
        if (fechaInicio || fechaFin) {
            query.fecha = {}
            if (fechaInicio) {
                const fechaInicioUTC = new Date(fechaInicio);
                fechaInicioUTC.setHours(fechaInicioUTC.getHours() + 5);
                query.fecha.$gte = fechaInicioUTC;
            } else {
                query.fecha.$gte = new Date(0);
            }
            if (fechaFin) {
                const fechaFinUTC = new Date(fechaFin)
                fechaFinUTC.setDate(fechaFinUTC.getDate() + 1);
                fechaFinUTC.setHours(fechaFinUTC.getHours() + 5);
                query.fecha.$lt = fechaFinUTC;
            } else {
                query.fecha.$lt = new Date();
            }
        }
        const recordLotes = await RecordLotesRepository.getVaciadoRecord({ query: query })
        const lotesIds = recordLotes.map(lote => lote.documento._id);

        const lotes = await LotesRepository.getLotes({
            ids: lotesIds,
            limit: recordLotes.length,
            select: { enf: 1, promedio: 1, tipoFruta: 1, __v: 1 }
        });
        const resultado = recordLotes.map(item => {
            const lote = lotes.find(lote => lote._id.toString() === item.documento._id);
            if (lote) {
                if (Object.prototype.hasOwnProperty.call(item.documento, "$inc")) {
                    item.documento = { ...lote, kilosVaciados: item.documento.$inc.kilosVaciados }
                    return (item)
                }
                else {
                    return item
                }
            }
            return null
        }).filter(item => item !== null);
        return resultado
    }
    static async obtenerHistorialLotesDirectoNacional(data) {
        const { fechaInicio, fechaFin } = data
        const query = {
            operacionRealizada: 'directoNacional'
        }
        if (fechaInicio || fechaFin) {
            query.fecha = {}
            if (fechaInicio) {
                const fechaInicioUTC = new Date(fechaInicio);
                fechaInicioUTC.setHours(fechaInicioUTC.getHours() + 5);
                query.fecha.$gte = fechaInicioUTC;
            } else {
                query.fecha.$gte = new Date(0);
            }
            if (fechaFin) {
                const fechaFinUTC = new Date(fechaFin)
                fechaFinUTC.setDate(fechaFinUTC.getDate() + 1);
                fechaFinUTC.setHours(fechaFinUTC.getHours() + 5);
                query.fecha.$lt = fechaFinUTC;
            } else {
                query.fecha.$lt = new Date();
            }
        }
        const recordLotes = await RecordLotesRepository.getRecordLotes({ query: query })
        const lotesIds = recordLotes.map(lote => lote.documento._id);

        const lotes = await LotesRepository.getLotes({
            ids: lotesIds,
            select: { enf: 1, promedio: 1, tipoFruta: 1, __v: 1 }
        });
        // se agrega la informacion de los lotes a los items de los records
        const resultado = recordLotes.map(item => {
            const lote = lotes.find(lote => lote._id.toString() === item.documento._id);
            if (lote) {
                if (Object.prototype.hasOwnProperty.call(item.documento, "$inc")) {
                    item.documento = { ...lote, directoNacional: item.documento.$inc.directoNacional }
                    return (item)
                }
                else {
                    return item
                }

            }
            return null
        }).filter(item => item !== null);
        return resultado
    }
    static async get_calidad_interna_lote(data) {
        const { page } = data;
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
    }
    static async get_historial_clasificacion_descarte(data) {
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
    }
    static async get_lotes_informe_calidad(data) {
        const { page } = data;
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
                frutaNacional: 1,
                fechaIngreso: 1,
                fecha_ingreso_patio: 1,
                fecha_salida_patio: 1,
                fecha_ingreso_inventario: 1,
                fecha_creacion: 1,
                fecha_estimada_llegada: 1,
                precio: 1,
                aprobacionComercial: 1,
                exportacionDetallada: 1,
                observaciones: 1,
                flag_is_favorita: 1,
                flag_balin_free: 1,

            },
            limit: resultsPerPage,
            populate: { path: 'predio', select: 'PREDIO ICA DEPARTAMENTO GGN precio' }

        })
        return lotes
    }
    static async obtener_contenedores_lotes(req) {
        const { data } = req
        const response = await ContenedoresRepository.get_Contenedores_sin_lotes({
            ids: data,
            select: { infoContenedor: 1, numeroContenedor: 1 }
        });
        return response
    }
    static async obtener_historial_decarte_lavado_proceso(user) {
        const recordLotes = await RecordLotesRepository.getRecordLotes({
            query: {
                operacionRealizada: 'ingresar_descarte_lavado',
            },
            user: user
        })
        const lotesIds = recordLotes.map(lote => lote.documento._id);
        const lotes = await LotesRepository.getLotes({
            ids: lotesIds,
            select: { enf: 1, promedio: 1, tipoFruta: 1 }
        });
        const resultado = recordLotes.map(item => {
            const lote = lotes.find(lote => lote._id.toString() === item.documento._id);
            if (lote) {
                if (Object.prototype.hasOwnProperty.call(item.documento, "$inc")) {
                    item.documento = { ...lote, descartes: item.documento.$inc }
                    return (item)
                }
                else {
                    return item
                }

            }
            return null
        }).filter(item => item !== null);

        return resultado
    }
    static async obtener_historial_decarte_encerado_proceso(user) {
        const recordLotes = await RecordLotesRepository.getRecordLotes({
            user: user,
            query: {
                operacionRealizada: 'ingresar_descarte_encerado'
            }
        })
        const lotesIds = recordLotes.map(lote => lote.documento._id);
        const lotes = await LotesRepository.getLotes({
            ids: lotesIds,
            select: { enf: 1, promedio: 1, tipoFruta: 1 }
        });
        const resultado = recordLotes.map(item => {
            const lote = lotes.find(lote => lote._id.toString() === item.documento._id);
            if (lote) {
                if (Object.prototype.hasOwnProperty.call(item.documento, "$inc")) {
                    item.documento = { ...lote, descartes: item.documento.$inc }
                    return (item)
                }
                else {
                    return item
                }

            }
            return null
        }).filter(item => item !== null);
        return resultado
    }
    static async obtener_historial_fotos_calidad_proceso(user) {
        const recordLotes = await RecordLotesRepository.getRecordLotes({
            user: user,
            query: {
                operacionRealizada: 'Agregar foto calidad'
            }

        });
        const lotesIds = recordLotes.map(lote => lote.documento._id);
        const lotes = await LotesRepository.getLotes({
            ids: lotesIds,
            select: { enf: 1, tipoFruta: 1 }
        });
        const resultado = recordLotes.map(item => {
            const lote = lotes.find(lote => lote._id.toString() === item.documento._id);
            if (lote) {
                return { ...item._doc, lote: lote }
            }
            return null
        }).filter(item => item !== null);
        return resultado
    }
    static async obtener_foto_calidad(url) {
        const data = fs.readFileSync(url)
        const base64Image = data.toString('base64');
        return base64Image
    }
    static async get_data_proceso() {
        const predio = await VariablesDelSistema.obtenerEF1proceso();
        const kilosProcesadosHoy = await VariablesDelSistema.get_kilos_procesados_hoy();
        const kilosExportacionHoy = await VariablesDelSistema.get_kilos_exportacion_hoy();
        return {
            predio: predio,
            kilosProcesadosHoy: kilosProcesadosHoy,
            kilosExportacionHoy: kilosExportacionHoy
        }
    }
    static async get_historial_descarte(data) {
        const { page } = data;
        const resultsPerPage = 50;

        const historial = await DespachoDescartesRepository.get_historial_descarte({
            skip: (page - 1) * resultsPerPage,
            limit: resultsPerPage,
        });
        return historial;
    }
    static async obtener_contenedores_programacion(data) {
        const { fecha } = data;
        const fechaActual = new Date(fecha);
        const year = fechaActual.getFullYear();
        const month = fechaActual.getMonth();

        // Aseguramos UTC desde el primer al último día de noviembre.
        const startDate = new Date(Date.UTC(year, month, 1)); // 2024-11-01T00:00:00.000Z
        const endDate = new Date(Date.UTC(year, month + 1, 1)); // 2024-12-01T00:00:00.000Z

        console.log("Start Date (UTC):", startDate.toISOString());
        console.log("End Date (UTC):", endDate.toISOString());


        const query = {
            "infoContenedor.fechaInicio": {
                $gte: startDate,
                $lt: endDate
            }
        };

        const response = await ContenedoresRepository.get_Contenedores_sin_lotes({
            select: { infoContenedor: 1, numeroContenedor: 1, __v: 1 },
            query: query
        });
        return response;
    }
    static async obtener_contenedores_listaDeEmpaque() {
        const contenedores = await ContenedoresRepository.getContenedores({
            select: { numeroContenedor: 1, infoContenedor: 1, pallets: 1 },
            query: { 'infoContenedor.cerrado': false }
        });
        return contenedores
    }
    static async obtener_contenedores_to_add_insumos() {
        const contenedores = await ContenedoresRepository.get_Contenedores_sin_lotes({
            select: { numeroContenedor: 1, infoContenedor: 1, insumosData: 1, __v: 1 },
            query: {
                'infoContenedor.cerrado': true,
                insumosData: { $exists: true },
                $or: [
                    { 'insumosData.flagInsumos': false }, // Contenedores con flagInsumos en false
                    { 'insumosData.flagInsumos': { $exists: false } } // O contenedores donde no exista flagInsumos
                ]
            }
        });
        return contenedores
    }
    static async obtener_contenedores_historial_listas_empaque(req) {
        const { page } = req
        const resultsPerPage = 25;
        const contenedores = await ContenedoresRepository.getContenedores({
            skip: (page - 1) * resultsPerPage,
            limit: resultsPerPage,
            select: {
                infoContenedor: 1,
                __v: 1,
                pallets: 1,
                numeroContenedor: 1
            },
            query: {
                "infoContenedor.fechaFinalizado": { $ne: null }
            }
        })
        return contenedores
    }
    static async get_record_lote_recepcion_pendiente(req) {
        const { page } = req
        const resultsPerPage = 50;
        const query = {
            operacionRealizada: 'lote_recepcion_pendiente'
        }
        const registros = await RecordLotesRepository.getRecordLotes({
            skip: (page - 1) * resultsPerPage,
            limit: resultsPerPage,
            query: query
        })

        const lotesArrIds = registros.map(lote => lote.documento._id)
        const lotesSetIds = new Set(lotesArrIds)
        const ids = [...lotesSetIds]

        const lotes = await LotesRepository.getLotes({
            ids: ids,
            select: { tipoFruta: 1, placa: 1, observaciones: 1 }
        })
        const result = registros.map(registro => {
            const lote = lotes.find(item => item._id.toString() === registro.documento._id)
            console.log(lote)

            return {
                ...registro._doc,
                documento: {
                    ...registro.documento,
                    predio: {
                        ...lote.predio._doc
                    },
                    tipoFruta: lote.tipoFruta,
                    placa: lote.placa,
                    observaciones: lote.observaciones
                }
            }
        })
        return result
    }
    static async get_record_lote_ingreso_inventario(req) {
        const { page } = req
        const resultsPerPage = 50;
        const query = {
            operacionRealizada: 'send_lote_to_inventario'
        }
        const registros = await RecordLotesRepository.getRecordLotes({
            skip: (page - 1) * resultsPerPage,
            limit: resultsPerPage,
            query: query
        })

        const lotesArrIds = registros.map(lote => lote.documento._id)
        const lotesSetIds = new Set(lotesArrIds)
        const ids = [...lotesSetIds]

        const lotes = await LotesRepository.getLotes({
            ids: ids,
            select: {
                tipoFruta: 1,
            }
        })
        const result = registros.map(registro => {
            const lote = lotes.find(item => item._id.toString() === registro.documento._id)

            return {
                ...registro._doc,
                documento: {
                    ...registro.documento,
                    predio: {
                        ...lote.predio._doc
                    },
                    tipoFruta: lote.tipoFruta,
                }
            }
        })
        return result
    }
    static async obtener_contenedores_historial_buscar(req) {
        const { contenedores, fechaInicio, fechaFin, clientes, tipoFruta } = req
        const query = {}

        //por numero de contenedores
        if (contenedores.length > 0) {
            query.numeroContenedor = { $in: contenedores }
        }
        //por clientes
        if (clientes.length > 0) {
            query["infoContenedor.clienteInfo"] = { $in: clientes }
        }
        //por tipo de fruta
        if (tipoFruta !== '') {
            query["infoContenedor.tipoFruta"] = tipoFruta
        }
        //por fecha
        if (fechaInicio || fechaFin) {
            query['infoContenedor.fechaCreacion'] = {}
            if (fechaInicio) {
                const localDate = parse(fechaInicio, 'yyyy-MM-dd', new Date())
                const inicio = startOfDay(localDate);

                query['infoContenedor.fechaCreacion'].$gte = inicio
            } else {
                query['infoContenedor.fechaCreacion'].$gte = new Date(0)
            }
            if (fechaFin) {
                const localDate = parse(fechaFin, 'yyyy-MM-dd', new Date());
                const fin = endOfDay(localDate);

                query['infoContenedor.fechaCreacion'].$lt = fin
            } else {
                query['infoContenedor.fechaCreacion'].$lt = new Date()
            }
        }
        console.log(query)
        const cont = await ContenedoresRepository.getContenedores({
            query: query
        });
        return cont
    }
    static async obtener_fecha_inicio_proceso() {
        const fecha = VariablesDelSistema.obtener_fecha_inicio_proceso()
        return fecha
    }
    static async obtener_status_proceso() {
        const status = await VariablesDelSistema.obtener_status_proceso()
        return status
    }
    static async get_status_pausa_proceso() {
        const status = VariablesDelSistema.get_status_pausa_proceso()
        return status
    }
    static async obtener_predio_procesando() {
        const predio = await VariablesDelSistema.obtener_predio_procesando()
        return predio
    }
    static async get_inventarios_registros_fruta_descompuesta(req) {
        try {
            const { page } = req
            const resultsPerPage = 50;

            const registros = await FrutaDescompuestaRepository.get_fruta_descompuesta({
                skip: (page - 1) * resultsPerPage,

            })

            return registros

        } catch (err) {
            if (err.status === 522) {
                throw err
            }
            throw new ProcessError(470, `Error ${err.type}: ${err.message}`)
        }
    }
    //! obtener el numero de elementos para paginacion
    static async obtener_cantidad_contenedores() {
        const cantidad = await ContenedoresRepository.obtener_cantidad_contenedores()
        return cantidad
    }
    static async obtener_cantidad_historial_espera_descargue() {
        const filtro = {
            operacionRealizada: "lote_recepcion_pendiente"
        }
        const cantidad = await RecordLotesRepository.obtener_cantidad_recordLote(filtro)
        return cantidad
    }
    static async obtener_cantidad_historial_ingreso_inventario() {
        const filtro = {
            operacionRealizada: "send_lote_to_inventario"
        }
        const cantidad = await RecordLotesRepository.obtener_cantidad_recordLote(filtro)
        return cantidad
    }
    static async get_inventario_historiales_ingresoFruta_numeroElementos() {
        const filtro = {
            operacionRealizada: "crearLote"
        }
        const cantidad = await RecordLotesRepository.obtener_cantidad_recordLote(filtro)
        return cantidad
    }
    static async get_inventarios_numero_registros_fruta_descompuesta() {
        try {

            const registros = await FrutaDescompuestaRepository.get_numero_fruta_descompuesta()
            return registros

        } catch (err) {
            if (err.status === 522) {
                throw err
            }
            throw new ProcessError(470, `Error ${err.type}: ${err.message}`)
        }
    }


    // #region PUT
    static async lote_recepcion_pendiente(req, user) {
        const { _id } = req
        const query = {
            fecha_ingreso_patio: new Date(),
        }
        await LotesRepository.modificar_lote_proceso(_id, query, 'lote_recepcion_pendiente', user)
        procesoEventEmitter.emit("inventario_fruta_sin_procesar", {});
    }
    static async send_lote_to_inventario(req, user) {
        const { _id, data } = req
        const enf = await this.get_ef1()

        const query = {
            ...data,
            enf: enf,
            fecha_salida_patio: new Date(),
            fecha_ingreso_inventario: new Date(),
        }
        const lote = await LotesRepository.modificar_lote_proceso(_id, query, 'send_lote_to_inventario', user)

        await VariablesDelSistema.ingresarInventario(lote._id.toString(), Number(data.canastillas));
        await VariablesDelSistema.incrementarEF1();


        //rust
        // console.time("Duración de miFuncion");

        // const rustConnectionProceso = getRustConnectionProceso()
        // const request = {
        //     action: "ingresar_inventario",
        //     collection: "variables_del_sistema",
        //     data: {
        //         _id: lote._id.toString(),
        //         canastillas: Number(data.canastillas)
        //     }
        // }
        // const enf_json = await rustConnectionProceso.sendMessage(request)
        // const response = JSON.parse(enf_json)
        // console.log(response)
        // console.timeEnd("Duración de miFuncion");

        procesoEventEmitter.emit("inventario_fruta_sin_procesar", {});
    }
    static async ingresar_descarte_lavado(req, user) {
        const { _id, data, action } = req;
        const keys = Object.keys(data);
        const query = { $inc: {} };
        let kilos = 0;
        for (let i = 0; i < keys.length; i++) {
            query.$inc[`descarteLavado.${keys[i]}`] = Math.round(data[keys[i]]);
            kilos += Math.round(data[keys[i]]);
        }
        query.$inc.__v = 1;

        const lote = await LotesRepository.modificar_lote_proceso(_id, query, action, user);
        await LotesRepository.deshidratacion(lote);
        const is_finish = await is_finish_lote(lote);
        if (is_finish) {
            const query_fecha = {
                fecha_finalizado_proceso: new Date()
            }
            await LotesRepository.modificar_lote_proceso(
                lote._id,
                query_fecha,
                "lote_finalizado",
                user
            );
        }

        await VariablesDelSistema.modificar_inventario_descarte(_id, data, "descarteLavado", lote);
        await VariablesDelSistema.ingresar_kilos_procesados(kilos, lote.tipoFruta);
        await VariablesDelSistema.ingresar_kilos_procesados2(kilos, lote.tipoFruta);


        procesoEventEmitter.emit("server_event", {
            action: "put_descarte",
            data: {}
        });

    }
    static async ingresar_descarte_encerado(req, user) {
        const { _id, data, action } = req;
        const keys = Object.keys(data);
        const query = { $inc: {} };
        let kilos = 0;

        for (let i = 0; i < keys.length; i++) {
            if (keys[i] === 'frutaNacional') {
                query.$inc[keys[i]] = data[keys[i]];
                kilos += data[keys[i]];
            } else {
                query.$inc[`descarteEncerado.${keys[i]}`] = Math.round(data[keys[i]]);
                kilos += Math.round(data[keys[i]]);
            }

        }
        query.$inc.__v = 1;

        const lote = await LotesRepository.modificar_lote_proceso(_id, query, action, user);
        await LotesRepository.deshidratacion(lote);

        await VariablesDelSistema.modificar_inventario_descarte(_id, data, "descarteEncerado", lote);
        await VariablesDelSistema.ingresar_kilos_procesados(kilos, lote.tipoFruta);
        await VariablesDelSistema.ingresar_kilos_procesados2(kilos, lote.tipoFruta);

        procesoEventEmitter.emit("server_event", {
            action: "put_descarte",
            data: {}
        });
    }
    static async ingresar_foto_calidad(req, user) {
        const { foto, fotoName, _id } = req;

        // Construir el nombre del archivo
        const fileName = `${_id}_${fotoName}.png`;

        // Construir la ruta completa del archivo
        const fotoPath = path.join(
            __dirname,
            "..",
            "..",
            "fotos_frutas",
            fileName
        );

        // Eliminar el encabezado de datos URI si está presente
        const base64Data = foto.replace(/^data:image\/\w+;base64,/, "");

        fs.writeFileSync(fotoPath, base64Data, { encoding: "base64" }, err => {
            if (err) {
                throw new ProcessError(422, `Error guardando fotos ${err.message}`)
            }
        });
        const fotos = {}
        fotos[`calidad.fotosCalidad.${fotoName}`] = fotoPath;
        const query = {
            ...fotos,
            "calidad.fotosCalidad.fechaIngreso": Date.now(),
        }
        console.log("se hace todo hasta aqui")
        console.log(_id)
        console.log(query)
        await LotesRepository.modificar_lote_proceso(_id, query, "Agregar foto calidad", user);
    }
    static async put_inventario_inventarios_orden_vaceo_modificar(data) {
        await VariablesDelSistema.put_inventario_inventarios_orden_vaceo_modificar(data)
        procesoEventEmitter.emit("server_event", {
            action: "modificar_orden_vaceo",
            data: {}
        });
    }
    static async vaciarLote(data, user) {
        const pilaFunciones = [];
        const { _id, kilosVaciados, inventario, __v, action } = data;

        //RUST
        // console.time("Duración de miFuncion getInventario");

        // const query = {
        //     $inc: {
        //         kilosVaciados: kilosVaciados,
        //         __v: 1,
        //     },
        //     fechaProceso: new Date()
        // }
        // await LotesRepository.modificar_lote(_id, query, action, user, __v);
        // const lote = await LotesRepository.getLotes({ ids: [_id] });
        // //condicional si es desverdizado o no

        // const rustConnectionProceso = getRustConnectionProceso()

        // const inventoryRequest = {
        //     action: "modificar_inventario",
        //     collection: "variables_del_sistema",
        //     data: {
        //         _id,
        //         canastillas: inventario
        //     }
        // }
        // await rustConnectionProceso.sendMessage(inventoryRequest)

        // procesoEventEmitter.emit("proceso_event", {
        //     predio: lote
        // });
        // procesoEventEmitter.emit("predio_vaciado", {
        //     predio: lote
        // });

        // console.timeEnd("Duración de miFuncion getInventario");

        try {

            //JS
            const query = {
                $inc: {
                    kilosVaciados: kilosVaciados,
                    __v: 1,
                },
                fechaProceso: new Date()
            }
            await LotesRepository.modificar_lote(_id, query, action, user, __v);


            pilaFunciones.push({
                funcion: "modificar_lote",
                datos: { _id, kilosVaciados, __v }
            })

            const lote = await LotesRepository.getLotes({ ids: [_id] });
            //condicional si es desverdizado o no
            if (lote[0].desverdizado) {
                await VariablesDelSistema.modificarInventario_desverdizado(lote[0]._id.toString(), inventario);
                pilaFunciones.push({
                    funcion: "modificar_inventario_desverdizado",
                    datos: { _id: lote[0]._id.toString(), inventario: inventario }
                })
            } else {
                await VariablesDelSistema.modificarInventario(lote[0]._id.toString(), inventario);
                pilaFunciones.push({
                    funcion: "modificar_inventario",
                    datos: { _id: lote[0]._id.toString(), inventario: inventario }
                })
            }

            const predioAnterior = await VariablesDelSistema.obtenerEF1proceso()

            await VariablesDelSistema.procesarEF1(lote[0], inventario);
            pilaFunciones.push({
                funcion: "modificar_ef1Proceso",
                datos: { ...predioAnterior }
            })

            await VariablesDelSistema.borrarDatoOrdenVaceo(lote[0]._id.toString())

            //para lista de empaque
            procesoEventEmitter.emit("predio_vaciado", {
                predio: lote
            });
            0
            //para el desktop app
            procesoEventEmitter.emit("server_event", {
                action: "vaciar_lote",
                data: {
                    predio: lote
                }
            });
        } catch (err) {
            // se devuelven los elementos que se cambiaron
            for (let i = pilaFunciones.length - 1; i >= 0; i--) {
                const value = pilaFunciones[i];
                if (value.funcion === "modificar_lote") {
                    const { _id, kilosVaciados, __v } = value.datos
                    const query = {
                        $inc: {
                            kilosVaciados: - kilosVaciados,
                            __v: 1,
                        },
                        fechaProceso: new Date()
                    }
                    await LotesRepository.modificar_lote(
                        _id, query, "rectificando_moficiar_lote", user, __v + 1
                    );
                } else if (value.funcion === "modificar_inventario_desverdizado") {
                    const { _id, inventario } = value.datos
                    await VariablesDelSistema.modificarInventario_desverdizado(_id, -inventario);
                } else if (value.funcion === "modificar_inventario") {
                    const { _id, inventario } = value.datos
                    await VariablesDelSistema.modificarInventario_desverdizado(_id, -inventario);
                } else if (value.funcion === "modificar_ef1Proceso") {
                    const { _id, enf, predio, nombrePredio, tipoFruta } = value.datos
                    const lote = {
                        _id: _id,
                        enf: enf,
                        tipoFruta: tipoFruta,
                        predio: {
                            _id: predio,
                            nombrePredio: nombrePredio,
                        }
                    }
                    await VariablesDelSistema.procesarEF1(lote);
                }
            }
            throw new Error(`Code ${err.code}: ${err.message}`);

        }

    }
    static async modificar_historial_fechas_en_patio(data, user) {
        try {
            const { fecha_ingreso_patio, _id, __v, lote, action } = data
            let query = {
                "documento.fecha_ingreso_patio": new Date(fecha_ingreso_patio)
            }

            await RecordLotesRepository.modificarRecord(_id, query, __v)

            query = {
                fecha_ingreso_patio: new Date(fecha_ingreso_patio)
            }
            await LotesRepository.modificar_lote_proceso(lote, query, action, user.user)
        } catch (err) {
            throw new Error(`Error en modificar_historial_fechas_en_patio: ${err.message}`)
        }

    }
    static async modificar_historial_lote_ingreso_inventario(data, user) {
        try {
            const { query, _id, __v, lote, action } = data

            if (Number(query.canastillas) === 0) {
                throw new Error("Error, modificar_historial_lote_ingreso_inventario, canastillas estan en cero")
            }
            const promedio = Number(query.kilos) / Number(query.canastillas)

            query.promedio = promedio

            let queryModificar = {}
            Object.entries(query).forEach(([key, value]) => {
                if (key === "fecha_salida_patio") {
                    queryModificar[`documento.${key}`] = new Date(value)
                    queryModificar[`documento.fecha_ingreso_inventario`] = new Date(value)
                } else {
                    queryModificar[`documento.${key}`] = value
                }
            })
            console.log(queryModificar)
            await RecordLotesRepository.modificarRecord(_id, queryModificar, __v)

            await LotesRepository.modificar_lote_proceso(lote, query, action, user.user)

            await VariablesDelSistema.ingresarInventario(lote, Number(query.canastillas));



        } catch (err) {
            throw new Error(`Error en modificar_historial_lote_ingreso_inventario: ${err.message}`)
        }

    }
    static async modificarHistorialFrutaProcesada(data, user) {
        //JS
        const { _id, kilosVaciados, inventario, __v, action, historialLote } = data;
        const { _idRecord, kilosHistorial, __vHistorial } = historialLote;
        const queryLote = {
            $inc: {
                kilosVaciados: kilosVaciados,
                __v: 1
            }
        }
        const queryRecord = {
            $inc: {
                "documento.$inc.kilosVaciados": kilosHistorial,
                __v: 1
            }
        }
        //se modifica el lote y el inventario
        await VariablesDelSistema.modificarInventario(_id, -inventario);
        await LotesRepository.modificar_lote(_id, queryLote, action, user, __v);
        //se modifica el registro
        await RecordLotesRepository.modificarRecord(_idRecord, queryRecord, __vHistorial);

        procesoEventEmitter.emit("server_event", {
            action: "modificar_historial_fruta_procesada",
            data: {}
        });
        //RUST
        // const { _id, kilosVaciados, inventario, __v, action, historialLote } = data;
        // const { _idRecord, kilosHistorial, __vHistorial } = historialLote;
        // const queryLote = {
        //     $inc: {
        //         kilosVaciados: kilosVaciados,
        //         __v: 1
        //     }
        // }
        // const queryRecord = {
        //     $inc: {
        //         "documento.$inc.kilosVaciados": kilosHistorial,
        //         __v: 1
        //     }
        // }
        // //se modifica el lote y el inventario
        // const rustConnectionProceso = getRustConnectionProceso()
        // const inventoryRequest = {
        //     action: "modificar_inventario",
        //     collection: "variables_del_sistema",
        //     data: {
        //         _id,
        //         canastillas: inventario
        //     }
        // }
        // await rustConnectionProceso.sendMessage(inventoryRequest)

        // await LotesRepository.modificar_lote(_id, queryLote, action, user, __v);
        // //se modifica el registro
        // await RecordLotesRepository.modificarRecord(_idRecord, queryRecord, __vHistorial);

    }
    static async directoNacional(data, user) {
        //JS
        const { _id, infoSalidaDirectoNacional, directoNacional, inventario, __v, action } = data;
        const query = {
            $inc: {
                directoNacional: directoNacional,
                __v: 1
            },
            infoSalidaDirectoNacional: infoSalidaDirectoNacional
        };
        const lote = await LotesRepository.modificar_lote(_id, query, action, user, __v);

        await VariablesDelSistema.modificarInventario(_id, inventario);
        await LotesRepository.deshidratacion(lote);

        procesoEventEmitter.emit("server_event", {
            action: "directo_nacional",
            data: {}
        });

        //RUST
        // const { _id, infoSalidaDirectoNacional, directoNacional, inventario, __v, action } = data;
        // const query = {
        //     $inc: {
        //         directoNacional: directoNacional,
        //         __v: 1
        //     },
        //     infoSalidaDirectoNacional: infoSalidaDirectoNacional
        // };
        // const lote = await LotesRepository.modificar_lote(_id, query, action, user, __v);
        // await LotesRepository.deshidratacion(lote);
        // //se modifica el lote y el inventario
        // const rustConnectionProceso = getRustConnectionProceso()
        // const inventoryRequest = {
        //     action: "modificar_inventario",
        //     collection: "variables_del_sistema",
        //     data: {
        //         _id,
        //         canastillas: inventario
        //     }
        // }
        // await rustConnectionProceso.sendMessage(inventoryRequest)

    }
    static async despacho_descarte(req, user) {
        const { data } = req;
        const { clienteInfo, tipoFruta, kilos } = data;
        const newDespacho = {
            ...clienteInfo,
            tipoFruta: tipoFruta,
            kilos: { ...kilos },
            user: user
        }
        const out = await VariablesDelSistema.restar_fruta_inventario_descarte(kilos, tipoFruta);
        const ids = Object.keys(out);
        const lotes = await LotesRepository.getLotes({
            ids: ids,
            select: { enf: 1 }
        });

        const resultado = lotes.map(lote => {
            return {
                ...lote._doc,
                descarteEncerado: out[lote._id].descarteEncerado,
                descarteLavado: out[lote._id].descarteLavado,
            }
        })
        await DespachoDescartesRepository.crear_nuevo_despacho(newDespacho, resultado);
        return resultado;

    }
    static async reprocesar_predio(data, user) {
        const { _id, query, inventario } = data;
        const { descarteLavado, descarteEncerado } = inventario;
        const kilosDescarteLavado =
            descarteLavado === undefined ? 0 :
                Object.values(descarteLavado).reduce((acu, item) => acu -= item, 0)
        const kilosDescarteEncerado =
            descarteEncerado === undefined ? 0 :
                Object.values(descarteEncerado).reduce((acu, item) => acu -= item, 0)

        const kilosTotal = kilosDescarteLavado + kilosDescarteEncerado;
        await LotesRepository.modificar_lote_proceso(
            _id,
            { ...query, $inc: { kilosReprocesados: kilosTotal } },
            "vaciarLote",
            user);
        const lote = await LotesRepository.getLotes({ ids: [_id] });
        if (descarteLavado)
            await VariablesDelSistema.modificar_inventario_descarte(_id, descarteLavado, 'descarteLavado');
        if (descarteEncerado)
            await VariablesDelSistema.modificar_inventario_descarte(_id, descarteEncerado, 'descarteEncerado');
        await VariablesDelSistema.reprocesar_predio(lote[0], kilosTotal);
    }
    static async reprocesar_celifrut(data, user) {
        const { lote, lotes } = data
        const codigo = await VariablesDelSistema.generar_codigo_celifrut()
        const enf_lote = { ...lote, enf: codigo }
        const newLote = await LotesRepository.crear_lote(enf_lote, user, lotes);

        const query = {
            $inc: {
                kilosVaciados: newLote.kilos,
                __v: 1,
            },
            fechaProceso: new Date()
        }


        await LotesRepository.modificar_lote(newLote._id.toString(), query, "vaciarLote", user, newLote.__v);
        await VariablesDelSistema.incrementar_codigo_celifrut();


        for (let i = 0; i < lotes.length; i++) {
            const loteObj = await transformObject(lotes[i]);
            if (loteObj.descarteLavado) {
                await VariablesDelSistema.modificar_inventario_descarte(
                    loteObj._id,
                    loteObj.descarteLavado,
                    'descarteLavado',
                    newLote.tipoFruta
                )
            }
            if (loteObj.descarteEncerado) {
                await VariablesDelSistema.modificar_inventario_descarte(
                    loteObj._id,
                    loteObj.descarteEncerado,
                    'descarteEncerado',
                    newLote.tipoFruta
                )
            }
            await VariablesDelSistema.reprocesar_predio_celifrut(newLote, newLote.kilos)

            procesoEventEmitter.emit("proceso_event", {
                predio: [newLote]
            });
            procesoEventEmitter.emit("predio_vaciado", {
                predio: [newLote]
            });

        }
    }
    static async modificar_predio_proceso_descarte(req,) {
        const { data } = req
        const clientePromise = iniciarRedisDB();
        const cliente = await clientePromise
        VariablesDelSistema.modificar_predio_proceso_descartes(data, cliente)

    }
    static async modificar_predio_proceso_listaEmpaque(req,) {
        const { data } = req
        VariablesDelSistema.modificar_predio_proceso_listaEmpaque(data)
        procesoEventEmitter.emit("predio_vaciado");
    }
    static async reiniciarValores_proceso() {
        await VariablesDelSistema.reiniciarValores_proceso();
        procesoEventEmitter.emit("proceso_event", {});
    }
    static async modificar_programacion_contenedor(req, user) {
        const { _id, __v, infoContenedor, action } = req;
        await ContenedoresRepository.modificar_contenedor(_id, infoContenedor, user.user, action, __v);
    }
    static async desverdizado(req, user) {
        //JS
        const { _id, inventario, desverdizado, __v, action } = req;
        const query = {
            desverdizado: desverdizado,
            $inc: {
                __v: 1
            },
        }
        await LotesRepository.modificar_lote(_id, query, action, user, __v);

        await VariablesDelSistema.ingresarInventarioDesverdizado(_id, inventario)
        await VariablesDelSistema.modificarInventario(_id, inventario);

        procesoEventEmitter.emit("server_event", {
            action: "enviar_desverdizado",
            data: {}
        });
        //RUST
        // const { _id, inventario, desverdizado, __v, action } = req;
        // const query = {
        //     desverdizado: desverdizado,
        //     $inc: {
        //         __v: 1
        //     },
        // }
        // await LotesRepository.modificar_lote(_id, query, action, user, __v);

        // await VariablesDelSistema.ingresarInventarioDesverdizado(_id, inventario)

        // //se modifica el inventariod e fruta sin procesar
        // const rustConnectionProceso = getRustConnectionProceso()
        // const inventoryRequest = {
        //     action: "modificar_inventario",
        //     collection: "variables_del_sistema",
        //     data: {
        //         _id,
        //         canastillas: inventario
        //     }
        // }
        // await rustConnectionProceso.sendMessage(inventoryRequest)
    }
    static async put_inventarios_desverdizado_finalizar(req, user) {
        const { _id, __v, action } = req;
        const query = {
            "desverdizado.fechaFinalizar": new Date(),
            $inc: {
                __v: 1,
            }
        }
        await LotesRepository.modificar_lote(_id, query, action, user, __v);
        procesoEventEmitter.emit("server_event", {
            action: "finalizar_desverdizado",
            data: {}
        });
    }
    static async set_hora_fin_proceso() {
        const status_proceso = await VariablesDelSistema.obtener_status_proceso()

        if (status_proceso === 'pause') {
            await VariablesDelSistema.set_hora_reanudar_proceso();
        }
        await VariablesDelSistema.set_hora_fin_proceso();
        procesoEventEmitter.emit("status_proceso", {
            status: "off"
        });
    }
    static async set_hora_pausa_proceso() {
        await VariablesDelSistema.set_hora_pausa_proceso();
        procesoEventEmitter.emit("status_proceso", {
            status: "pause"
        });
    }
    static async set_hora_reanudar_proceso() {
        await VariablesDelSistema.set_hora_reanudar_proceso();
        procesoEventEmitter.emit("status_proceso", {
            status: "on"
        });
    }
    static async sp32_funcionamiento_maquina(data) {
        let estado_maquina = false
        const status_proceso = await VariablesDelSistema.obtener_status_proceso()
        if (Number(data) >= 1925) {
            estado_maquina = true
        }
        //al inicio maquina apagada, status off
        if (estado_maquina && status_proceso === 'off') {
            await VariablesDelSistema.set_hora_inicio_proceso();

            //se prende la maquina , continua el proceso
        } else if (estado_maquina && status_proceso === 'pause') {
            //se reanuda el proces cuando se prende la maquina
            await VariablesDelSistema.set_hora_reanudar_proceso();
            //se pausa la maquina
        } else if (!estado_maquina && status_proceso === 'on') {
            await VariablesDelSistema.set_hora_pausa_proceso()
        }

        const new_status_proceso = await VariablesDelSistema.obtener_status_proceso()

        procesoEventEmitter.emit("status_proceso", {
            status: new_status_proceso
        });
    }
    static async finalizar_informe_proveedor(req, userInfo) {
        const { _id, precio, action, contenedores } = req
        const { user } = userInfo


        const exportacion = {}
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

        const query = {
            precio: precio,
            aprobacionComercial: true,
            fecha_finalizado_proceso: new Date()
        }

        Object.keys(exportacion).forEach(cont => {

            Object.keys(exportacion[cont]).forEach(calidad => {
                let llave = calidad
                if (calidad === "1.5") {
                    llave = "15"
                }
                query[`exportacionDetallada.any.${cont}.${llave}`] = exportacion[cont][calidad]

            })
        })

        await LotesRepository.modificar_lote_proceso(_id, query, action, user)


    }
    static async put_inventarios_registros_fruta_descompuesta(req) {
        try {
            const { _id, data } = req;
            await FrutaDescompuestaRepository.put_fruta_descompuesta(_id, data);
        } catch (err) {
            if (err.status === 523) {
                throw err
            }
            throw new ProcessError(470, `Error ${err.type}: ${err.message}`)
        }
    }

    //? lista de empaque
    static async add_settings_pallet(req, user) {
        const { _id, pallet, settings, action } = req;
        const contenedor = await ContenedoresRepository
            .agregar_settings_pallet(_id, pallet, settings, action, user);

        if (!Object.prototype.hasOwnProperty.call(
            contenedor.infoContenedor, "fechaInicioReal"
        )) {
            await ContenedoresRepository.modificar_contenedor(
                _id,
                { "infoContenedor.fechaInicioReal": new Date() },
                user,
                "Inicio real del contenedor",
                contenedor.__v
            )
        }
        procesoEventEmitter.emit("listaempaque_update");
    }
    static async actualizar_pallet_contenedor(req, user) {
        const pilaFunciones = [];
        try {
            const { _id, pallet, item, action } = req;

            if (item.calidad === '') throw new Error("El item debe tener una calidad")

            const contenedor = await ContenedoresRepository.get_Contenedores_sin_lotes({
                ids: [_id],
                populate: {
                    path: 'infoContenedor.clienteInfo',
                    select: 'CLIENTE PAIS_DESTINO',
                }
            });
            //se ajustan los kilos de exportacion para el lote
            let kilosExportacion = 0;
            let index;
            const kilos = Number(item.tipoCaja.split('-')[1].replace(",", "."))
            const query = {
                $addToSet: { contenedores: _id },
                $inc: {}
            }
            kilosExportacion = kilos * Number(item.cajas)
            query.$inc[calidadFile[item.calidad]] = kilosExportacion

            //se examina si el pallet tiene items ya subidsos
            if (contenedor[0].pallets[pallet].get("EF1").length === 0) {
                await ContenedoresRepository.actualizar_pallet_contenedor(_id, pallet, item, action, user);

            } else {
                index = contenedor[0].pallets[pallet].get("EF1").findIndex(data =>
                    data.lote === item.lote &&
                    data.calidad === item.calidad &&
                    data.calibre === item.calibre
                )
                if (index === -1) {
                    await ContenedoresRepository.actualizar_pallet_contenedor(_id, pallet, item, action, user);
                } else {
                    const newPallet = contenedor[0].pallets[pallet]
                    newPallet.get("EF1")[index].cajas += item.cajas

                    await ContenedoresRepository.actualizar_pallet_item_contenedor(
                        _id, pallet, item, newPallet, action, user)
                }
            }

            pilaFunciones.push({
                funcion: "modificar_contenedor",
                datos: {
                    _id: _id, pallet: pallet, index: index, item: item
                }
            })



            //se agrega la exportacion al lote
            const lote = await LotesRepository
                .modificar_lote_proceso(item.lote, query, "Agregar exportacion", user)

            pilaFunciones.push({
                funcion: "modificar_lote_exportacion",
                datos: {
                    id: item.lote, query: query
                }
            })

            await LotesRepository.rendimiento(lote);
            await LotesRepository.deshidratacion(lote);

            // se agrega la exportacion a las variables del sistema

            await VariablesDelSistema.ingresar_exportacion(kilosExportacion, lote.tipoFruta)
            await VariablesDelSistema.ingresar_kilos_procesados2(kilosExportacion, lote.tipoFruta)
            await VariablesDelSistema.ingresar_exportacion2(kilosExportacion, lote.tipoFruta)

            pilaFunciones.push({
                funcion: "exportacion_variables_sistema",
                datos: {
                    tipoFruta: lote.tipoFruta,
                    kilosExportacion: -kilosExportacion
                }
            })

            // s 3eingresan los kilos GGN en el predio si el destino esta permitido como GGN
            const predio = await ProveedoresRepository.get_proveedores({
                ids: [lote.predio],
                select: { GGN: 1, PREDIO: 1 }
            })

            const have_ggn = have_lote_GGN_export(predio[0], contenedor[0], item)
            if (have_ggn) {
                const query = {
                    $inc: {}
                }
                kilosExportacion = kilos * Number(item.cajas)
                query.$inc.kilosGGN = kilosExportacion

                //se agrega la exportacion al lote
                await LotesRepository
                    .modificar_lote_proceso(item.lote, query, "Agregar exportacion GGN", user)
            }


            // se envia el evento de que se actualizo la lista de empaque
            procesoEventEmitter.emit("proceso_event", {});
            procesoEventEmitter.emit("listaempaque_update");

        } catch (err) {
            // se devuelven los elementos que se cambiaron
            pilaFunciones.forEach(async funcion => {
                if (funcion.funcion === "modificar_contenedor") {
                    const { _id, pallet, item, index } = funcion.datos;

                    const contenedor = await ContenedoresRepository.get_Contenedores_sin_lotes({ ids: [_id] });

                    const newPallet = contenedor[0].pallets[pallet]
                    newPallet.get("EF1")[index].cajas += -item.cajas

                    await ContenedoresRepository.actualizar_pallet_item_contenedor(
                        _id, pallet, item, newPallet, "rectificando fallo", user)

                } else if (funcion.funcion === 'modificar_lote_exportacion') {
                    const { id, query } = funcion.datos;
                    Object.keys(query.$inc).forEach(key => {
                        query.$inc[key] = - query.$inc[key]
                    })
                    const lote = await LotesRepository
                        .modificar_lote_proceso(id, query, "Corregir exportacion", user)

                    //se elimina el rendimiento al lote
                    await LotesRepository.rendimiento(lote);
                    pilaFunciones.push({
                        funcion: "rendimiento_lote",
                        datos: lote
                    })
                    //se elimina la deshidratacion
                    await LotesRepository.deshidratacion(lote);
                    pilaFunciones.push({
                        funcion: "deshidratacion_lote",
                        datos: lote
                    })

                } else if (funcion.funcion === "exportacion_variables_sistema") {
                    const { kilosExportacion, tipoFruta } = funcion.datos

                    await VariablesDelSistema.ingresar_exportacion(kilosExportacion, tipoFruta)
                    await VariablesDelSistema.ingresar_kilos_procesados2(kilosExportacion, tipoFruta)
                    await VariablesDelSistema.ingresar_exportacion2(kilosExportacion, tipoFruta)
                    procesoEventEmitter.emit("proceso_event", {});
                    procesoEventEmitter.emit("listaempaque_update");
                }
            })
            throw new Error(`Code ${err.code}: ${err.message}`);
        }
    }
    static async modificar_items_lista_empaque(req, user) {
        const pilaFunciones = [];

        try {
            const { _id, pallet, seleccion, data, action } = req;

            const contenedor = await ContenedoresRepository.get_Contenedores_sin_lotes({
                ids: [_id],
                select: { infoContenedor: 1 },
                populate: {
                    path: 'infoContenedor.clienteInfo',
                    select: 'CLIENTE PAIS_DESTINO',
                }
            })
            const oldData = await ContenedoresRepository
                .modificar_items_pallet(_id, pallet, seleccion, data, action, user);

            pilaFunciones.push({
                funcion: "modificar_items_pallet",
                datos: {
                    _id, pallet, seleccion, oldData: {
                        calibre: oldData[0].calibre,
                        calidad: oldData[0].calidad,
                        tipoCaja: oldData[0].tipoCaja,
                    }
                }
            })

            if (oldData[0].calidad !== data.calidad) {
                //se agrega la exportacion a el lote
                const kilos = Number(oldData[0].tipoCaja.split('-')[1].replace(",", "."))

                for (let i = 0; i < oldData.length; i++) {

                    const query = {
                        $inc: {}
                    }
                    query.$inc[calidadFile[oldData[0].calidad]] = 0;
                    query.$inc[calidadFile[data.calidad]] = 0;

                    query.$inc[calidadFile[oldData[0].calidad]] = -(kilos * Number(oldData[i].cajas))
                    query.$inc[calidadFile[data.calidad]] = (kilos * Number(oldData[i].cajas))


                    await LotesRepository.modificar_lote_proceso(
                        oldData[i].lote,
                        query,
                        "Cambiar tipo de exportacion",
                        user
                    )

                    pilaFunciones.push({
                        funcion: "Cambiar tipo de exportacion",
                        datos: {
                            query: query,
                            id: oldData[i].lote
                        }
                    })
                }
            }

            if (oldData[0].tipoCaja !== data.tipoCaja) {
                const kilosnuevos = Number(data.tipoCaja.split('-')[1].replace(",", "."))

                const query = {
                    $inc: {}
                }
                query.$inc[calidadFile[data.calidad]] = 0;
                for (let i = 0; i < oldData.length; i++) {
                    const kilosviejos = Number(oldData[i].tipoCaja.split('-')[1].replace(",", "."))
                    const kilosNuevos = (kilosnuevos * Number(oldData[i].cajas)) - (kilosviejos * Number(oldData[i].cajas))
                    query.$inc[calidadFile[data.calidad]] = kilosNuevos

                    const lote = await LotesRepository.modificar_lote_proceso(
                        oldData[i].lote,
                        query,
                        "Cambiar kilos de exportacion",
                        user
                    )

                    pilaFunciones.push({
                        funcion: "Cambiar cajas de exportacion",
                        datos: {
                            query: query,
                            id: oldData[i].lote
                        }
                    })
                    await VariablesDelSistema.ingresar_kilos_procesados2(kilosNuevos, oldData[i].tipoFruta)
                    await VariablesDelSistema.ingresar_exportacion2(kilosNuevos, oldData[i].tipoFruta)

                    pilaFunciones.push({
                        funcion: "Cambiar kilosprocesados",
                        datos: {
                            kilosNuevos,
                            tipoFruta: oldData[i].tipoFruta
                        }
                    })


                    const predio = await ProveedoresRepository.get_proveedores({
                        ids: [lote.predio], select: { GGN: 1 }
                    })


                    if (have_lote_GGN_export(predio[0], contenedor[0])) {
                        const queryGGN = {
                            $inc: {}
                        }

                        queryGGN.$inc.kilosGGN = query.$inc[calidadFile[data.calidad]]


                        //se agrega la exportacion al lote
                        await LotesRepository.modificar_lote_proceso(
                            oldData[i].lote,
                            queryGGN,
                            "Cambiar kilos GGN",
                            user
                        )

                        pilaFunciones.push({
                            funcion: "Cambiar cajas de exportacion GGN",
                            datos: {
                                query: queryGGN,
                                id: oldData[i].lote
                            }
                        })

                    }

                }

            }

            procesoEventEmitter.emit("proceso_event", {});
            procesoEventEmitter.emit("listaempaque_update");

        } catch (err) {
            for (let i = pilaFunciones.length - 1; i >= 0; i--) {
                const value = pilaFunciones[i];
                if (value.funcion === "modificar_items_pallet") {
                    const { _id, pallet, seleccion, oldData } = value.datos
                    await ContenedoresRepository
                        .modificar_items_pallet(_id, pallet, seleccion, oldData, "rectificando fallo", user);

                } else if (value.funcion === "Cambiar tipo de exportacion") {
                    const { query, id } = value.datos;
                    for (const calidad of Object.keys(query.$inc)) {
                        query.$inc[calidad] = query.$inc[calidad] * -1
                    }

                    await LotesRepository.modificar_lote_proceso(
                        id,
                        query,
                        "rectificando fallo",
                        user
                    )
                } else if (value.funcion === "Cambiar cajas de exportacion") {
                    const { query, id } = value.datos;
                    for (const calidad of Object.keys(query.$inc)) {
                        query.$inc[calidad] = - query.$inc[calidad]
                    }
                    await LotesRepository.modificar_lote_proceso(
                        id,
                        query,
                        "rectificando fallo",
                        user
                    )
                } else if (value.funcion === "Cambiar cajas de exportacion GGN") {
                    const { query, id } = value.datos;

                    query.$inc.kilosGGN = query.$inc.kilosGGN * -1

                    await LotesRepository.modificar_lote_proceso(
                        id,
                        query,
                        "rectificando fallo",
                        user
                    )
                } else if (value.funcion === 'Cambiar kilosprocesados') {
                    await VariablesDelSistema.ingresar_kilos_procesados2(
                        -(value.datos.kilosNuevos), value.datos.tipoFruta
                    )
                    await VariablesDelSistema.ingresar_exportacion2(
                        -(value.datos.kilosNuevos), value.datos.tipoFruta
                    )


                }
            }

            procesoEventEmitter.emit("proceso_event", {});
            procesoEventEmitter.emit("listaempaque_update");

            throw new Error(`Code ${err.status}: ${err.message}`);

        }
    }
    static async eliminar_item_lista_empaque(req, user) {
        const pilaFunciones = [];
        try {
            const { _id, pallet, seleccion, action } = req;
            let kilosTotal = {};
            //se ordenan los items seleccionados
            const seleccionOrdenado = seleccion.sort((a, b) => b - a);
            //se eliminan los items de la lista de empaque
            const contenedor = await ContenedoresRepository.get_Contenedores_sin_lotes({
                ids: [_id],
                select: { infoContenedor: 1 },
                populate: {
                    path: 'infoContenedor.clienteInfo',
                    select: 'CLIENTE PAIS_DESTINO',
                }
            })

            const items = await ContenedoresRepository
                .eliminar_items_lista_empaque(_id, pallet, seleccionOrdenado, action, user)
            pilaFunciones.push({
                funcion: "eliminar_items_lista_empaque",
                datos: {
                    _id: _id, pallet: pallet, items: items
                }
            })

            //se descuentan los kilos ne exportacion de los lotes correspondientes
            for (let i = 0; i < items.length; i++) {
                const { lote, calidad, tipoCaja, cajas, fecha } = items[i]

                const diaItem = new Date(fecha).getDate();
                const hoy = new Date().getDate();

                const mult = Number(tipoCaja.split("-")[1].replace(",", "."))
                const kilos = cajas * mult;
                const query = { $inc: {} }
                query.$inc[calidadFile[calidad]] = -kilos;

                const loteDB = await LotesRepository.modificar_lote_proceso(lote, query, action, user);
                await LotesRepository.rendimiento(loteDB);
                await LotesRepository.deshidratacion(loteDB);

                if (diaItem === hoy) {
                    if (!Object.prototype.hasOwnProperty.call(kilosTotal, loteDB.tipoFruta))
                        kilosTotal[loteDB.tipoFruta] = 0

                    kilosTotal[loteDB.tipoFruta] += kilos;

                }

                query.$inc[calidadFile[calidad]] = kilos;
                pilaFunciones.push({
                    funcion: "modificar_lote_proceso",
                    datos: {
                        lote: lote,
                        query: query
                    }
                })

                const predio = await ProveedoresRepository.get_proveedores({
                    ids: [loteDB.predio], select: { GGN: 1 }
                })

                if (have_lote_GGN_export(predio[0], contenedor[0])) {
                    const query = {
                        $inc: {}
                    }
                    query.$inc.kilosGGN = -kilos

                    //se agrega la exportacion GGN al lote
                    await LotesRepository
                        .modificar_lote_proceso(loteDB._id, query, "Agregar exportacion GGN", user)

                    pilaFunciones.push({
                        funcion: "Cambiar kilos GGN",
                        datos: {
                            id: loteDB._id,
                            query: query
                        }
                    })
                }
            }

            //se modifica la cantidad de kilos exportacion
            for (const [key, value] of Object.entries(kilosTotal)) {
                await VariablesDelSistema.ingresar_exportacion(-value, key);
                await VariablesDelSistema.ingresar_kilos_procesados2(-value, key)
                await VariablesDelSistema.ingresar_exportacion2(-value, key)

            }

            pilaFunciones.push({
                funcion: "ingresar_exportacion_variales",
                datos: kilosTotal
            })


            procesoEventEmitter.emit("proceso_event", {});
            procesoEventEmitter.emit("listaempaque_update");

        } catch (err) {
            // se devuelven los elementos que se cambiaron
            for (let i = pilaFunciones.length - 1; i >= 0; i--) {
                const value = pilaFunciones[i];
                if (value.funcion === "eliminar_items_lista_empaque") {
                    const { _id, pallet, items } = value.datos;
                    for (const item of items) {
                        await ContenedoresRepository
                            .actualizar_pallet_contenedor(_id, pallet, item, "corregir eliminar_items_lista_empaque", user);
                    }
                } else if (value.funcion === 'modificar_lote_proceso') {
                    const { lote, query } = value.datos
                    const loteDB = await LotesRepository
                        .modificar_lote_proceso(lote, query, "revertir modificar_lote_proceso", user);
                    await LotesRepository.rendimiento(loteDB);
                    await LotesRepository.deshidratacion(loteDB);
                } else if (value.funcion === "ingresar_exportacion_variales") {

                    const { datos } = value

                    for (const [key, value] of Object.entries(datos)) {
                        await VariablesDelSistema.ingresar_exportacion(value, key);
                        await VariablesDelSistema.ingresar_kilos_procesados2(value, key)
                        await VariablesDelSistema.ingresar_exportacion2(value, key)
                    }

                    procesoEventEmitter.emit("proceso_event", {});
                    procesoEventEmitter.emit("listaempaque_update");

                } else if (value.funcion === "Cambiar kilos GGN") {
                    const { query, id } = value.datos;
                    query.$inc.kilosGGN = query.$inc.kilosGGN * -1
                    await LotesRepository.modificar_lote_proceso(
                        id,
                        query,
                        "rectificando fallo",
                        user
                    )
                }
            }
            throw new Error(`Code ${err.code}: ${err.message}`);

        }
    }
    static async add_pallet_listaempaque(req, user) {
        const { _id, action } = req
        const newItem = {
            EF1: [],
            listaLiberarPallet: {
                rotulado: false,
                paletizado: false,
                enzunchado: false,
                estadoCajas: false,
                estiba: false
            },
            settings: {
                tipoCaja: '',
                calidad: '',
                calibre: ''
            }
        }
        const query = {
            $push: { pallets: newItem }
        }
        await ContenedoresRepository.modificar_contenedor(_id, query, user, action)
        procesoEventEmitter.emit("listaempaque_update");

    }
    static async liberar_pallets_lista_empaque(req, user) {
        const { _id, pallet, item, action } = req;
        await ContenedoresRepository.liberar_pallet_lista_empaque(_id, pallet, item, action, user);
        procesoEventEmitter.emit("listaempaque_update");
    }
    static async restar_item_lista_empaque(req, user) {
        const pilaFunciones = [];

        try {
            const { action, _id, pallet, seleccion, cajas } = req;

            const contenedor = await ContenedoresRepository.get_Contenedores_sin_lotes({
                ids: [_id],
                select: { infoContenedor: 1 },
                populate: {
                    path: 'infoContenedor.clienteInfo',
                    select: 'CLIENTE PAIS_DESTINO',
                }
            })

            const item = await ContenedoresRepository
                .restar_item_lista_empaque(_id, pallet, seleccion, cajas, action, user)

            pilaFunciones.push({
                funcion: "restar_item_lista_empaque",
                datos: {
                    _id: _id, pallet: pallet, seleccion: seleccion, cajas: cajas, item: item
                }
            })
            const { lote, calidad, tipoCaja } = item
            const mult = Number(tipoCaja.split("-")[1].replace(",", "."))
            const kilos = cajas * mult;
            const query = { $inc: {} }
            query.$inc[calidadFile[calidad]] = -kilos;

            const loteDB = await LotesRepository.modificar_lote_proceso(lote, query, action, user);
            await LotesRepository.rendimiento(loteDB);
            await LotesRepository.deshidratacion(loteDB);

            query.$inc[calidadFile[calidad]] = kilos;
            pilaFunciones.push({
                funcion: "modificar_lote_proceso",
                datos: {
                    lote: loteDB._id,
                    query: query
                }
            })

            const predio = await ProveedoresRepository.get_proveedores({
                ids: [loteDB.predio], select: { GGN: 1 }
            })

            if (have_lote_GGN_export(predio[0], contenedor[0])) {
                const query = {
                    $inc: {}
                }
                query.$inc.kilosGGN = -kilos

                //se agrega la exportacion GGN al lote
                await LotesRepository
                    .modificar_lote_proceso(loteDB._id, query, "restar exportacion GGN", user)

                pilaFunciones.push({
                    funcion: "Cambiar kilos GGN",
                    datos: {
                        id: loteDB._id,
                        query: query
                    }
                })
            }

            query.$inc[calidadFile[calidad]] = kilos;
            pilaFunciones.push({
                funcion: "modificar_lote_proceso",
                datos: {
                    lote: lote,
                    query: query
                }
            })

            await VariablesDelSistema.ingresar_exportacion(-kilos, loteDB.tipoFruta)
            await VariablesDelSistema.ingresar_kilos_procesados2(-kilos, loteDB.tipoFruta)
            await VariablesDelSistema.ingresar_exportacion2(-kilos, loteDB.tipoFruta)

            pilaFunciones.push({
                funcion: "exportacion_variables_sistema",
                datos: {
                    tipoFruta: loteDB.tipoFruta,
                    kilosExportacion: kilos
                }
            })

            procesoEventEmitter.emit("proceso_event", {});
            procesoEventEmitter.emit("listaempaque_update");



        } catch (err) {
            for (let i = pilaFunciones.length - 1; i >= 0; i--) {
                const value = pilaFunciones[i];
                let index
                if (value.funcion === "restar_item_lista_empaque") {
                    const { _id, pallet, cajas, item } = value.datos;
                    const contenedor = await ContenedoresRepository.get_Contenedores_sin_lotes({ ids: [_id] });
                    item.cajas = cajas
                    //se examina si el pallet tiene items ya subidsos
                    if (contenedor[0].pallets[pallet].get("EF1").length === 0) {
                        await ContenedoresRepository.actualizar_pallet_contenedor(
                            _id, pallet, item, "restituir restar_item_lista_empaque", user
                        );

                    } else {
                        index = contenedor[0].pallets[pallet].get("EF1").findIndex(data =>
                            data.lote === item.lote &&
                            data.calidad === item.calidad &&
                            data.calibre === item.calibre
                        )
                        if (index === -1) {
                            await ContenedoresRepository.actualizar_pallet_contenedor(
                                _id, pallet, item, "restituir restar_item_lista_empaque", user
                            );
                        } else {
                            const newPallet = contenedor[0].pallets[pallet]
                            newPallet.get("EF1")[index].cajas += item.cajas

                            await ContenedoresRepository.actualizar_pallet_item_contenedor(
                                _id, pallet, item, newPallet, "restituir restar_item_lista_empaque", user)
                        }
                    }

                } else if (value.funcion === 'modificar_lote_proceso') {
                    const { lote, query } = value.datos
                    const loteDB = await LotesRepository
                        .modificar_lote_proceso(lote, query, "revertir modificar_lote_proceso", user);
                    await LotesRepository.rendimiento(loteDB);
                    await LotesRepository.deshidratacion(loteDB);
                } else if (value.funcion === "exportacion_variables_sistema") {
                    const { kilosExportacion, tipoFruta } = value.datos

                    await VariablesDelSistema.ingresar_exportacion(kilosExportacion, tipoFruta)
                    await VariablesDelSistema.ingresar_kilos_procesados2(kilosExportacion, tipoFruta)
                    await VariablesDelSistema.ingresar_exportacion2(kilosExportacion, tipoFruta)


                } else if (value.funcion === "Cambiar kilos GGN") {
                    const { query, id } = value.datos;
                    query.$inc.kilosGGN = query.$inc.kilosGGN * -1
                    await LotesRepository.modificar_lote_proceso(
                        id,
                        query,
                        "rectificando fallo",
                        user
                    )
                }

            }
            procesoEventEmitter.emit("proceso_event", {});
            procesoEventEmitter.emit("listaempaque_update");

            throw new Error(`Code ${err.code}: ${err.message}`);

        }
    }
    static async mover_item_lista_empaque(req, user) {
        const { contenedor1, contenedor2, cajas, action } = req;

        if (contenedor1.pallet !== "" && contenedor2.pallet !== "" && cajas === 0) {
            await this.mover_item_entre_contenedores(contenedor1, contenedor2, action, user);
        }
        // else if (contenedor1.pallet !== -1 && contenedor2._id === -1 && cajas === 0) {
        //     await this.mover_item_contenedor_cajasSinPallet(contenedor1, action, user)
        // }
        else if (contenedor1.pallet !== "" && contenedor2.pallet !== "" && cajas !== 0) {
            await this.restar_mover_contenedor_contenedor(contenedor1, contenedor2, cajas, action, user)
        }
        // else if (contenedor1.pallet === -1 && contenedor2.pallet !== -1 && cajas !== 0) {
        //     await this.restar_mover_item_cajasSinPallet_contenedor(contenedor1, contenedor2, cajas, action, user)
        // } 
        // else if (contenedor1.pallet !== -1 && contenedor2._id === -1 && cajas !== 0) {
        //     await this.restar_mover_item_contenedor_cajasSinPallet(contenedor1, cajas, action, user)
        // }
        procesoEventEmitter.emit("listaempaque_update");

    }
    static async mover_item_entre_contenedores(contenedor1, contenedor2, action, user) {
        const pilaFunciones = [];
        try {
            const seleccionOrdenado = contenedor1.seleccionado.sort((a, b) => b - a);
            //se eliminan los items de la lista de empaque
            const items = await ContenedoresRepository.mover_items_lista_empaque(
                contenedor1._id,
                contenedor2._id,
                contenedor1.pallet,
                contenedor2.pallet,
                seleccionOrdenado,
                action,
                user
            );
            pilaFunciones.push({
                funcion: "mover_items_lista_empaque",
                datos: {
                    id1: contenedor1._id,
                    id2: contenedor2._id,
                    pallet1: contenedor1.pallet,
                    pallet2: contenedor2.pallet,
                    items: items
                }
            })
            const query = {
                $addToSet: { contenedores: contenedor2._id }
            }
            const idsArr = items.map(item => item.lote)
            const lotesSet = new Set(idsArr);
            const lotesIds = [...lotesSet];
            for (let i = 0; i < lotesIds.length; i++) {
                await LotesRepository.modificar_lote_proceso(lotesIds[i], query, `Se agrega contenedor ${contenedor2._id}`, user)
            }
        } catch (err) {
            if (err.status !== 408) {
                for (const value of Object.values(pilaFunciones)) {
                    if (value.funcion === "mover_items_lista_empaque") {

                        const { id1, id2, pallet1, pallet2, items } = value.datos;

                        for (const item of items) {
                            await ContenedoresRepository
                                .actualizar_pallet_contenedor(id1, pallet1, item, "rectificando fallo", user);

                            const contenedor = await ContenedoresRepository
                                .get_Contenedores_sin_lotes({ ids: [id2] });

                            const index = contenedor[0].pallets[pallet2].get("EF1").findIndex(
                                lote => lote.lote === item.lote &&
                                    lote.calidad === item.calidad &&
                                    lote.calibre === item.calibre
                            )

                            if (index !== -1) {
                                await ContenedoresRepository.restar_item_lista_empaque(
                                    id2, pallet2, index, item.cajas, "rectificando fallo", user
                                )
                            }
                        }

                    }
                }
            }
            throw new Error(`Code ${err.status}: ${err.message}`);
        }
    }
    static async restar_mover_contenedor_contenedor(contenedor1, contenedor2, cajas, action, user) {
        const pilaFunciones = [];

        try {
            const seleccion = contenedor1.seleccionado;
            //se eliminan los items de la lista de empaque
            const items = await ContenedoresRepository.restar_mover_items_lista_empaque(
                contenedor1._id,
                contenedor2._id,
                contenedor1.pallet,
                contenedor2.pallet,
                seleccion[0],
                cajas,
                action,
                user
            );

            pilaFunciones.push({
                funcion: "mover_items_lista_empaque",
                datos: {
                    id1: contenedor1._id,
                    id2: contenedor2._id,
                    pallet1: contenedor1.pallet,
                    pallet2: contenedor2.pallet,
                    item: items,
                    cajas: cajas
                }
            })
            const query = {
                $addToSet: { contenedores: contenedor2._id }
            }

            await LotesRepository.modificar_lote_proceso(items.lote, query, `Se agrega contenedor ${contenedor2._id}`, user)

        } catch (err) {
            if (err.status !== 408) {
                for (const value of Object.values(pilaFunciones)) {
                    if (value.funcion === "mover_items_lista_empaque") {

                        const { id1, id2, pallet1, pallet2, item, cajas } = value.datos;

                        const contenedor1 = await ContenedoresRepository.get_Contenedores_sin_lotes({ ids: [id1] });

                        const index = contenedor1[0].pallets[pallet1].get("EF1").findIndex(
                            lote => lote.lote === item.lote &&
                                lote.calidad === item.calidad &&
                                lote.calibre === item.calibre &&
                                lote.tipoCaja === item.tipocaja

                        )
                        if (index === -1) {
                            await ContenedoresRepository.actualizar_pallet_contenedor(id1, pallet1, item, "corregir fallo", user);
                        } else {
                            const newPallet = contenedor1[0].pallets[pallet1]
                            newPallet.get("EF1")[index].cajas += cajas

                            await ContenedoresRepository.actualizar_pallet_item_contenedor(
                                id1, pallet1, item, newPallet, "corregir fallo", user)
                        }

                        const contenedor2 = await ContenedoresRepository.get_Contenedores_sin_lotes({ ids: [id2] });

                        const index2 = contenedor2[0].pallets[pallet2].get("EF1").findIndex(
                            lote => lote.lote === item.lote &&
                                lote.calidad === item.calidad &&
                                lote.calibre === item.calibre &&
                                lote.tipoCaja === item.tipocaja
                        )
                        if (index2 !== -1) {
                            await ContenedoresRepository.restar_item_lista_empaque(
                                id2, pallet2, index2, cajas, "rectificando fallo", user
                            )
                        }


                    }
                }
            }
            throw new Error(`Code ${err.status}: ${err.message}`);

        }

    }
    static async cerrar_contenedor(req, user) {
        const { _id, action } = req;
        const contenedor = await ContenedoresRepository.getContenedores({ ids: [_id] });
        const lista = await insumos_contenedor(contenedor[0])
        const listasAlias = Object.keys(lista);
        const idsInsumos = await InsumosRepository.get_insumos({
            query: {
                codigo: { $in: listasAlias },
            }
        })
        const listaInsumos = {};
        idsInsumos.forEach(item => {
            listaInsumos[`insumosData.${item._id.toString()}`] = lista[item.codigo]
        })
        await ContenedoresRepository.cerrar_lista_empaque(_id, listaInsumos, action, user);
        procesoEventEmitter.emit("listaempaque_update");
        return { status: 200, message: 'Ok' }
    }
    static async add_contenedor_insumos_items(req, user) {
        const { action, data, _id, __v } = req
        const query = {
            insumosData: data
        }
        await ContenedoresRepository.modificar_contenedor(
            _id, query, user, action, __v
        );
    }

    // #region POST
    static async post_inventarios_ingreso_lote(req, user) {

        try {
            //JS
            const { data } = req
            let enf
            console.log(data)
            if (!data.ef || data.ef.startsWith('EF1')) {
                enf = await VariablesDelSistema.generarEF1(data.fecha_estimada_llegada)
            } else if (data.ef.startsWith('EF8')) {
                enf = await VariablesDelSistema.generarEF8(data.fecha_estimada_llegada)

            } else {
                throw new ProcessError(470, `Error codigo no valido de EF`)
            }


            const proveedor = await ProveedoresRepository.get_proveedores({
                ids: [data.predio],
                select: { precio: 1 }
            })

            if (!proveedor[0].precio) throw Error("El proveedor no tiene un precio establecido")

            const query = {
                ...data,
                precio: proveedor[0].precio[data.tipoFruta],
                enf: enf,
                fecha_salida_patio: new Date(data.fecha_estimada_llegada),
                fecha_ingreso_patio: new Date(data.fecha_estimada_llegada),
                fecha_ingreso_inventario: new Date(data.fecha_estimada_llegada),
            }
            const lote = await LotesRepository.addLote(query, user);

            await VariablesDelSistema.ingresarInventario(lote._id.toString(), Number(lote.canastillas));

            if (data.ef.startsWith('EF1')) {
                await VariablesDelSistema.incrementarEF1();
            } else if (data.ef.startsWith('EF8')) {
                await VariablesDelSistema.incrementarEF8();
            }

            procesoEventEmitter.emit("server_event", {
                action: "add_lote",
                data: {
                    ...lote._doc,
                    predio: proveedor[0].PREDIO
                }
            });


            //Rust
            // console.time("Duración de miFuncion");

            // const enf = await VariablesDelSistema.generarEF1()
            // let lote = data.data.data
            // const user = data.user.user

            // const proveedor = await ProveedoresRepository.get_proveedores({
            //     ids: [lote.predio],
            //     select: { precio: 1 }
            // })

            // const query = {
            //     ...lote,
            //     precio: proveedor[0].precio[lote.tipoFruta],
            //     enf: enf,
            //     fecha_salida_patio: new Date(lote.fecha_estimada_llegada),
            //     fecha_ingreso_inventario: new Date(lote.fecha_estimada_llegada),
            // }
            // lote = await LotesRepository.addLote(query, user);

            // const rustConnectionProceso = getRustConnectionProceso()
            // const request = {
            //     action: "ingresar_inventario",
            //     collection: "variables_del_sistema",
            //     data: {
            //         _id: lote._id.toString(),
            //         canastillas: Number(lote.canastillas)
            //     }
            // }
            // const enf_json = await rustConnectionProceso.sendMessage(request)
            // const response = JSON.parse(enf_json)
            // console.log(response)

            // await VariablesDelSistema.incrementarEF1();

            // procesoEventEmitter.emit("server_event", {
            //     section: "inventario_fruta_sin_procesar",
            //     action: "add_lote",
            //     data: {
            //         ...lote._doc,
            //         predio: proveedor[0].PREDIO
            //     }
            // });
            // console.timeEnd("Duración de miFuncion");

        } catch (err) {
            if (err.status === 521) {
                throw err
            }
            throw new ProcessError(470, `Error ${err.type}: ${err.message}`)

        }

    }
    static async post_inventarios_registros_fruta_descompuesta(req, user) {
        const pilaFunciones = [];
        try {
            const { data, descarte } = req
            const response = await FrutaDescompuestaRepository.post_fruta_descompuesta(data, user._id);

            pilaFunciones.push({
                funcion: "post_fruta_descompuesta",
                datos: {
                    response
                }
            })
            if (!descarte) throw new Error("No hay descarte")

            //eliminar kilos del descarte
            VariablesDelSistema.restar_fruta_inventario_descarte(descarte, data.tipo_fruta)

            procesoEventEmitter.emit("server_event", {
                action: "registro_fruta_descompuesta"
            });

        } catch (err) {
            if (pilaFunciones.length > 0) {
                if (pilaFunciones[0].funcion === "post_fruta_descompuesta") {
                    FrutaDescompuestaRepository.delete_fruta_descompuesta(
                        pilaFunciones[0].datos.response._id
                    )
                }
            }
            if (err.status === 521) {
                throw err
            }
            throw new ProcessError(470, `Error ${err.type}: ${err.message}`)
        }
    }
    static async set_hora_inicio_proceso() {
        const date = await VariablesDelSistema.set_hora_inicio_proceso();
        procesoEventEmitter.emit("status_proceso", {
            status: true
        });
        return date
    }



    // static async mover_item_cajasSinPallet_contenedor(contenedor1, contenedor2, action, user) {
    //     const seleccionOrdenado = contenedor1.seleccionado.sort((a, b) => b - a);
    //     const items = await VariablesDelSistema.eliminar_items_cajas_sin_pallet(seleccionOrdenado);

    //     await ContenedoresRepository.agregar_items_lista_empaque(contenedor2._id, contenedor2.pallet, items, action, user)

    //     const query = {
    //         $addToSet: { contenedores: contenedor2._id }
    //     }
    //     const idsArr = items.map(item => item.lote)
    //     const lotesSet = new Set(idsArr);
    //     const lotesIds = [...lotesSet];
    //     for (let i = 0; i < lotesIds.length; i++) {
    //         await LotesRepository.modificar_lote_proceso(lotesIds[i], query, `Se agrega contenedor ${contenedor2._id}`, user)
    //     }

    // }
    // static async mover_item_contenedor_cajasSinPallet(contenedor1, action, user) {
    //     const seleccionOrdenado = contenedor1.seleccionado.sort((a, b) => b - a);
    //     const items = await ContenedoresRepository.eliminar_items_lista_empaque(
    //         contenedor1._id,
    //         contenedor1.pallet,
    //         seleccionOrdenado,
    //         action,
    //         user
    //     );
    //     for (let i = 0; i < items.length; i++) {
    //         await VariablesDelSistema.ingresar_item_cajas_sin_pallet(items[i])
    //     }

    // }
    // static async restar_mover_item_cajasSinPallet_contenedor(contenedor1, contenedor2, cajas, action, user) {
    //     const seleccionOrdenado = contenedor1.seleccionado;
    //     const item = await VariablesDelSistema.restar_items_cajas_sin_pallet(seleccionOrdenado, cajas);

    //     await ContenedoresRepository.actualizar_pallet_contenedor(
    //         contenedor2._id,
    //         contenedor2.pallet,
    //         item,
    //         action,
    //         user);
    //     const query = {
    //         $addToSet: { contenedores: contenedor2._id }
    //     }

    //     await LotesRepository.modificar_lote_proceso(item.lote, query, `Se agrega contenedor ${contenedor2._id}`, user)

    // }
    // static async restar_mover_item_contenedor_cajasSinPallet(contenedor1, cajas, action, user) {
    //     const seleccionOrdenado = contenedor1.seleccionado;
    //     const item = await ContenedoresRepository.restar_item_lista_empaque(
    //         contenedor1._id,
    //         contenedor1.pallet,
    //         seleccionOrdenado[0],
    //         cajas,
    //         action,
    //         user
    //     );
    //     item.cajas = cajas

    //     await VariablesDelSistema.ingresar_item_cajas_sin_pallet(item)
    // }

}

module.exports.ProcesoRepository = ProcesoRepository

const transformObject = async (obj) => {
    const result = {};

    for (const key in obj) {
        if (key === '_id') {
            result[key] = obj[key];
            continue;
        }

        const [mainKey, subKey] = key.split('.');
        if (!result[mainKey]) {
            result[mainKey] = {};
        }

        result[mainKey][subKey] = -obj[key];
    }

    return result;
};