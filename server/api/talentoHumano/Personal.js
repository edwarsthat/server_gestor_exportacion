import { db } from "../../../DB/mongoDB/config/init.js";
import { LogsRepository } from "../../Class/LogsSistema.js";
import { Seriales } from "../../Class/Seriales.js";
import { PersonalRepository } from "../../Class/talentoHumano/Personal.js";
import { TalentoHumanoValidations } from "../../validations/talentoHumano.js";
import { registrarPasoLog } from "../helper/logs.js";
import { ErrorTalentHumanoLogicHandlers } from "../utils/errorsHandlers.js";
import path from "path";
import fs from "fs/promises";
import { fileTypeFromBuffer } from "file-type";
import { dirname } from 'path';
import { fileURLToPath } from 'url';
import { cleanForRust } from "../../routes/sockets/utils/cleanData.js";
import { rustRcpClient } from "../../../config/grpcRust.js";
import crypto from "crypto";
import { PersonalTalentoHumanoService } from "../../services/talentoHumano/Personal.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

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

            const fotoBase64 = foto.base64.replace(/^data:image\/\w+;base64,/, '').trim();

            if (!fotoBase64) {
                throw new Error('La foto está vacía o inválida.');
            }

            const fileSize = Buffer.byteLength(fotoBase64, 'base64');
            if (fileSize > 5 * 1024 * 1024) {
                throw new Error('El archivo de la foto excede el tamaño máximo permitido (5MB).');
            }

            const buffer = Buffer.from(fotoBase64, 'base64');
            const fileType = await fileTypeFromBuffer(buffer);
            const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];

            if (!fileType || !allowedTypes.includes(fileType.mime)) {
                throw new Error('Tipo de archivo no permitido para la foto. Solo se permiten imágenes (JPEG, PNG, WEBP).');
            }

            await registrarPasoLog(log._id, "Validación de datos foto", "completado")

            const urlPath = path.join(
                __dirname,
                "..",
                "..",
                "..",
                "..",
                "uploads",
                "personal",
                "fotoCarnet",
            );

            await fs.mkdir(urlPath, { recursive: true });

            const fileName = `${crypto.randomUUID()}.${fileType.ext}`;
            const filePath = path.join(urlPath, fileName);

            await fs.writeFile(filePath, buffer);

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

                await PersonalRepository.addPersonal(data, { user: user._id, action: action, session })
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

            const cedulaBase64 = cedula.replace(/^data:.*;base64,/, '').trim();
            if (!cedulaBase64) {
                throw new Error('El documento de identificación está vacío o inválido.');
            }

            // Validar tamaño del archivo (simulando limits de multer)
            const fileSize = Buffer.byteLength(cedulaBase64, 'base64');
            if (fileSize > 5 * 1024 * 1024) { // 5MB
                throw new Error('El archivo excede el tamaño máximo permitido (5MB).');
            }
            // Validar tipo de archivo real (magic numbers)
            const buffer = Buffer.from(cedulaBase64, 'base64');
            const fileType = await fileTypeFromBuffer(buffer);
            const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];

            const isPdf = buffer.slice(0, 5).toString() === '%PDF-';
            const mime = fileType?.mime ?? (isPdf ? 'application/pdf' : null);

            if (!mime || !allowedTypes.includes(mime)) {
                throw new Error('Tipo de archivo no permitido. Solo se permiten imágenes (JPEG, PNG, WEBP) y PDF.');
            }

            await registrarPasoLog(log._id, "Validación de datos", "completado")
            const urlPath = path.join(
                __dirname,
                "..",
                "..",
                "..",
                "..",
                "uploads",
                "personal",
                "identificacion",
            );

            await fs.mkdir(urlPath, { recursive: true });
            await registrarPasoLog(log._id, "Crear directorio", "completado")
            const extension = fileType?.ext || (isPdf ? 'pdf' : null);
            let fileToSave = null;
            let filePath = null;

            if (extension) {
                const tempId = crypto.randomUUID();
                const fileName = `cedula_tmp_${Date.now()}_${tempId}.${extension}.enc`;
                filePath = path.join(urlPath, fileName);

                const encryptedBuffer = PersonalTalentoHumanoService.encryptBuffer(buffer);
                fileToSave = { path: filePath, buffer: encryptedBuffer };
            }
            if (fileToSave) {
                await fs.writeFile(fileToSave.path, fileToSave.buffer);
            }
            const payload = {
                data: JSON.stringify(cleanForRust(filePath)),
                server: "python",
                action: "validar_cedula"
            };

            const responseStr = await rustRcpClient.sendData(payload);
            const response = JSON.parse(responseStr);


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

            console.log(query)
            const data = await PersonalRepository.get_personal({
                query: query,
                skip: (page - 1) * resultsPerPage,
                limit: resultsPerPage,
                populate: {
                    path: "cargo",
                    select: "nombre"
                },
            })
            return data
        } catch (error) {
            console.error(`[ERROR][${new Date().toISOString()}]`, error);
            await ErrorTalentHumanoLogicHandlers(error)
        }
    }
    static async get_talentoHumano_personal_numeroRegistros(req) {
        try {
            const { filtro } = req.data
            const query = { estado: filtro.activo }

            const data = await PersonalRepository.get_numero_registros_personal(query)
            return data
        } catch (error) {
            console.error(`[ERROR][${new Date().toISOString()}]`, error);
            await ErrorTalentHumanoLogicHandlers(error)
        }
    }
    static async get_talentoHumano_personal_Imgs(req) {
        try {
            const { _id } = req.data
            const data = await PersonalRepository.get_personal({ _id })

            if (data && data.length > 0) {
                // Convertir a objeto plano Mongoose si es necesario para poder agregar propiedades
                if (typeof data[0].toObject === 'function') {
                    data[0] = data[0].toObject();
                }

                // 1. Procesar Foto Rostro (Pública / No Encriptada)
                if (data[0].urlFotoCarnet) {
                    try {
                        const filePath = data[0].urlFotoCarnet;
                        const fileBuffer = await fs.readFile(filePath);
                        const fileType = await fileTypeFromBuffer(fileBuffer);
                        const mime = fileType ? fileType.mime : 'image/jpeg';
                        const base64 = fileBuffer.toString('base64');
                        data[0].imgFoto = `data:${mime};base64,${base64}`;
                    } catch (error) {
                        console.error("Error al leer la imagen de rostro:", error);
                    }
                }

                // 2. Procesar Identificación (Encriptada PDF/Imagen)
                if (data[0].urlIdentificacion) {
                    try {
                        const idPath = data[0].urlIdentificacion;
                        const encryptedBuffer = await fs.readFile(idPath);

                        // Desencriptar
                        const decryptedBuffer = PersonalTalentoHumanoService.decryptBuffer(encryptedBuffer);

                        // Detectar tipo real del archivo desencriptado
                        const fileType = await fileTypeFromBuffer(decryptedBuffer);
                        // Si no detecta tipo (ej. PDF a veces no lo detecta bien si es parcial, pero file-type suele funcionar), asumir pdf si falla o basarse en magic bytes
                        // Nota: file-type funciona bien con PDFs.
                        const mime = fileType ? fileType.mime : 'application/pdf';

                        const base64 = decryptedBuffer.toString('base64');
                        data[0].pdfDocumento = `data:${mime};base64,${base64}`;

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

            const updatedPersonal = await PersonalRepository.actualizar_personal({ _id }, data, { user })
            return updatedPersonal

        } catch (error) {
            console.error(`[ERROR][${new Date().toISOString()}]`, error);
            await ErrorTalentHumanoLogicHandlers(error)
        }
    }
}

