import { db } from "../../../DB/mongoDB/config/init.js";
import { LogsRepository } from "../../Class/LogsSistema.js";
import { Seriales } from "../../Class/Seriales.js";
import { PersonalRepository } from "../../Class/talentoHumano/Personal.js";
import { TalentoHumanoValidations } from "../../validations/talentoHumano.js";
import { registrarPasoLog } from "../helper/logs.js";
import { ErrorTalentHumanoLogicHandlers } from "../utils/errorsHandlers.js";
import path from "path";
import { cleanForRust } from "../../routes/sockets/utils/cleanData.js";
import { rustRcpClient } from "../../../config/grpcRust.js";
import { FileService } from "../../services/helpers/FileService.js";
import { CarnetsService } from "../../services/talentoHumano/carnets.js";
import { TalentoHumanoDotacionCarnetsRepository } from "../../Class/talentoHumano/dotacion/Carnets.js";
import bcrypt from "bcrypt";


export class PersonalControllerRepository {

    static async post_talentoHumano_personal_ingresoPersonal(req) {
        const { user } = req
        const { action, data, cedulaPath, foto } = req.data
        let log
        log = await LogsRepository.create({
            user: user._id,
            action: action,
            acciones: [{ paso: "Inicio de la función", status: "Iniciado", timestamp: new Date() }]
        })
        const session = await db.Personal.db.startSession();

        try {
            TalentoHumanoValidations.post_talentoHumano_personal_ingresoPersonal().parse(data)

            if (!cedulaPath) {
                throw new Error('El documento de identificación es obligatorio.');
            }
            const urlPath = path.join(
                "personal",
                "fotoCarnet",
            );

            const filePath = await FileService.saveBase64File(
                foto.url,
                urlPath,
                "STORAGE"
            )

            data.foto = filePath;


            await session.withTransaction(async () => {

                const skuResult = await Seriales.get_seriales("SKU", session)
                if (!skuResult || skuResult.length === 0) {
                    throw new Error("No se encontró el serial SKU")
                }
                const sku = skuResult[0]
                data.SKU = sku.serial
                data.urlIdentificacion = cedulaPath

                const payload = {
                    data: JSON.stringify(cleanForRust(filePath)),
                    server: "python",
                    action: "talentoHumano_procesamiento_imagen"
                };

                const responseStr = await rustRcpClient.sendData(payload);
                const response = JSON.parse(responseStr);

                if (!response.success) {
                    throw new Error(response.message)
                }

                data.urlFotoCarnet = response.path

                await PersonalRepository.post_data(data, { user: user._id, action: action, session })
                await registrarPasoLog(log._id, "Agregar personal", "completado")

                await Seriales.modificar_seriales({ name: "SKU" }, { $inc: { serial: 1 } }, { session })
                await registrarPasoLog(log._id, "Actualizar serial", "completado")

            })


        } catch (error) {
            console.error(`[ERROR][${new Date().toISOString()}]`, error);
            await ErrorTalentHumanoLogicHandlers(error, log)
        } finally {
            await session.endSession();
            await registrarPasoLog(log._id, "Fin de la función", "completado")
        }
    }
    static async post_talentoHumano_personal_cargarCedula(req) {
        const { user } = req
        const { action, cedula } = req.data
        let log
        log = await LogsRepository.create({
            user: user._id,
            action: action,
            acciones: [{ paso: "Inicio de la función", status: "Iniciado", timestamp: new Date() }]
        })

        try {

            if (!cedula) {
                throw new Error('El documento de identificación es obligatorio.');
            }

            if (typeof cedula !== 'string') {
                throw new Error('El documento de identificación debe enviarse como string en base64.');
            }

            const urlPath = path.join(
                "personal",
                "identificacion",
            );

            const filePath = await FileService.saveBase64File(
                cedula,
                urlPath,
                "STORAGE",
                { encrypt: true }
            )
            await registrarPasoLog(log._id, "Cargar cedula", "completado")
            const payload = {
                data: JSON.stringify(cleanForRust(filePath)),
                server: "python",
                action: "validar_cedula"
            };
            await registrarPasoLog(log._id, "Procesar cedula", "completado")
            const responseStr = await rustRcpClient.sendData(payload);
            const response = JSON.parse(responseStr);
            await registrarPasoLog(log._id, "Procesar cedula", "completado")

            return response

        } catch (error) {
            console.error(`[ERROR][${new Date().toISOString()}]`, error);
            await ErrorTalentHumanoLogicHandlers(error, log)
        } finally {
            await registrarPasoLog(log._id, "Fin de la función", "completado")
        }
    }
    static async get_talentoHumano_personal_registros(req) {
        try {
            const { page, filtro } = req.data
            const resultsPerPage = 25;
            const query = { estado: filtro.activo }

            const data = await PersonalRepository.get_data({
                query: query,
                skip: (page - 1) * resultsPerPage,
                limit: resultsPerPage,
                populate: [
                    { path: "cargo", select: "nombre" },
                    { path: "carnet", select: "serialNumber" }
                ]
            })
            return data
        } catch (error) {
            console.error(`[ERROR][${new Date().toISOString()}]`, error);
            await ErrorTalentHumanoLogicHandlers(error)
        }
    }
    // Hash dummy pre-calculado para protección contra timing attacks
    // Generado con: bcrypt.hashSync("dummy_value_for_timing_protection", 10)
    // eslint-disable-next-line no-secrets/no-secrets -- Hash falso intencional, no es un secreto real
    static DUMMY_HASH = "$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy";

