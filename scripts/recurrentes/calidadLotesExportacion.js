/**
 * @file Script para migrar PAIS_DESTINO de clientes de strings a ObjectId
 * @description Lee el array de strings de PAIS_DESTINO de cada cliente, normaliza los nombres,
 * busca el _id correspondiente en la colección pais y actualiza el campo con el nuevo formato
 */

import { MongoClient } from 'mongodb';
import { writeFileSync } from 'fs';
import config from '../../src/config/index.js';

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


        const lotes = await lotesCollection.find(
            {

            },
        ).toArray();

        const calidades = await calidadCollection.find({}).toArray()

        const calidadesMap = new Map(calidades.map(d => [d._id.toString(), d]))

        const out = []

        for(const lote of lotes){
            if(!lote.salidaExportacion || !lote.salidaExportacion.porCalidad){
                continue
            }
            if(Object.keys(lote.salidaExportacion.porCalidad).length === 0) {
                continue
            }

            const objLote = {
                enf: lote.enf,
                fecha: lote.fecha_creacion
            }

            Object.entries(lote.salidaExportacion.porCalidad).forEach(([key,value]) => {
                const calidad = calidadesMap.get(key)
                objLote[calidad.nombre] = value.kilos
            })

            console.log(objLote)
            out.push(objLote)

        }

        if (out.length > 0) {
            const headers = [...new Set(out.flatMap(row => Object.keys(row)))];
            const csvRows = [
                headers.join(';'),
                ...out.map(row => headers.map(h => row[h] ?? '').join(';')),
            ];
            const outputPath = '/home/analista/server/server_gestor_exportacion/scripts/out/calidadLotesExportacion.csv';
            writeFileSync(outputPath, csvRows.join('\n'), 'utf8');
            console.log(`CSV generado: ${outputPath} (${out.length} filas)`);
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
