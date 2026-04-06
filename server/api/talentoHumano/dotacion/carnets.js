import crypto from 'crypto';
import bcrypt from 'bcrypt';
import { TalentoHumanoDotacionCarnetsRepository } from "../../../Class/talentoHumano/dotacion/Carnets.js";
import { LogsRepository } from "../../../Class/LogsSistema.js";
import { registrarPasoLog } from "../../helper/logs.js";
import { ErrorTalentHumanoLogicHandlers } from "../../utils/errorsHandlers.js";
import { db } from "../../../../DB/mongoDB/config/init.js";
import { Seriales } from "../../../Class/Seriales.js";
import { PersonalRepository } from "../../../Class/talentoHumano/Personal.js";
import { FileService } from "../../../services/helpers/FileService.js";
import { HtmlToImage } from '../../../services/helpers/HtmlToImage.js';
import config from '../../../../src/config/index.js';
import { TalentoHumanoValidations } from '../../../validations/talentoHumano.js';
import { CarnetWorkerRunner } from '../../../services/workers/talentoHumano/carnetWorkerRunner.js';
import { executeTransactionalTask, executeQueryTask } from '../../../utils/wrappers.js';
import QRCode from 'qrcode';
import { InsumosRepository } from '../../../Class/Insumos.js';

export class DotacionCarnetsControllerRepository {
    static async post_talentoHumano_dotacion_carnets(req) {
        const { user } = req
        if (!user || !user._id) {
            throw new Error("Error ususario no registrado")
        }

        return await executeTransactionalTask(req, async (session, log) => {

            const serial = await Seriales.actualizar_data(
                { name: "SKU" },
                { $inc: { serial: 1 } },
                { session }
            )

            if (!serial) {
                throw new Error("No se encontró el serial Carnet")
            }
            const carnet = serial
            await registrarPasoLog(log._id, "Éxito", "Completado", "Serial encontrado");

            const tokenGenerado = crypto.randomUUID();
            await registrarPasoLog(log._id, "Éxito", "Completado", "Token generado exitosamente");
            const tokenHash = await bcrypt.hash(tokenGenerado, 10);
            await registrarPasoLog(log._id, "Éxito", "Completado", "Token hash generado exitosamente");

            const newCarnet = await TalentoHumanoDotacionCarnetsRepository.post_data(
                { type: "temp", SKU: carnet.serial, tokenHash, isGenerated: true },
                { user, session }
            )
            await registrarPasoLog(log._id, "Éxito", "Completado", "Dotación ingresar carnet completada exitosamente");



            //Cargar el template HTML
            let htmlTemplate = await FileService.readTemplate('talentoHumano/carnet/carnet.html');
            await registrarPasoLog(log._id, "Éxito", "Completado", "Template HTML cargado exitosamente");

            const fontBase64 = await FileService.readFileAsBase64('talentoHumano/carnet/Montserrat-VariableFont_wght.ttf');
            const fontItalicBase64 = await FileService.readFileAsBase64('talentoHumano/carnet/Montserrat-Italic-VariableFont_wght.ttf');
            htmlTemplate = htmlTemplate.replace('{{MONTSERRAT_FONT}}', fontBase64);
            htmlTemplate = htmlTemplate.replace('{{MONTSERRAT_FONT_ITALIC}}', fontItalicBase64);

            const logoBase64 = await FileService.readFileAsBase64('talentoHumano/carnet/Captura_desde_2026-01-13_16-04-29-removebg-preview.png');
            htmlTemplate = htmlTemplate.replace('{{LOGO_BASE64}}', logoBase64);

            const urlSegura = `${config.URL_CELIFRUT}/verify?serial=${newCarnet.SKU}#${tokenGenerado}`;
            await registrarPasoLog(log._id, "Éxito", "Completado", "Carnet actualizado exitosamente");

            const qrBase64 = await QRCode.toDataURL(urlSegura, { width: 250, margin: 1 });
            htmlTemplate = htmlTemplate.replace('{{QR_URL}}', qrBase64);

            const templateDir = await FileService.getTemplateDir('talentoHumano/carnet/carnet.html');
            const pdfBuffer = await HtmlToImage.convertToPdf(htmlTemplate, {
                baseUrl: templateDir,
                waitFor: 'domcontentloaded',
            });
            if (!pdfBuffer || pdfBuffer.length === 0) {
                throw new Error("Fallo crítico: El carnet se generó pero el PDF resultante no es válido.");
            }
            await registrarPasoLog(log._id, "Éxito", "Completado", "PDF generado exitosamente");

            await InsumosRepository.actualizar_data(
                { alias: "Carnet" },
                { $inc: { cantidad: -1 } },
                { session }
            )

            return {
                status: 200,
                message: "Token generado y template cargado",
                data: Buffer.from(pdfBuffer)
            };

        })
    }
    static async post_talentoHumano_newCarnet_final(req) {
        const { user } = req
        if (!user || !user._id) {
            throw new Error("Error ususario no registrado")
        }

        return await executeTransactionalTask(req, async (session, log) => {
            const parseData = TalentoHumanoValidations.post_talentoHumano_newCarnet_final().parse(req.data)
            const { personalId, vinilo } = parseData

            //se obtiene el empleado
            const empleadoArr = await PersonalRepository.get_data({ query: { _id: personalId } }, { session })
            if (!empleadoArr || empleadoArr.length === 0) {
                throw new Error("Empleado no encontrado")
            }
            const empleado = empleadoArr[0]
            await registrarPasoLog(log._id, "Obtener empleado", "completado")
            //se obtiene el serial SKU del carnet
            const skuSerial = await Seriales.modificar_seriales({ name: "SKU" }, { $inc: { serial: 1 } }, { session })
            if (!skuSerial) {
                throw new Error("No se encontró el serial SKU")
            }
            await registrarPasoLog(log._id, "Actualizar serial", "completado")

            //se crea el carnet
            const carnetIngresado = await TalentoHumanoDotacionCarnetsRepository.post_data(
                { type: "final", SKU: skuSerial.serial, employeeId: empleado._id, vinilo: vinilo },
                { user, session }
            )
            if (!carnetIngresado) {
                throw new Error("Error creando el carnet")
            }
            await registrarPasoLog(log._id, "Creacion del carnet", "completado")
        })
    }
    static async get_talentoHumano_dotacion_carnets(req) {

        const { page, filtro } = req.data
        const resultsPerPage = 25;

        if (filtro.tokenHash) {
            filtro.isGenerated = false
        }
        delete filtro.tokenHash

        const query = { ...filtro }
        if (query.type === "TODOS") {
            delete query.type
        }
        if (query.status === "TODOS") {
            delete query.status
        }

        try {
            const data = await TalentoHumanoDotacionCarnetsRepository.get_data(
                {
                    query,
                    sort: { createdAt: -1 },
                    limit: resultsPerPage, skip: (page - 1) * resultsPerPage,
                    populate: [
                        { path: "employeeId", select: "nombre identificacion" }
                    ]
                },
            )
            return data
        } catch (err) {
            console.error(`[ERROR][${new Date().toISOString()}]`, err);
            await ErrorTalentHumanoLogicHandlers(err)
        }
    }
    static async get_talentoHumano_dotacion_carnets_count(req) {

        try {
            const filtro = req.data.filtro

            if (filtro.tokenHash) {
                filtro.isGenerated = false
            }
            delete filtro.tokenHash

            const query = { ...filtro }
            if (query.type === "TODOS") {
                delete query.type
            }
            if (query.status === "TODOS") {
                delete query.status
            }
            const data = await TalentoHumanoDotacionCarnetsRepository.get_numero_registros(query)
            return data
        } catch (error) {
            console.error(`[ERROR][${new Date().toISOString()}]`, error);
            await ErrorTalentHumanoLogicHandlers(error)
        }
    }
    static async get_talentoHumano_dotacion_carnets_empleados() {
        try {
            const data = await PersonalRepository.get_data({
                query: {
                    estado: true,
                    carnet: null
                },
                select: {
                    SKU: 1, nombre: 1, identificacion: 1, cargo: 1
                },
                populate: {
                    path: 'cargo',
                    select: 'nombre color'
                }
            })
            return data
        } catch (error) {
            console.error(`[ERROR][${new Date().toISOString()}]`, error);
            await ErrorTalentHumanoLogicHandlers(error)
        }
    }
    static async get_talentoHumano_personal_sinCarnets() {
        return await executeQueryTask(async () => {
            const personal = await PersonalRepository.get_data({
                query: { carnet: null }
            })
            if (personal.length === 0) {
                throw new Error("No hay personal sin carnets asignados")
            }
            return personal
        })
    }
    static async put_talentoHumano_dotacion_carnets_generar_temporal(req) {

        const { user } = req
        const { data, action } = req.data

        let log
        log = await LogsRepository.create({
            user: user._id,
            action: action,
            acciones: [{ paso: "Inicio de la función", status: "Iniciado", timestamp: new Date() }]
        })

        try {
            TalentoHumanoValidations.put_talentoHumano_dotacion_carnets_generar_temporal().parse(req.data)

            // Generar el AccessToken único
            const tokenGenerado = crypto.randomUUID();
            await registrarPasoLog(log._id, "Éxito", "Completado", "Token generado exitosamente");
            const tokenHash = await bcrypt.hash(tokenGenerado, 10);
            await registrarPasoLog(log._id, "Éxito", "Completado", "Token hash generado exitosamente");
            // Actualizar el carnet con el tokenHash
            const carnetActualizado = await TalentoHumanoDotacionCarnetsRepository.actualizar_data(
                { _id: data },
                { tokenHash, isGenerated: true },
                { user }
            )
            if (!carnetActualizado) {
                throw new Error("No se encontró el carnet para actualizar");
            }
            await registrarPasoLog(log._id, "Éxito", "Completado", "Carnet actualizado exitosamente");
            const urlSegura = `${config.URL_CELIFRUT}/verify?serial=${carnetActualizado.serialNumber}#${tokenGenerado}`;
            //Cargar el template HTML
            let htmlTemplate = await FileService.readTemplate('talentoHumano/carnet/carnet.html');
            await registrarPasoLog(log._id, "Éxito", "Completado", "Template HTML cargado exitosamente");
            //Cargar la iamgen de fondo
            const imgaBase64 = await FileService.readFileAsBase64('talentoHumano/carnet/CREDENCIAL TEMPORAL.png');
            await registrarPasoLog(log._id, "Éxito", "Completado", "Imagen de fondo cargada exitosamente");

            //se reemplaza la imagen por la de base64 
            htmlTemplate = htmlTemplate.replace(
                "url('CREDENCIAL TEMPORAL.png')",
                `url('${imgaBase64}')`
            );
            await registrarPasoLog(log._id, "Éxito", "Completado", "Imagen de fondo reemplazada exitosamente");

            const qrBase64 = await QRCode.toDataURL(urlSegura, { width: 250, margin: 1 });
            htmlTemplate = htmlTemplate.replace('{{QR_URL}}', qrBase64);
            await registrarPasoLog(log._id, "Éxito", "Completado", "QR Data codificado exitosamente");


            const templateDir = await FileService.getTemplateDir('talentoHumano/carnet/carnet.html');
            const base64 = await HtmlToImage.convertToBase64(htmlTemplate, { baseUrl: templateDir });

            if (!base64 || typeof base64 !== 'string' || !base64.startsWith('data:image/')) {
                throw new Error("Fallo crítico: El carnet se generó pero la imagen resultante no es válida.");
            }

            await registrarPasoLog(log._id, "Éxito", "Completado", "Base64 generado exitosamente");

            return {
                status: "success",
                message: "Token generado y template cargado",
                data: base64
            };

        } catch (error) {
            console.error(`[ERROR][${new Date().toISOString()}]`, error);
            await ErrorTalentHumanoLogicHandlers(error, log)
        } finally {
            await registrarPasoLog(log._id, "Finalizado", "Completado", "Función completada exitosamente");
        }
    }
    static async put_talentoHumano_dotacion_carnets_generar_final(req) {
        const { data } = req.data

        const session = await db.Carnet.db.startSession();

        try {
            TalentoHumanoValidations.put_talentoHumano_dotacion_carnets_generar_temporal().parse(req.data)

            const jobId = CarnetWorkerRunner.launch(data)
            return jobId;

        } catch (error) {
            console.error(`[ERROR][${new Date().toISOString()}]`, error);
        } finally {
            await session.endSession();
        }
    }
}