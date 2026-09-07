/**
 * @file Reporte de kilos/cajas/precios por lote (enf) + contenedor + calidad, incluyendo fruta nacional y descartes
 * @description Extiende KilosCajasyCalidadxLoteyContenedor.js: a las filas de exportacion
 * (agrupadas por enf + numeroContenedor + calidad, sobre itempallets.fecha) les agrega una
 * fila por cada lote con fruta nacional (lote.frutaNacional > 0, naranja) y una fila por cada
 * tipo de descarte con kilos > 0 en lote.descartes (incluye "Fruta Nacional" para limon y
 * cualquier otro tipo del catalogo "descartes"), sobre fecha_creacion del lote, ya que esa
 * fruta no pasa por itempallets/contenedores. El precio de exportacion sale de
 * precios.exportacion[calidad]; el de fruta nacional (naranja), de precios.frutaNacional;
 * el de cualquier tipo de descarte, de precios.descarte (precio generico del lote, igual
 * para todos los tipos). Salida ordenada cronologicamente por fecha en una sola hoja.
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

// Rango de fechas a reportar (itempallets.fecha para exportacion, fecha_creacion para nacional),
// en hora Colombia (UTC-5)
const FECHA_INICIO = new Date('2026-07-15T05:00:00.000Z'); //se pone la fecha a combenir
const FECHA_FIN = new Date('2026-09-07T05:00:00.000Z');

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

function buildPipelineExportacion(fechaInicio, fechaFin) {
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

/**
 * Filas de fruta nacional + todos los tipos de descarte (kilos > 0) por lote/lotemaquila.
 * No pasan por itempallets/contenedores, asi que se arman en JS (no aggregation):
 * - lote.frutaNacional (naranja): precioUnitario = precios.frutaNacional (campo dedicado).
 * - cada entrada de lote.descartes con kilos > 0 (incluye "Fruta Nacional" para limon, y
 *   cualquier otro tipo del catalogo "descartes"): precioUnitario = precios.descarte
 *   (precio generico del lote, el mismo para todos los tipos de descarte -> asi se maneja
 *   en el negocio: lo entra una persona segun criterio interno, no hay precio por tipo).
 * El nombre de cada tipo sale del catalogo "descartes" (campo descripcion).
 */
