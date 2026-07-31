/**
 * @file Script para obtener el precio de la fruta exportada por lote/contenedor
 * @description Agrupa los itemPallets por lote + contenedor + tipoFruta + calidad,
 * suma kilos y cajas de cada grupo, calcula el precio unitario segun el precio del lote
 * y genera un archivo excel donde cada fila es un grupo.
 */

import { MongoClient } from 'mongodb';
import config from '../../src/config/index.js';
import ExcelJS from 'exceljs';
import path from 'path';

const { MONGODB_PROCESO } = config;

// La coleccion precios solo tiene documentos desde 2025-03-07 y los lotes anteriores
// apuntan a un precio que ya no existe, por eso se filtra por fecha.
const FECHA_INICIO = new Date('2026-01-01');

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

async function main() {
    try {
        const database = await connectProcesoDB();
        const itemPaleltsCollection = database.collection('itempallets');
        const lotesCollection = database.collection('lotes');
        const loteMaquilaCollection = database.collection('lotemaquilas');
        const proveedoresCollectio = database.collection('proveedors');
        const tipoFrutaCollection = database.collection('tipofrutas');
        const preciosCollection = database.collection('precios');
        const calidadCollection = database.collection("calidades");
        const contenedorCollection = database.collection('contenedors')

        const itemPallets = await itemPaleltsCollection.find({
            fecha: { $gte: FECHA_INICIO },
        }).toArray();
        const tipoFrutaArr = await tipoFrutaCollection.find({}).toArray();
        const calidadesArr = await calidadCollection.find({}).toArray();

        const tipoFrutaMap = new Map(tipoFrutaArr.map((d) => [d._id.toString(), d]));
        const calidadesMap = new Map(calidadesArr.map((d) => [d._id.toString(), d]));

        // Se guardan los ObjectId (no strings) para poder usarlos en el $in
        const lotesIds = new Map();
        const contenedoresIds = new Map();

        for (const item of itemPallets) {
            if (item.lote) lotesIds.set(item.lote.toString(), item.lote);
            if (item.contenedor) contenedoresIds.set(item.contenedor.toString(), item.contenedor);
        }

        const [lotes, lotesMaquila, contenedores] = await Promise.all([
            lotesCollection.find({ _id: { $in: [...lotesIds.values()] } }).toArray(),
            loteMaquilaCollection.find({ _id: { $in: [...lotesIds.values()] } }).toArray(),
            contenedorCollection.find({ _id: { $in: [...contenedoresIds.values()] } }).toArray()
        ])

        const contenedoresMap = new Map(contenedores.map(d => [d._id.toString(), d]));

        const lotesMap = new Map();
        const proveedoresIds = new Map();
        const preciosIds = new Map();

        for (const lote of [...lotes, ...lotesMaquila]) {
            lotesMap.set(lote._id.toString(), lote);
            if (lote.predio) proveedoresIds.set(lote.predio.toString(), lote.predio);
            if (lote.precio) preciosIds.set(lote.precio.toString(), lote.precio);
        }

        const [proveedores, precios] = await Promise.all([
            proveedoresCollectio.find({ _id: { $in: [...proveedoresIds.values()] } }).toArray(),
            preciosCollection.find({ _id: { $in: [...preciosIds.values()] } }).toArray()
        ])

        const proveedoresMap = new Map(proveedores.map((d) => [d._id.toString(), d]))
        const preciosMap = new Map(precios.map((d) => [d._id.toString(), d]))

        // Sumatoria por lote + contenedor + tipoFruta + calidad
        const out = new Map();
        const diagnostico = { sinLote: 0, sinContenedor: 0, sinKey: 0, sinPrecio: 0, sinCalidadEnPrecio: 0 };

        for (const item of itemPallets) {
            // Solo se procesan los items que cumplen con toda la llave
            if (!item.lote || !item.contenedor || !item.tipoFruta || !item.calidad) {
                diagnostico.sinKey += 1;
                continue;
            }

            const loteId = item.lote.toString();
            const contenedorId = item.contenedor.toString();
            const tipoFrutaId = item.tipoFruta.toString();
            const calidadId = item.calidad.toString();

            const lote = lotesMap.get(loteId);
            const contenedor = contenedoresMap.get(contenedorId);
            const tipoFruta = tipoFrutaMap.get(tipoFrutaId);
            const calidad = calidadesMap.get(calidadId);

            if (!lote) {
                diagnostico.sinLote += 1;
                continue;
            }
            if (!contenedor) {
                diagnostico.sinContenedor += 1;
                continue;
            }

            const proveedor = proveedoresMap.get(lote.predio?.toString());

            // El lote puede apuntar a un precio que ya no existe en la coleccion precios
            const precio = preciosMap.get(lote.precio?.toString());
            if (!precio) diagnostico.sinPrecio += 1;
            else if (precio.exportacion?.[calidadId] == null) diagnostico.sinCalidadEnPrecio += 1;

            const precioCalidad = Number(precio?.exportacion?.[calidadId] ?? 0);

            const key = `${loteId}-${contenedorId}-${tipoFrutaId}-${calidadId}`;

            const kilos = Number(item.kilos) || 0;
            const cajas = Number(item.cajas) || 0;

            const acumulado = out.get(key);

            if (acumulado) {
                acumulado.kilos += kilos;
                acumulado.cajas += cajas;
                acumulado.precioTotal = acumulado.kilos * acumulado.precioUnitario;
            } else {
                out.set(key, {
                    fecha: item.fecha,
                    enf: lote.enf,
                    predio: proveedor?.PREDIO || 'Desconocido',
                    contenedor: contenedor.numeroContenedor,
                    tipoFruta: tipoFruta?.tipoFruta || 'Desconocido',
                    calidad: calidad?.nombre || 'Desconocida',
                    kilos,
                    cajas,
                    precioUnitario: precioCalidad,
                    precioTotal: kilos * precioCalidad
                })
            }
        }

        const rows = [...out.values()];

        const allKeys = [...new Set(rows.flatMap(row => Object.keys(row)))];

        const workbook = new ExcelJS.Workbook();
        const sheet = workbook.addWorksheet('Lotes contenedor precio');

        sheet.columns = allKeys.map(key => ({ header: key, key, width: 20 }));

        for (const row of rows) {
            sheet.addRow(row);
        }

        const fecha = new Date().toISOString().slice(0, 10);
        const outputPath = path.join('scripts', 'out', `lotes_contenedor_precio_${fecha}.xlsx`);
        await workbook.xlsx.writeFile(outputPath);

        console.log(`Total items procesados: ${itemPallets.length}`);
        console.log(`Total filas generadas: ${rows.length}`);
        console.log('Items descartados / sin precio:', diagnostico);
        console.log(`Archivo guardado en: ${outputPath}`);

    } catch (error) {
        console.error('Error en el proceso:', error.message);
        console.error(error);
        process.exit(1);
    } finally {
        await closeConnection();
    }
}

main();
