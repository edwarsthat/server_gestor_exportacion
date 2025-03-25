const { LotesRepository } = require("../Class/Lotes");
const { ProcesoRepository } = require("../api/Proceso");
const { VariablesDelSistema } = require("../Class/VariablesDelSistema");
const { CalidadRepository } = require("../api/Calidad");
const { ComercialRepository } = require("../api/Comercial");
const { SistemaRepository } = require("../api/Sistema");
const { ContabilidadRepository } = require("../api/Contabilidad");
const { ConstantesDelSistema } = require("../Class/ConstantesDelSistema");
const { Get_info_update_app_desktop } = require("./docs/getDocs");
const { IndicadoresAPIRepository } = require("../api/IndicadoresAPI");

const apiSocket = {
    //#region GET
    Get_info_update_app_desktop: async () => {
        const data = await Get_info_update_app_desktop()
        return { status: 200, message: 'Ok', data: data }
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


    // obtener_clientes_historial_contenedores: async () => {
    //     const clientes = await ComercialRepository.obtener_clientes_historial_contenedores();
    //     return { status: 200, message: 'Ok', data: clientes }
    // },

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



    obtener_status_proceso: async () => {
        const status = await ProcesoRepository.obtener_status_proceso()
        return { status: 200, message: 'Ok', data: status }
    },
    // get_status_pausa_proceso: async () => {
    //     const status = await ProcesoRepository.get_status_pausa_proceso();
    //     return { status: 200, message: 'Ok', data: status }
    // },
    // obtener_predio_procesando: async () => {
    //     const data = await ProcesoRepository.obtener_predio_procesando()
    //     return { status: 200, message: 'Ok', data: data }
    // },

    obtener_info_mi_cuenta: async (req) => {
        const { user } = req
        const usuario = await SistemaRepository.obtener_info_mi_cuenta(user)
        return { status: 200, message: 'Ok', data: usuario }

    },



    obtener_lotes_contabilidad_informes_calidad: async (req) => {
        const { data } = req
        const response = await ContabilidadRepository.obtener_lotes_contabilidad_informes_calidad(data);
        return { status: 200, message: 'Ok', data: response }
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



    get_comercial_precios_registros_precios_proveedor: async (req) => {
        //Obtiene los proveedores
        const { data } = req;
        const response = await ComercialRepository.get_comercial_precios_registros_precios_proveedor(data)
        return { status: 200, message: 'Ok', data: response }
    },



    //! obtener numero de datos para paginar las tablas


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


    //#endregion
    //#region POST

    guardarDescarteHistorial: async (data) => {
        const descarte = data.data.inventario

        await VariablesDelSistema.modificar_inventario_descarte(descarte.descarteLavado, 'descarteLavado');
        await VariablesDelSistema.modificar_inventario_descarte(descarte.descarteEncerado, 'descarteEncerado');

        await LotesRepository.add_historial_descarte(data);

        return { status: 200, message: 'Ok' }
    },


    //! transporte


    //#endregion
    //#region PUT
    desverdizado: async (data) => {
        const user = data.user.user;
        await ProcesoRepository.desverdizado(data.data, user)
        return { status: 200, message: 'Ok' }
    },


    add_settings_pallet: async (req) => {
        const { data, user } = req;
        const contenedores = await ProcesoRepository.add_settings_pallet(data, user.user);

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





    modificar_mi_password: async (req) => {
        const { data, user } = req
        await SistemaRepository.modificar_mi_password(data, user)
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



    //#endregion
}

module.exports.apiSocket = apiSocket;