async function buildFilasNacionalYDescarte(database, fechaInicio, fechaFin) {
    const lotesCollection = database.collection('lotes');
    const lotesMaquilaCollection = database.collection('lotemaquilas');
    const descartesCollection = database.collection('descartes');
    const preciosCollection = database.collection('precios');
    const proveedoresCollection = database.collection('proveedors');
    const tipoFrutaCollection = database.collection('tipofrutas');

    const filtroFecha = { fecha_creacion: { $gte: fechaInicio, $lt: fechaFin } };
    const [lotesDocs, lotesMaquilaDocs, descartesCatalogo] = await Promise.all([
        lotesCollection.find(filtroFecha).toArray(),
        lotesMaquilaCollection.find(filtroFecha).toArray(),
        descartesCollection.find({}).toArray(),
    ]);
    const lotes = [...lotesDocs, ...lotesMaquilaDocs];
    if (lotes.length === 0) return [];

    const descartesMap = new Map(descartesCatalogo.map(d => [d._id.toString(), d]));

    const preciosIdsMap = new Map();
    const proveedorIdsMap = new Map();
    const tipoFrutaIdsMap = new Map();
    for (const lote of lotes) {
        if (lote.precio) preciosIdsMap.set(lote.precio.toString(), lote.precio);
        if (lote.predio) proveedorIdsMap.set(lote.predio.toString(), lote.predio);
        if (lote.tipoFruta) tipoFrutaIdsMap.set(lote.tipoFruta.toString(), lote.tipoFruta);
    }

    const [precios, proveedores, tiposFruta] = await Promise.all([
        preciosCollection.find({ _id: { $in: [...preciosIdsMap.values()] } }).toArray(),
        proveedoresCollection.find({ _id: { $in: [...proveedorIdsMap.values()] } }).toArray(),
        tipoFrutaCollection.find({ _id: { $in: [...tipoFrutaIdsMap.values()] } }).toArray(),
    ]);
    const preciosMap = new Map(precios.map(p => [p._id.toString(), p]));
    const proveedoresMap = new Map(proveedores.map(p => [p._id.toString(), p]));
    const tiposFrutaMap = new Map(tiposFruta.map(t => [t._id.toString(), t]));

    const filas = [];

    for (const lote of lotes) {
        const predio = proveedoresMap.get(lote.predio?.toString())?.PREDIO || 'Desconocido';
        const tipoFruta = tiposFrutaMap.get(lote.tipoFruta?.toString())?.tipoFruta || 'Desconocido';
        const precioDoc = preciosMap.get(lote.precio?.toString() || '');
        const base = { fecha: lote.fecha_creacion, enf: lote.enf, predio, contenedor: 'Nacional', tipoFruta, cajas: 0 };

        if (lote.frutaNacional) {
            const precioUnitario = precioDoc?.frutaNacional || 0;
            filas.push({
                ...base,
                calidad: 'Fruta Nacional',
                kilos: lote.frutaNacional,
                precioUnitario,
                precioTotal: lote.frutaNacional * precioUnitario,
            });
        }

        // Deshidratada: se calcula igual que en calibresLotesExportacion.js (deshidratacion % * kilos),
        // se paga siempre a precio de descarte general (precio.descarte), igual que el Informe proveedor
        if (lote.deshidratacion) {
            const kilosDeshidratacion = (lote.deshidratacion / 100) * lote.kilos;
            if (kilosDeshidratacion) {
                const precioUnitario = precioDoc?.descarte || 0;
                filas.push({
                    ...base,
                    calidad: 'Deshidratada',
                    kilos: kilosDeshidratacion,
                    precioUnitario,
                    precioTotal: kilosDeshidratacion * precioUnitario,
                });
            }
        }

        if (lote.descartes) {
            for (const [descarteId, kilos] of Object.entries(lote.descartes)) {
                if (!kilos) continue; // se descartan solo 0/null/undefined, se conservan negativos
                const descarte = descartesMap.get(descarteId);
                const nombreDescarte = descarte?.descripcion || descarte?.nombre || 'Desconocido';

                // Misma logica que descarte_nopago_pago() en server/api/utils/lotesFunctions.js:
                // el tipo "frutaNacional" dentro del mapa de descartes (caso limon) se precia con
                // precio.frutaNacional; el resto solo se paga (precio.descarte) si el catalogo
                // marca pago: true, si no queda en $0.
                let precioUnitario;
                if (descarte?.nombre === 'frutaNacional') {
                    precioUnitario = precioDoc?.frutaNacional || 0;
                } else if (descarte && descarte.pago === false) {
                    precioUnitario = 0;
                } else {
                    precioUnitario = precioDoc?.descarte || 0;
                }

                filas.push({
                    ...base,
                    calidad: nombreDescarte,
                    kilos,
                    precioUnitario,
                    precioTotal: kilos * precioUnitario,
                });
            }
        }

        if (lote.directoNacional) {
            // OJO: no hay campo dedicado de precio para "Directo Nacional" en el esquema de
            // precios -> se usa precio.frutaNacional como mejor aproximacion. Falta confirmar
            // contra un caso real con kilos > 0 en el Informe proveedor de la app.
            const precioUnitario = precioDoc?.frutaNacional || 0;
            filas.push({
                ...base,
                calidad: 'Directo Nacional',
                kilos: lote.directoNacional,
                precioUnitario,
                precioTotal: lote.directoNacional * precioUnitario,
            });
        }
    }

    return filas;
}

async function main() {
    try {
        const database = await connectProcesoDB();
        const itemsPalletCollection = database.collection('itempallets');

        const [exportacion, nacionalYDescarte] = await Promise.all([
            itemsPalletCollection.aggregate(buildPipelineExportacion(FECHA_INICIO, FECHA_FIN)).toArray(),
            buildFilasNacionalYDescarte(database, FECHA_INICIO, FECHA_FIN),
        ]);

        console.log(`Filas de exportacion: ${exportacion.length}`);
        console.log(`Filas de nacional + descarte: ${nacionalYDescarte.length}`);

        const out = [...exportacion, ...nacionalYDescarte].sort((a, b) => a.fecha - b.fecha);

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
        const outputPath = path.join(outDir, 'exportacionyNacional.xlsx');
        await workbook.xlsx.writeFile(outputPath);

        console.log(`Filas generadas: ${out.length}`);
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
