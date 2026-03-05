/**
 * @file Script para migrar el campo `formulario` de las colecciones de calidad
 * @description Reemplaza los valores legibles del campo `formulario` (ej: "Limpieza diária")
 * por la clave normalizada correspondiente (ej: "limpieza_diaria"), usando regex tolerante
 * a variaciones de tildes y mayúsculas.
 */

import { MongoClient } from 'mongodb';
import config from '../../../src/config/index.js';

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

// Cada entrada: coleccion MongoDB → key normalizada que debe quedar en el campo `formulario`
const migraciones = [
    { coleccion: 'limpiezadiarias',   keyNueva: 'limpieza_diaria'  },
    { coleccion: 'limpiezamensuales', keyNueva: 'limpieza_mensual' },
    { coleccion: 'controlplagas',     keyNueva: 'control_plagas'   },
];

async function main() {
    try {
        const database = await connectProcesoDB();

        for (const { coleccion, keyNueva } of migraciones) {
            const collection = database.collection(coleccion);

            // Documentos sin migrar: sin campo, con valor null, o con cualquier valor distinto a la key
            const pendientes = await collection.countDocuments({ formulario: { $ne: keyNueva } });
            const yaCorrectos = await collection.countDocuments({ formulario: keyNueva });
            console.log(`[${coleccion}] Total correctos: ${yaCorrectos} | A migrar: ${pendientes}`);

            if (pendientes === 0) {
                console.log(`[${coleccion}] Nada que migrar, se omite.\n`);
                continue;
            }

            const result = await collection.updateMany(
                { formulario: { $ne: keyNueva } },
                { $set: { formulario: keyNueva } }
            );

            console.log(`[${coleccion}] Migrados: ${result.modifiedCount} / ${pendientes}\n`);
        }

        console.log('Migracion completada.');

    } catch (error) {
        console.error('Error en el proceso:', error.message);
        console.error(error);
        process.exit(1);
    } finally {
        await closeConnection();
    }
}

main();
