const jwt = require('jsonwebtoken');
const { ValidationUserError, ValidationTokenError, AccessError } = require('../../Error/ValidationErrors');
const { UsuariosRepository } = require('../Class/Usuarios');
const permisos_generales = [
    "obtener_status_proceso",
    "obtener_info_mi_cuenta",
    "modificar_mi_password",
    "count_documents_formularios_calidad_limpieza_diaria",
    "count_documents_formularios_calidad_limpieza_mensual",
    "count_documents_formularios_calidad_control_plagas",
    "obtener_cantidad_usuarios",
    "obtener_cantidad_contenedores",
    "obtener_cantidad_historial_espera_descargue",
    "obtener_cantidad_historial_ingreso_inventario",
    "get_info_formulario_inspeccion_fruta",
    "get_transporte_registros_programacion_mula_numeroElementos",
    "get_transporte_registros_exportacion_numeroElementos",
    "get_transporte_registros_inspeccionMula_numeroElementos",
    "get_transporte_documentos_programacionMulas_numeroElementos",
    "get_inventario_historiales_ingresoFruta_numeroElementos",


    //obteniendo constantes
    "get_constantes_sistema_clasificacion_descarte",
    "get_constantes_sistema_observaciones_calidad"
]

class UserRepository {

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
        /**
         * Valida los valores de usuario son validos
         * 
         * @param {{user:string, password:string}} user - Un objeto que contiene la informacion de inicio de sesion
         * @throws {TypeError} - Retorna un error de tipo si no cumple con alguna de las condiciones
         * @return {void}
         * 
         */

