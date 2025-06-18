import { ZodError } from "zod";
import { TransporteError } from "../../Error/TransporteErrors.js";
import { RecordModificacionesRepository } from "../archive/ArchivoModificaciones.js";
import { ContenedoresRepository } from "../Class/Contenedores.js";
import { transporteValidations } from "../validations/transporte.js";
import { TransporteService } from "../services/transporte.js";
const PAGE_ITEMS = 50;

export class TransporteRepository {

    //#region programaciones
    static async get_transporte_programaciones_mulaContenedores() {
        try {
            const haceUnMes = new Date();
            haceUnMes.setMonth(haceUnMes.getMonth() - 1);

            const response = await ContenedoresRepository.get_Contenedores_sin_lotes({
                query: {
                    $and: [
                        { 'infoContenedor.fechaCreacion': { $gte: haceUnMes } },
                        { infoExportacion: { $exists: true } },
                        { infoTractoMula: { $exists: false } },
                    ],
                },
                select: {
                    numeroContenedor: 1,
                    infoContenedor: 1,
                    __v: 1,
                },
                sort: { 'infoExportacion.fechaCreacion': -1 },
            });
            return response

        } catch (err) {
            if (err.status === 522) {
                throw err
            } else {
                throw new TransporteError(440, `Error get Contenedores programaciones ${err.message}`)
            }
        }
    }
    static async put_transporte_programaciones_mulaContenedor(req) {
        try {
            const { user } = req

            const { action, _id, data } = req.data

            //se obtienen los datos
            const contenedor = await ContenedoresRepository.get_Contenedores_sin_lotes({
                ids: [_id],
                select: { numeroContenedor: 1 },
            })

            const query = {
                infoTractoMula: {
                    ...data
                }
            }

            const newContenedor = await ContenedoresRepository.actualizar_contenedor(
                { _id },
                query
            );

            // Registrar modificación Contenedores
            await RecordModificacionesRepository.post_record_contenedor_modification(
                action,
                user,
                {
                    modelo: "Contenedor",
                    documentoId: _id,
                    descripcion: `Se agregó la programación tractomula`,
                },
                contenedor,
                newContenedor,
                { action, _id, data }
            );

        } catch (err) {
            if (err.status === 523) {
                throw err
            } else {
                throw new TransporteError(440,
                    `Error ingresanddo dato post_transporte_programacion_mula a contenedor  --- 
                    ${err.message}`
                )

            }
        }
    }
    static async get_transporte_programaciones_exportacion_contenedores() {
        try {
            const haceUnMes = new Date();
            haceUnMes.setMonth(haceUnMes.getMonth() - 1);

            const inicioDeMes = new Date(haceUnMes.getFullYear(), haceUnMes.getMonth(), 1);

            const response = await ContenedoresRepository.get_Contenedores_sin_lotes({
                query: {
                    $and: [
                        {
                            'infoContenedor.fechaCreacion': { $gte: inicioDeMes },
                        },
                        { infoExportacion: { $exists: false } },
                    ],
                },
                select: {
                    numeroContenedor: 1,
                    infoContenedor: 1,
                    __v: 1,
                },
                sort: { 'infoContenedor.fechaCreacion': -1 },
            });

            return response;

        } catch (err) {
            if (err.status === 522) {
                throw err
            } else {
                throw new TransporteError(440, `Error obteniendo contenedores --- ${err.message}`)
            }
        }
    }
    static async put_transporte_programaciones_exportacion(req) {
        try {
            const { user } = req
            const { action, _id, data } = req.data
            //se obtienen los datos
            const contenedor = await ContenedoresRepository.get_Contenedores_sin_lotes({
                ids: [_id],
                select: { numeroContenedor: 1 },
            })

            const query = {
                infoExportacion: {
                    ...data
                }
            }

            const newContenedor = await ContenedoresRepository.actualizar_contenedor(
                { _id },
                query
            );

            // Registrar modificación Contenedores
            await RecordModificacionesRepository.post_record_contenedor_modification(
                action,
                user,
                {
                    modelo: "Contenedor",
                    documentoId: _id,
                    descripcion: `Se agregó transporte exportacion `,
                },
                contenedor,
                newContenedor,
                { action, _id, data }
            );

        } catch (err) {
            if (err.status === 523) {
                throw err
            } else {
                throw new TransporteError(440, `Error ingresanddo dato post_transporte_programacion_exportacion a contenedor  --- ${err.message}`)
            }
        }
    }
    static async get_transporte_contenedores_entregaPrescinto() {
        try {
            const response = await ContenedoresRepository.get_Contenedores_sin_lotes({
                query: {
                    infoExportacion: { $exists: true },
                    entregaPrecinto: { $exists: false },
                }
            })
            return response;
        } catch (err) {
            const message = typeof err.message === "string" ? err.message : "Error inesperado";
            throw new TransporteError(470, `Error ${err.type || "interno"}: ${message}`);
        }
    }
    /**
     * Registra la entrega de precinto para un contenedor, incluyendo fotos y datos de entrega.
     * @param {Object} req - Objeto de solicitud que contiene el usuario, datos de entrega, fotos y acción.
     * @param {Object} req.user - Usuario que realiza la acción.
     * @param {Object} req.data - Datos de la entrega.
     * @param {Object} req.data.data - Información de la entrega (id, entrega, recibe, fechaEntrega, observaciones).
     * @param {Array} req.data.fotos - Fotos asociadas a la entrega del precinto.
     * @param {string} req.data.action - Acción realizada.
     * @returns {Promise<void>} No retorna nada si la operación es exitosa.
     * @throws {TransporteError|ZodError} Si ocurre un error de validación o de proceso, lanza un error personalizado.
     */
    static async post_transporte_conenedor_entregaPrecinto(req) {
        try {
            transporteValidations.post_transporte_conenedor_entregaPrecinto().parse(req.data.data);
            const { user } = req
            const { data, fotos, action } = req.data;
            const { _id, entrega, recibe, fechaEntrega, observaciones } = data;

            const fotosUrls = await TransporteService.guardarFotosEntregaPrecintoContenedor(fotos)

            const update = {
                entregaPrecinto: {
                    fotos: fotosUrls,
                    entrega,
                    recibe,
                    fechaEntrega: new Date(fechaEntrega),
                    observaciones,
                }
            }

            await ContenedoresRepository.actualizar_contenedor(
                { _id },
                update,
                { user: user._id, action: action }
            )


        } catch (err) {
            if (err.status === 518 || err.status === 413) {
                throw err
            }
            if (err instanceof ZodError) {
                const mensajeLindo = err.errors[0]?.message || "Error desconocido en los datos del lote";
                throw new TransporteError(470, mensajeLindo);
            }
            const message = typeof err.message === "string" ? err.message : "Error inesperado";
            throw new TransporteError(470, `Error ${err.type || "interno"}: ${message}`);
        }
    }
    //#endregion
    //#region registros
    static async get_transporte_registros_exportacion(req) {
        try {
            const { page } = req.data
            const resultsPerPage = 50;
            const response = await ContenedoresRepository.get_Contenedores_sin_lotes({
                query: {
                    infoExportacion: { $exists: true },
                },
                select: {
                    numeroContenedor: 1,
                    infoContenedor: 1,
                    __v: 1,
                    infoExportacion: 1,
                },
                skip: (page - 1) * resultsPerPage,
                limit: resultsPerPage,
                sort: { 'infoExportacion.fecha': -1 },
            });

            return response;

        } catch (err) {
            if (err.status === 522) {
                throw err
            } else {
                throw new TransporteError(440, `Error obteniendo contenedores --- ${err.message}`)
            }
        }
    }
    static async get_transporte_registros_exportacion_numeroElementos() {
        try {
            const filtro = {
                infoExportacion: { $exists: true }
            }
            const numeroContenedores = await ContenedoresRepository.obtener_cantidad_contenedores(filtro)

            return numeroContenedores

        } catch (err) {
            if (err.status === 524) {
                throw err
            } else {
                throw new TransporteError(440, `Error obteniendo contenedores --- ${err.message}`)
            }
        }
    }
    static async put_transporte_registros_exportacion(req) {
        try {
            const { user } = req

            const { action, _id, data } = req.data
            //se obtienen los datos
            const contenedor = await ContenedoresRepository.get_Contenedores_sin_lotes({
                ids: [_id],
                select: { numeroContenedor: 1, infoExportacion: 1 },
            })
            const query = {
                $set: {
                    ...data
                }
            }
            const newContenedor = await ContenedoresRepository.actualizar_contenedor(
                { _id },
                query
            );

            // Registrar modificación Contenedores
            await RecordModificacionesRepository.post_record_contenedor_modification(
                action,
                user,
                {
                    modelo: "Contenedor",
                    documentoId: _id,
                    descripcion: `Se modifico transporte exportacion `,
                },
                contenedor[0].infoExportacion,
                newContenedor.infoExportacion,
                { action, _id, data }
            );

        } catch (err) {
            if (err.status === 523) {
                throw err
            } else {
                throw new TransporteError(440, `Error ingresando dato put_transporte_programacion_exportacion_modificar a contenedor  --- ${err.message}`)

            }
        }
    }
    static async get_transporte_registros_programacionMula(req) {
        try {
            const { page } = req.data
            const resultsPerPage = 50;
            const response = await ContenedoresRepository.get_Contenedores_sin_lotes({
                query: {
                    infoTractoMula: { $exists: true },
                },
                select: {
                    numeroContenedor: 1,
                    infoContenedor: 1,
                    __v: 1,
                    infoTractoMula: 1,
                },
                skip: (page - 1) * resultsPerPage,
                limit: resultsPerPage,
                sort: { 'infoTractoMula.fecha': -1 },
            });

            return response;

        } catch (err) {
            if (err.status === 522) {
                throw err
            } else {
                throw new TransporteError(440, `Error obteniendo contenedores --- ${err.message}`)
            }
        }
    }
    static async get_transporte_registros_programacion_mula_numeroElementos() {
        try {
            const filtro = {
                infoTractoMula: { $exists: true }
            }
            const numeroContenedores = await ContenedoresRepository.obtener_cantidad_contenedores(filtro)

            return numeroContenedores

        } catch (err) {
            if (err.status === 522) {
                throw err
            } else {
                throw new TransporteError(440, `Error obteniendo contenedores --- ${err.message}`)
            }
        }
    }
    static async put_transporte_registros_programacionMula(req) {
        try {
            const { user } = req
            const { action, _id, data } = req.data
            //se obtienen los datos
            const contenedor = await ContenedoresRepository.get_Contenedores_sin_lotes({
                ids: [_id],
                select: { numeroContenedor: 1, infoTractoMula: 1 },
            })

            const query = {
                $set: {
                    ...data
                }
            }
            const newContenedor = await ContenedoresRepository.actualizar_contenedor(
                { _id },
                query
            );

            // Registrar modificación Contenedores
            await RecordModificacionesRepository.post_record_contenedor_modification(
                action,
                user,
                {
                    modelo: "Contenedor",
                    documentoId: _id,
                    descripcion: `Se modifico transporte programacion mula `,
                },
                contenedor[0].infoTractoMula,
                newContenedor.infoTractoMula,
                { action, _id, data }
            );

        } catch (err) {
            if (err.status === 523) {
                throw err
            } else {
                throw new TransporteError(440,
                    `Error ingresanddo dato post_transporte_programacion_mula_modificar a contenedor  --- 
                    ${err.message}`
                )
            }
        }
    }
    static async get_transporte_registros_inspeccionMula_numeroElementos() {
        try {
            const filtro = {
                inspeccion_mula: { $exists: true }
            }
            const numeroContenedores = await ContenedoresRepository.obtener_cantidad_contenedores(filtro)

            return numeroContenedores

        } catch (err) {
            if (err.status === 524) {
                throw err
            } else {
                throw new TransporteError(440, `Error obteniendo contenedores --- ${err.message}`)
            }
        }
    }
    static async get_transporte_registros_formulariosInspeccion(req) {
        try {
            const { page } = req.data
            const resultsPerPage = 50;
            const response = await ContenedoresRepository.get_Contenedores_sin_lotes({
                query: {
                    inspeccion_mula: { $exists: true },
                },
                select: {
                    numeroContenedor: 1,
                    infoContenedor: 1,
                    __v: 1,
                    inspeccion_mula: 1,
                },
                skip: (page - 1) * resultsPerPage,
                limit: resultsPerPage,
                sort: { 'inspeccion_mula.fecha': -1 },
            });

            return response;

        } catch (err) {
            if (err.status === 522) {
                throw err
            } else {
                throw new TransporteError(440, `Error obteniendo contenedores --- ${err.message}`)
            }
        }
    }
    static async put_transporte_registros_inspeccionMula(req) {
        try {
            const { user } = req
            const { action, _id, data } = req.data
            //se obtienen los datos
            const contenedor = await ContenedoresRepository.get_Contenedores_sin_lotes({
                ids: [_id],
                select: { numeroContenedor: 1, inspeccion_mula: 1 },
            })
            const query = {
                $set: {
                    ...data
                }
            }
            const newContenedor = await ContenedoresRepository.actualizar_contenedor(
                { _id },
                query
            );

            // Registrar modificación Contenedores
            await RecordModificacionesRepository.post_record_contenedor_modification(
                action,
                user,
                {
                    modelo: "Contenedor",
                    documentoId: _id,
                    descripcion: `Se modifico formulario inspeccion mula `,
                },
                contenedor[0].inspeccion_mula,
                newContenedor.inspeccion_mula,
                { action, _id, data }
            );


        } catch (err) {
            if (err.status === 523) {
                throw err
            } else {
                throw new TransporteError(441,
                    `Error ingresanddo dato post_transporte_registros_inspeccionMula_modificar a contenedor  --- 
                    ${err.message}`
                )
            }
        }
    }
    static async get_transporte_registros_entregaPrecintos(req) {
        try {
            const { data } = req;
            const { page } = data

            const registros = await ContenedoresRepository.get_Contenedores_sin_lotes({
                query: {
                    entregaPrecinto: { $exists: true },
                    infoTractoMula: { $exists: true },
                },
                select: {
                    numeroContenedor: 1,
                    infoContenedor: 1,
                    infoTractoMula: 1,
                    entregaPrecinto: 1,
                },
                skip: (page - 1) * PAGE_ITEMS,
                limit: PAGE_ITEMS,
                sort: { 'entregaPrecinto.fechaEntrega': -1 },
            })
            return registros
        } catch (err) {
            if (err.status === 518 || err.status === 413) {
                throw err
            }
            if (err instanceof ZodError) {
                const mensajeLindo = err.errors[0]?.message || "Error desconocido en los datos del lote";
                throw new TransporteError(470, mensajeLindo);
            }
            const message = typeof err.message === "string" ? err.message : "Error inesperado";
            throw new TransporteError(470, `Error ${err.type || "interno"}: ${message}`);
        }
    }
    static async get_transporte_registros_entregaPrecintos_numeroElementos() {
        try {
            const filtro = {
                entregaPrecinto: { $exists: true }
            }
            const numeroContenedores = await ContenedoresRepository.obtener_cantidad_contenedores(filtro)
            return numeroContenedores

        } catch (err) {
            if (err.status === 524) {
                throw err
            } else {
                throw new TransporteError(440, `Error obteniendo contenedores --- ${err.message}`)
            }
        }
    }
    static async get_transporte_registros_entregaPrecintos_fotos(req) {
        try {
            const { data } = req.data;
            transporteValidations.get_transporte_registros_entregaPrecintos_fotos().parse(data);
            const response = await TransporteService.obtenerFotosEntregaPrecintoContenedor(data);
            return response
        } catch (err) {
            if (err.status === 524) {
                throw err
            } else {
                throw new TransporteError(440, `Error obteniendo contenedores --- ${err.message}`)
            }
        }
    }
    //#endregion
    //#region formularios
    static async get_transporte_formulario_contenedores() {
        try {
            const haceUnMes = new Date();
            haceUnMes.setMonth(haceUnMes.getMonth() - 1);

            const response = await ContenedoresRepository.get_Contenedores_sin_lotes({
                query: {
                    $and: [
                        { 'infoContenedor.fechaCreacion': { $gte: haceUnMes } },
                        { infoTractoMula: { $exists: true } },
                        { inspeccion_mula: { $exists: false } },
                    ],
                },
                select: {
                    numeroContenedor: 1,
                    infoContenedor: 1,
                    infoTractoMula: 1,
                    __v: 1,
                },
                sort: { 'infoExportacion.fechaCreacion': -1 },
            });
            return response

        } catch (err) {
            if (err.status === 522) {
                throw err
            } else {
                throw new TransporteError(440, `Error obteniendo contenedores --- ${err.message}`)
            }
        }
    }
    static async put_transporte_formulario_inspeccionMula(req) {
        try {
            const { user } = req
            const { action, _id, data } = req.data
            //se obtienen los datos
            const contenedor = await ContenedoresRepository.get_Contenedores_sin_lotes({
                ids: [_id],
                select: { numeroContenedor: 1 },
            })

            const query = {
                inspeccion_mula: {
                    ...data,
                    usuario: user._id
                }
            }
            const newContenedor = await ContenedoresRepository.actualizar_contenedor(
                { _id },
                query
            );

            // Registrar modificación Contenedores
            await RecordModificacionesRepository.post_record_contenedor_modification(
                action,
                user,
                {
                    modelo: "Contenedor",
                    documentoId: _id,
                    descripcion: `Se ingresa el formulario de inspeccion mula`,
                },
                contenedor[0],
                newContenedor,
                { action, _id, data }
            );

        } catch (err) {
            if (err.status === 523) {
                throw err
            } else {
                throw new TransporteError(440,
                    `Error ingresanddo dato post_transporte_formulario_inspeccion_mula a contenedor  --- 
                    ${err.message}`
                )
            }
        }
    }
    //#endregion
    //#region documentos
    static async get_transporte_documentos_programacionMula_contenedores(req) {
        try {
            const { page } = req.data
            const resultsPerPage = 50;
            const response = await ContenedoresRepository.get_Contenedores_sin_lotes({
                query: {
                    infoTractoMula: { $exists: true },
                    infoExportacion: { $exists: true },
                    "infoContenedor.cerrado": true
                },
                select: {
                    numeroContenedor: 1,
                    infoContenedor: 1,
                    __v: 1,
                    infoTractoMula: 1,
                    infoExportacion: 1,
                    pallets: 1
                },
                skip: (page - 1) * resultsPerPage,
                limit: resultsPerPage,
                populate: {
                    path: 'infoContenedor.clienteInfo',
                    select: 'CLIENTE DIRECCIÓN',
                },
                sort: { 'infoContenedor.fechaCreacion': -1 },
            });

            return response;

        } catch (err) {
            if (err.status === 522) {
                throw err
            } else {
                throw new TransporteError(440, `Error obteniendo contenedores --- ${err.message}`)
            }
        }
    }
    static async get_transporte_documentos_programacionMulas_numeroElementos() {
        try {
            const filtro = {
                infoTractoMula: { $exists: true },
                "infoContenedor.cerrado": true
            }
            const numeroContenedores = await ContenedoresRepository.obtener_cantidad_contenedores(filtro)

            return numeroContenedores

        } catch (err) {
            if (err.status === 508) {
                throw err
            } else {
                throw new TransporteError(440, `Error obteniendo contenedores --- ${err.message}`)
            }
        }
    }
    //#endregion
}

