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
import { browserPool } from '../../helpers/browserPool.js'
import { PDFDocument } from 'pdf-lib'
import { defineInsumos } from '../../../../DB/mongoDB/schemas/insumos/schemaInsumos.js'

const { carnetsIds, jobId, wsEndpoint } = workerData

async function initDB() {
    const conn = await connectProcesoDB()
    await conn.asPromise()

    const Carnet = await defineSchemaCarnets(conn)
    const Personal = await defineSchemaPersonal(conn, null)
    const CargosPersonal = await defineSchemaCargosPersonal(conn, null)
    const Insumos = await defineInsumos(conn)

    return { conn, Carnet, Personal, CargosPersonal, Insumos }
}

async function run() {

    let connection;
    let session

    try {
        await browserPool.connect(wsEndpoint, 1)
        const { conn, Carnet, Personal, CargosPersonal, Insumos } = await initDB()
        connection = conn
        session = await conn.startSession()

        const carnetsArray = await Carnet.find({ _id: { $in: carnetsIds } })
        const empleadosIds = carnetsArray.map((i) => i.employeeId)

        const empleados = await Personal.find({ _id: { $in: empleadosIds } })

        if (!empleados || empleados.length === 0) {
            throw new Error("No se encontraron empleados para generar");
        }
        const personalMap = new Map(empleados.map(e => [e._id.toString(), e]))

        const cargosIds = empleados.map(e => e.cargo)
        const cargos = await CargosPersonal.find({ _id: { $in: cargosIds } })
        if (!cargos || cargos.length === 0) {
            throw new Error("No se encontraron cargos para generar");
        }
        const cargosMap = new Map(cargos.map(c => [c._id.toString(), c]))

        const fontBase64 = await FileService.readFileAsBase64('talentoHumano/carnet/Montserrat-VariableFont_wght.ttf');
        const fontItalicBase64 = await FileService.readFileAsBase64('talentoHumano/carnet/Montserrat-Italic-VariableFont_wght.ttf');

        const pdfs = []

        session.startTransaction()

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

            if (carnetActualizado.vinilo) {
                const insumoActualizado = await Insumos.findOneAndUpdate(
                    { alias: "Carnet", cantidad: { $gt: 0 } },
                    { $inc: { cantidad: -1 } },
                    { session }
                )
                if (!insumoActualizado) {
                    throw new Error("Stock insuficiente: no hay carnets disponibles")
                }
            }

            const empleadoData = personalMap.get(carnetActualizado.employeeId.toString())
            if (!empleadoData) throw new Error("Error empleado no existe")
            const cargoData = cargosMap.get(empleadoData.cargo.toString())
            if (!cargoData) throw new Error("Error cargo no existe")

            let htmlTemplate = await FileService.readTemplate('talentoHumano/carnet/carnetFinal.html');

            htmlTemplate = htmlTemplate.replace('{{MONTSERRAT_FONT}}', fontBase64);
            htmlTemplate = htmlTemplate.replace('{{MONTSERRAT_FONT_ITALIC}}', fontItalicBase64);

            const logoBase64 = await FileService.readFileAsBase64('talentoHumano/carnet/Captura_desde_2026-01-13_16-04-29-removebg-preview.png');
            htmlTemplate = htmlTemplate.replace('{{LOGO_BASE64}}', logoBase64);

            const fotoBase64 = await FileService.readFileAsBase64(
                empleadoData.urlFotoCarnet,
                'STORAGE',
                { decrypt: empleadoData.urlFotoCarnet?.endsWith('.enc') }
            );

            htmlTemplate = htmlTemplate.replace('{{FOTO_BASE64}}', fotoBase64);

            let nombreCompleto = empleadoData.nombre + ' ' + empleadoData.apellido;
            const identificacionFormateada = Number(empleadoData.identificacion).toLocaleString('de-DE');

            htmlTemplate = htmlTemplate.replace('{{NOMBRE}}', nombreCompleto);

            //Reemplazar datos del empleado
            htmlTemplate = htmlTemplate.replace('{{CARGO}}', (cargoData?.nombre || 'Sin cargo'));
            htmlTemplate = htmlTemplate.replace('{{CEDULA}}', identificacionFormateada || 'N/A');
            htmlTemplate = htmlTemplate.replace('{{RH}}', empleadoData.tipoSangre || 'O+');
            htmlTemplate = htmlTemplate.replace('{{COLOR_PRINCIPAL}}', cargoData.color || '#F3930D');

            const urlSegura = `${config.URL_CELIFRUT}/verify?serial=${carnetActualizado.SKU}#${tokenGenerado}`;
            const qrBase64 = await QRCode.toDataURL(urlSegura, { width: 250, margin: 1 });
            htmlTemplate = htmlTemplate.replace('{{QR_URL}}', qrBase64);

            const templateDir = await FileService.getTemplateDir('talentoHumano/carnet/carnetFinal.html');
            const pdfBuffer = await HtmlToImage.convertToPdf(htmlTemplate, {
                baseUrl: templateDir,
                waitFor: 'domcontentloaded',
                width: '5.4cm',
                height: '8.56cm',
                scale: 0.4535,
                viewportWidth: 450,
                viewportHeight: 690,
            });

            if (!pdfBuffer || pdfBuffer.length === 0) {
                throw new Error("Fallo crítico: El carnet se generó pero el PDF resultante no es válido.");
            }

            if (carnetActualizado.vinilo === false) {
                const reversoBuffer = await FileService.readFileAsBase64('talentoHumano/carnet/REVERSO CREDENCIALES.pdf');
                const reversoBytes = Buffer.from(reversoBuffer.split(',')[1], 'base64');

                const combined = await PDFDocument.create();
                const frontDoc = await PDFDocument.load(pdfBuffer);
                const reversoDoc = await PDFDocument.load(reversoBytes);

                const [frontPage] = await combined.copyPages(frontDoc, [0]);
                const [reversoPage] = await combined.copyPages(reversoDoc, [0]);
                combined.addPage(frontPage);
                combined.addPage(reversoPage);

                pdfs.push(Buffer.from(await combined.save()));
            } else {
                pdfs.push(Buffer.from(pdfBuffer));
            }

            parentPort.postMessage({
                type: 'progress',
                status: 200,
                jobId,
                done: pdfs.length,
                total: carnetsIds.length
            })
        }

        await session.commitTransaction()

        const mergedPdf = await PDFDocument.create()
        for (const pdfBuffer of pdfs) {
            const doc = await PDFDocument.load(pdfBuffer)
            const pages = await mergedPdf.copyPages(doc, doc.getPageIndices())
            pages.forEach(page => mergedPdf.addPage(page))
        }
        const mergedBuffer = Buffer.from(await mergedPdf.save())

        parentPort.postMessage({ type: 'done', status: 200, jobId, pdf: mergedBuffer })
    } catch (err) {
        if (session && session.inTransaction()) await session.abortTransaction()
        console.error(err)
        parentPort.postMessage({
            type: 'error',
            jobId,
            message: err.message,
            stack: err.stack,
            status: 401,
        })
    } finally {
        if (session) await session.endSession()
        if (connection) await connection.close()
        await browserPool.disconnect()
    }
}

run()
