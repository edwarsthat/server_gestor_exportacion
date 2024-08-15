const { ClientesRepository } = require("../Class/Clientes");
const { ContenedoresRepository } = require("../Class/Contenedores");
const { LotesRepository } = require("../Class/Lotes");
const { ProcesoRepository } = require("../api/Proceso");
const { ProveedoresRepository } = require("../Class/Proveedores");
const { VariablesDelSistema } = require("../Class/VariablesDelSistema");
const { RecordLotesRepository } = require("../archive/ArchiveLotes");
const { CalidadRepository } = require("../api/Calidad");
const { ComercialRepository } = require("../api/Comercial");
const { ViewsRepository } = require("../api/Views");
const { ModificarRepository } = require("../api/ModificarData");
const { SistemaRepository } = require("../api/Sistema");

const apiSocket = {
    //#region GET
    obtenerEF1: async () => {
        const enf = await VariablesDelSistema.generarEF1();
        return { status: 200, message: 'Ok', response: enf }
    },
    get_predio_Proceso_Descarte: async () => {
        const response = await ProcesoRepository.get_predio_Proceso_Descarte()
        return { data: response, status: 200, message: 'Ok' }
    },
    getProveedores: async () => {
        const proveedores = await ComercialRepository.get_proveedores();
        return { status: 200, message: 'Ok', data: proveedores }
    },
    getInventario: async () => {
        const resultado = await ProcesoRepository.getInventario();
        return { data: resultado, status: 200, message: 'Ok' }
    },
    getInventario_orden_vaceo: async () => {
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

            if (lote.desverdizado && lote.desverdizado.fechaFinalizar) {
                return {
                    ...lote.toObject(),
                    inventario: InvDes[id]
                }
            } else if (lote.desverdizado && !lote.desverdizado.fechaFinalizar) {
                return null
            } else if (lote) {
                return {
                    ...lote.toObject(),
                    inventario: inventario[id]
                }
            }
            return null
        }).filter(item => item !== null);

        return { data: resultado, status: 200, message: 'Ok' }
    },
    getInventarioDesverdizado: async () => {
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
        return { data: resultado, status: 200, message: 'Ok' }

    },
    getOrdenVaceo: async () => {
        const oredenVaceo = await VariablesDelSistema.getOrdenVaceo()
        return { status: 200, message: 'Ok', data: oredenVaceo }
    },
    obtenerHistorialLotes: async (data) => {
        const response = await ProcesoRepository.obtenerHistorialLotes(data.data)
        return { data: response, status: 200, message: 'Ok' }

    },
    obtenerHistorialLotesDirectoNacional: async (data) => {
        const reponse = await ProcesoRepository.obtenerHistorialLotesDirectoNacional(data.data)
        return { data: reponse, status: 200, message: 'Ok' }

    },
    getInfoIndicadoresProceso: async (data) => {
        const { fecha, query, select, sort, limit } = data.data.data;
        const newQuery = {
            ...query,
            fechaIngreso:
            {
                '$gte': new Date(fecha.fechaInicio),
                '$lt': new Date(fecha.fechaFin)
            },
        }
        const lotes = await LotesRepository.getLotes({
            query: newQuery,
            select: select,
            sort: sort,
            limit: limit,
        });
        return { data: lotes, status: 200, message: 'Ok' }


    },
    obtener_inventario_descartes: async () => {
        const inventario = await ProcesoRepository.obtener_inventario_descartes();
        return { status: 200, message: 'Ok', data: inventario }
    },
    getClientes: async () => {
        const clientes = await ClientesRepository.getProveedores();
        return { status: 200, message: 'Ok', data: clientes }
    },
    getLotesCalidadInterna: async () => {
        const lotes = await ProcesoRepository.getLotesCalidadInterna();
        return { status: 200, message: 'Ok', data: lotes }
    },
    get_lotes_clasificacion_descarte: async () => {
        const lotes = await CalidadRepository.get_lotes_clasificacion_descarte();
        return { status: 200, message: 'Ok', data: lotes }
    },
    get_descarte_reproceso: async () => {
        const query = {
            $or: [
                { "descarteLavado.descarteGeneral": { $gt: 0 } },
                { "descarteLavado.pareja": { $gt: 0 } },
                { "descarteLavado.balin": { $gt: 0 } },
                { "descarteEncerado.descarteGeneral": { $gt: 0 } },
                { "descarteEncerado.pareja": { $gt: 0 } },
                { "descarteEncerado.balin": { $gt: 0 } },
                { "descarteEncerado.extra": { $gt: 0 } },
            ],
        }
        const select = { nombrePredio: 1, tipoFruta: 1, descarteLavado: 1, descarteEncerado: 1, enf: 1 }
        const lotes = await LotesRepository.getLotes({ select: select, query: query })
        return { status: 200, message: 'Ok', data: lotes }
    },
    get_lotes_informe_calidad: async (req) => {
        const { data } = req
        const response = await ProcesoRepository.get_lotes_informe_calidad(data);
        return { status: 200, message: 'Ok', data: response }
    },
    view_lotes: async (req) => {
        const { data } = req
        const response = await ViewsRepository.view_lotes(data)
        return { status: 200, message: 'Ok', data: response }

    },
    get_ingresos_lotes: async (req) => {
        const { data } = req
        const response = await ProcesoRepository.get_ingresos_lotes(data)
        return { status: 200, message: 'Ok', data: response }
    },
    get_historial_calidad_interna: async (req) => {
        const { data } = req
        const response = await ProcesoRepository.get_calidad_interna_lote(data)
        return { status: 200, message: 'Ok', data: response }
    },
    get_historial_clasificacion_descarte: async (req) => {
        const { data } = req
        const response = await ProcesoRepository.get_historial_clasificacion_descarte(data)
        return { status: 200, message: 'Ok', data: response }
    },
    obtener_contenedores_lotes: async (req) => {
        const { data } = req
        const response = await ProcesoRepository.obtener_contenedores_lotes(data)
        return { status: 200, message: 'Ok', data: response }
    },
    obtener_observaciones_calidad: async (req) => {
        const { data } = req
        const response = await CalidadRepository.obtener_observaciones_calidad(data)
        return { status: 200, message: 'Ok', data: response }
    },
    obtener_imagen_lote_calidad: async (req) => {
        const { data } = req
        const response = await CalidadRepository.obtener_imagen_lote_calidad(data)
        return { status: 200, message: 'Ok', data: response }
    },
    obtener_precio_proveedores: async (req) => {
        const { data } = req
        const response = await ComercialRepository.obtener_precio_proveedores(data)
        return { status: 200, message: 'Ok', data: response }
    },
    get_cargos: async (req) => {
        const { user } = req
        const response = await SistemaRepository.get_cargos(user)
        return { status: 200, message: 'Ok', data: response }
    },
    get_users: async (req) => {
        const { user } = req
        const response = await SistemaRepository.get_users(user)
        return { status: 200, message: 'Ok', data: response }
    },
    get_historial_descarte: async () => {
        const response = await ProcesoRepository.get_historial_descarte()
        return { status: 200, message: 'Ok', data: response }
    },
    //#region POST
    guardarLote: async (data) => {
        await ProcesoRepository.addLote(data)
        return { status: 200, message: 'Ok' }
    },
    guardarDescarteHistorial: async (data) => {
        const descarte = data.data.inventario

        await VariablesDelSistema.modificar_inventario_descarte(descarte.descarteLavado, 'descarteLavado');
        await VariablesDelSistema.modificar_inventario_descarte(descarte.descarteEncerado, 'descarteEncerado');

        await LotesRepository.add_historial_descarte(data);

        return { status: 200, message: 'Ok' }
    },
    crearContenedor: async (data) => {
        await ContenedoresRepository.crearContenedor(data)
        return { status: 200, message: 'Ok' }
    },
    add_cargo: async (req) => {
        const { data, user } = req
        await SistemaRepository.add_cargo(data.data, user)
        return { status: 200, message: 'Ok' }
    },
    add_user: async (req) => {
        const { data, user } = req
        await SistemaRepository.add_user(data.data, user.user)
        return { status: 200, message: 'Ok' }
    },

    //#region PUT
    directoNacional: async (data) => {
        const user = data.user.user;
        await ProcesoRepository.directoNacional(data.data, user)
        return { status: 200, message: 'Ok' }
    },
    desverdizado: async (data) => {
        const { _id, inventario, desverdizado, __v, action } = data.data;
        const user = data.user.user;
        const query = {
            desverdizado: desverdizado,
            $inc: {
                __v: 1
            },
        }
        await LotesRepository.modificar_lote(_id, query, action, user, __v);

        await VariablesDelSistema.ingresarInventarioDesverdizado(_id, inventario)
        await VariablesDelSistema.modificarInventario(_id, inventario);
        return { status: 200, message: 'Ok' }
    },
    vaciarLote: async (data, sendData) => {
        const user = data.user.user;
        await ProcesoRepository.vaciarLote(data.data, user, sendData)
        return { status: 200, message: 'Ok' }
    },
    addOrdenDeVaceo: async (data) => {
        await VariablesDelSistema.modificarOrdenVaceo(data.data.data)
        return { status: 200, message: 'Ok' }

    },
    modificarHistorialFrutaProcesada: async (data) => {
        const user = data.user.user;
        await ProcesoRepository.modificarHistorialFrutaProcesada(data.data, user)
        return { status: 200, message: 'Ok' }
    },
    modificarHistorial_directoNacional: async (data) => {
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
    },
    ingresoCalidadInterna: async (data) => {
        await ProcesoRepository.ingresoCalidadInterna(data.data, data.user.suer)
        return { status: 200, message: 'Ok' }
    },
    put_lotes_clasificacion_descarte: async (req) => {
        const user = req.user.user;
        await CalidadRepository.put_lotes_clasificacion_descarte(req.data, user)
        return { status: 200, message: 'Ok' }
    },
    reprocesar_predio: async (data) => {
        await ProcesoRepository.reprocesar_predio(data.data, data.user.user)
        return { status: 200, message: 'Ok' }
    },
    reprocesar_celifrut: async (req) => {
        const { data, user } = req
        await ProcesoRepository.reprocesar_celifrut(data, user.user);
        return { status: 200, message: 'Ok' }
    },
    ingresar_precio_fruta: async (req) => {
        const { action, data } = req.data
        const { precio, tipoFruta } = data
        const user = req.user.user;

        const keys = Object.keys(precio);
        const info = {};
        for (let i = 0; i < keys.length; i++) {
            let key2 = `precio.${tipoFruta}.${keys[i]}`
            info[key2] = precio[keys[i]]
        }
        await ProveedoresRepository.modificar_varios_proveedores({}, { $set: info }, action, user);
        return { status: 200, message: 'Ok' }
    },
    set_parametros_desverdizado: async (req) => {
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
        return { status: 200, message: 'Ok' }
    },
    set_finalizar_desverdizado: async (req) => {
        const { _id, __v, action } = req.data;
        const user = req.user.user;
        const query = {
            "desverdizado.fechaFinalizar": new Date(),
            $inc: {
                __v: 1,
            }
        }
        await LotesRepository.modificar_lote(_id, query, action, user, __v);
        return { status: 200, message: 'Ok' }
    },
    ingresar_descarte_lavado: async (req) => {
        const { data, user } = req;
        await ProcesoRepository.ingresar_descarte_lavado(data, user)
        return { status: 200, message: 'Ok' }
    },
    ingresar_descarte_encerado: async (req) => {
        const { data, user } = req;
        await ProcesoRepository.ingresar_descarte_encerado(data, user)
        return { status: 200, message: 'Ok' }
    },
    despacho_descarte: async (req) => {
        const { data, user } = req;
        const descarte = await ProcesoRepository.despacho_descarte(data, user.user);
        return { status: 200, message: 'Ok', data: descarte }

    },
    modificar_ingreso_lote: async (req) => {
        const { data, user } = req
        await ModificarRepository.modificar_ingreso_lote(data, user.user)
        return { status: 200, message: 'Ok' }

    },
    modificar_calidad_interna_lote: async (req) => {
        const { data, user } = req
        await ModificarRepository.modificar_calidad_interna_lote(data, user.user)
        return { status: 200, message: 'Ok' }
    },
    modificar_clasificacion_descarte_lote: async (req) => {
        const { data, user } = req
        await ModificarRepository.modificar_clasificacion_descarte_lote(data, user.user)
        return { status: 200, message: 'Ok' }
    },
    inactivar_Proveesdor: async (req) => {
        const { data, user } = req
        await ComercialRepository.inactivar_Proveedor(data, user.user)
        return { status: 200, message: 'Ok' }
    },
    addProveedor: async (req) => {
        const { data, user } = req
        await ComercialRepository.addProveedor(data, user.user)
        return { status: 200, message: 'Ok' }
    },
    modificar_proveedor: async (req) => {
        const { data, user } = req
        await ComercialRepository.modificar_proveedor(data, user.user)
        return { status: 200, message: 'Ok' }
    },
    modificar_predio_proceso_descarte: async (req) => {
        const { data, user } = req
        await ProcesoRepository.modificar_predio_proceso_descarte(data, user.user)
        return { status: 200, message: 'Ok' }
    },
    modificar_predio_proceso_listaEmpaque: async (req) => {
        const { data, user } = req
        await ProcesoRepository.modificar_predio_proceso_listaEmpaque(data, user.user)
        return { status: 200, message: 'Ok' }
    },
    desactivar_user: async (req) => {
        const { data, user } = req;
        await SistemaRepository.desactivar_user(data, user);
        return { status: 200, message: 'Ok' }
    },
    modificar_usuario: async (req) => {
        const { data, user } = req;
        await SistemaRepository.modificar_usuario(data, user);
        return { status: 200, message: 'Ok' }
    },
    eliminar_cargo: async (req) => {
        const { data, user } = req;
        await SistemaRepository.eliminar_cargo(data, user)
        return { status: 200, message: 'Ok' }
    },
    modificar_cargo: async (req) => {
        const { data, user } = req;
        await SistemaRepository.modificar_cargo(data, user);
        return { status: 200, message: 'Ok' }
    }
}

module.exports.apiSocket = apiSocket;