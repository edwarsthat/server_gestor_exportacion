const { UploaAWSRepository } = require("../../aws/lambda/upload");
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
    static async obtenerHistorialLotes(data) {
        const { fechaInicio, fechaFin } = data
        const query = {
            operacionRealizada: 'vaciarLote'
        }
        if (fechaInicio || fechaFin) {
            query.fecha = {}
            if (fechaInicio) {
                const localDate = parse(fechaInicio, 'yyyy-MM-dd', new Date())
                const inicio = startOfDay(localDate);

                query.fecha.$gte = inicio
            } else {
                query.fecha.$gte = new Date(0)
            }
            if (fechaFin) {
                const localDate = parse(fechaFin, 'yyyy-MM-dd', new Date());
                const fin = endOfDay(localDate);

                query.fecha.$lt = fin
            } else {
                query.fecha.$lt = new Date()
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
                const localDate = parse(fechaInicio, 'yyyy-MM-dd', new Date())
                const inicio = startOfDay(localDate);
                query.fecha.$gte = inicio
            } else {
                query.fecha.$gte = new Date(0)
            }
            if (fechaFin) {
                const localDate = parse(fechaFin, 'yyyy-MM-dd', new Date());
                const fin = endOfDay(localDate);
                query.fecha.$lt = new Date(fin)
            } else {
                query.fecha.$lt = new Date()
            }
        }
        const recordLotes = await RecordLotesRepository.getVaciadoRecord({ query: query })
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
    static async getLotesCalidadInterna() {
        const query = {
            'calidad.calidadInterna': { $exists: false },
            enf: { $regex: '^E', $options: 'i' }
        }
        const select = { enf: 1, calidad: 1, tipoFruta: 1 }
        const lotes = await LotesRepository.getLotes({ query: query, select: select })
        return lotes
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
                fechaIngreso: 1
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
            user: user,
            query: {
                operacionRealizada: 'ingresar_descarte_lavado'
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
            select: { infoContenedor: 1, numeroContenedor: 1 },
            query: query
        });
        console.log(response)

        return response
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
        const kilosProcesados = await VariablesDelSistema.ingresar_kilos_procesados(kilos);
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
        const kilosProcesados = await VariablesDelSistema.ingresar_kilos_procesados(kilos);
        procesoEventEmitter.emit("proceso_event", {
            kilosProcesadosHoy: kilosProcesados
        });
    }
    static async ingresar_foto_calidad(req, user) {
        const { foto, fotoName, _id } = req
        const fotosPath = "G:/Mi unidad/fotos_frutas/";
        const base64Data = foto.replace(/^data:image\/\w+;base64,/, "");
        const fotoPath = fotosPath + _id + "_" + fotoName + ".png";

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
    static async vaciarLote(data, user, sendData) {
        const { _id, kilosVaciados, inventario, __v, action } = data;
        const query = {
            $inc: {
                kilosVaciados: kilosVaciados,
                __v: 1,
            },
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

        //se sube los datos a la nube
        await UploaAWSRepository.eliminar_item_inventario_fruta_sin_procesar(lote[0])
        //envia el evento al cliente
        await sendData(lote)
        procesoEventEmitter.emit("proceso_event", {
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

        const lote = await LotesRepository.getLotes({ ids: [_id] })
        await UploaAWSRepository.upload_item_inventario_fruta_sin_procesar(lote[0], inventario)
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

        const isDelete = await VariablesDelSistema.modificarInventario(_id, inventario);
        await LotesRepository.deshidratacion(lote);

        // proceso para enviar a la nube
        const loteSend = await LotesRepository.getLotes({ ids: [_id] });
        if (isDelete) {
            await UploaAWSRepository.eliminar_item_inventario_fruta_sin_procesar(loteSend[0])
        } else {
            const inventarioData = await VariablesDelSistema.get_item_inventario(_id)
            await UploaAWSRepository.modificar_item_inventario_fruta_sin_procesar(loteSend[0], { inventario: inventarioData })
        }
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
        const clientePromise = iniciarRedisDB();
        const cliente = await clientePromise
        VariablesDelSistema.modificar_predio_proceso_listaEmpaque(data, cliente)

    }
    static async reiniciarValores_proceso() {
        await VariablesDelSistema.reiniciarValores_proceso();
    }
    // #region POST
    static async addLote(data) {
        const enf = await VariablesDelSistema.generarEF1()
        const lote = await LotesRepository.addLote(data, enf);
        await VariablesDelSistema.ingresarInventario(lote._id.toString(), Number(data.data.data.canastillas));
        await VariablesDelSistema.incrementarEF1();
        const loteWeb = await LotesRepository.getLotes({ ids: [lote._id] })
        await UploaAWSRepository.upload_item_inventario_fruta_sin_procesar(loteWeb[0], data.data.data.canastillas)
    }
    static async set_hora_inicio_proceso() {
        const date = await VariablesDelSistema.set_hora_inicio_proceso();
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