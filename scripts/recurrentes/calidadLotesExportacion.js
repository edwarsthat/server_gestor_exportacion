/**
 * @file Script para migrar PAIS_DESTINO de clientes de strings a ObjectId
 * @description Lee el array de strings de PAIS_DESTINO de cada cliente, normaliza los nombres,
 * busca el _id correspondiente en la colección pais y actualiza el campo con el nuevo formato
 */

import { MongoClient } from 'mongodb';
import writeXlsxFile from 'write-excel-file/node';
import config from '../../src/config/index.js';
import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const { MONGODB_PROCESO } = config;

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
        const calidadCollection = database.collection('calidades')
        const descartesCollection = database.collection('descartes')
        const tipoFrutaCollection = database.collection('tipofrutas')
        const proveedoresCollection = database.collection('proveedors')

        const lotes = await lotesCollection.find(
            {
                fecha_creacion: {
                    $gte: new Date('2024-05-01T05:00:00.000Z'),
                    // $lt: new Date('2026-05-01T05:00:00.000Z'),
                },
            },
        ).toArray();

        const [calidades, descartes, tipoFrutas, proveedores] = await Promise.all([
            calidadCollection.find({}).toArray(),
            descartesCollection.find({}).toArray(),
            tipoFrutaCollection.find({}).toArray(),
            proveedoresCollection.find({}).toArray()
        ]);

        const calidadesMap = new Map(calidades.map(d => [d._id.toString(), d]))
        const descartesMap = new Map(descartes.map(d => [d._id.toString(), d]))
        const tipoFrutasMap = new Map(tipoFrutas.map(d => [d._id.toString(), d]))
        const proveedoresMap = new Map(proveedores.map(d => [d._id.toString(), d]))


        const out = []

        for (const lote of lotes) {
            if (!lote.salidaExportacion || !lote.salidaExportacion.porCalidad) {
                continue
            }
            if (Object.keys(lote.salidaExportacion.porCalidad).length === 0) {
                continue
            }

            const tipoFruta = tipoFrutasMap.get(lote.tipoFruta.toString());
            if(!tipoFruta) {
                console.warn(`Tipo fruta no encontrado para lote ${lote._id}: tipoFruta=${lote.tipoFruta}`);
                continue;
            }



            const objLote = {
                fecha: lote.fecha_creacion,
                enf: lote.enf,
                tipoFruta: tipoFruta.tipoFruta,
                kilos: lote.kilos,
                predio: proveedoresMap.get(lote.predio.toString())?.PREDIO || "Err"
            }

            Object.entries(lote.salidaExportacion.porCalidad).forEach(([key, value]) => {
                const calidad = calidadesMap.get(key)
                objLote[calidad.nombre] = value.kilos
            })

            if (lote.directoNacional) {
                objLote.directoNacional = lote?.directoNacional || 0;
            }


            if (lote.descartes) {
                Object.entries(lote.descartes).forEach(([key, value]) => {
                    const descarte = descartesMap.get(key);
                    if (descarte) {
                        objLote[`kilos_descarte_${descarte.nombre}`] = value;
                    } else {
                        console.warn(`Descarte no encontrado para lote ${lote._id}: descarte=${key}`);
                    }
                })
            }
            if (lote.deshidratacion !== 0) {
                objLote.kilosDeshidratacion = ((lote.deshidratacion / 100) * lote.kilos);
            }
            if(lote.descarteEncerado && lote.descarteEncerado.suelo){
                objLote.suelo = lote.descarteEncerado.suelo
            }


            console.log(objLote)
            out.push(objLote)

        }

        if (out.length > 0) {
            const headers = [...new Set(out.flatMap(row => Object.keys(row)))];
            const data = [
                headers.map(h => ({ value: h, fontWeight: 'bold' })),
                ...out.map(row => headers.map(h => {
                    const val = row[h] ?? null;
                    if (val instanceof Date) return { value: val, type: Date };
                    if (typeof val === 'number') return { value: val, type: Number };
                    return { value: val !== null ? String(val) : '', type: String };
                })),
            ];
            const outputPath = path.join(__dirname, '../out/calidadLotesExportacion.xlsx');
            await writeXlsxFile(data, { filePath: outputPath, dateFormat: 'dd/mm/yyyy' });
            console.log(`Excel generado: ${outputPath} (${out.length} filas)`);
        } else {
            console.log('No hay datos para exportar');
        }

    } catch (error) {
        console.error('Error en el proceso:', error.message);
        console.error(error);
        process.exit(1);
    } finally {
        await closeConnection();
    }
}

main();
