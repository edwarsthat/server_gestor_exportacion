/**
 * @file Script para migrar PAIS_DESTINO de clientes de strings a ObjectId
 * @description Lee el array de strings de PAIS_DESTINO de cada cliente, normaliza los nombres,
 * busca el _id correspondiente en la colección pais y actualiza el campo con el nuevo formato
 */

import { MongoClient } from 'mongodb';
import { writeFileSync } from 'fs';
import ExcelJS from 'exceljs';
import 'dotenv/config';

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

async function main() {
    try {
        const database = await connectProcesoDB();
        const lotesCollection = database.collection('lotes');
        const lotesMaquiladosCollection = database.collection('lotemaquilas')
        const calidadCollection = database.collection('calidades')
        const contenedoresCollection = database.collection('contenedors')
        const itemsContenedoresCollection = database.collection('itempallets')

        const calidades = await calidadCollection.find({}).toArray()
        const calidadesMap = new Map(calidades.map(d => [d._id.toString(), d]))

        const numerosContenedor = [1639, 1642, 1641, 1638, 1643, 1644, 1645, 1640, 1646, 1647, 1648, 1651, 1636, 1650, 1653, 1657, 1649, 1654, 1652, 1655, 1660, 1659, 1658, 1656, 1662, 1661]
        const contenedoresDocs = await contenedoresCollection.find(
            { numeroContenedor: { $in: numerosContenedor } },
            { projection: { _id: 1, numeroContenedor: 1 } }
        ).toArray()
        const contenedoresMap = new Map(contenedoresDocs.map(c => [c._id.toString(), c.numeroContenedor]))
        const contenedoresIds = contenedoresDocs.map(c => c._id)


        const itemsPallet = await itemsContenedoresCollection.find(
            { contenedor: { $in: contenedoresIds } }
        ).toArray()

        const lotesIds = [...new Set(itemsPallet.map(item => item.lote))]
        const [lotesDocs, lotesMaquilaDocs] = await Promise.all([
            lotesCollection.find({ _id: { $in: lotesIds } }, { projection: { _id: 1, enf: 1 } }).toArray(),
            lotesMaquiladosCollection.find({ _id: { $in: lotesIds } }, { projection: { _id: 1, enf: 1 } }).toArray()
        ])
        const todosLotesDocs = [...lotesDocs, ...lotesMaquilaDocs]
        const lotesMap = new Map(todosLotesDocs.map(l => [l._id.toString(), l.enf]))

        const outMap = new Map()

        for (const item of itemsPallet) {
            const enf = lotesMap.get(item.lote.toString())
            if (!enf) throw new Error(`Lote no encontrado para item ${item._id}: lote=${item.lote}`)
            const numeroContenedor = contenedoresMap.get(item.contenedor.toString())
            if (!numeroContenedor) throw new Error(`Contenedor no encontrado para item ${item._id}: contenedor=${item.contenedor}`)
            const calidad = calidadesMap.get(item.calidad.toString())
            if (!calidad) throw new Error(`Calidad no encontrada para item ${item._id}: calidad=${item.calidad}`)
            const key = `${item.calibre}:${enf}:${numeroContenedor}`
            if (!outMap.has(key)) {
                outMap.set(key, {
                    calibre: item.calibre,
                    enf, 
                    cajas: 0,
                    kilos: 0,
                    numeroContenedor: numeroContenedor,
                    calidad: calidad.nombre
                })
            }
            const entry = outMap.get(key)
            entry.cajas += item.cajas
            entry.kilos += item.kilos

        }

        const workbook = new ExcelJS.Workbook()
        const sheet = workbook.addWorksheet('Calibres')
        sheet.addRow(['Contenedor', 'ENF', 'Calibre', 'Cajas', 'Kilos', 'Calidad'])
        for (const row of outMap.values()) {
            sheet.addRow([row.numeroContenedor, row.enf, row.calibre, row.cajas, row.kilos, row.calidad])
        }
        await workbook.xlsx.writeFile('D:/trabajo/Celifrut/server_gestor_exportacion/scripts/out/calibresLotesExportacion.xlsx')
        console.log('Archivo generado: scripts/out/calibresLotesExportacion.xlsx')

    } catch (error) {
        console.error('Error en el proceso:', error.message);
        console.error(error);
        process.exit(1);
    } finally {
        await closeConnection();
    }
}

main();
