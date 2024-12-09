const { TransporteError } = require("../../Error/TransporteErrors");
const { ContenedoresRepository } = require("../Class/Contenedores");


class TransporteRepository {
    static async get_transporte_exportacion_contenedores() {
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
            if (err.status === 508) {
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
            if (err.status === 508) {
                throw err
            } else {
                throw new TransporteError(440, `Error obteniendo contenedores --- ${err.message}`)
            }
        }
    }
    static async get_transporte_registro_exportacion(req) {
        try {
            const { page } = req
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
            if (err.status === 508) {
                throw err
            } else {
                throw new TransporteError(440, `Error obteniendo contenedores --- ${err.message}`)
            }
        }
    }
    static async get_transporte_mula_contenedores() {
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
            if (err.status === 508) {
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
            if (err.status === 508) {
                throw err
            } else {
                throw new TransporteError(440, `Error obteniendo contenedores --- ${err.message}`)
            }
        }
    }
    static async get_transporte_registro_programacion_mula(req) {
        try {
            const { page } = req
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
            if (err.status === 508) {
                throw err
            } else {
                throw new TransporteError(440, `Error obteniendo contenedores --- ${err.message}`)
            }
        }
    }
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
            if (err.status === 508) {
                throw err
            } else {
                throw new TransporteError(440, `Error obteniendo contenedores --- ${err.message}`)
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
            if (err.status === 508) {
                throw err
            } else {
                throw new TransporteError(440, `Error obteniendo contenedores --- ${err.message}`)
            }
        }
    }
    static async get_transporte_registro_formularios_inspeccion(req) {
        try {
            const { page } = req
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
            if (err.status === 508) {
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
    static async get_transporte_documentos_programacionMula_contenedores(req) {
        try {
            const { page } = req
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
            if (err.status === 508) {
                throw err
            } else {
                throw new TransporteError(440, `Error obteniendo contenedores --- ${err.message}`)
            }
        }
    }
    static async post_transporte_programacion_exportacion(req, user) {
        try {
            const { action, _id, data } = req
            const query = {
                infoExportacion: {
                    ...data
                }
            }
            await ContenedoresRepository.modificar_contenedor(
                _id, query, user, action
            )

        } catch (err) {
            if (err.status === 524) {
                throw err
            } else {
                throw new TransporteError(441, `Error ingresanddo dato post_transporte_programacion_exportacion a contenedor  --- ${err.message}`)
            }
        }
    }
    static async post_transporte_programacion_exportacion_modificar(req, user) {
        try {
            const { action, _id, data } = req
            const query = {
                $set: {
                    ...data
                }
            }
            await ContenedoresRepository.modificar_contenedor(
                _id, query, user, action
            )

        } catch (err) {
            if (err.status === 524) {
                throw err
            } else {
                throw new TransporteError(441, `Error ingresanddo dato post_transporte_programacion_exportacion_modificar a contenedor  --- ${err.message}`)

            }
        }
    }
    static async post_transporte_programacion_mula(req, user) {
        try {
            const { action, _id, data } = req
            const query = {
                infoTractoMula: {
                    ...data
                }
            }
            await ContenedoresRepository.modificar_contenedor(
                _id, query, user, action
            )

        } catch (err) {
            if (err.status === 524) {
                throw err
            } else {
                throw new TransporteError(441,
                    `Error ingresanddo dato post_transporte_programacion_mula a contenedor  --- 
                    ${err.message}`
                )

            }
        }
    }
    static async post_transporte_programacion_mula_modificar(req, user) {
        try {
            const { action, _id, data } = req
            const query = {
                $set: {
                    ...data
                }
            }
            await ContenedoresRepository.modificar_contenedor(
                _id, query, user, action
            )

        } catch (err) {
            if (err.status === 524) {
                throw err
            } else {
                throw new TransporteError(441,
                    `Error ingresanddo dato post_transporte_programacion_mula_modificar a contenedor  --- 
                    ${err.message}`
                )
            }
        }
    }
    static async post_transporte_formulario_inspeccion_mula(req, user) {
        try {
            const { action, _id, data } = req
            const query = {
                inspeccion_mula: {
                    ...data,
                    usuario: user._id
                }
            }
            await ContenedoresRepository.modificar_contenedor(
                _id, query, user.user, action
            )

        } catch (err) {
            if (err.status === 524) {
                throw err
            } else {
                throw new TransporteError(441,
                    `Error ingresanddo dato post_transporte_formulario_inspeccion_mula a contenedor  --- 
                    ${err.message}`
                )
            }
        }
    }
    static async post_transporte_registros_inspeccionMula_modificar(req, user) {
        try {
            const { action, _id, data } = req
            const query = {
                $set: {
                    ...data
                }
            }
            await ContenedoresRepository.modificar_contenedor(
                _id, query, user, action
            )

        } catch (err) {
            if (err.status === 524) {
                throw err
            } else {
                throw new TransporteError(441,
                    `Error ingresanddo dato post_transporte_registros_inspeccionMula_modificar a contenedor  --- 
                    ${err.message}`
                )
            }
        }
    }
}

module.exports = {
    TransporteRepository
}