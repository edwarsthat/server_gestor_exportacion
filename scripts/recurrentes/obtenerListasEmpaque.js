/**
 * @file Reporte de listas de empaque (packing list) a Excel
 * @description Replica la informacion de Inventario y Logistica / Historiales inventario /
 * Listas de empaque: una fila por itemPallet con los datos del contenedor (cliente, numero,
 * fecha, datalogger) y las columnas del PACKING LIST REPORT (pallet, packing date, lote, label,
 * variety, weight, category, size, qty, farm code, N° GG, expiration date).
 * Filtra por la fecha de empaque del item (itempallets.fecha) segun el rango definido en la consulta.
 */

import { MongoClient } from 'mongodb';
import writeXlsxFile from 'write-excel-file/node';
import 'dotenv/config';
import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const MONGODB_PROCESO = process.env.MONGODB_PROCESO;


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

const toMap = (docs) => new Map(docs.map(d => [d._id.toString(), d]));
// Ids unicos (ObjectId) del campo indicado
const idsDe = (docs, campo) => [...new Map(docs.filter(d => d[campo]).map(d => [d[campo].toString(), d[campo]])).values()];

async function main() {
    try {
        const database = await connectProcesoDB();

        const items = await database.collection('itempallets').find({
            // Rango sobre la fecha de empaque, en hora Colombia (UTC-5)
            fecha: {
                $gte: new Date('2026-01-01T05:00:00.000Z'),
                //$lte: new Date('2026-12-31T05:00:00.000Z'),
            },
        }).toArray();

        console.log(`Items encontrados: ${items.length}`);

        const lotesIds = idsDe(items.filter(i => i.loteType !== 'loteMaquila'), 'lote');
        const lotesMaquilaIds = idsDe(items.filter(i => i.loteType === 'loteMaquila'), 'lote');

        const [pallets, contenedores, lotes, lotesMaquila, calidades, tiposFruta] = await Promise.all([
            database.collection('pallets').find({ _id: { $in: idsDe(items, 'pallet') } }).toArray(),
            database.collection('contenedors').find({ _id: { $in: idsDe(items, 'contenedor') } }).toArray(),
            database.collection('lotes').find({ _id: { $in: lotesIds } }).toArray(),
            database.collection('lotemaquilas').find({ _id: { $in: lotesMaquilaIds } }).toArray(),
            database.collection('calidades').find({}).toArray(),
            database.collection('tipofrutas').find({}).toArray(),
        ]);

        const todosLotes = [...lotes, ...lotesMaquila];
        const clientesIds = idsDe(contenedores.map(c => ({ cliente: c.infoContenedor?.clienteInfo })), 'cliente');
        const salidasIds = contenedores.flatMap(c => c.registrosSalidas || []);

        const [proveedores, clientes, salidas] = await Promise.all([
            database.collection('proveedors').find({ _id: { $in: idsDe(todosLotes, 'predio') } }).toArray(),
            database.collection('clientes').find({ _id: { $in: clientesIds } }).toArray(),
            database.collection('salidavehiculos').find({ _id: { $in: salidasIds } }).toArray(),
        ]);

        const palletsMap = toMap(pallets);
        const contenedoresMap = toMap(contenedores);
        const lotesMap = toMap(todosLotes);
        const calidadesMap = toMap(calidades);
        const tiposFrutaMap = toMap(tiposFruta);
        const proveedoresMap = toMap(proveedores);
        const clientesMap = toMap(clientes);
        const salidasMap = toMap(salidas);

        const out = [];

        for (const item of items) {
            const pallet = palletsMap.get(item.pallet?.toString());
            const contenedor = contenedoresMap.get(item.contenedor?.toString());
            const lote = lotesMap.get(item.lote?.toString());
            const predio = proveedoresMap.get(lote?.predio?.toString() || '');
            const cliente = clientesMap.get(contenedor?.infoContenedor?.clienteInfo?.toString() || '');
            const calidad = calidadesMap.get(item.calidad?.toString() || '');
            const tipoFruta = tiposFrutaMap.get(item.tipoFruta?.toString() || '');

            const dataloggers = (contenedor?.registrosSalidas || [])
                .map(id => salidasMap.get(id.toString())?.datalogger_id)
                .filter(Boolean)
                .join(' - ');

            const [label, peso] = (item.tipoCaja || '').split('-');

            out.push({
                cliente: cliente ? cliente.CLIENTE.trim() : 'Desconocido',
                contenedor: contenedor?.numeroContenedor,
                fechaContenedor: contenedor?.infoContenedor?.fechaCreacion,
                tempRecorderId: dataloggers,
                palletId: pallet ? `${pallet.numeroPallet}${contenedor?.numeroContenedor || ''}` : '',
                packingDate: item.fecha,
                codigoLote: lote?.enf || 'No EF',
                label: label,
                variety: tipoFruta ? tipoFruta.tipoFruta : 'Desconocido',
                weight: isNaN(Number(peso)) ? item.tipoCaja : `${Number(peso)}Kg`,
                category: calidad ? calidad.nombre : '',
                size: item.calibre,
                qty: item.cajas,
                kilos: item.kilos,
                predio: predio ? predio.PREDIO : 'Desconocido',
                farmCode: item.SISPAP ? (predio?.ICA?.code || '') : 'Sin SISPAP',
                ggn: item.GGN ? (predio?.GGN?.code || '') : 'N/A',
                expirationDate: item.GGN ? predio?.GGN?.fechaVencimiento : null,
                // Para ordenar igual que en el sistema: por contenedor y numero de pallet
                _numeroPallet: pallet?.numeroPallet ?? 0,
            });
        }

        out.sort((a, b) =>
            (a.contenedor ?? 0) - (b.contenedor ?? 0) ||
            a._numeroPallet - b._numeroPallet ||
            new Date(a.packingDate) - new Date(b.packingDate)
        );

        const columnas = [
            { column: 'CLIENTE', key: 'cliente', type: String },
            { column: 'CONTAINER NUMBER', key: 'contenedor', type: Number },
            { column: 'DATE', key: 'fechaContenedor', type: Date, format: 'dd/mm/yyyy' },
            { column: 'TEMP RECORDER ID', key: 'tempRecorderId', type: String },
            { column: 'PALLET ID', key: 'palletId', type: String },
            { column: 'PACKING DATE', key: 'packingDate', type: Date, format: 'dd/mm/yyyy hh:mm:ss' },
            { column: 'CODIGO LOTE', key: 'codigoLote', type: String },
            { column: 'LABEL', key: 'label', type: String },
            { column: 'VARIETY', key: 'variety', type: String },
            { column: 'WEIGHT', key: 'weight', type: String },
            { column: 'CATEGORY', key: 'category', type: String },
            { column: 'SIZE', key: 'size', type: String },
            { column: 'QTY', key: 'qty', type: Number },
            { column: 'KILOS', key: 'kilos', type: Number },
            { column: 'PREDIO', key: 'predio', type: String },
            { column: 'FARM CODE', key: 'farmCode', type: String },
            { column: 'N° GG', key: 'ggn', type: String },
            { column: 'EXPIRATION DATE', key: 'expirationDate', type: Date, format: 'dd/mm/yyyy' },
        ];

        const schema = columnas.map(({ column, key, type, format }) => ({
            column,
            type,
            format,
            value: row => {
                const v = row[key];
                if (v == null || v === '') return null;
                if (type === Number) return typeof v === 'number' ? v : Number(v);
                if (type === Date) return v instanceof Date ? v : new Date(v);
                return String(v);
            },
        }));

        const outDir = path.join(__dirname, '..', 'out');
        fs.mkdirSync(outDir, { recursive: true });
        const filePath = path.join(outDir, 'listas_empaque.xlsx');
        await writeXlsxFile(out, { schema, filePath });
        console.log(`Archivo generado: ${filePath} (${out.length} filas)`);

    } catch (error) {
        console.error('Error en el proceso:', error.message);
        console.error(error);
        process.exit(1);
    } finally {
        await closeConnection();
    }
}

main();
