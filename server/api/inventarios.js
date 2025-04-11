const { InventariosLogicError } = require("../../Error/logicLayerError");
const { procesoEventEmitter } = require("../../events/eventos");
const { RecordLotesRepository } = require("../archive/ArchiveLotes");
const { CanastillasRepository } = require("../Class/CanastillasRegistros");
const { ContenedoresRepository } = require("../Class/Contenedores");
const { DespachoDescartesRepository } = require("../Class/DespachoDescarte");
const { FrutaDescompuestaRepository } = require("../Class/FrutaDescompuesta");
const { InsumosRepository } = require("../Class/Insumos");
const { LotesRepository } = require("../Class/Lotes");
const { PreciosRepository } = require("../Class/Precios");
const { ProveedoresRepository } = require("../Class/Proveedores");
const { UsuariosRepository } = require("../Class/Usuarios");
const { VariablesDelSistema } = require("../Class/VariablesDelSistema");
const { InventariosValidations } = require("../validations/inventarios");
const { modificarInventarioCanastillas } = require("./helper/inventarios");
const { ajustarCanastillasProveedor } = require("./services/inventarios");
const { obtenerEstadoDesdeAccionCanastillasInventario } = require("./utils/diccionarios");
const { filtroFechaInicioFin } = require("./utils/filtros");
const { transformObjectInventarioDescarte } = require("./utils/objectsTransforms");

