/**
 * @file Genera un PDF con QR (~3cm) por cada carnet pendiente (isGenerated: false)
 * @description Asigna token, guarda hash en DB, produce un PDF por carnet y uno combinado.
 */

import { MongoClient } from 'mongodb';
import config from '../../../src/config/index.js';
import crypto from 'crypto';
import bcrypt from 'bcrypt';
import QRCode from 'qrcode';
import { PDFDocument, StandardFonts } from 'pdf-lib';
import fs from 'fs';
import path from 'path';

const { MONGODB_PROCESO, URL_CELIFRUT } = config;

const OUTPUT_DIR = path.resolve('scripts/2026/1.12.1/output_qrs');

// 3 cm en puntos PDF (1 pt = 1/72 inch, 1 inch = 2.54 cm)
const QR_SIZE_PT = (3 / 2.54) * 72;  // ~85 pt
const PAGE_PADDING_PT = 10;
const FONT_SIZE = 7;
const TEXT_GAP = 4;
const TEXT_BLOCK_HEIGHT = (FONT_SIZE + TEXT_GAP) * 2; // nombre + cédula
const PAGE_WIDTH_PT = QR_SIZE_PT + PAGE_PADDING_PT * 2;
const PAGE_HEIGHT_PT = QR_SIZE_PT + PAGE_PADDING_PT * 2 + TEXT_BLOCK_HEIGHT;

let client = null;
let db = null;

async function connectProcesoDB() {
    client = new MongoClient(MONGODB_PROCESO, {
        serverSelectionTimeoutMS: 5000,
        socketTimeoutMS: 45000,
    });
    await client.connect();
    await client.db().admin().ping();
    db = client.db();
    console.log('✅ Conectado a MongoDB proceso');
    return db;
}

async function closeConnection() {
    if (client) {
        await client.close();
        client = null;
        db = null;
    }
}

async function generarPdfQR(carnet, empleado) {
    const tokenGenerado = crypto.randomUUID();
    const tokenHash = await bcrypt.hash(tokenGenerado, 10);

    const urlSegura = `${URL_CELIFRUT}/verify?serial=${carnet.SKU}#${tokenGenerado}`;
    const qrBuffer = await QRCode.toBuffer(urlSegura, {
        width: Math.round(QR_SIZE_PT * 4),
        margin: 1,
        type: 'png',
    });

    const pdfDoc = await PDFDocument.create();
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const page = pdfDoc.addPage([PAGE_WIDTH_PT, PAGE_HEIGHT_PT]);

    // QR arriba del bloque de texto
    const qrY = PAGE_PADDING_PT + TEXT_BLOCK_HEIGHT;
    const qrImage = await pdfDoc.embedPng(qrBuffer);
    page.drawImage(qrImage, {
        x: PAGE_PADDING_PT,
        y: qrY,
        width: QR_SIZE_PT,
        height: QR_SIZE_PT,
    });

    // Nombre centrado
    const nombreCompleto = `${empleado.nombre} ${empleado.apellido}`;
    const cedulaFormateada = Number(empleado.identificacion).toLocaleString('de-DE');
    const nombreAncho = font.widthOfTextAtSize(nombreCompleto, FONT_SIZE);
    const cedulaAncho = font.widthOfTextAtSize(cedulaFormateada, FONT_SIZE);

    page.drawText(nombreCompleto, {
        x: (PAGE_WIDTH_PT - nombreAncho) / 2,
        y: PAGE_PADDING_PT + FONT_SIZE + TEXT_GAP,
        size: FONT_SIZE,
        font,
    });
    page.drawText(cedulaFormateada, {
        x: (PAGE_WIDTH_PT - cedulaAncho) / 2,
        y: PAGE_PADDING_PT,
        size: FONT_SIZE,
        font,
    });

    const pdfBytes = await pdfDoc.save();
    return { pdfBytes: Buffer.from(pdfBytes), tokenHash };
}

async function main() {
    try {
        const database = await connectProcesoDB();
        const carnetCollection = database.collection('carnets');
        const personalCollection = database.collection('personals');

        const carnets = await carnetCollection.find({ isGenerated: false }).toArray();
        if (!carnets.length) {
            console.log('ℹ️  No hay carnets pendientes de generar.');
            return;
        }

        const empleadosIds = carnets.map(c => c.employeeId);
        const empleados = await personalCollection.find({ _id: { $in: empleadosIds } }).toArray();
        const empleadosMap = new Map(empleados.map(e => [e._id.toString(), e]));

        console.log(`📋 Carnets a procesar: ${carnets.length}`);
        fs.mkdirSync(OUTPUT_DIR, { recursive: true });

        const pdfs = [];

        for (const carnet of carnets) {
            const empleado = empleadosMap.get(carnet.employeeId.toString());
            if (!empleado) {
                console.warn(`⚠️  Empleado no encontrado para carnet SKU ${carnet.SKU}, omitiendo.`);
                continue;
            }
            const { pdfBytes, tokenHash } = await generarPdfQR(carnet, empleado);

            await carnetCollection.updateOne(
                { _id: carnet._id },
                { $set: { tokenHash, isGenerated: true } }
            );

            const fileName = `carnet_${carnet.SKU}.pdf`;
            fs.writeFileSync(path.join(OUTPUT_DIR, fileName), pdfBytes);

            pdfs.push(pdfBytes);
            console.log(`✅ QR generado: SKU ${carnet.SKU} → ${fileName}`);
        }

        // PDF combinado con todos los QRs
        const mergedDoc = await PDFDocument.create();
        for (const pdfBuf of pdfs) {
            const doc = await PDFDocument.load(pdfBuf);
            const [page] = await mergedDoc.copyPages(doc, [0]);
            mergedDoc.addPage(page);
        }
        const mergedPath = path.join(OUTPUT_DIR, 'todos_los_qrs.pdf');
        fs.writeFileSync(mergedPath, await mergedDoc.save());

        console.log(`\n🏁 Listo. ${pdfs.length} QRs generados.`);
        console.log(`📁 Archivos en: ${OUTPUT_DIR}`);
        console.log(`📄 Combinado: ${mergedPath}`);

    } catch (error) {
        console.error('❌ Error:', error.message);
        console.error(error);
        process.exit(1);
    } finally {
        await closeConnection();
    }
}

main();
