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
import PDFDocument from "pdfkit";
import { executeQueryTask, executeTransactionalTask } from "../../utils/wrappers.js";
import mongoose from "mongoose";


export class PersonalControllerRepository {

    // Hash dummy pre-calculado para protección contra timing attacks
    // Generado con: bcrypt.hashSync("dummy_value_for_timing_protection", 10)
    // eslint-disable-next-line no-secrets/no-secrets -- Hash falso intencional, no es un secreto real
    static DUMMY_HASH = "$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy";


    static async post_talentoHumano_personal_ingresoPersonal(req) {
        const { user } = req
        let filePath;
        let responsePath;
        if (!user || !user._id) {
            throw new Error('Usuario no encontrado');
        }
        const dataValidada = TalentoHumanoValidations.post_talentoHumano_personal_ingresoPersonal().parse(req.data)
        const { action, data, cedulaPath, foto } = dataValidada

        if (!foto) {
            throw new Error('La foto es obligatoria.');
        }

        if (!cedulaPath) {
            throw new Error('El documento de identificación es obligatorio.');
        }

        const urlPath = path.join(
            "personal",
            "fotoCarnet",
        );

        try {
            filePath = await FileService.saveBufferFile(
                foto,
                urlPath,
                "STORAGE"
            )

            const payload = {
                data: JSON.stringify(cleanForRust(filePath)),
                server: "python",
                action: "talentoHumano_procesamiento_imagen"
            };

            const responseStr = await rustRcpClient.sendData(payload);
            const response = JSON.parse(responseStr);

            if (!response.success) throw new Error(response.message || 'Error al procesar la imagen');
            responsePath = response.path;

            await executeTransactionalTask(req, async (session, log) => {
                //se crea el _id que va a tener el empleado
                const nuevoEmpleadoId = new mongoose.Types.ObjectId();
                if (!nuevoEmpleadoId) {
                    throw new Error("Error creando el _id del empleado")
                }
                //se obtiene el serial SKU del carnet
                const skuSerial = await Seriales.modificar_seriales({ name: "SKU" }, { $inc: { serial: 1 } }, { session })
                if (!skuSerial) {
                    throw new Error("No se encontró el serial SKU")
                }
                await registrarPasoLog(log._id, "Actualizar serial", "completado")
                //se crea el carnet
                const carnetIngresado = await TalentoHumanoDotacionCarnetsRepository.post_data(
                    { type: "final", SKU: skuSerial.serial, employeeId: nuevoEmpleadoId, vinilo: data.vinilo },
                    { user, session }
                )
                if (!carnetIngresado) {
                    throw new Error("Error creando el carnet")
                }
                await registrarPasoLog(log._id, "Creacion del carnet", "completado")
                //se obtiene el serial PE del empleado
                const peResult = await Seriales.modificar_seriales({ name: "PE-" }, { $inc: { serial: 1 } }, { session })
                if (!peResult) {
                    throw new Error("No se encontró el serial PE")
                }
                await registrarPasoLog(log._id, "Actualizar serial", "completado")
                //se crea el empleado
                const empleado = await PersonalRepository.post_data(
                    {
                        _id: nuevoEmpleadoId,
                        carnet: null,
                        ...data,
                        PE: peResult.serial,
                        urlIdentificacion: cedulaPath,
                        urlFotoCarnet: response.path,
                    },
                    { user: user._id, action: action, session }
                )
                if (!empleado) {
                    throw new Error("Error creando el empleado")
                }
                await registrarPasoLog(log._id, "Éxito", "Completado", "Empleado vinculado al carnet exitosamente");

            });
        }
        catch (error) {
            try {
                if (filePath) {
                    await FileService.deleteFile(filePath, "STORAGE")
                }
                if (responsePath) {
                    await FileService.deleteFile(responsePath, "STORAGE")
                }
            } catch (deleteError) {
                console.error(deleteError)
            }
            throw error
        }
    }
    static async post_talentoHumano_personal_cargarCedula(req) {
        const { user } = req
        if (!user || !user._id) {
            throw new Error("No se encontró el usuario")
        }

        return await executeQueryTask(async () => {

            const { cedula, cedulaFrente, cedulaTrasera } = req.data
            TalentoHumanoValidations.post_talentoHumano_personal_cargarCedula().parse(req.data)

            const urlPath = path.join(
                "personal",
                "identificacion",
            );

            let filePath;

            if (cedulaFrente && cedulaTrasera) {
                const pdfBuffer = await new Promise((resolve, reject) => {
                    const doc = new PDFDocument({ margin: 0, size: 'A4' });
                    const chunks = [];
                    doc.on('data', chunk => chunks.push(chunk));
                    doc.on('end', () => resolve(Buffer.concat(chunks)));
                    doc.on('error', reject);

                    try {
                        const img1 = Buffer.from(cedulaFrente);
                        const img2 = Buffer.from(cedulaTrasera);

                        doc.image(img1, {
                            fit: [doc.page.width, doc.page.height],
                            align: 'center',
                            valign: 'center'
                        });
                        doc.addPage();
                        doc.image(img2, {
                            fit: [doc.page.width, doc.page.height],
                            align: 'center',
                            valign: 'center'
                        });
                        doc.end();
                    } catch (err) {
                        reject(err);
                    }
                });

                filePath = await FileService.saveBufferFile(
                    pdfBuffer,
                    urlPath,
                    "STORAGE",
                    { encrypt: true }
                )

            } else if (cedula) {
                filePath = await FileService.saveBufferFile(
                    cedula,
                    urlPath,
                    "STORAGE",
                    { encrypt: true }
                )
            }

            if (!filePath) {
                throw new Error("La cedula es obligatoria")
            }

            let dataForRust = filePath;

            const payload = {
                data: JSON.stringify(cleanForRust(dataForRust)),
                server: "python",
                action: "validar_cedula"
            };
            const responseStr = await rustRcpClient.sendData(payload);
            const response = await JSON.parse(responseStr);
            return response
        })

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
            const data = await PersonalRepository.get_data({ ids: [_id] })

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
        if (!user || !user._id) throw new Error("Usuario no identificado")

        await executeTransactionalTask(req, async (session, log) => {

            const { personal, qr, action } = req.data

            const personalDocArr = await PersonalRepository.get_data({ ids: [personal] }, { session })
            const personalDoc = personalDocArr[0]
            await registrarPasoLog(log._id, "Obtener personal", "completado")
            if (!personalDoc) {
                throw new Error('Personal no encontrado');
            }
            if (!personalDoc.estado) {
                throw new Error('Personal no activo');
            }

            console.log(qr)

            const { serial, token } = CarnetsService.procesarQr(qr)

            console.log(serial)
            console.log(token)


            const carnetDocArr = await TalentoHumanoDotacionCarnetsRepository.get_data(
                {
                    query: { SKU: serial },
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

    }
    static async put_talentoHumano_personal_modificar_carnet(req) {
        const { user } = req
        if (!user || !user._id) throw new Error("Usuario no encontrado")

        await executeTransactionalTask(req, async (session, log) => {

            const { status, _id } = req.data
            if (status === "active") return;

            const personal = await PersonalRepository.get_data({ ids: [_id] }, { session })
            if (personal.length === 0) throw new Error("error obteniendo personal")

            const carnetDocArr = await TalentoHumanoDotacionCarnetsRepository.get_data(
                { query: { _id: personal[0].carnet } },
                { session }
            )
            await registrarPasoLog(log._id, "Carnet desasignado al personal", "completado")


            await PersonalRepository.actualizar_data(
                { _id: _id },
                { carnet: null },
                { session, user: user._id }
            )
            await registrarPasoLog(log._id, "Carnet carnet elimniado del personal", "completado")


            const carnetDoc = carnetDocArr[0]
            if (!carnetDoc) {
                throw new Error('Carnet no encontrado');
            }

            let statusEmployeeId = ""
            if (carnetDoc.type === "temp") {
                statusEmployeeId = null
            } else {
                statusEmployeeId = _id
            }
            await TalentoHumanoDotacionCarnetsRepository.actualizar_data(
                { _id: carnetDoc._id },
                { status: status, employeeId: statusEmployeeId },
                { session, user: user._id }
            )
            await registrarPasoLog(log._id, "Carnet actualizado", "completado")
        })
    }
    static async put_talentoHumano_upload_document(req) {
        console.log("Iniciando proceso de carga de documento para personal")
        const { user } = req;
        if (!user || !user._id) {
            throw new Error('Usuario no encontrado');
        }
        await executeTransactionalTask(req, async (session, log) => {

            //se valida la data de entrada
            const dataValidate = TalentoHumanoValidations.put_talentoHumano_upload_document().parse(req.data)

            //se obtiene el documento del personal
            const personalDocArr = await PersonalRepository.get_data({ ids: [dataValidate._id] }, { session })
            const personalDoc = personalDocArr[0]
            if (!personalDoc) {
                throw new Error('Personal no encontrado');
            }
            if (!personalDoc.estado) {
                throw new Error('Personal no activo');
            }
            await registrarPasoLog(log._id, "Obtener personal", "completado")

            //se debe mirar que tipo de documento es elq ue se va a subir
            let docToChange = ""
            let campo = ""
            let isEncrypted = false

            let urlPath = ""

            if (dataValidate.typeDoc === "foto") {
                docToChange = personalDoc.urlFotoCarnet
                campo = "urlFotoCarnet"

                urlPath = path.join(
                    "personal",
                    "fotoCarnetProcessed",
                );
            } else if (dataValidate.typeDoc === "cedula") {
                docToChange = personalDoc.urlIdentificacion
                campo = "urlIdentificacion"
                isEncrypted = true

                urlPath = path.join(
                    "personal",
                    "identificacion",
                );
            }

            //borrar el documento anterior si existe
            if (docToChange) {
                await FileService.deleteFile(docToChange, "STORAGE")
                await registrarPasoLog(log._id, "Documento anterior eliminado", "completado")
            }

            //subir el nuevo documento
            const fileUrl = await FileService.saveBufferFile(dataValidate.file, urlPath, "STORAGE", { encrypt: isEncrypted })

            await registrarPasoLog(log._id, "Documento subido", "completado")

            //actualizar el documento en la base de datos
            await PersonalRepository.actualizar_data(
                { _id: dataValidate._id },
                { [campo]: fileUrl },
                { session, user: user._id }
            )
            await registrarPasoLog(log._id, "Documento actualizado", "completado")

        });
    }
}

