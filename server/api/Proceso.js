const { iniciarRedisDB } = require("../../DB/redis/init");
const { ProcessError } = require("../../Error/ProcessError");
const { procesoEventEmitter } = require("../../events/eventos");
const { RecordLotesRepository } = require("../archive/ArchiveLotes");
const { ContenedoresRepository } = require("../Class/Contenedores");
const { DespachoDescartesRepository } = require("../Class/DespachoDescarte");
const { LotesRepository } = require("../Class/Lotes");
const { ProveedoresRepository } = require("../Class/Proveedores");
const { VariablesDelSistema } = require("../Class/VariablesDelSistema");
const fs = require("fs");
const { startOfDay, parse, endOfDay } = require('date-fns');
const calidadFile = require('../../constants/calidad.json');
const { insumos_contenedor } = require("../functions/insumos");
const { InsumosRepository } = require("../Class/Insumos");
const path = require('path');


class ProcesoRepository {

    // #region GET
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
            skip: (page - 1) * resultsPerPage
        });
        const proveedoresids = lotes.map(lote => lote.documento.predio);
        const proveedoresSet = new Set(proveedoresids)
        const proveedoresArr = [...proveedoresSet]

        const proveedores = await ProveedoresRepository.get_proveedores({
            ids: proveedoresArr
        })

        const result = lotes.map(lote => {
            const proveedor = proveedores.find(proveedor => proveedor._id.toString() === lote.documento.predio.toString());

            if (proveedor) {
                delete lote.documento.predio
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
        const inventario = await VariablesDelSistema.getInventario();
        const inventarioKeys = Object.keys(inventario)
        const lotes = await LotesRepository.getLotes({
            ids: inventarioKeys,
            select: {
                __v: 1,
                clasificacionCalidad: 1,
                nombrePredio: 1,
                fechaIngreso: 1,
                observaciones: 1,
                tipoFruta: 1,
                promedio: 1,
                enf: 1,
                kilosVaciados: 1
            }
        });
        //se agrega las canastillas en inventario
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
        return resultado
    }
    static async getInventario_orden_vaceo() {
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
            enf: { $regex: '^E', $options: 'i' },
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
                precio: 1,
                aprobacionComercial: 1,
                exportacionDetallada: 1
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
                    { fechaIngreso: { $gte: new Date(haceUnMes) } },
                ],
            },
            select: { enf: 1 }
        });
        return lotes
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
        const fehcaActual = new Date(fecha)
        const year = fehcaActual.getFullYear();
        const month = fehcaActual.getMonth();
        const query = {
            "infoContenedor.fechaInicio": {
                $gte: new Date(year, month, 1),
                $lt: new Date(year, month + 1, 1)
            }
        }
        const response = await ContenedoresRepository.get_Contenedores_sin_lotes({
            select: { infoContenedor: 1, numeroContenedor: 1, __v: 1 },
            query: query
        });
        return response
    }
    static async obtener_contenedores_programacion_mulas() {
        const haceUnMes = new Date();
        haceUnMes.setMonth(haceUnMes.getMonth() - 1);

        const response = await ContenedoresRepository.get_Contenedores_sin_lotes({
            select: { infoContenedor: 1, numeroContenedor: 1, infoTractoMula: 1 },
            query: {
                'infoContenedor.fechaCreacion': { $gte: new Date(haceUnMes) },
            },
        });
        return response
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
    static async get_contenedores_programacion_mula() {
        const haceUnMes = new Date();
        haceUnMes.setMonth(haceUnMes.getMonth() - 1);
        const inicioDeMes = new Date(haceUnMes.getFullYear(), haceUnMes.getMonth(), 1);
        const finDeMes = new Date(haceUnMes.getFullYear(), haceUnMes.getMonth() + 1, 0, 23, 59, 59, 999);

        const response = await ContenedoresRepository.get_Contenedores_sin_lotes({
            query: {
                $and: [
                    {
                        'infoContenedor.fechaCreacion': {
                            $gte: inicioDeMes,
                            $lte: finDeMes
                        }
                    },
                    { infoTractoMula: { $exists: true } },
                    { "infoTractoMula.criterios": { $exists: false } }
                ],
            },
            select: { numeroContenedor: 1, infoContenedor: 1, __v: 1, infoTractoMula: 1 },
            sort: { 'infoContenedor.fechaCreacion': -1 },
        });

        return response;
    }

    // #region PUT
    static async ingresar_descarte_lavado(req, user) {
        const { _id, data, action } = req;
        const keys = Object.keys(data);
        const query = { $inc: {} };
        let kilos = 0;
        for (let i = 0; i < keys.length; i++) {
            query.$inc[`descarteLavado.${keys[i]}`] = data[keys[i]];
            kilos += data[keys[i]];
        }
        query.$inc.__v = 1;

        const lote = await LotesRepository.modificar_lote_proceso(_id, query, action, user);
        await LotesRepository.deshidratacion(lote);

        await VariablesDelSistema.modificar_inventario_descarte(_id, data, "descarteLavado", lote);
        const kilosProcesados = await VariablesDelSistema.ingresar_kilos_procesados(kilos, lote.tipoFruta);
        procesoEventEmitter.emit("proceso_event", {
            kilosProcesadosHoy: kilosProcesados
        });

    }
    static async ingresar_descarte_encerado(req, user) {
        const { _id, data, action } = req;
        const keys = Object.keys(data);
        const query = { $inc: {} };
        let kilos = 0;

        for (let i = 0; i < keys.length; i++) {
            query.$inc[`descarteEncerado.${keys[i]}`] = data[keys[i]];
            kilos += data[keys[i]];
        }
        query.$inc.__v = 1;

        const lote = await LotesRepository.modificar_lote_proceso(_id, query, action, user);
        await LotesRepository.deshidratacion(lote);

        await VariablesDelSistema.modificar_inventario_descarte(_id, data, "descarteEncerado", lote);
        const kilosProcesados = await VariablesDelSistema.ingresar_kilos_procesados(kilos, lote.tipoFruta);
        procesoEventEmitter.emit("proceso_event", {
            kilosProcesadosHoy: kilosProcesados
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
        await LotesRepository.modificar_lote_proceso(_id, query, "Agregar foto calidad", user);
    }
    static async vaciarLote(data, user) {
        const { _id, kilosVaciados, inventario, __v, action } = data;
        const query = {
            $inc: {
                kilosVaciados: kilosVaciados,
                __v: 1,
            },
            fechaProceso: new Date()
        }
        await LotesRepository.modificar_lote(_id, query, action, user, __v);
        const lote = await LotesRepository.getLotes({ ids: [_id] });
        //condicional si es desverdizado o no
        if (lote[0].desverdizado) {
            await VariablesDelSistema.modificarInventario_desverdizado(lote[0]._id.toString(), inventario);
        } else {
            await VariablesDelSistema.modificarInventario(lote[0]._id.toString(), inventario);
        }
        await VariablesDelSistema.procesarEF1(lote[0], inventario);
        await VariablesDelSistema.borrarDatoOrdenVaceo(lote[0]._id.toString())

        procesoEventEmitter.emit("proceso_event", {
            predio: lote
        });
        procesoEventEmitter.emit("predio_vaciado", {
            predio: lote
        });
    }
    static async modificarHistorialFrutaProcesada(data, user) {
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

    }
    static async directoNacional(data, user) {
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
        const { _id, query, inventario, action } = data;
        const { descarteLavado, descarteEncerado } = inventario;
        const kilosDescarteLavado = descarteLavado === undefined ? 0 : Object.values(descarteLavado).reduce((acu, item) => acu -= item, 0)
        const kilosDescarteEncerado = descarteEncerado === undefined ? 0 : Object.values(descarteEncerado).reduce((acu, item) => acu -= item, 0)

        const kilosTotal = kilosDescarteLavado + kilosDescarteEncerado;
        await LotesRepository.modificar_lote_proceso(
            _id,
            { ...query, $inc: { kilosReprocesados: kilosTotal } },
            action,
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
    }
    static async modificar_programacion_contenedor(req, user) {
        const { _id, __v, infoContenedor, action } = req;
        await ContenedoresRepository.modificar_contenedor(_id, infoContenedor, user.user, action, __v);
    }
    static async add_formulario_programacion_mula(req, user) {
        const { _id, data, action } = req;
        await ContenedoresRepository.modificar_contenedor(
            _id,
            data,
            user,
            action
        )
    }
    static async desverdizado(req, user) {
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
    }
    static async set_hora_fin_proceso() {
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
    static async finalizar_informe_proveedor(req, userInfo) {
        const { _id, precio, action, contenedores } = req
        const { cargo, user } = userInfo
        if (!["66b29b1736733668246c9559"]
            .includes(cargo)) { throw new Error("Acceso no autorizado") }

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
            aprobacionComercial: true
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
    //? lista de empaque
    static async add_settings_pallet(req, user) {
        const { _id, pallet, settings, action } = req;

        const contenedor = await ContenedoresRepository.agregar_settings_pallet(_id, pallet, settings, action, user);
        const contenedores = await ContenedoresRepository.getContenedores({ query: { 'infoContenedor.cerrado': false } });
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
        return contenedores
    }
    static async actualizar_pallet_contenedor(req, user) {

        const { _id, pallet, item, action } = req;
        let kilosExportacion = 0;
        // se agrega el item a la lista de empaque
        await ContenedoresRepository.actualizar_pallet_contenedor(_id, pallet, item, action, user);
        //se agrega la exportacion a el lote
        const kilos = Number(item.tipoCaja.split('-')[1].replace(",", "."))
        const query = {
            $addToSet: { contenedores: _id },
            $inc: {}
        }
        kilosExportacion = kilos * Number(item.cajas)
        query.$inc[calidadFile[item.calidad]] = kilosExportacion
        const lote = await LotesRepository.modificar_lote_proceso(item.lote, query, "Agregar exportacion", user)
        await LotesRepository.rendimiento(lote);
        await LotesRepository.deshidratacion(lote);
        const { kilosProcesadosHoy, kilosExportacionHoy } =
            await VariablesDelSistema.ingresar_exportacion(kilosExportacion, lote.tipoFruta)
        procesoEventEmitter.emit("proceso_event", {
            kilosProcesadosHoy: kilosProcesadosHoy,
            kilosExportacionHoy: kilosExportacionHoy
        });
        const contenedores = await ContenedoresRepository.getContenedores({ query: { 'infoContenedor.cerrado': false } });
        procesoEventEmitter.emit("listaempaque_update");
        return contenedores
    }
    static async eliminar_item_lista_empaque(req, user) {
        const { _id, pallet, seleccion, action } = req;
        let kilosTotal = { Limon: 0, Naranja: 0 };
        //se ordenan los items seleccionados
        const seleccionOrdenado = seleccion.sort((a, b) => b - a);
        //se eliminan los items de la lista de empaque
        const items = await ContenedoresRepository.eliminar_items_lista_empaque(_id, pallet, seleccionOrdenado, action, user)

        //se descuentan los kilos ne exportacion de los lotes correspondientes
        for (let i = 0; i < items.length; i++) {
            const { lote, calidad, tipoCaja, cajas } = items[i]

            const mult = Number(tipoCaja.split("-")[1].replace(",", "."))
            const kilos = cajas * mult;
            const query = { $inc: {} }
            query.$inc[calidadFile[calidad]] = -kilos;

            const loteDB = await LotesRepository.modificar_lote_proceso(lote, query, action, user);
            await LotesRepository.rendimiento(loteDB);
            await LotesRepository.deshidratacion(loteDB);
            kilosTotal[loteDB.tipoFruta] += kilos;

        }
        //se modifica la cantidad de kilos exportacion
        let kilosProcesadosHoyTotal
        let kilosExportacionHoyTotal

        Object.entries(kilosTotal).forEach(async ([key, value]) => {
            const { kilosProcesadosHoy, kilosExportacionHoy } =
                await VariablesDelSistema.ingresar_exportacion(-value, key);
            kilosProcesadosHoyTotal = kilosProcesadosHoy
            kilosExportacionHoyTotal = kilosExportacionHoy
        })

        procesoEventEmitter.emit("proceso_event", {
            kilosProcesadosHoy: kilosProcesadosHoyTotal,
            kilosExportacionHoy: kilosExportacionHoyTotal
        });
        const contenedores = await ContenedoresRepository.getContenedores({ query: { 'infoContenedor.cerrado': false } });
        procesoEventEmitter.emit("listaempaque_update");
        return contenedores
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
        const contenedores = await ContenedoresRepository.getContenedores({ query: { 'infoContenedor.cerrado': false } });
        procesoEventEmitter.emit("listaempaque_update");
        return contenedores
    }
    static async restar_item_lista_empaque(req, user) {
        const { action, _id, pallet, seleccion, cajas } = req;

        const item = await ContenedoresRepository.restar_item_lista_empaque(_id, pallet, seleccion, cajas, action, user)

        const { lote, calidad, tipoCaja } = item
        const mult = Number(tipoCaja.split("-")[1].replace(",", "."))
        const kilos = cajas * mult;
        const query = { $inc: {} }
        query.$inc[calidadFile[calidad]] = -kilos;

        const loteDB = await LotesRepository.modificar_lote_proceso(lote, query, action, user);
        await LotesRepository.rendimiento(loteDB);
        await LotesRepository.deshidratacion(loteDB);

        const { kilosProcesadosHoy, kilosExportacionHoy } =
            await VariablesDelSistema.ingresar_exportacion(-kilos, loteDB.tipoFruta)
        procesoEventEmitter.emit("proceso_event", {
            kilosProcesadosHoy: kilosProcesadosHoy,
            kilosExportacionHoy: kilosExportacionHoy
        });
        const contenedores = await ContenedoresRepository.getContenedores({ query: { 'infoContenedor.cerrado': false } });
        procesoEventEmitter.emit("listaempaque_update");

        return contenedores
    }
    static async mover_item_lista_empaque(req, user) {
        const { contenedor1, contenedor2, cajas, action } = req;

        if (contenedor1.pallet !== -1 && contenedor2.pallet !== -1 && cajas === 0) {
            await this.mover_item_entre_contenedores(contenedor1, contenedor2, action, user);
        } else if (contenedor1.pallet === -1 && contenedor2.pallet !== -1 && cajas === 0) {
            await this.mover_item_cajasSinPallet_contenedor(contenedor1, contenedor2, action, user)
        } else if (contenedor1.pallet !== -1 && contenedor2._id === -1 && cajas === 0) {
            await this.mover_item_contenedor_cajasSinPallet(contenedor1, action, user)
        } else if (contenedor1.pallet !== -1 && contenedor2.pallet !== -1 && cajas !== 0) {
            await this.restar_mover_contenedor_contenedor(contenedor1, contenedor2, cajas, action, user)
        } else if (contenedor1.pallet === -1 && contenedor2.pallet !== -1 && cajas !== 0) {
            await this.restar_mover_item_cajasSinPallet_contenedor(contenedor1, contenedor2, cajas, action, user)
        } else if (contenedor1.pallet !== -1 && contenedor2._id === -1 && cajas !== 0) {
            await this.restar_mover_item_contenedor_cajasSinPallet(contenedor1, cajas, action, user)
        }

        const contenedores = await ContenedoresRepository.getContenedores({ query: { 'infoContenedor.cerrado': false } });
        const cajasSinPallet = await VariablesDelSistema.obtener_cajas_sin_pallet();
        procesoEventEmitter.emit("listaempaque_update");

        return { contenedores: contenedores, cajasSinPallet: cajasSinPallet }
    }
    static async mover_item_entre_contenedores(contenedor1, contenedor2, action, user) {
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
        const query = {
            $addToSet: { contenedores: contenedor2._id }
        }
        const idsArr = items.map(item => item.lote)
        const lotesSet = new Set(idsArr);
        const lotesIds = [...lotesSet];
        for (let i = 0; i < lotesIds.length; i++) {
            await LotesRepository.modificar_lote_proceso(lotesIds[i], query, `Se agrega contenedor ${contenedor2._id}`, user)
        }
    }
    static async mover_item_cajasSinPallet_contenedor(contenedor1, contenedor2, action, user) {
        const seleccionOrdenado = contenedor1.seleccionado.sort((a, b) => b - a);
        const items = await VariablesDelSistema.eliminar_items_cajas_sin_pallet(seleccionOrdenado);

        await ContenedoresRepository.agregar_items_lista_empaque(contenedor2._id, contenedor2.pallet, items, action, user)

        const query = {
            $addToSet: { contenedores: contenedor2._id }
        }
        const idsArr = items.map(item => item.lote)
        const lotesSet = new Set(idsArr);
        const lotesIds = [...lotesSet];
        for (let i = 0; i < lotesIds.length; i++) {
            await LotesRepository.modificar_lote_proceso(lotesIds[i], query, `Se agrega contenedor ${contenedor2._id}`, user)
        }

    }
    static async mover_item_contenedor_cajasSinPallet(contenedor1, action, user) {
        const seleccionOrdenado = contenedor1.seleccionado.sort((a, b) => b - a);
        const items = await ContenedoresRepository.eliminar_items_lista_empaque(
            contenedor1._id,
            contenedor1.pallet,
            seleccionOrdenado,
            action,
            user
        );
        for (let i = 0; i < items.length; i++) {
            await VariablesDelSistema.ingresar_item_cajas_sin_pallet(items[i])
        }

    }
    static async restar_mover_contenedor_contenedor(contenedor1, contenedor2, cajas, action, user) {
        const seleccionOrdenado = contenedor1.seleccionado;
        //se eliminan los items de la lista de empaque
        const items = await ContenedoresRepository.restar_mover_items_lista_empaque(
            contenedor1._id,
            contenedor2._id,
            contenedor1.pallet,
            contenedor2.pallet,
            seleccionOrdenado,
            cajas,
            action,
            user
        );
        const query = {
            $addToSet: { contenedores: contenedor2._id }
        }

        await LotesRepository.modificar_lote_proceso(items.lote, query, `Se agrega contenedor ${contenedor2._id}`, user)


    }
    static async restar_mover_item_cajasSinPallet_contenedor(contenedor1, contenedor2, cajas, action, user) {
        const seleccionOrdenado = contenedor1.seleccionado;
        const item = await VariablesDelSistema.restar_items_cajas_sin_pallet(seleccionOrdenado, cajas);

        await ContenedoresRepository.actualizar_pallet_contenedor(
            contenedor2._id,
            contenedor2.pallet,
            item,
            action,
            user);
        const query = {
            $addToSet: { contenedores: contenedor2._id }
        }

        await LotesRepository.modificar_lote_proceso(item.lote, query, `Se agrega contenedor ${contenedor2._id}`, user)

    }
    static async restar_mover_item_contenedor_cajasSinPallet(contenedor1, cajas, action, user) {
        const seleccionOrdenado = contenedor1.seleccionado;
        const item = await ContenedoresRepository.restar_item_lista_empaque(
            contenedor1._id,
            contenedor1.pallet,
            seleccionOrdenado[0],
            cajas,
            action,
            user
        );
        item.cajas = cajas

        await VariablesDelSistema.ingresar_item_cajas_sin_pallet(item)
    }
    static async agregar_cajas_sin_pallet(req, user) {

        const { item } = req;
        await VariablesDelSistema.ingresar_item_cajas_sin_pallet(item)
        //se agrega la exportacion a el lote
        const kilos = Number(item.tipoCaja.split('-')[1].replace(",", "."))
        let kilosTotal = kilos * Number(item.cajas)

        const query = { $inc: {} }
        query.$inc[calidadFile[item.calidad]] = kilosTotal
        const lote = await LotesRepository.modificar_lote_proceso(item.lote, query, "Agregar exportacion", user)
        await LotesRepository.rendimiento(lote);
        await LotesRepository.deshidratacion(lote);

        const { kilosProcesadosHoy, kilosExportacionHoy } =
            await VariablesDelSistema.ingresar_exportacion(kilosTotal, lote.tipoFruta);
        procesoEventEmitter.emit("proceso_event", {
            kilosProcesadosHoy: kilosProcesadosHoy,
            kilosExportacionHoy: kilosExportacionHoy
        });

        //envia las cajas sin pallet actualizadas
        const cajasSinPallet = await VariablesDelSistema.obtener_cajas_sin_pallet();
        return cajasSinPallet
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
    static async add_inspeccion_mula_contenedor(req, user) {
        const { _id, __v, data, action } = req;
        const query = {
            "infoTractoMula.criterios": data
        }
        await ContenedoresRepository.modificar_contenedor(
            _id, query, user, action, __v
        );
    }
    // #region POST
    static async addLote(data) {
        const enf = await VariablesDelSistema.generarEF1()
        const lote = await LotesRepository.addLote(data, enf);
        await VariablesDelSistema.ingresarInventario(lote._id.toString(), Number(data.data.data.canastillas));
        await VariablesDelSistema.incrementarEF1();

        procesoEventEmitter.emit("nuevo_predio", {
            predio: lote
        });

    }
    static async set_hora_inicio_proceso() {
        const date = await VariablesDelSistema.set_hora_inicio_proceso();
        procesoEventEmitter.emit("status_proceso", {
            status: true
        });
        return date
    }
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