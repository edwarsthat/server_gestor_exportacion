import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { ValidationUserError, ValidationTokenError, AccessError } from '../../Error/ValidationErrors.js';
import { UsuariosRepository } from '../Class/Usuarios.js';
import config from '../../src/config/index.js';
const { ACCES_TOKEN } = config

const permisos_generales = new Set([
    "obtener_status_proceso",
    "obtener_info_mi_cuenta",
    "modificar_mi_password",
    //permisos de sistema para agrupar fletes compuestos. Jp
    "agrupar_fletes_compuestos",
    //permisos de contabilidad para agrupar fletes compuestos. Jp
    "put_contabilidad_agrupar_fletes_compuestos",
    //permisos tarifas .Jp
    "get_comercial_tarifa_predio",
    "post_comercial_tarifa_predio",
    //permisos historial concentracion. Jp
    "get_calidad_formulario_historialConcentraciones",
    "post_calidad_formulario_historialConcentraciones",
    "put_calidad_formulario_historialConcentraciones",
    "delete_calidad_formulario_historialConcentraciones",
    "get_calidad_formularios_historialConcentraciones_numeroElementos",
    //permiso tarifa congelada
    "put_tarifa_congelada_lote",

    "obtener_cantidad_usuarios",
    "obtener_cantidad_historial_espera_descargue",
    "obtener_cantidad_historial_ingreso_inventario",
    "get_comercial_precios_cantidad_registros",
    "get_inventarios_historiales_numeroCanastillas_registros",
    "get_info_formulario_inspeccion_fruta",
    "get_contabilidad_informeMaquila_loteMaquila_detalle",
    "get_contabilidad_informe_lote_detalle",
    "get_talentoHumano_cargosPersonal_ingresoPersonal",
    "post_talentoHumano_personal_cargarCedula",
    "get_contabilidad_informeMaquila_resumenInforme",
    //numero de elementos
    "get_inventarios_historiales_numeroRegistros_cuartosFrios",
    "get_inventarios_historiales_listasDeEmpaque_numeroRegistros",
    "get_comercial_formularios_reclamacionesCalidad_numeroElementos",
    "get_calidad_formulario_limpiezaDiaria_numeroElementos",
    "get_calidad_formulario_limpiezaMensual_numeroElementos",
    "get_calidad_formulario_controlPlagas_numeroElementos",
    "get_transporte_registros_salida_vehiculo_exportacion_numeroElementos",
    "get_transporte_registros_exportacion_numeroElementos",
    "get_transporte_registros_inspeccionMula_numeroElementos",
    "get_transporte_documentos_programacionMulas_numeroElementos",
    "get_inventarios_historiales_ingresoFruta_numeroElementos",
    "get_inventarios_numero_registros_fruta_descompuesta",
    "get_calidad_historial_calidadInterna_numeroElementos",
    "get_calidad_informes_informeProveedor_numeroElementos",
    "get_indicadores_proceso_numero_items",
    "get_comercial_proveedores_numero_elementos",
    "get_inventarios_historiales_lista_empaque_proveedores",
    "get_inventarios_historiales_numero_DespachoDescarte",
    "get_calidad_reclamaciones_contenedores_numeroElementos",
    "get_transporte_registros_entregaPrecintos_numeroElementos",
    "get_inventarios_historiales_numeroRegistros_inventarioDescartes",
    "get_comercial_precios_registros_precios_proveedores_numeroElementos",
    "get_contabilidad_informes_calidad_numeroElementos",
    "get_calidad_informes_informeMaquila_numeroElementos",
    "get_contabilidad_informesMaquila_calidad_numeroElementos",
    "get_talentoHumano_cargos_numeroRegistros",
    "get_talentoHumano_personal_numeroRegistros",
    "get_talentoHumano_dotacion_carnets_count",
    //obteniendo constantes
    "get_inventarios_cuartosFrios_listaEmpaque",
    "get_inventarios_cuartosFrios_detalles",
    "get_constantes_sistema_observaciones_calidad",
    "get_constantes_sistema_tipo_frutas",
    "get_constantes_sistema_paises_GGN",
    "get_comercial_clientesNacionales",
    // "get_data_bootstrap",
    //se obtiene datos del sistema
    "Get_info_update_app_desktop",

    //obtener los proveedores para desplegables
    "get_sys_proveedores",
    // "get_data_tipoFruta",
    // "get_data_clientes",
    // "get_data_cargos",
    // "get_data_clientesNacionales",
    // "get_data_proveedores",
    // "get_data_cuartosFrios",
    // "get_data_tipoFruta2",
    // "get_data_areasAcceso",
    // "get_data_cargosPersonal",
    // "get_data_canastillas_canastillasCelifrut",
    // "get_data_ingresos_tiposFormularios",
    // "get_data_formularios_calidad_campos",

    "get_proceso_aplicaciones_listaEmpaque_pallets",
    "get_proceso_aplicaciones_listaEmpaque_itemsPallet",
    "get_inventarios_historiales_listasDeEmpaque_itemPallets",
    //seriales
    "get_data_EF8",
    "get_data_EF1",
    "get_data_EF10",

    //fotos
    "get_transporte_registros_entregaPrecintos_fotos",
])

