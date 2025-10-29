import { ZodError } from "zod";
import { TransporteError } from "../../Error/TransporteErrors.js";
import { RecordModificacionesRepository } from "../archive/ArchivoModificaciones.js";
import { ContenedoresRepository } from "../Class/Contenedores.js";
import { transporteValidations } from "../validations/transporte.js";
import { TransporteService } from "../services/transporte.js";
import { addHours } from "./utils/fechas.js";
import { db } from "../../DB/mongoDB/config/init.js";
import { LogsRepository } from "../Class/LogsSistema.js";
import { registrarPasoLog } from "./helper/logs.js";
import { ErrorTransporteLogicHandlers } from "./utils/errorsHandlers.js";
import { VehiculoRegistro } from "../Class/VehiculosRegistros.js";
import { Seriales } from "../Class/Seriales.js";
import { dataRepository } from "./data.js";
import { CrearDocumentosRepository } from "../services/crearDocumentos.js";
import JSZip from "jszip";

const PAGE_ITEMS = 50;

export class TransporteRepository {

    //#region programaciones
    static async get_transporte_programaciones_mulaContenedores() {
        try {
            const haceUnMes = new Date();
            haceUnMes.setMonth(haceUnMes.getMonth() - 2);

            const response = await ContenedoresRepository.get_Contenedores_sin_lotes({
                query: {
                    $and: [
                        { 'infoContenedor.fechaCreacion': { $gte: haceUnMes } },
                        { infoExportacion: { $exists: true } },
                    ],
                },
                select: {
                    numeroContenedor: 1,
                    totalKilos: 1,
                    totalCajas: 1,
                    infoContenedor: 1,
                    registrosSalidas: 1,
                },
                sort: { 'infoExportacion.fechaCreacion': -1 },
                populate: {
                    path: "registrosSalidas",
                    select: "codigo tipoVehiculo placa trailer pesoEstimado fecha transportadora",
                    options: { sort: { fecha: -1 } }
                }
            });
            const data = await TransporteService.filtrarContenedoresParaTransporte(response);
            return data;

        } catch (err) {
            if (err.status === 522) {
                throw err
            } else {
                throw new TransporteError(440, `Error get Contenedores programaciones ${err.message}`)
            }
        }
    }
    static async put_transporte_programaciones_mulaContenedor(req) {

        const { user } = req;
        const { data, action } = req.data;

        let log
        const session = await db.Contenedores.db.startSession();

        log = await LogsRepository.create({
            user: user._id,
            action: action,
            acciones: [{ paso: "Inicio de la función", status: "Iniciado", timestamp: new Date() }]
        })
        try {
            await session.withTransaction(async () => {
                const update = {};
                const serial = await Seriales.get_seriales("RVS-");
                const newCodigo = serial[0].name + String(serial[0].serial)
                const newData = {
                    ...data,
                    user: user._id,
                    codigo: newCodigo
                }

                if (!newData.tipoSalida) {
                    throw new TransporteError(440, `El tipo de salida es obligatorio`)
                }
                if (newData.tipoSalida === "Nacional") {
                    delete newData.contenedor
                }

                const registro = await VehiculoRegistro.addTractomula(newData, { session });
                await registrarPasoLog(log._id, "VehiculoRegistro.addTractomula", "Completado", `Se agregó el registro de tractomula con ID: ${registro._id}`);

                if (data.contenedor) {

                    update.$push = { registrosSalidas: registro._id.toString() };

                    const contenedor = await ContenedoresRepository.get_Contenedores_sin_lotes({
                        ids: [data.contenedor],
                        select: { numeroContenedor: 1 },
                    })

                    const idsCont = contenedor._id;

                    const newContenedor = await ContenedoresRepository.actualizar_contenedor(
                        { _id: data.contenedor },
                        update,
                        { session, new: true },
                        log._id
                    );

                    await RecordModificacionesRepository.post_record_contenedor_modification(
                        action,
                        user,
                        {
                            modelo: "Contenedor",
                            documentoId: idsCont,
                            descripcion: `Se agregó la programación tractomula`,
                        },
                        contenedor,
                        newContenedor,
                        { idsCont, action },
                        { session }
                    );
                }

                await dataRepository.incrementar_cn_serial("RVS-", session);

            });

        } catch (err) {
            console.error(`[ERROR][${new Date().toISOString()}]`, err);
            await ErrorTransporteLogicHandlers(err, log)
        } finally {
            await session.endSession();
            await registrarPasoLog(log._id, "Finalizo la funcion", "Completado");
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
            const response = await VehiculoRegistro.getRegistrosVehiculo({
                query: {
                    entregaPrecinto: { $exists: false },
                    tipoSalida: "Exportacion",
                }
            });
            return response;
        } catch (err) {
            const message = typeof err.message === "string" ? err.message : "Error inesperado";
            throw new TransporteError(470, `Error ${err.type || "interno"}: ${message}`);
        }
    }
    static async post_transporte_conenedor_entregaPrecinto(req) {
        const { user } = req
        const { data, fotos, action } = req.data;

        let log
        const session = await db.Contenedores.db.startSession();

        log = await LogsRepository.create({
            user: user._id,
            action: action,
            acciones: [{ paso: "Inicio de la función", status: "Iniciado", timestamp: new Date() }]
        })
        try {
            transporteValidations.post_transporte_conenedor_entregaPrecinto().parse(req.data.data);

            const { _id, entrega, recibe, fechaEntrega, observaciones } = data;

            await session.withTransaction(async () => {
                const fotosUrls = await TransporteService.guardarFotosEntregaPrecintoContenedor(fotos)
                registrarPasoLog(log._id, "TransporteService.guardarFotosEntregaPrecintoContenedor", "Completado", `Se guardaron las fotos del precinto para el contenedor con ID: ${_id}`);

                const update = {
                    entregaPrecinto: {
                        fotos: fotosUrls,
                        entrega,
                        recibe,
                        fechaEntrega: addHours(fechaEntrega, 5),
                        observaciones,
                    }
                }

                await VehiculoRegistro.actualizar_registro(
                    { _id },
                    update,
                    { user: user._id, action: action, session },
                )
                registrarPasoLog(log._id, "VehiculoRegistro.actualizar_registro", "Completado", `Se actualizó el registro de tractomula con ID: ${_id}`);
            });

        } catch (err) {
            console.error(`[ERROR][${new Date().toISOString()}]`, err);
            await ErrorTransporteLogicHandlers(err, log)
        } finally {
            await session.endSession();
            await registrarPasoLog(log._id, "Finalizo la funcion", "Completado");
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
    static async get_transporte_registros_salida_vehiculo_exportacion(req) {
        try {
            const { page } = req.data
            const resultsPerPage = 50;
            const response = await VehiculoRegistro.getRegistrosVehiculo({
                query: {
                    tipoSalida: "Exportacion"
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
                throw new TransporteError(440, `Error obteniendo registro salida vehiculos exportacion --- ${err.message}`)
            }
        }
    }
    static async get_transporte_registros_salida_vehiculo_exportacion_numeroElementos() {
        try {
            const filtro = {
                tipoSalida: "Exportacion"
            }
            const numeroContenedores = await VehiculoRegistro.obtener_cantidad_registros_vehiculos(filtro)
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
        const { user } = req;
        const { action, _id, data } = req.data

        let log
        const session = await db.Contenedores.db.startSession();

        log = await LogsRepository.create({
            user: user._id,
            action: action,
            acciones: [{ paso: "Inicio de la función", status: "Iniciado", timestamp: new Date() }]
        })
        try {

            await session.withTransaction(async () => {
                const oldregistro = await VehiculoRegistro.getRegistrosVehiculo({
                    ids: [_id],
                }, { session });
                if (oldregistro.length === 0) {
                    throw new TransporteError(404, `Registro no encontrado`);
                }
                if (oldregistro[0].contenedor.numeroContenedor !== data.contenedor) {
                    const newCont = await TransporteService.modificarRegistroontenedorSalidaVehiculoExportacion(action, user, oldregistro, data, { session });
                    data.contenedor = newCont[0]._id;
                }
                await VehiculoRegistro.actualizar_registro({ _id }, { $set: data }, { session });

            });

        } catch (err) {
            console.error(`[ERROR][${new Date().toISOString()}]`, err);
            await ErrorTransporteLogicHandlers(err, log)
        } finally {
            await session.endSession();
            await registrarPasoLog(log._id, "Finalizo la funcion", "Completado");
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

            const registros = await VehiculoRegistro.getRegistrosVehiculo({
                query: {
                    entregaPrecinto: { $exists: true },
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
            const numeroContenedores = await VehiculoRegistro.obtener_cantidad_registros_vehiculos(filtro)
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
            const response = await VehiculoRegistro.getRegistrosVehiculo({
                query: {
                    infoExportacion: { $exists: true },
                },
                skip: (page - 1) * resultsPerPage,
                limit: resultsPerPage,
                sort: { numeroContenedor: -1 },
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
    static async get_transporte_documentos_generarDocumentos(req) {
        try {
            const { registro } = req.data;

            const response = await VehiculoRegistro.getRegistrosVehiculo({
                ids: [registro],
                populate: {
                    path: 'contenedor',
                    select: 'infoExportacion numeroContenedor infoContenedor  totalKilos  totalCajas pallets'
                }
            });
            console.log(response[0])

            if (response.length > 0 && response[0].contenedor) {
                await response[0].contenedor.populate('infoContenedor.clienteInfo', 'CLIENTE');
                await response[0].contenedor.populate('infoContenedor.tipoFruta', 'tipoFruta');
            }
            if (response.length === 0) {
                throw new TransporteError(404, `Registro no encontrado`);
            }

            if (response[0].tipoVehiculo === "Camion") {
                const buffer = await CrearDocumentosRepository.crear_carta_responsabilidad_camiones(response[0])
                const base64 = buffer.toString('base64');

                return {
                    file: base64,
                    filename: `PLANTILLA CARTA INSTRUCCIONES TRANSPORTE FAVORITA_${response[0].contenedor.numeroContenedor}_${Date.now()}.docx`,
                    mimetype: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
                }
            } else if (response[0].tipoVehiculo === "Tractomula") {
                const zip = new JSZip();

                const buffer1 = await CrearDocumentosRepository.crear_reporte_vehiculo(response[0])
                const buffer2 = await CrearDocumentosRepository.crear_reporte_datalogger(response[0])
                const buffer3 = await CrearDocumentosRepository.crear_carta_instrucciones(response[0])
                const buffer4 = await CrearDocumentosRepository.crear_carta_responsabilidad(response[0])

                // Agregar documentos al ZIP
                zip.file(`REPORTE_VEHICULO__${response[0].contenedor.numeroContenedor}_${Date.now()}.xlsx`, buffer1);
                zip.file(`REPORTE_DATALOGGER__${response[0].contenedor.numeroContenedor}_${Date.now()}.xlsx`, buffer2);
                zip.file(`CARTA_INSTRUCCIONES__${response[0].contenedor.numeroContenedor}_${Date.now()}.docx`, buffer3);
                zip.file(`CARTA_RESPONSABILIDAD__${response[0].contenedor.numeroContenedor}_${Date.now()}.docx`, buffer4);

                // Generar ZIP
                const zipBuffer = await zip.generateAsync({ type: 'nodebuffer' });
                const base64 = zipBuffer.toString('base64');

                return {
                    file: base64,
                    filename: `DOCUMENTOS_TRACTOMULA_${Date.now()}.zip`,
                    mimetype: 'application/zip'
                };
            }


        } catch (err) {
            if (err.status === 522) {
                throw err
            } else {
                throw new TransporteError(440, `Error obteniendo contenedores --- ${err.message}`)
            }
        }
    }
    //#endregion
}

