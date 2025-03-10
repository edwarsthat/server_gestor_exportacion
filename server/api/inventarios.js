const { InventariosLogicError } = require("../../Error/logicLayerError");
const { procesoEventEmitter } = require("../../events/eventos");
const { RecordLotesRepository } = require("../archive/ArchiveLotes");
const { DespachoDescartesRepository } = require("../Class/DespachoDescarte");
const { FrutaDescompuestaRepository } = require("../Class/FrutaDescompuesta");
const { LotesRepository } = require("../Class/Lotes");
const { VariablesDelSistema } = require("../Class/VariablesDelSistema");
const { filtroFechaInicioFin } = require("./utils/filtros");
const { transformObjectInventarioDescarte } = require("./utils/objectsTransforms");

class InventariosRepository {
    //#region desverdizando
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
    //#endregion
    //#region Inventario descarte
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
    //#endregion
    //#region Historial fruta procesada
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
    //#endregion
    //#region historial directo nacional
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
}


module.exports.InventariosRepository = InventariosRepository