class InventariosRepository {
    //#region inventarios
    static async put_inventarios_frutaDesverdizando_parametros(req) {
        try {
            const { __v, _id, data, action } = req.data;
            const user = req.user.user;
            const query = {
                $push: {
                    "desverdizado.parametros": data
                },
                $inc: {
                    __v: 1,
                }
            }
            await LotesRepository.modificar_lote(_id, query, action, user, __v);
        } catch (err) {
            if (err.status === 523) {
                throw err
            }
            throw new InventariosLogicError(470, `Error ${err.type}: ${err.message}`)
        }
    }
    static async put_inventarios_frutaDesverdizado_finalizar(req) {
        try {
            const { data, user } = req
            const { _id, __v, action } = data;
            const query = {
                "desverdizado.fechaFinalizar": new Date(),
                $inc: {
                    __v: 1,
                }
            }
            await LotesRepository.modificar_lote(_id, query, action, user.user, __v);
            procesoEventEmitter.emit("server_event", {
                action: "finalizar_desverdizado",
                data: {}
            });
        } catch (err) {
            if (err.status === 523) {
                throw err
            }
            throw new InventariosLogicError(470, `Error ${err.type}: ${err.message}`)
        }
    }
    static async get_inventarios_frutaDescarte_fruta() {
        try {
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
        } catch (err) {
            if (err.status === 518 || err.status === 413) {
                throw err
            }
            throw new InventariosLogicError(470, `Error ${err.type}: ${err.message}`)
        }
    }
    static async put_inventarios_frutaDescarte_despachoDescarte(req) {
        try {
            const { user } = req.user;
            const { data } = req.data;

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
        } catch (err) {
            if (err.status === 518 || err.status === 413 || err.status === 521) {
                throw err
            }
            throw new InventariosLogicError(470, `Error ${err.type}: ${err.message}`)
        }

    }
    static async put_inventarios_frutaDescarte_reprocesarFruta(req) {
        try {
            const { user } = req.user
            const { data } = req
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
        } catch (err) {
            if (err.status === 518 || err.status === 413) {
                throw err
            }
            throw new InventariosLogicError(470, `Error ${err.type}: ${err.message}`)
        }
    }
    static async put_inventarios_frutaDescarte_reprocesarCelifrut(req) {
        try {
            const { data, user } = req
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
                const loteObj = await transformObjectInventarioDescarte(lotes[i]);
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
        } catch (err) {
            if (
                err.status === 518 ||
                err.status === 413 ||
                err.status === 506 ||
                err.status === 521 ||
                err.status === 511 ||
                err.status === 523
            ) {
                throw err
            }
            throw new InventariosLogicError(470, `Error ${err.type}: ${err.message}`)
        }
    }
    static async post_inventarios_frutaDescarte_frutaDescompuesta(req) {
        const pilaFunciones = [];
        try {
            const { user, data: datos } = req;
            const { data, descarte } = datos;

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
            if (err.status === 521 || err.status === 518) {
                throw err
            }
            throw new InventariosLogicError(470, `Error ${err.type}: ${err.message}`)
        }
    }
    static async get_inventarios_canastillas_canastillasCelifrut() {
        try {
            const response = await VariablesDelSistema.obtener_canastillas_inventario()
            return response
        } catch (err) {
            if (err.status === 518 || err.status === 413) {
                throw err
            }
            throw new InventariosLogicError(470, `Error ${err.type}: ${err.message}`)
        }
    }
    static async put_inventarios_canastillas_celifrut(req) {
        try {
            const { canastillasPrestadas, canastillas } = req.data
            if (canastillas) {
                await VariablesDelSistema.set_canastillas_inventario(canastillas, "canastillas")
            }
            if (canastillasPrestadas) {
                await VariablesDelSistema.set_canastillas_inventario(canastillasPrestadas, "canastillasPrestadas")
            }
        } catch (err) {
            if (err.status === 523) {
                throw err
            }
            throw new InventariosLogicError(470, `Error ${err.type}: ${err.message}`)
        }
    }
    static async post_inventarios_canastillas_registro(req) {
        try {
            const { user } = req
            const { data } = req.data

            const {
                destino,
                origen,
                observaciones,
                fecha,
                canastillas,
                canastillasPrestadas,
                accion,
                remitente,
                destinatario
            } = data
            InventariosValidations.post_inventarios_canastillas_registro(data);

            //Se crean los datos del registro de canastillas
            const dataRegistro = {
                fecha: new Date(fecha),
                destino: destino,
                origen: origen,
                cantidad: {
                    propias: canastillas,
                    // Se deja como array porque en el futuro se manejarán varios propietarios
                    prestadas: [
                        {
                            cantidad: canastillasPrestadas,
                            propietario: ""
                        }
                    ]
                },
                observaciones: observaciones,
                referencia: "C1",
                tipoMovimiento: accion,
                estado: accion,
                usuario: {
                    id: user._id,
                    user: user.user
                },
                remitente: remitente,
                destinatario: destinatario
            }

            dataRegistro.estado = obtenerEstadoDesdeAccionCanastillasInventario(accion)

            if (accion === "ingreso") {

                await ajustarCanastillasProveedor(origen, -(canastillas + canastillasPrestadas));
                await modificarInventarioCanastillas(canastillas, canastillasPrestadas);

            } else if (accion === "salida") {

                await ajustarCanastillasProveedor(destino, canastillas + canastillasPrestadas);
                await modificarInventarioCanastillas(-canastillas, -canastillasPrestadas);

            } else if (accion === 'traslado') {

                await ajustarCanastillasProveedor(origen, -(canastillas + canastillasPrestadas));
                await ajustarCanastillasProveedor(destino, canastillas + canastillasPrestadas);

            }

            await CanastillasRepository.post_registro(dataRegistro)

        } catch (err) {
            console.log(err)
            if (err.status === 521 || err.status === 523) {
                throw err
            }
            throw new InventariosLogicError(470, `Error ${err.type}: ${err.message}`)
        }
    }
    //#endregion
    //#region Historiales
    static async get_inventarios_historialProcesado_frutaProcesada(data) {
        try {

            const { fechaInicio, fechaFin } = data.data
            let query = {
                operacionRealizada: 'vaciarLote'
            }

            query = filtroFechaInicioFin(fechaInicio, fechaFin, query, 'fecha')

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
        } catch (err) {
            if (err.status === 522) {
                throw err
            }
            throw new InventariosLogicError(470, `Error ${err.type}: ${err.message}`)
        }
    }
    static async put_inventarios_historialProcesado_modificarHistorial(req) {
        try {
            const { user } = req.user;
            const { data } = req;

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

            await VariablesDelSistema.ingresar_kilos_vaciados(kilosVaciados);


            procesoEventEmitter.emit("server_event", {
                action: "modificar_historial_fruta_procesada",
                data: {}
            });
        } catch (err) {
            if (err.status === 518 || err.status === 523 || err.status === 419) {
                throw err
            }
            throw new InventariosLogicError(470, `Error ${err.type}: ${err.message}`)
        }

    }
    static async put_inventarios_historialDirectoNacional_registros(req) {
        try {
            const { data } = req
            const { fechaInicio, fechaFin } = data
            let query = {
                operacionRealizada: 'directoNacional'
            }

            query = filtroFechaInicioFin(fechaInicio, fechaFin, query, 'fecha')

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
        } catch (err) {
            if (err.status === 522) {
                throw err
            }
            throw new InventariosLogicError(470, `Error ${err.type}: ${err.message}`)
        }
    }
    static async put_inventarios_historialDirectoNacional_modificarHistorial(data) {
        try {
            const { _id, directoNacional, inventario, __v, action, historialLote } = data.data;
            const { _idRecord, kilosHistorial, __vHistorial } = historialLote;
            const user = data.user.user;
            const queryLote = {
                $inc: {
                    directoNacional: directoNacional,
                    __v: 1
                }
            }
            const queryRecord = {
                $inc: {
                    "documento.$inc.directoNacional": kilosHistorial,
                    __v: 1
                }
            }
            //se modifica el lote y el inventario
            await VariablesDelSistema.modificarInventario(_id, -inventario);
            const lote = await LotesRepository.modificar_lote(_id, queryLote, action, user, __v);
            await LotesRepository.deshidratacion(lote);


            //se modifica el registro
            await RecordLotesRepository.modificarRecord(_idRecord, queryRecord, __vHistorial);
            return { status: 200, message: 'Ok' }
        } catch (err) {
            if (
                err.status === 518 ||
                err.status === 523 ||
                err.status === 515
            ) {
                throw err
            }
            throw new InventariosLogicError(470, `Error ${err.type}: ${err.message}`)
        }
    }
    static async get_inventarios_historiales_ingresoFruta_numeroElementos() {
        try {
            const filtro = {
                operacionRealizada: "crearLote"
            }
            const cantidad = await RecordLotesRepository.obtener_cantidad_recordLote(filtro)
            return cantidad
        } catch (err) {
            if (err.status === 522) {
                throw err
            }
            throw new InventariosLogicError(470, `Error ${err.type}: ${err.message}`)
        }
    }
    static async get_inventarios_historiales_ingresoFruta_registros(req) {
        try {
            const { data } = req
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

            const proveedoresids = [];
            const usersId = [];

            for (const lote of lotes) {
                proveedoresids.push(lote.documento.predio.toString());
                usersId.push(lote.user.toString());
            }

            const proveedoresSet = new Set(proveedoresids)
            const proveedoresArr = [...proveedoresSet]

            const proveedores = await ProveedoresRepository.get_proveedores({
                ids: proveedoresArr
            })

            const usersIdSet = new Set(usersId)
            const usersIdArr = [...usersIdSet]

            const user = await UsuariosRepository.get_users({
                ids: usersIdArr,
                getAll: true
            })

            const result = [];
            for (const lote of lotes) {
                const proveedor = proveedores.find(proveedor =>
                    proveedor._id.toString() === lote.documento.predio.toString()
                );

                const usuario = user.find(u => u._id.toString() === lote.user.toString());

                if (proveedor && usuario) {
                    delete lote.documento.predio0;
                    lote.documento.predio = {};
                    lote.documento.predio.PREDIO = proveedor.PREDIO;
                    lote.documento.predio._id = proveedor._id;
                    lote.user = usuario.nombre + " " + usuario.apellido;
                }
                result.push(lote);
            }
            return result;
        } catch (err) {
            if (err.status === 522) {
                throw err
            }
            throw new InventariosLogicError(470, `Error ${err.type}: ${err.message}`)
        }
    }
    static async put_inventarios_historiales_ingresoFruta_modificar(req) {
        try {
            const { data: datos, user } = req
            const { action, data, _idLote, _idRecord, __v } = datos

            await LotesRepository.modificar_lote_proceso(
                _idLote,
                {
                    ...data,
                    fecha_ingreso_patio: data.fecha_estimada_llegada,
                    fecha_salida_patio: data.fecha_estimada_llegada,
                    fecha_ingreso_inventario: data.fecha_estimada_llegada,

                },
                action,
                user
            )
            const query = {}
            Object.keys(data).forEach(item => {
                query[`documento.${item}`] = data[item]
            })
            query[`documento.fecha_ingreso_patio`] = data.fecha_estimada_llegada
            query[`documento.fecha_salida_patio`] = data.fecha_estimada_llegada
            query[`documento.fecha_ingreso_inventario`] = data.fecha_estimada_llegada

            await RecordLotesRepository.modificarRecord(
                _idRecord,
                query,
                __v
            )
        } catch (err) {
            if (err.status === 523) {
                throw err
            }
            throw new InventariosLogicError(470, `Error ${err.type}: ${err.message}`)
        }

    }
    static async get_inventarios_historiales_despachoDescarte(req) {
        try {
            const { data } = req
            const { page } = data;
            const resultsPerPage = 50;

            const historial = await DespachoDescartesRepository.get_historial_descarte({
                skip: (page - 1) * resultsPerPage,
                limit: resultsPerPage,
            });
            return historial;
        } catch (err) {
            if (err.status === 523) {
                throw err
            }
            throw new InventariosLogicError(470, `Error ${err.type}: ${err.message}`)
        }
    }
    static async get_inventarios_historiales_listasDeEmpaque(req) {
        try {
            const { data } = req;
            const { page } = data
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
        } catch (err) {
            if (err.status === 523) {
                throw err
            }
            throw new InventariosLogicError(470, `Error ${err.type}: ${err.message}`)
        }
    }
    static async get_inventarios_historiales_listasDeEmpaque_numeroRegistros() {
        const cantidad = await ContenedoresRepository.obtener_cantidad_contenedores()
        return cantidad
    }
    static async get_inventarios_historiales_contenedores(req) {
        try {
            const { data } = req;
            const { contenedores, fechaInicio, fechaFin, clientes, tipoFruta } = data
            let query = {}

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

            query = filtroFechaInicioFin(fechaInicio, fechaFin, query, 'infoContenedor.fechaCreacion')

            const cont = await ContenedoresRepository.getContenedores({
                query: query
            });
            return cont
        } catch (err) {
            if (err.status === 522) {
                throw err
            }
            throw new InventariosLogicError(470, `Error ${err.type}: ${err.message}`)
        }
    }
    static async get_inventarios_registros_fruta_descompuesta(req) {
        try {
            const { data } = req;
            const { page } = data
            const resultsPerPage = 50;

            const registros = await FrutaDescompuestaRepository.get_fruta_descompuesta({
                skip: (page - 1) * resultsPerPage,

            })

            return registros

        } catch (err) {
            if (err.status === 522) {
                throw err
            }
            throw new InventariosLogicError(470, `Error ${err.type}: ${err.message}`)
        }
    }
    static async get_inventarios_numero_registros_fruta_descompuesta() {
        try {
            const registros = await FrutaDescompuestaRepository.get_numero_fruta_descompuesta()
            return registros

        } catch (err) {
            if (err.status === 522) {
                throw err
            }
            throw new InventariosLogicError(470, `Error ${err.type}: ${err.message}`)
        }
    }
    static async get_inventarios_historiales_numeroCanastillas_registros(req) {
        try {

            const { filtro } = req.data || {}
            let query = {}

            if (filtro) {
                const { fechaInicio, fechaFin } = filtro
                InventariosValidations.validarFiltroBusquedaFechaPaginacion(req.data)
                query = filtroFechaInicioFin(fechaInicio, fechaFin, query, "createdAt") // no pases `query` si no lo necesita
            }
            const registros = await CanastillasRepository.get_numero_registros(query)

            return registros

        } catch (err) {
            if (err.status === 522) {
                throw err
            }
            throw new InventariosLogicError(
                470,
                `Error ${err?.type || 'desconocido'}: ${err?.message || 'sin mensaje'}`
            )
        }
    }
    static async get_inventarios_historiales_canastillas_registros(req) {
        try {

            const { page = 1, filtro } = req.data || {}
            const resultsPerPage = 50;
            let query = {}
            let skip = (page - 1) * resultsPerPage

            if (filtro) {
                InventariosValidations.validarFiltroBusquedaFechaPaginacion(req.data)
                const { fechaInicio, fechaFin } = filtro
                query = filtroFechaInicioFin(fechaInicio, fechaFin, query, "createdAt") // no pases `query` si no lo necesita
            }

            const registros = await CanastillasRepository.get_registros_canastillas({ query: query, skip })

            return registros

        } catch (err) {
            if (err.status === 522) {
                throw err
            }
            throw new InventariosLogicError(470, `Error ${err.type}: ${err.message}`)
        }
    }
    //#endregion
    //#region ingresos
    static async get_inventarios_ingresos_ef1() {
        try {
            const enf = await VariablesDelSistema.generarEF1();
            return enf
        }
        catch (err) {
            if (err.status === 506) {
                throw err
            }
            throw new InventariosLogicError(470, `Error ${err.type}: ${err.message}`)
        }
    }
    static async get_inventarios_ingresos_ef8() {
        try {
            const enf = await VariablesDelSistema.generarEF8();
            return enf
        } catch (err) {
            if (err.status === 506) {
                throw err
            }
            throw new InventariosLogicError(470, `Error ${err.type}: ${err.message}`)
        }
    }
    static async post_inventarios_ingreso_lote(req) {
        try {
            const { data, user } = req;
            const { dataLote: datos, dataCanastillas } = data
            let enf
            if (Number(datos.canastillas) === 0) throw new Error(`Las canastillas no pueden ser cero`)
            if (Number(datos.kilos) === 0) throw new Error(`Los kilos no pueden ser cero`)
            if (Number(datos.kilos) === 0) throw new Error(`Los kilos no pueden ser cero`)

            if (Number(datos.promedio) < 17 || Number(datos.promedio) > 23)
                throw new Error(` Los kilos no corresponden a las canastillas`)

            if (!datos.ef || datos.ef.startsWith('EF1')) {
                enf = await VariablesDelSistema.generarEF1(datos.fecha_estimada_llegada)
            } else if (datos.ef.startsWith('EF8')) {
                enf = await VariablesDelSistema.generarEF8(datos.fecha_estimada_llegada)

            } else {
                throw new InventariosLogicError(470, `Error codigo no valido de EF`)
            }


            const proveedor = await ProveedoresRepository.get_proveedores({
                ids: [datos.predio],
                select: { precio: 1, PREDIO: 1 }
            })

            const precio = await PreciosRepository.get_precios({
                ids: [proveedor[0].precio[datos.tipoFruta]]
            })

            if (!precio) throw Error("El proveedor no tiene un precio establecido")

            const query = {
                ...datos,
                precio: precio[0]._id,
                enf: enf,
                fecha_salida_patio: new Date(datos.fecha_estimada_llegada),
                fecha_ingreso_patio: new Date(datos.fecha_estimada_llegada),
                fecha_ingreso_inventario: new Date(datos.fecha_estimada_llegada),
            }

            const lote = await LotesRepository.addLote(query, user);

            await VariablesDelSistema.ingresarInventario(lote._id.toString(), Number(lote.canastillas));

            //Se crean los datos del registro de canastillas
            const dataRegistro = {
                fecha: new Date(),
                destino: "Celifrut",
                origen: lote.predio.PREDIO,
                cantidad: {
                    propias: dataCanastillas.canastillasPropias,
                    prestadas: [
                        {
                            cantidad: dataCanastillas.canastillasPrestadas,
                            propietario: proveedor[0].PREDIO
                        }
                    ]
                },
                observaciones: `Ingreso lote ${lote.enf}`,
                referencia: "C1",
                tipoMovimiento: "Ingreso",
                estado: "En planta",
                usuario: {
                    id: user._id,
                    user: user.user
                }
            }
            await CanastillasRepository.post_registro(dataRegistro)

            await VariablesDelSistema.modificar_canastillas_inventario(dataCanastillas.canastillasPropias, "canastillas")
            await VariablesDelSistema.modificar_canastillas_inventario(dataCanastillas.canastillasPrestadas, "canastillasPrestadas")

            if (datos.ef.startsWith('EF1')) {
                await VariablesDelSistema.incrementarEF1();
            } else if (datos.ef.startsWith('EF8')) {
                await VariablesDelSistema.incrementarEF8();
            }

            procesoEventEmitter.emit("server_event", {
                action: "add_lote",
                data: {
                    ...lote._doc,
                    predio: proveedor[0].PREDIO
                }
            });

        } catch (err) {
            if (err.status === 521) {
                throw err
            }
            throw new InventariosLogicError(470, err.message)

        }

    }
    //#endregion
    //#region programacion
    static async get_inventarios_programaciones_contenedores(req) {
        try {
            const { data } = req
            const { fecha } = data;
            const fechaActual = new Date(fecha);
            const year = fechaActual.getFullYear();
            const month = fechaActual.getMonth();

            const startDate = new Date(Date.UTC(year, month, 1));
            const endDate = new Date(Date.UTC(year, month + 1, 1));

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
        } catch (err) {
            if (err.status === 522) {
                throw err
            }
            throw new InventariosLogicError(470, `Error ${err.type}: ${err.message}`)

        }
    }
    static async put_inventarios_programacion_contenedores(req) {
        try {
            const { data, user } = req;
            const { _id, __v, infoContenedor, action } = data;
            await ContenedoresRepository.modificar_contenedor(_id, infoContenedor, user.user, action, __v);
        } catch (err) {
            if (err.status === 523) {
                throw err
            }
            throw new InventariosLogicError(470, `Error ${err.type}: ${err.message}`)

        }
    }
    //#endregion
    //#region insumos
    static async get_inventarios_insumos() {
        try {
            const insumos = await InsumosRepository.get_insumos()
            return insumos
        } catch (err) {
            if (err.status === 522) {
                throw err
            }
            throw new InventariosLogicError(470, `Error ${err.type}: ${err.message}`)
        }
    }
    static async put_inventarios_insumos(req) {
        try {
            const { data: datos, user } = req

            const { data, action } = datos
            await InsumosRepository.modificar_insumo(
                data._id,
                data,
                action,
                user,
            )
        } catch (err) {
            if (err.status === 523) {
                throw err
            }
            throw new InventariosLogicError(470, `Error ${err.type}: ${err.message}`)
        }
    }
    static async post_inventarios_insumos_tipoInsumo(req) {
        try {
            const { data: datos, user } = req
            const { data } = datos;
            await InsumosRepository.add_tipo_insumo(data, user.user)
        } catch (err) {
            if (err.status === 521) {
                throw err
            }
            throw new InventariosLogicError(470, `Error ${err.type}: ${err.message}`)
        }
    }
    static async get_inventarios_insumos_contenedores() {
        try {
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
        } catch (err) {
            if (err.status === 522) {
                throw err
            }
            throw new InventariosLogicError(470, `Error ${err.type}: ${err.message}`)
        }
    }
    static async put_inventarios_insumos_contenedores(req) {
        try {
            const { data: datos, user } = req
            const { action, data, _id, __v } = datos
            const query = {
                insumosData: data
            }
            await ContenedoresRepository.modificar_contenedor(
                _id, query, user.user, action, __v
            );
        } catch (err) {
            if (err.status === 523) {
                throw err
            }
            throw new InventariosLogicError(470, `Error ${err.type}: ${err.message}`)
        }
    }
    //endregion
}


module.exports.InventariosRepository = InventariosRepository