export class UserRepository {

    static async validate_password(user) {
        /**
       * Valida los valores de la contraseña sean validos
       *
       * @param {{user:string, password:string}} useer - Un objeto que contiene la informacion de inicio de sesion
       * @throws {TypeError} - Retorna un error de tipo si no cumple con alguna de las condiciones
       * @return {void}
       */
        if (typeof user.password !== "string") throw new ValidationUserError(402, "El password debe ser texto")
        if (user.password.length < 4) throw new ValidationUserError(402, "La contraseña debe tener al menos 8 caracteres")
    }
    static async validate_userName(user) {
        if (typeof user.user !== "string") throw new ValidationUserError(401, "El usuario debe ser texto")
        if (user.user.length < 3) throw new ValidationUserError(401, "El usuario debe tener al menos 3 caracteres")
    }
    static generateAccessToken(data) {
        return jwt.sign(data, process.env.ACCES_TOKEN, { expiresIn: '8h' })
    }
    static async authenticateTokenSocket(socket, next) {

        const token = socket.handshake.auth.token;

        if (!token) {
            return next(new ValidationTokenError(403, 'Authentication error: No token provided'));
        }

        try {
            const decoded = jwt.verify(token, ACCES_TOKEN);
            socket.user = decoded
            next()
        } catch (err) {
            if (err.name === 'TokenExpiredError') {
                return next(new ValidationTokenError(404, 'Authentication error: Token expired'));
            }
            return next(new ValidationTokenError(405, 'Authentication error: Invalid token'));
        }

    }
    static async authenticateToken(token) {
        /**
        * Autentica el token entre el socket cliente y el servidor, en caso de que expire cancelar la conexion
        * 
        * @param {string} token - El token de acceso 
        * @throws - ValidationTokenError regresa un error si el token expiró
        * @return - Devuelve la informacion del usuario
        */
        try {
            const decoded = jwt.verify(token, ACCES_TOKEN);
            return decoded
        } catch (err) {
            if (err.name === 'TokenExpiredError') {
                throw new ValidationTokenError(404, 'Authentication error: Token expired');
            }
            throw new ValidationTokenError(405, 'Authentication error: Invalid token');
        }

    }
    static async autentificacionPermisos2(req) {
        try {
            const { data, user } = req;
            const { action } = data;
            const { cargo } = user;
            if (permisos_generales.has(action)) {
                return true
            }
            const permisos = await UsuariosRepository.get_cargos({
                ids: [cargo]
            });

            if (!permisos) {
                return false
            }
            for (const seccion of Object.values(permisos[0]._doc)) {
                for (const tipo of Object.values(seccion)) {
                    for (const item of Object.values(tipo)) {
                        if (item.permisos) {
                            for (const permiso of Object.values(item.permisos)) {
                                if (permiso.trim() === action.trim()) {
                                    return true;
                                }
                            }
                        }
                    }
                }
            }

            return false
        } catch (err) {
            console.log(err)
            throw new AccessError(412, `Acceso no autorizado ${req.data.action}`);
        }
    }
    static async autentificacionPermisosHttps(cargo, action) {
        try {

            let permisoOut = false
            if (permisos_generales.has(action)) {
                return true
            }

            const permisos = await UsuariosRepository.get_cargos({
                ids: [cargo]
            });
            if (!permisos) {
                return permisoOut
            }
            Object.values(permisos[0]._doc).forEach(seccion => {
                Object.values(seccion).forEach(tipo => {
                    Object.values(tipo).forEach(item => {
                        if (item.permisos) {
                            Object.values(item.permisos).forEach(permiso => {
                                if (permiso === action) {
                                    permisoOut = true
                                }
                            })
                        }
                    })
                })
            })
            return permisoOut
        } catch (err) {
            // console.log(err.message, `Cargo: ${cargo}  User:${user}`)
            // throw new AccessError(412, `Accesos no autorizado ${action}`);
            console.log(err)
        }
    }
    static async generarTokenRecuperacion() {
        return crypto.randomInt(0, Math.pow(10, 6)).toString().padStart(6, '0')
    }
}

