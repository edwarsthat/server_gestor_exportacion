/**
 * @file Reporte de kilos/cajas/precios por lote (enf) + contenedor + calidad
 * @description Version en Node de "Pipeline final orden cronologico mongocompass":
 * agrupa los itemPallets del rango de fechas configurado (sobre itempallets.fecha)
 * por enf + numeroContenedor + calidad, sumando kilos/cajas, y calcula precioUnitario
 * (precios.exportacion[calidad] del lote) y precioTotal (kilos * precioUnitario).
 * Salida ordenada cronologicamente por fecha.
 */

import { MongoClient } from 'mongodb';
import ExcelJS from 'exceljs';
import config from '../../src/config/index.js';
import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const { MONGODB_PROCESO } = config;

// Rango de fechas a reportar (sobre itempallets.fecha), en hora Colombia (UTC-5)
const FECHA_INICIO = new Date('2025-12-26T05:00:00.000Z'); //se pone la fecha a combenir 
const FECHA_FIN = new Date('2026-08-10T05:00:00.000Z');

let client = null;
let db = null;

async function connectProcesoDB() {
    try {
        if (db) {
            console.log('Ya existe una conexion activa a la base de datos proceso');
            return db;
        }

        console.log('Conectando a la base de datos proceso...');

        client = new MongoClient(MONGODB_PROCESO, {
            serverSelectionTimeoutMS: 5000,
            socketTimeoutMS: 45000,
        });

        await client.connect();
        await client.db().admin().ping();
        console.log('Conectado exitosamente a la base de datos proceso');

        db = client.db();
        return db;
    } catch (error) {
        console.error('Error conectando a la base de datos:', error.message);
        throw error;
    }
}

async function closeConnection() {
    try {
        if (client) {
            await client.close();
            client = null;
            db = null;
            console.log('Conexion cerrada correctamente');
        }
    } catch (error) {
        console.error('Error cerrando la conexion:', error.message);
        throw error;
    }
}

function buildPipeline(fechaInicio, fechaFin) {
    return [
        { $match: { fecha: { $gte: fechaInicio, $lt: fechaFin } } },
        // El lote puede estar en "lotes" o en "lotemaquilas" -> buscamos en las dos y nos quedamos con la que exista
        { $lookup: { from: 'lotes', localField: 'lote', foreignField: '_id', as: 'loteDocA' } },
        { $lookup: { from: 'lotemaquilas', localField: 'lote', foreignField: '_id', as: 'loteDocB' } },
        { $addFields: { loteDoc: { $ifNull: [{ $arrayElemAt: ['$loteDocA', 0] }, { $arrayElemAt: ['$loteDocB', 0] }] } } },
        { $lookup: { from: 'contenedors', localField: 'contenedor', foreignField: '_id', as: 'contenedorDoc' } },
        { $unwind: { path: '$contenedorDoc', preserveNullAndEmptyArrays: true } },
        { $lookup: { from: 'calidades', localField: 'calidad', foreignField: '_id', as: 'calidadDoc' } },
        { $unwind: { path: '$calidadDoc', preserveNullAndEmptyArrays: true } },
        { $lookup: { from: 'tipofrutas', localField: 'tipoFruta', foreignField: '_id', as: 'tipoFrutaDoc' } },
        { $unwind: { path: '$tipoFrutaDoc', preserveNullAndEmptyArrays: true } },
        { $lookup: { from: 'proveedors', localField: 'loteDoc.predio', foreignField: '_id', as: 'predioDoc' } },
        { $unwind: { path: '$predioDoc', preserveNullAndEmptyArrays: true } },
        { $lookup: { from: 'precios', localField: 'loteDoc.precio', foreignField: '_id', as: 'precioDoc' } },
        { $unwind: { path: '$precioDoc', preserveNullAndEmptyArrays: true } },
        {
            $addFields: {
                precioUnitarioMatch: {
                    $filter: {
                        input: { $objectToArray: { $ifNull: ['$precioDoc.exportacion', {}] } },
                        as: 'pe',
                        cond: { $eq: ['$$pe.k', { $toString: '$calidad' }] },
                    },
                },
            },
        },
        { $addFields: { precioUnitario: { $ifNull: [{ $arrayElemAt: ['$precioUnitarioMatch.v', 0] }, 0] } } },
        {
            $group: {
                _id: { enf: '$loteDoc.enf', contenedor: '$contenedorDoc.numeroContenedor', calidad: '$calidadDoc.nombre' },
                fecha: { $min: '$fecha' },
                predio: { $first: { $ifNull: ['$predioDoc.PREDIO', 'Desconocido'] } },
                tipoFruta: { $first: { $ifNull: ['$tipoFrutaDoc.tipoFruta', 'Desconocido'] } },
                kilos: { $sum: '$kilos' },
                cajas: { $sum: '$cajas' },
                precioUnitario: { $first: '$precioUnitario' },
            },
        },
        {
            $project: {
                _id: 0,
                fecha: 1,
                enf: '$_id.enf',
                predio: 1,
                contenedor: '$_id.contenedor',
                tipoFruta: 1,
                calidad: { $ifNull: ['$_id.calidad', 'Desconocido'] },
                kilos: 1,
                cajas: 1,
                precioUnitario: 1,
                precioTotal: { $multiply: [{ $ifNull: ['$kilos', 0] }, '$precioUnitario'] },
            },
        },
        { $sort: { fecha: 1 } }, // cronologico, igual que el Excel de referencia
    ];
}

async function main() {
    try {
        const database = await connectProcesoDB();
        const itemsPalletCollection = database.collection('itempallets');

        const pipeline = buildPipeline(FECHA_INICIO, FECHA_FIN);
        const out = await itemsPalletCollection.aggregate(pipeline).toArray();

        console.log(`Filas generadas: ${out.length}`);

        if (out.length === 0) {
            console.log('No hay datos para exportar en el rango de fechas indicado.');
            return;
        }

        const workbook = new ExcelJS.Workbook();
        const sheet = workbook.addWorksheet('Reporte');
        sheet.columns = [
            { header: 'fecha', key: 'fecha', width: 12, style: { numFmt: 'dd/mm/yyyy' } },
            { header: 'enf', key: 'enf', width: 18 },
            { header: 'predio', key: 'predio', width: 20 },
            { header: 'contenedor', key: 'contenedor', width: 12 },
            { header: 'tipoFruta', key: 'tipoFruta', width: 14 },
            { header: 'calidad', key: 'calidad', width: 10 },
            { header: 'kilos', key: 'kilos', width: 10 },
            { header: 'cajas', key: 'cajas', width: 10 },
            { header: 'precioUnitario', key: 'precioUnitario', width: 14 },
            { header: 'precioTotal', key: 'precioTotal', width: 14 },
        ];
        out.forEach(row => sheet.addRow(row));

        const outDir = path.join(__dirname, '..', 'out');
        fs.mkdirSync(outDir, { recursive: true });
        const outputPath = path.join(outDir, 'kilosCajasCalidadLoteContenedor.xlsx');
        await workbook.xlsx.writeFile(outputPath);

        console.log(`Archivo generado: ${outputPath}`);
    } catch (error) {
        console.error('Error en el proceso:', error.message);
        console.error(error);
        process.exit(1);
    } finally {
        await closeConnection();
    }
}

main();
