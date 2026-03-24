import { workerData, parentPort } from 'worker_threads'
import { connectProcesoDB } from '../../../../DB/mongoDB/config/config.js'
import { defineSchemaCarnets } from '../../../../DB/mongoDB/schemas/personal/dotaciones/SchemaCarnets.js'
import { defineSchemaPersonal } from '../../../../DB/mongoDB/schemas/personal/SchemaPersonal.js'
import { defineSchemaCargosPersonal } from '../../../../DB/mongoDB/schemas/personal/SchemaCargosPersonal.js'
import crypto from 'crypto';
import bcrypt from 'bcrypt';
import { FileService } from '../../helpers/FileService.js'
import config from '../../../../src/config/index.js'
import QRCode from 'qrcode';
import { HtmlToImage } from '../../helpers/HtmlToImage.js'

const { carnetsIds, jobId } = workerData

async function initDB() {
    const conn = await connectProcesoDB()
    await conn.asPromise()

    const Carnet = await defineSchemaCarnets(conn)
    const Personal = await defineSchemaPersonal(conn, null)
    const CargosPersonal = await defineSchemaCargosPersonal(conn, null)

    return { conn, Carnet, Personal, CargosPersonal }
}

async function run() {

    let connection;
    let session

    try {
        const { conn, Carnet, Personal, CargosPersonal } = await initDB()
        connection = conn
        session = await conn.startSession()

        console.log("[carnetWorker] carnetsIds: ", carnetsIds)

        const empleados = await Personal.find({ carnet: { $in: carnetsIds } }).session(session)
        console.log("[carnetWorker] empleados: ", empleados)
 
        if (!empleados || empleados.length === 0) {
            throw new Error("No se encontraron empleados para generar");
        }
        const personalMap = new Map(empleados.map(e => [e._id.toString(), e]))

        const cargosIds = empleados.map(e => e.cargo)
        const cargos = await CargosPersonal.find({ _id: { $in: cargosIds } }).session(session)
        if (!cargos || cargos.length === 0) {
            throw new Error("No se encontraron cargos para generar");
        }
        const cargosMap = new Map(cargos.map(c => [c._id.toString(), c]))

        const pdfs = []

        for (const carnetId of carnetsIds) {

            const tokenGenerado = crypto.randomUUID();
            const tokenHash = await bcrypt.hash(tokenGenerado, 10);

            const carnetActualizado = await Carnet.findOneAndUpdate(
                { _id: carnetId },
                { tokenHash, isGenerated: true },
                { new: true, session }
            )
            if (!carnetActualizado) {
                throw new Error("No se encontró el carnet para generar");
            }

            const empleadoData = personalMap.get(carnetActualizado.employeeId)
            if (!empleadoData) throw new Error("Error empleado no existe")
            const cargoData = cargosMap.get(empleadoData.cargo)
            if (!cargoData) throw new Error("Error cargo no existe")


            let htmlTemplate = await FileService.readTemplate('talentoHumano/carnet/carnetFinal.html');

            const logoBase64 = await FileService.readFileAsBase64('talentoHumano/carnet/Captura_desde_2026-01-13_16-04-29-removebg-preview.png');
            htmlTemplate = htmlTemplate.replace('{{LOGO_BASE64}}', logoBase64);

            const fotoBase64 = await FileService.readFileAsBase64(
                empleadoData.urlFotoCarnet,
                'STORAGE',
                { decrypt: empleadoData.urlFotoCarnet?.endsWith('.enc') }
            );

            htmlTemplate = htmlTemplate.replace('{{FOTO_BASE64}}', fotoBase64);

            const nombreArray = empleadoData.nombre.split(' ');
            let nombreCompleto = '';
            if (nombreArray.length > 3) {
                nombreCompleto = [nombreArray[0], nombreArray[1], nombreArray[2]]
                    .map(palabra => palabra.charAt(0).toUpperCase() + palabra.slice(1).toLowerCase())
                    .join(' ');
            } else {
                nombreCompleto = [nombreArray[0], nombreArray[1]]
                    .map(palabra => palabra.charAt(0).toUpperCase() + palabra.slice(1).toLowerCase())
                    .join(' ');
            }
            const identificacionFormateada = Number(empleadoData.identificacion).toLocaleString('de-DE');

            htmlTemplate = htmlTemplate.replace('{{NOMBRE}}', nombreCompleto);

            //Reemplazar datos del empleado
            htmlTemplate = htmlTemplate.replace('{{CARGO}}', (empleadoData.cargo?.nombre || 'Sin cargo'));
            htmlTemplate = htmlTemplate.replace('{{CEDULA}}', identificacionFormateada || 'N/A');
            htmlTemplate = htmlTemplate.replace('{{RH}}', empleadoData.tipoSangre || 'O+');
            htmlTemplate = htmlTemplate.replace('{{COLOR_PRINCIPAL}}', cargoData.color || '#F3930D');

            const urlSegura = `${config.URL_CELIFRUT}/verify?serial=${carnetActualizado.serialNumber}#${tokenGenerado}`;
            const qrBase64 = await QRCode.toDataURL(urlSegura, { width: 250, margin: 1 });
            htmlTemplate = htmlTemplate.replace('{{QR_URL}}', qrBase64);

            const templateDir = await FileService.getTemplateDir('talentoHumano/carnet/carnetFinal.html');
            const pdfBuffer = await HtmlToImage.convertToPdf(htmlTemplate, {
                baseUrl: templateDir,
                waitFor: 'domcontentloaded',
            });

            if (!pdfBuffer || pdfBuffer.length === 0) {
                throw new Error("Fallo crítico: El carnet se generó pero el PDF resultante no es válido.");
            }

            pdfs.push(Buffer.from(pdfBuffer))

            parentPort.postMessage({
                type: 'progress',
                status: 200,
                jobId,
                done: pdfs.length,
                total: carnetsIds.length
            })

        }

        parentPort.postMessage({ type: 'done', status: 200, jobId, pdfs })
    } catch (err) {
        console.error(err)
        parentPort.postMessage({
            type: 'error',
            jobId,
            message: err.message,
            stack: err.stack,
            status: 401,
        })
    } finally {
        if (connection) {
            await connection.close()
        }
    }
}

run()
