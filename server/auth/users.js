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

    "obtener_cantidad_usuarios",
    "obtener_cantidad_historial_espera_descargue",
    "obtener_cantidad_historial_ingreso_inventario",
    "get_comercial_precios_cantidad_registros",
    "get_inventarios_historiales_numeroCanastillas_registros",
    "get_info_formulario_inspeccion_fruta",

    //numero de elementos
    "get_inventarios_historiales_listasDeEmpaque_numeroRegistros",
    "get_comercial_formularios_reclamacionesCalidad_numeroElementos",
    "get_calidad_formulario_limpiezaDiaria_numeroElementos",
    "get_calidad_formulario_limpiezaMensual_numeroElementos",
    "get_calidad_formulario_controlPlagas_numeroElementos",
    "get_transporte_registros_programacion_mula_numeroElementos",
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
    //obteniendo constantes
    "get_constantes_sistema_clasificacion_descarte",
    "get_constantes_sistema_observaciones_calidad",
    "get_constantes_sistema_tipo_frutas",
    "get_constantes_sistema_paises_GGN",
    "get_comercial_clientesNacionales",
    //se obtiene datos del sistema
    "Get_info_update_app_desktop",

    //obtener los proveedores para desplegables
    "get_sys_proveedores",
    "get_data_tipoFruta",
    "get_data_clientes",
    "get_data_cargos",
    "get_data_clientesNacionales",
    "get_data_proveedores",

    //seriales
    "get_data_EF8",

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
        if (user.password < 3) throw new ValidationUserError(402, "La constraseña debe tener mas de 3 caracteres de largo")
    }
    static async validate_userName(user) {
        if (typeof user.user !== "string") throw new ValidationUserError(401, "El usuario debe ser texto")
        if (user.user < 3) throw new ValidationUserError(401, "El usuario debe tener mas de 3 letras")
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