    static async get_talentoHumano_personal_registro(req) {
        const ERROR_CREDENCIALES = 'Credenciales de carnet inválidas';

        try {
            const data = req.data || req;
            // Sanitización: Forzamos a string para evitar inyección de objetos NoSQL
            const serial = String(data.serial || "");
            const token = String(data.token || "");

            // Validación de campos requeridos
            if (!serial || !token) {
                throw new Error(ERROR_CREDENCIALES);
            }

            // Validación de formato: serial numérico o alfanumérico (1-30 caracteres)
            if (!/^[A-Za-z0-9-]{1,30}$/.test(serial)) {
                throw new Error(ERROR_CREDENCIALES);
            }

            // Validación de formato: token debe ser UUID válido (36 chars con guiones)
            if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(token)) {
                throw new Error(ERROR_CREDENCIALES);
            }

            const carnetDocArr = await TalentoHumanoDotacionCarnetsRepository.get_data({
                query: { serialNumber: serial },
                select: { tokenHash: 1, status: 1, employeeId: 1 },
            })
            const carnetDoc = carnetDocArr[0]

            // Protección contra timing attacks: siempre ejecutar bcrypt.compare
            // Usamos el hash real si existe, o un hash dummy si no existe
            const hashToCompare = carnetDoc?.tokenHash || PersonalControllerRepository.DUMMY_HASH;
            const isValid = await bcrypt.compare(token, hashToCompare);

            // Validar todas las condiciones después de bcrypt para evitar timing attacks
            const carnetInvalido = !carnetDoc || carnetDoc.status !== "active" || !isValid;

            if (carnetInvalido) {
                throw new Error(ERROR_CREDENCIALES);
            }

            const personalDocArr = await PersonalRepository.get_data({
                query: { _id: carnetDoc.employeeId },
                select: { _id: 1, nombre: 1, apellido: 1, cedula: 1, cargo: 1, carnet: 1, estado: 1 },
                populate: [
                    {
                        path: "cargo",
                        select: "nombre areasAcceso",
                        populate: {
                            path: "areasAcceso",
                            select: "nombre sede"
                        }
                    }
                ]
            })
            const personalDoc = personalDocArr[0]

            if (!personalDoc || !personalDoc.estado) {
                throw new Error(ERROR_CREDENCIALES);
            }

            return personalDoc
        } catch (error) {
            console.error(`[ERROR][${new Date().toISOString()}] Verificación de carnet fallida`);
            await ErrorTalentHumanoLogicHandlers(error)
        }
    }
    static async get_talentoHumano_personal_numeroRegistros(req) {
        try {
            const { filtro } = req.data
            const query = { estado: filtro.activo }

            const data = await PersonalRepository.get_numero_registros(query)
            return data
        } catch (error) {
            console.error(`[ERROR][${new Date().toISOString()}]`, error);
            await ErrorTalentHumanoLogicHandlers(error)
        }
    }
    static async get_talentoHumano_personal_Imgs(req) {
        try {
            const { _id } = req.data
            const data = await PersonalRepository.get_data({ _id })

            if (data && data.length > 0) {
                // Convertir a objeto plano Mongoose si es necesario para poder agregar propiedades
                if (typeof data[0].toObject === 'function') {
                    data[0] = data[0].toObject();
                }

                // 1. Procesar Foto Rostro (Pública / No Encriptada)
                if (data[0].urlFotoCarnet) {
                    try {
                        const filePath = data[0].urlFotoCarnet;
                        data[0].imgFoto = await FileService.readFileAsBase64(filePath, "STORAGE")
                    } catch (error) {
                        console.error("Error al leer la imagen de rostro:", error);
                    }
                }

                // 2. Procesar Identificación (Encriptada PDF/Imagen)
                if (data[0].urlIdentificacion) {
                    try {
                        const idPath = data[0].urlIdentificacion;

                        data[0].pdfDocumento = await FileService.readFileAsBase64(idPath, "STORAGE", { decrypt: true })

                    } catch (error) {
                        console.error("Error al leer/desencriptar identificación:", error);
                    }
                }
            }
            return data
        } catch (error) {
            console.error(`[ERROR][${new Date().toISOString()}]`, error);
            await ErrorTalentHumanoLogicHandlers(error)
        }
    }
    static async put_talentoHumano_personal(req) {
        try {
            const { user } = req
            const { _id, data } = req.data

            const updatedPersonal = await PersonalRepository.actualizar_data({ _id }, data, { user })
            return updatedPersonal

        } catch (error) {
            console.error(`[ERROR][${new Date().toISOString()}]`, error);
            await ErrorTalentHumanoLogicHandlers(error)
        }
    }
    static async put_talentoHumano_personal_asignarCarnet(req) {
        const { user } = req
        const { personal, qr, action } = req.data
        let log
        log = await LogsRepository.create({
            user: user._id,
            action: action,
            acciones: [{ paso: "Inicio de la función", status: "Iniciado", timestamp: new Date() }]
        })

        const session = await db.Personal.db.startSession();

        try {

            await session.withTransaction(async () => {

                const personalDocArr = await PersonalRepository.get_data({ ids: [personal] }, { session })
                const personalDoc = personalDocArr[0]
                await registrarPasoLog(log._id, "Obtener personal", "completado")
                if (!personalDoc) {
                    throw new Error('Personal no encontrado');
                }
                if (!personalDoc.estado) {
                    throw new Error('Personal no activo');
                }

                const { serial, token } = CarnetsService.procesarQr(qr)
                const carnetDocArr = await TalentoHumanoDotacionCarnetsRepository.get_data(
                    {
                        query: { serialNumber: serial },
                        select: { tokenHash: 1, type: 1, employeeId: 1 }
                    },
                    { session }
                )
                const carnetDoc = carnetDocArr[0]
                await registrarPasoLog(log._id, "Obtener carnet", "completado")
                if (!carnetDoc) {
                    throw new Error('Carnet no encontrado');
                }
                if (carnetDoc.type === "temp" && carnetDoc.employeeId !== null) {
                    throw new Error('El carnet ya esta asignado');
                }

                // Verificar si el token coincide con el tokenHash de la base de datos
                const isValid = await bcrypt.compare(token, carnetDoc.tokenHash);
                if (!isValid) {
                    throw new Error('Token de carnet inválido');
                }
                await registrarPasoLog(log._id, "Token verificado", "completado")

                if (carnetDoc.type === "final" && (carnetDoc.employeeId.toString() !== personalDoc._id.toString())) {
                    throw new Error('El carnet no es del personal');
                }
                await registrarPasoLog(log._id, "Verificar carnet", "completado")

                // Asignar el carnet al personal
                await PersonalRepository.actualizar_data(
                    { _id: personal },
                    { carnet: carnetDoc._id },
                    { session, user: user._id, action }
                );
                await registrarPasoLog(log._id, "Carnet asignado al personal", "completado")

                // Actualizar el carnet con el employeeId
                await TalentoHumanoDotacionCarnetsRepository.actualizar_data(
                    { _id: carnetDoc._id },
                    { employeeId: personal, status: 'active', assignedBy: user._id },
                    { session, user: user._id }
                );
                await registrarPasoLog(log._id, "Carnet actualizado con employeeId", "completado")

            })


        } catch (error) {
            console.error(`[ERROR][${new Date().toISOString()}]`, error);
            await ErrorTalentHumanoLogicHandlers(error, log)
        } finally {
            await session.endSession();
            await registrarPasoLog(log._id, "Fin de la función", "completado")
        }
    }
    static async put_talentoHumano_personal_modificar_carnet(req) {
        const { user } = req
        const { status, _id, action } = req.data

        let log
        log = await LogsRepository.create({
            user: user._id,
            action: action,
            acciones: [{ paso: "Inicio de la función", status: "Iniciado", timestamp: new Date() }]
        })

        const session = await db.Personal.db.startSession();

        try {
            await session.withTransaction(async () => {

                if (status === "active") return;

                await PersonalRepository.actualizar_data(
                    { _id: _id },
                    { carnet: null },
                    { session, user: user._id }
                )
                await registrarPasoLog(log._id, "Carnet desasignado al personal", "completado")

                const carnetDocArr = await TalentoHumanoDotacionCarnetsRepository.get_data(
                    { query: { employeeId: _id } },
                    { session }
                )
                const carnetDoc = carnetDocArr[0]
                if (!carnetDoc) {
                    throw new Error('Carnet no encontrado');
                }

                let statusCarnet = ""
                if (carnetDoc.type === "temp" && status !== "lost") {
                    statusCarnet = "stock"
                } else {
                    statusCarnet = status
                }

                await TalentoHumanoDotacionCarnetsRepository.actualizar_data(
                    { employeeId: _id },
                    { status: statusCarnet, employeeId: null },
                    { session, user: user._id }
                )
                await registrarPasoLog(log._id, "Carnet actualizado", "completado")
            })
        } catch (error) {
            console.error(`[ERROR][${new Date().toISOString()}]`, error);
            await registrarPasoLog(log._id, "Error", "error")
            await ErrorTalentHumanoLogicHandlers(error, log)
        } finally {
            await session.endSession();
            await registrarPasoLog(log._id, "Fin de la función", "completado")
        }
    }
}