        if (typeof user.user !== "string") throw new ValidationUserError(401, "El usuario debe ser texto")
        if (user.user < 3) throw new ValidationUserError(401, "El usuario debe tener mas de 3 letras")
    }
    static generateAccessToken(data) {
        /**
         * Se genera el token de acceso con la libreria jwt
         * 
         * @param {            
         * user: string,
         * cargo: string
         * _id: string
         * }
         * @return - Access token
         * 
         */
        return jwt.sign(data, process.env.ACCES_TOKEN, { expiresIn: '5h' })
    }
    static async authenticateTokenSocket(socket, next) {
        /**
         * Autentica el token de acceso para establecer la conexion con el socket
         * 
         * @param {socket} - El socket que va a crear la conexion
         * @param {next} - Es la funcion que pasa cuando se cumple el middleware
         * @throws - ValidationTokenError regresa un error si el token expiró
         */
        const token = socket.handshake.auth.token;

        if (!token) {
            return next(new ValidationTokenError(403, 'Authentication error: No token provided'));
        }

        try {
            const decoded = jwt.verify(token, process.env.ACCES_TOKEN);
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
            const decoded = jwt.verify(token, process.env.ACCES_TOKEN);
            return decoded
        } catch (err) {
            if (err.name === 'TokenExpiredError') {
                throw new ValidationTokenError(404, 'Authentication error: Token expired');
            }
            throw new ValidationTokenError(405, 'Authentication error: Invalid token');
        }

    }
    // static async autentificacionPermisos(cargo, action, user = '') {
    //     /**
    //      * Funcion que verifica si un cargo tiene permisos para realizar una acción específica.
    //      *
    //      * @param {string} cargo - El cargo del usuario que solicita realizar la acción.
    //      * @param {string} action - La acción que se desea realizar.
    //      * @returns {Promise<boolean>} - Promesa que resuelve a true si el cargo tiene permiso para la acción.
    //      * @throws {AccessError} - Lanza un error si el cargo no tiene permiso o si la acción no está definida.
    //      */
    //     try {
    //         const permisos = {
    //             //#region get

    //             //inventarios
    //             obtenerEF1: ['recepcion', 'admin'],
    //             getProveedores: ['recepcion', 'admin'],
    //             getInventario: ['recepcion', 'admin', 'contabilidad'],
    //             getInventarioDesverdizado: ['recepcion', 'admin', 'contabilidad'],
    //             getInventario_orden_vaceo: ['admin', 'recepcion'],
    //             getOrdenVaceo: ['recepcion', 'admin'],
    //             obtenerHistorialLotes: ['recepcion', 'admin', 'contabilidad'],
    //             obtenerHistorialLotesDirectoNacional: ['recepcion', 'admin', 'contabilidad'],
    //             obtener_inventario_descartes: ['recepcion', 'admin', 'contabilidad'],
    //             getClientes: ['admin'],
    //             get_ingresos_lotes: ['admin', 'recepcion', 'contabilidad'],
    //             obtener_contenedores_lotes: ['admin'],
    //             //calidad
    //             getLotesCalidadInterna: ['admin', 'inspector'],
    //             getLotesClasificacionCalidad: ['admin', 'inspector'],
    //             get_descarte_reproceso: ['admin', 'inspector'],
    //             get_lotes_informe_calidad: ['admin', 'inspector'],
    //             get_lotes_clasificacion_descarte: ['admin', 'inspector'],
    //             get_historial_calidad_interna: ['admin'],
    //             get_historial_clasificacion_descarte: ['admin'],
    //             obtener_observaciones_calidad: ['admin'],
    //             obtener_imagen_lote_calidad: ['admin'],
    //             //proceso
    //             get_predio_Proceso_Descarte: ['admin'],
    //             //views
    //             view_lotes: ['admin', 'contabilidad'],
    //             getInfoIndicadoresProceso: ['admin'],
    //             //comercial 
    //             obtener_precio_proveedores: ['admin'],
    //             get_cargos: ['admin'],
    //             get_users: ['admin'],

    //             //!
    //             //#region post
    //             guardarLote: ['recepcion', 'admin'],
    //             guardarDescarteHistorial: ['admin', 'recepcion'],
    //             crearContenedor: ['admin'],

    //             //#region Put
    //             directoNacional: ['recepcion', 'admin'],
    //             desverdizado: ['recepcion', 'admin'],
    //             addOrdenDeVaceo: ['admin'],
    //             vaciarLote: ['recepcion', 'admin'],
    //             modificarHistorialFrutaProcesada: ['admin', 'recepcion'],
    //             ingresar_descarte_lavado: ['admin', 'aux_descarte_lavado'],
    //             ingresar_descarte_encerado: ['admin', 'aux_descarte_encerado'],
    //             ingresoCalidadInterna: ['admin', 'inspector'],
    //             put_lotes_clasificacion_descarte: ['admin', 'inspector'],
    //             ingresar_foto_calidad: ['admin', 'inspector'],
    //             reprocesar_predio: ['admin'],
    //             reprocesar_celifrut: ['admin'],
    //             ingresar_precio_fruta: ['admin'],
    //             set_parametros_desverdizado: ['admin', 'recepcion'],
    //             set_finalizar_desverdizado: ['admin', 'recepcion'],
    //             modificarHistorial_directoNacional: ['admin'],
    //             despacho_descarte: ['admin', 'recepcion'],
    //             //modificar datos
    //             modificar_ingreso_lote: ['admin'],
    //             modificar_calidad_interna_lote: ['admin'],
    //             modificar_clasificacion_descarte_lote: ['admin'],
    //             modificar_predio_proceso_descarte: ['admin'],
    //             modificar_predio_proceso_listaEmpaque: ['admin'],

    //             //#region lista de empaque
    //             obtener_predio_listaDeEmpaque: ['admin', "aux_lista_empaque", 'inspector'],
    //             obtener_contenedores_listaDeEmpaque: ['admin', "aux_lista_empaque", 'inspector'],
    //             add_settings_pallet: ['admin', 'aux_lista_empaque'],
    //             actualizar_pallet_contenedor: ['admin', 'aux_lista_empaque'],
    //             eliminar_item_lista_empaque: ['admin', 'aux_lista_empaque'],
    //             restar_item_lista_empaque: ['admin', 'aux_lista_empaque'],
    //             mover_item_lista_empaque: ['admin', 'aux_lista_empaque'],
    //             agregar_cajas_sin_pallet: ['admin', 'aux_lista_empaque'],
    //             obtener_cajas_sin_pallet: ['admin', 'aux_lista_empaque', 'inspector'],
    //             eliminar_item_cajas_sin_pallet: ['admin', 'aux_lista_empaque'],
    //             liberar_pallets_lista_empaque: ['admin', 'inspector'],
    //             cerrar_contenedor: ['admin', 'inspector', 'aux_lista_empaque'],
    //             modificar_items_lista_empaque: ['admin', 'aux_lista_empaque'],

    //             // #region Comercial
    //             inactivar_Proveesdor: ['admin'],
    //             addProveedor: ['admin'],
    //             modificar_proveedor: ['admin'],
    //             //cuentas
    //             add_cargo: ['admin'],
    //             add_user: ['admin'],

    //         }
    //         if (Object.prototype.hasOwnProperty.call(permisos, action)) {
    //             if (permisos[action].includes(cargo)) {
    //                 return true;
    //             } else {
    //                 return false;
    //             }
    //         }
    //         return false;
    //     } catch (err) {
    //         console.log(err.message, `Cargo: ${cargo}  User:${user}`)
    //         throw new AccessError(412, `Accesos no autorizado ${action}`);
    //     }
    // }
    static async autentificacionPermisos2(req) {
        try {
            const { data, user } = req;
            const { action } = data;
            const { cargo } = user;

            if (permisos_generales.includes(action)) {
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
                                console.log("permiso:", permiso);
                                console.log("action:", action);
                                console.log("Comparación:", permiso.trim() === action.trim());
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
            throw new AccessError(412, `Accesos no autorizado ${req.data.action}`);
        }
    }
    static async autentificacionPermisosHttps(cargo, action) {
        try {

            let permisoOut = false
            if (permisos_generales.includes(action)) {
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
}


module.exports.UserRepository = UserRepository