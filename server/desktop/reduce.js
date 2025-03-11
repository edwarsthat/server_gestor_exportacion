const { ContenedoresRepository } = require("../Class/Contenedores");
const { LotesRepository } = require("../Class/Lotes");
const { ProcesoRepository } = require("../api/Proceso");
const { VariablesDelSistema } = require("../Class/VariablesDelSistema");
const { CalidadRepository } = require("../api/Calidad");
const { ComercialRepository } = require("../api/Comercial");
const { ModificarRepository } = require("../api/ModificarData");
const { SistemaRepository } = require("../api/Sistema");
const { ContabilidadRepository } = require("../api/Contabilidad");
const { TransporteRepository } = require("../api/Transporte");
const { ConstantesDelSistema } = require("../Class/ConstantesDelSistema");
const { Get_info_update_app_desktop } = require("./docs/getDocs");
const { IndicadoresAPIRepository } = require("../api/IndicadoresAPI");

const apiSocket = {
    //#region GET
    Get_info_update_app_desktop: async () => {
        const data = await Get_info_update_app_desktop()
        return { status: 200, message: 'Ok', data: data }
    },

    get_predio_Proceso_Descarte: async () => {
        const response = await ProcesoRepository.get_predio_Proceso_Descarte()
        return { data: response, status: 200, message: 'Ok' }
    },
    obtener_precio_proveedores: async (req) => {
        const { data } = req
        const response = await ComercialRepository.obtener_precio_proveedores(data)
        return { status: 200, message: 'Ok', data: response }
    },
    //?proveedores que ya estan bajo el esquema
    get_comercial_proveedores_elementos: async (req) => {
        const { data, user } = req;
        const proveedores = await ComercialRepository.get_comercial_proveedores_elementos(data, user);
        return { status: 200, message: 'Ok', data: proveedores }
    },
    get_sys_proveedores: async (req) => {
        const { data } = req;
        const response = await ComercialRepository.get_sys_proveedores(data.data);
        return { status: 200, message: 'Ok', data: response }
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
    get_clientes: async () => {
        const clientes = await ComercialRepository.get_clientes();
        return { status: 200, message: 'Ok', data: clientes }
    },
    getClientes: async () => {
        const clientes = await ComercialRepository.get_clientes();
        return { status: 200, message: 'Ok', data: clientes }
    },
    // obtener_clientes_historial_contenedores: async () => {
    //     const clientes = await ComercialRepository.obtener_clientes_historial_contenedores();
    //     return { status: 200, message: 'Ok', data: clientes }
    // },
    get_calidad_ingresos_inspeccionFruta_lotes: async () => {
        const lotes = await CalidadRepository.get_calidad_ingresos_inspeccionFruta_lotes();
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

    obtener_contenedores_listaDeEmpaque: async () => {
        const contenedores = await ProcesoRepository.obtener_contenedores_listaDeEmpaque()
        return { status: 200, message: 'Ok', data: contenedores }
    },
    obtener_predio_listaDeEmpaque: async () => {
        const response = await VariablesDelSistema.obtener_EF1_listaDeEmpaque();
        return { status: 200, message: 'Ok', data: response }
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
    get_constantes_sistema_clasificacion_descarte: async (req) => {
        const { data } = req;
        const response = await ConstantesDelSistema.get_constantes_sistema_clasificacion_descarte(data)
        return { status: 200, message: 'Ok', data: response }
    },

    get_indicadores_eficiencia_operativa_elementos: async (req) => {
        const { data } = req;
        const response = await IndicadoresAPIRepository.get_indicadores_eficiencia_operativa_elementos(data)
        return { status: 200, message: 'Ok', data: response }
    },
    get_indicadores_operaciones_registros: async (req) => {
        const { data } = req;
        const response = await IndicadoresAPIRepository.get_indicadores_operaciones_registros(data)
        return { status: 200, message: 'Ok', data: response }
    },
    get_indicaores_operaciones_lotes: async (req) => {
        const { data } = req;
        const response = await IndicadoresAPIRepository.get_indicaores_operaciones_lotes(data)
        return { status: 200, message: 'Ok', data: response }
    },
    get_indicadores_operaciones_noCalidad: async (req) => {
        const { data } = req;
        const response = await IndicadoresAPIRepository.get_indicadores_operaciones_noCalidad(data)
        return { status: 200, message: 'Ok', data: response }
    },
    get_comercial_precios_registros_precios_proveedor: async (req) => {
        //Obtiene los proveedores
        const { data } = req;
        const response = await ComercialRepository.get_comercial_precios_registros_precios_proveedor(data)
        return { status: 200, message: 'Ok', data: response }
    },



    //! obtener numero de datos para paginar las tablas
    get_calidad_formularios_controlPlagas_numeroElementos: async () => {
        const count = await CalidadRepository.get_calidad_formularios_controlPlagas_numeroElementos();
        return { status: 200, message: 'Ok', data: count }
    },
    get_calidad_formularios_limpiezaMensual_numeroElementos: async () => {
        const count = await CalidadRepository.get_calidad_formularios_limpiezaMensual_numeroElementos();
        return { status: 200, message: 'Ok', data: count }
    },
    get_calidad_formularios_higienePersonal_numeroElementos: async () => {
        const count = await CalidadRepository.get_calidad_formularios_higienePersonal_numeroElementos();
        return { status: 200, message: 'Ok', data: count }
    },
    obtener_cantidad_usuarios: async () => {
        const response = await SistemaRepository.obtener_cantidad_usuarios()
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

    get_calidad_historial_calidadInterna_numeroElementos: async () => {
        const data = await CalidadRepository.get_calidad_historial_calidadInterna_numeroElementos()
        return { status: 200, message: 'Ok', data: data }
    },
    get_calidad_informes_calidad_informe_proveedor_numero_datos: async () => {
        const data = await CalidadRepository.get_calidad_informes_calidad_informe_proveedor_numero_datos()
        return { status: 200, message: 'Ok', data: data }
    },
    get_indicadores_proceso_numero_items: async () => {
        const data = await IndicadoresAPIRepository.get_indicadores_proceso_numero_items()
        return { status: 200, message: 'Ok', data: data }
    },

    //!constantes del sistema, formularios y otras cosas
    get_info_formulario_inspeccion_fruta: async () => {
        const formulario = await CalidadRepository.get_info_formulario_inspeccion_fruta()
        return { status: 200, message: 'Ok', data: formulario }
    },
    get_constantes_sistema_observaciones_calidad: async () => {
        const formulario = await ConstantesDelSistema.get_constantes_sistema_observaciones_calidad()
        return { status: 200, message: 'Ok', data: formulario }
    },
    get_constantes_sistema_tipo_frutas: async () => {
        const data = await SistemaRepository.get_constantes_sistema_tipo_frutas()
        return { status: 200, message: 'Ok', data: data }
    },
    get_constantes_sistema_paises_GGN: async () => {
        const data = await SistemaRepository.get_constantes_sistema_paises_GGN()
        return { status: 200, message: 'Ok', data: data }
    },

    //! transporte
    get_transporte_exportacion_contenedores: async () => {
        const data = await TransporteRepository.get_transporte_exportacion_contenedores()
        return { status: 200, message: 'Ok', data: data }
    },
    get_transporte_registro_exportacion: async (req) => {
        const { data } = req;
        const response = await TransporteRepository.get_transporte_registro_exportacion(data)
        return { status: 200, message: 'Ok', data: response }
    },
    get_transporte_mula_contenedores: async () => {
        const data = await TransporteRepository.get_transporte_mula_contenedores()
        return { status: 200, message: 'Ok', data: data }
    },
    get_transporte_registro_programacion_mula: async (req) => {
        const { data } = req;
        const response = await TransporteRepository.get_transporte_registro_programacion_mula(data)
        return { status: 200, message: 'Ok', data: response }
    },
    get_transporte_registro_formularios_inspeccion: async (req) => {
        const { data } = req;
        const response = await TransporteRepository.get_transporte_registro_formularios_inspeccion(data)
        return { status: 200, message: 'Ok', data: response }
    },
    get_transporte_documentos_programacionMula_contenedores: async (req) => {
        const { data } = req;
        const response = await TransporteRepository.get_transporte_documentos_programacionMula_contenedores(data)
        return { status: 200, message: 'Ok', data: response }
    },

    obtenerHistorialLotes: async () => {
        // Obtener la fecha actual en Colombia
        const ahora = new Date();

        // Crear fechaInicio (comienzo del día en Colombia, pero en UTC)
        const fechaInicio = new Date(Date.UTC(
            ahora.getFullYear(),
            ahora.getMonth(),
            ahora.getDate() - 1, // Restar dos días
            0, 0, 0, 0 // 00:00 en Colombia es 05:00 en UTC
        ));

        // Crear fechaFin (final del día en Colombia, pero en UTC)
        const fechaFin = new Date();

        const data = {
            fechaInicio,
            fechaFin
        }
        const response = await ProcesoRepository.obtenerHistorialLotes(data)
        return { status: 200, message: 'Ok', data: response }
    },



    //#endregion
    //#region POST

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
    //#endregion
    //#region PUT
    desverdizado: async (data) => {
        const user = data.user.user;
        await ProcesoRepository.desverdizado(data.data, user)
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

    put_inventarios_registros_fruta_descompuesta: async (req) => {
        const { data, user } = req
        await ProcesoRepository.put_inventarios_registros_fruta_descompuesta(data, user)
        return { status: 200, message: 'Ok' }
    },
    put_indicadores_eficiencia_operativa_modificar: async (req) => {
        const { data, user } = req
        await IndicadoresAPIRepository.put_indicadores_eficiencia_operativa_modificar(data, user)
        return { status: 200, message: 'Ok' }
    },


    //#endregion
}

module.exports.apiSocket = apiSocket;
