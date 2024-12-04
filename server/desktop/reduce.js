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
const { ContabilidadRepository } = require("../api/Contabilidad");
const { TransporteRepository } = require("../api/Transporte");

const apiSocket = {
    //#region GET
    obtenerEF1: async () => {
        const enf = await ProcesoRepository.get_ef1()
        return { status: 200, message: 'Ok', data: enf }
    },
    get_predio_Proceso_Descarte: async () => {
        const response = await ProcesoRepository.get_predio_Proceso_Descarte()
        return { data: response, status: 200, message: 'Ok' }
    },
    getProveedores: async () => {
        const proveedores = await ComercialRepository.get_proveedores();
        return { status: 200, message: 'Ok', data: proveedores }
    },
    get_proveedores_proceso: async () => {
        const proveedores = await ComercialRepository.get_proveedores_proceso();
        return { status: 200, message: 'Ok', data: proveedores }
    },
    getInventario: async () => {
        const resultado = await ProcesoRepository.getInventario();
        return { data: resultado, status: 200, message: 'Ok' }
    },
    getInventario_orden_vaceo: async () => {
        const resultado = await ProcesoRepository.getInventario_orden_vaceo();
        return { data: resultado, status: 200, message: 'Ok' }
    },
    getInventarioDesverdizado: async () => {
        const response = await ProcesoRepository.getInventarioDesverdizado()
        return { data: response, status: 200, message: 'Ok' }

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
    get_clientes: async () => {
        const clientes = await ComercialRepository.get_clientes();
        return { status: 200, message: 'Ok', data: clientes }
    },
    getClientes: async () => {
        const clientes = await ComercialRepository.get_clientes();
        return { status: 200, message: 'Ok', data: clientes }
    },
    obtener_clientes_historial_contenedores: async () => {
        const clientes = await ComercialRepository.obtener_clientes_historial_contenedores();
        return { status: 200, message: 'Ok', data: clientes }
    },
    get_lotes_inspeccion_ingreso: async () => {
        const lotes = await CalidadRepository.get_lotes_inspeccion_ingreso();
        return { status: 200, message: 'Ok', data: lotes }
    },
    get_lotes_calidad_interna: async () => {
        const lotes = await CalidadRepository.get_lotes_calidad_interna();
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
        const { data, user } = req
        const response = await SistemaRepository.get_users(data, user)
        return { status: 200, message: 'Ok', data: response }
    },
    get_historial_descarte: async (req) => {
        const { data } = req
        const response = await ProcesoRepository.get_historial_descarte(data)
        return { status: 200, message: 'Ok', data: response }
    },
    obtener_operarios_seleccionadoras: async () => {
        const response = await SistemaRepository.obtener_operarios_seleccionadoras()
        return { status: 200, message: 'Ok', data: response }
    },
    obtener_volante_calidad: async (req) => {
        const { data } = req
        const response = await SistemaRepository.obtener_volante_calidad(data)
        return { status: 200, message: 'Ok', data: response }
    },
    obtener_operarios_higiene: async (req) => {
        const { data } = req
        const response = await SistemaRepository.obtener_operarios_higiene(data)
        return { status: 200, message: 'Ok', data: response }
    },
    obtener_formularios_higiene_personal: async (req) => {
        const { data } = req
        const response = await SistemaRepository.obtener_formularios_higiene_personal(data)
        return { status: 200, message: 'Ok', data: response }
    },
    obtener_contenedores_programacion: async (req) => {
        const { data } = req
        const response = await ProcesoRepository.obtener_contenedores_programacion(data)
        return { status: 200, message: 'Ok', data: response }
    },
    obtener_contenedores_listaDeEmpaque: async () => {
        const contenedores = await ProcesoRepository.obtener_contenedores_listaDeEmpaque()
        return { status: 200, message: 'Ok', data: contenedores }
    },
    obtener_predio_listaDeEmpaque: async () => {
        const response = await VariablesDelSistema.obtener_EF1_listaDeEmpaque();
        return { status: 200, message: 'Ok', data: response }
    },
    obtener_cajas_sin_pallet: async () => {
        const cajasSinPallet = await VariablesDelSistema.obtener_cajas_sin_pallet();
        return { status: 200, message: 'Ok', data: cajasSinPallet }
    },
    obtener_tipo_insumos: async () => {
        const insumos = await SistemaRepository.obtener_tipo_insumos();
        return { status: 200, message: 'Ok', data: insumos }
    },
    obtener_historial_decarte_lavado_proceso: async () => {
        // const { user } = req
        const registros = await ProcesoRepository.obtener_historial_decarte_lavado_proceso("");
        return { status: 200, message: 'Ok', data: registros }
    },
    obtener_historial_decarte_encerado_proceso: async () => {
        // const { user } = req
        const registros = await ProcesoRepository.obtener_historial_decarte_encerado_proceso("");
        return { status: 200, message: 'Ok', data: registros }
    },
    obtener_contenedores_to_add_insumos: async () => {
        const insumos = await ProcesoRepository.obtener_contenedores_to_add_insumos();
        return { status: 200, message: 'Ok', data: insumos }
    },
    obtener_lotes_fotos_calidad: async () => {
        const lotes = await CalidadRepository.obtener_lotes_fotos_calidad();
        return { status: 200, message: 'Ok', data: lotes }
    },
    obtener_contenedores_historial_listas_empaque: async (req) => {
        const { data } = req;
        const contenedores = await ProcesoRepository.obtener_contenedores_historial_listas_empaque(data)
        return { status: 200, message: 'Ok', data: contenedores }

    },
    obtener_contenedores_historial_buscar: async (req) => {
        const { data } = req;
        const contenedores = await ProcesoRepository.obtener_contenedores_historial_buscar(data)
        return { status: 200, message: 'Ok', data: contenedores }
    },
    obtener_fecha_inicio_proceso: async () => {
        const fecha = await ProcesoRepository.obtener_fecha_inicio_proceso();
        return { status: 200, message: 'Ok', data: fecha }
    },
    obtener_status_proceso: async () => {
        const status = await ProcesoRepository.obtener_status_proceso()
        return { status: 200, message: 'Ok', data: status }
    },
    get_status_pausa_proceso: async () => {
        const status = await ProcesoRepository.get_status_pausa_proceso();
        return { status: 200, message: 'Ok', data: status }
    },
    get_data_proceso: async () => {
        const data = await ProcesoRepository.get_data_proceso();
        return { status: 200, message: 'Ok', data: data }
    },
    obtener_info_mi_cuenta: async (req) => {
        const { user } = req
        const usuario = await SistemaRepository.obtener_info_mi_cuenta(user)
        return { status: 200, message: 'Ok', data: usuario }

    },
    obtener_tipos_formularios_calidad: async () => {
        const data = await CalidadRepository.obtener_tipos_formularios_calidad();
        return { status: 200, message: 'Ok', data: data }
    },
    get_formularios_calidad_creados: async () => {
        const data = await CalidadRepository.get_formularios_calidad_creados();
        return { status: 200, message: 'Ok', data: data }
    },
    get_transporte_formulario_contenedores: async () => {
        const data = await TransporteRepository.get_transporte_formulario_contenedores();
        return { status: 200, message: 'Ok', data: data }
    },
    get_view_formularios_limpieza_diaria: async (req) => {
        const { data } = req
        const formularios = await CalidadRepository.get_view_formularios_limpieza_diaria(data);
        return { status: 200, message: 'Ok', data: formularios }
    },
    get_view_formularios_limpieza_mensual: async (req) => {
        const { data } = req
        const formularios = await CalidadRepository.get_view_formularios_limpieza_mensual(data);
        return { status: 200, message: 'Ok', data: formularios }
    },
    get_view_formularios_control_plagas: async (req) => {
        const { data } = req
        const formularios = await CalidadRepository.get_view_formularios_control_plagas(data);
        return { status: 200, message: 'Ok', data: formularios }
    },
    obtener_lotes_contabilidad_informes_calidad: async (req) => {
        const { data } = req
        const response = await ContabilidadRepository.obtener_lotes_contabilidad_informes_calidad(data);
        return { status: 200, message: 'Ok', data: response }
    },
    obtener_predio_procesando: async () => {
        const data = await ProcesoRepository.obtener_predio_procesando()
        return { status: 200, message: 'Ok', data: data }

    },
    get_record_lote_recepcion_pendiente: async (req) => {
        const { data } = req;
        const response = await ProcesoRepository.get_record_lote_recepcion_pendiente(data)
        return { status: 200, message: 'Ok', data: response }
    },
    get_record_lote_ingreso_inventario: async (req) => {
        const { data } = req;
        const response = await ProcesoRepository.get_record_lote_ingreso_inventario(data)
        return { status: 200, message: 'Ok', data: response }
    },
    //! obtener numero de datos para paginar las tablas
    count_documents_formularios_calidad_control_plagas: async () => {
        const count = await CalidadRepository.count_documents_formularios_calidad_control_plagas();
        return { status: 200, message: 'Ok', data: count }
    },
    count_documents_formularios_calidad_limpieza_mensual: async () => {
        const count = await CalidadRepository.count_documents_formularios_calidad_limpieza_mensual();
        return { status: 200, message: 'Ok', data: count }
    },
    count_documents_formularios_calidad_limpieza_diaria: async () => {
        const count = await CalidadRepository.count_documents_formularios_calidad_limpieza_diaria();
        return { status: 200, message: 'Ok', data: count }
    },
    obtener_cantidad_usuarios: async () => {
        const response = await SistemaRepository.obtener_cantidad_usuarios()
        return { status: 200, message: 'Ok', data: response }
    },
    obtener_cantidad_contenedores: async () => {
        const response = await ProcesoRepository.obtener_cantidad_contenedores()
        return { status: 200, message: 'Ok', data: response }
    },
    obtener_cantidad_historial_espera_descargue: async () => {
        const response = await ProcesoRepository.obtener_cantidad_historial_espera_descargue()
        return { status: 200, message: 'Ok', data: response }
    },
    obtener_cantidad_historial_ingreso_inventario: async () => {
        const response = await ProcesoRepository.obtener_cantidad_historial_ingreso_inventario()
        return { status: 200, message: 'Ok', data: response }
    },
    get_transporte_registros_exportacion_numeroElementos: async () => {
        const data = await TransporteRepository.get_transporte_registros_exportacion_numeroElementos()
        return { status: 200, message: 'Ok', data: data }
    },
    get_transporte_registros_programacion_mula_numeroElementos: async () => {
        const data = await TransporteRepository.get_transporte_registros_programacion_mula_numeroElementos()
        return { status: 200, message: 'Ok', data: data }
    },
    get_transporte_registros_inspeccionMula_numeroElementos: async () => {
        const data = await TransporteRepository.get_transporte_registros_inspeccionMula_numeroElementos()
        return { status: 200, message: 'Ok', data: data }
    },
    get_transporte_documentos_programacionMulas_numeroElementos: async () => {
        const data = await TransporteRepository.get_transporte_documentos_programacionMulas_numeroElementos()
        return { status: 200, message: 'Ok', data: data }
    },
    //!constantes del sistema, formularios y otras cosas
    get_info_formulario_inspeccion_fruta: async () => {
        const formulario = await CalidadRepository.get_info_formulario_inspeccion_fruta()
        return { status: 200, message: 'Ok', data: formulario }
    },

    //! transporte
    get_transporte_exportacion_contenedores: async () => {
        const data = await TransporteRepository.get_transporte_exportacion_contenedores()
        return { status: 200, message: 'Ok', data: data }
    },
    get_transporte_registro_exportacion: async () => {
        const data = await TransporteRepository.get_transporte_registro_exportacion()
        return { status: 200, message: 'Ok', data: data }
    },
    get_transporte_mula_contenedores: async () => {
        const data = await TransporteRepository.get_transporte_mula_contenedores()
        return { status: 200, message: 'Ok', data: data }
    },
    get_transporte_registro_programacion_mula: async () => {
        const data = await TransporteRepository.get_transporte_registro_programacion_mula()
        return { status: 200, message: 'Ok', data: data }
    },
    get_transporte_registro_formularios_inspeccion: async () => {
        const data = await TransporteRepository.get_transporte_registro_formularios_inspeccion()
        return { status: 200, message: 'Ok', data: data }
    },
    get_transporte_documentos_programacionMula_contenedores: async () => {
        const data = await TransporteRepository.get_transporte_documentos_programacionMula_contenedores()
        return { status: 200, message: 'Ok', data: data }
    },

    //#region POST
    guardarLote: async (data) => {
        await ProcesoRepository.addLote(data)
        return { status: 200, message: 'Ok' }
    },
    lote_recepcion_pendiente: async (req) => {
        const { user, data } = req
        await ProcesoRepository.lote_recepcion_pendiente(data, user.user)
        return { status: 200, message: 'Ok' }
    },
    send_lote_to_inventario: async (req) => {
        const { user, data } = req

        await ProcesoRepository.send_lote_to_inventario(data, user.user)
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
    add_volante_calidad: async (req) => {
        const { data, user } = req
        await SistemaRepository.add_volante_calidad(data, user)
        return { status: 200, message: 'Ok' }

    },
    add_higiene_personal: async (req) => {
        const { data, user } = req
        await SistemaRepository.add_higiene_personal(data, user)
        return { status: 200, message: 'Ok' }
    },
    add_cliente: async (req) => {
        const { data, user } = req
        await ComercialRepository.add_cliente(data, user)
        return { status: 200, message: 'Ok' }
    },
    add_tipo_insumo: async (req) => {
        const { data, user } = req
        await SistemaRepository.add_tipo_insumo(data, user.user)
        return { status: 200, message: 'Ok' }
    },
    set_hora_inicio_proceso: async () => {
        await ProcesoRepository.set_hora_inicio_proceso();
        return { status: 200, message: 'Ok' }

    },
    crear_formulario_calidad: async (req) => {
        const { data, user } = req
        await CalidadRepository.crear_formulario_calidad(data, user._id)
        return { status: 200, message: 'Ok' }
    },
    //! transporte
    post_transporte_programacion_exportacion: async (req) => {
        const { data, user } = req
        await TransporteRepository.post_transporte_programacion_exportacion(data, user.user)
        return { status: 200, message: 'Ok' }
    },
    post_transporte_programacion_exportacion_modificar: async (req) => {
        const { data, user } = req
        await TransporteRepository.post_transporte_programacion_exportacion_modificar(data, user.user)
        return { status: 200, message: 'Ok' }
    },
    post_transporte_programacion_mula: async (req) => {
        const { data, user } = req
        await TransporteRepository.post_transporte_programacion_mula(data, user.user)
        return { status: 200, message: 'Ok' }
    },
    post_transporte_programacion_mula_modificar: async (req) => {
        const { data, user } = req
        await TransporteRepository.post_transporte_programacion_mula_modificar(data, user.user)
        return { status: 200, message: 'Ok' }
    },
    post_transporte_registros_inspeccionMula_modificar: async (req) => {
        const { data, user } = req
        await TransporteRepository.post_transporte_registros_inspeccionMula_modificar(data, user.user)
        return { status: 200, message: 'Ok' }
    },
    //#region PUT
    directoNacional: async (data) => {
        const user = data.user.user;
        await ProcesoRepository.directoNacional(data.data, user)
        return { status: 200, message: 'Ok' }
    },
    desverdizado: async (data) => {
        const user = data.user.user;
        await ProcesoRepository.desverdizado(data.data, user)
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
        await CalidadRepository.ingresoCalidadInterna(data.data, data.user.suer)
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
    },
    modificar_programacion_contenedor: async (req) => {
        const { data, user } = req;
        await ProcesoRepository.modificar_programacion_contenedor(data, user)
        return { status: 200, message: 'Ok' }
    },
    put_lotes_inspeccion_ingreso: async (req) => {
        const user = req.user.user;
        await CalidadRepository.put_lotes_inspeccion_ingreso(req.data, user)
        return { status: 200, message: 'Ok' }
    },
    modificar_estado_cliente: async (req) => {
        const user = req.user.user;
        await ComercialRepository.modificar_estado_cliente(req.data, user)
        return { status: 200, message: 'Ok' }
    },
    modificar_info_cliente: async (req) => {
        const { user, data } = req
        await ComercialRepository.modificar_info_cliente(data, user.user)
        return { status: 200, message: 'Ok' }
    },
    add_settings_pallet: async (req) => {
        const { data, user } = req;
        const contenedores = await ProcesoRepository.add_settings_pallet(data, user.user);

        return { status: 200, message: 'Ok', data: contenedores }
    },
    actualizar_pallet_contenedor: async (req) => {
        const { data, user } = req;
        const contenedores = await ProcesoRepository.actualizar_pallet_contenedor(data, user.user);
        return { status: 200, message: 'Ok', data: contenedores }
    },
    eliminar_item_lista_empaque: async (req) => {
        const { data, user } = req;
        const contenedores = await ProcesoRepository.eliminar_item_lista_empaque(data, user.user);
        return { status: 200, message: 'Ok', data: contenedores }
    },
    add_pallet_listaempaque: async (req) => {
        const { data, user } = req;
        await ProcesoRepository.add_pallet_listaempaque(data, user.user);
        return { status: 200, message: 'Ok' }
    },
    liberar_pallets_lista_empaque: async (req) => {
        const { data, user } = req;
        await ProcesoRepository.liberar_pallets_lista_empaque(data, user.user);
        return { status: 200, message: 'Ok' }
    },
    cerrar_contenedor: async (req) => {
        const { data, user } = req;
        await ProcesoRepository.cerrar_contenedor(data, user.user);
        return { status: 200, message: 'Ok' }
    },
    modificar_tipo_insumo: async (req) => {
        const { data, user } = req
        await SistemaRepository.modificar_tipo_insumo(data, user.user)
        return { status: 200, message: 'Ok' }
    },
    add_contenedor_insumos_items: async (req) => {
        const { data, user } = req
        await ProcesoRepository.add_contenedor_insumos_items(data, user.user)
        return { status: 200, message: 'Ok' }
    },
    ingresar_foto_calidad: async (req) => {
        const { data, user } = req
        await ProcesoRepository.ingresar_foto_calidad(data, user.user)
        return { status: 200, message: 'Ok' }
    },
    set_hora_fin_proceso: async () => {
        await ProcesoRepository.set_hora_fin_proceso();
        return { status: 200, message: 'Ok' }

    },
    set_hora_pausa_proceso: async () => {
        await ProcesoRepository.set_hora_pausa_proceso();
        return { status: 200, message: 'Ok' }

    },
    set_hora_reanudar_proceso: async () => {
        await ProcesoRepository.set_hora_reanudar_proceso();
        return { status: 200, message: 'Ok' }

    },
    modificar_mi_password: async (req) => {
        const { data, user } = req
        await SistemaRepository.modificar_mi_password(data, user)
        return { status: 200, message: 'Ok' }
    },
    add_item_formulario_calidad: async (req) => {
        const { data, user } = req
        await CalidadRepository.add_item_formulario_calidad(data, user._id);
        return { status: 200, message: 'Ok' }
    },
    post_transporte_formulario_inspeccion_mula: async (req) => {
        const { data, user } = req
        await TransporteRepository.post_transporte_formulario_inspeccion_mula(data, user)
        return { status: 200, message: 'Ok' }
    },
    finalizar_informe_proveedor: async (req) => {
        const { data, user } = req
        await ProcesoRepository.finalizar_informe_proveedor(data, user)
        return { status: 200, message: 'Ok' }
    },
    lote_caso_favorita: async (req) => {
        const { data, user } = req
        await ComercialRepository.lote_caso_favorita(data, user.user)
        return { status: 200, message: 'Ok' }

    },
    lote_no_pagar_balin: async (req) => {
        const { data, user } = req
        await ComercialRepository.lote_no_pagar_balin(data, user.user)
        return { status: 200, message: 'Ok' }
    },
    modificar_historial_fechas_en_patio: async (req) => {
        const { data, user } = req
        await ProcesoRepository.modificar_historial_fechas_en_patio(data, user)
        return { status: 200, message: 'Ok' }
    },
    modificar_historial_lote_ingreso_inventario: async (req) => {
        const { data, user } = req
        await ProcesoRepository.modificar_historial_lote_ingreso_inventario(data, user)
        return { status: 200, message: 'Ok' }
    },
    lotes_derogar_lote: async (req) => {
        const { data, user } = req
        await CalidadRepository.lotes_derogar_lote(data, user)
        return { status: 200, message: 'Ok' }
    },
    lotes_devolver_lote: async (req) => {
        const { data, user } = req
        await CalidadRepository.lotes_devolver_lote(data, user)
        return { status: 200, message: 'Ok' }
    },
    put_inventarioLogistica_frutaSinProcesar_modificar_canastillas: async (req) => {
        const { data, user } = req
        await ModificarRepository.put_inventarioLogistica_frutaSinProcesar_modificar_canastillas(data, user)
        return { status: 200, message: 'Ok' }
    },
}

module.exports.apiSocket = apiSocket;