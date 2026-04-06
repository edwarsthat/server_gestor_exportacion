/**
 * @file Script para convertir campo user de String a ObjectId
 * @description Convierte el campo user de tipo String a ObjectId en lotes, loteef8 y lotemaquila
 */

import { MongoClient } from 'mongodb';
import config from '../../../src/config/index.js';
import fs from 'fs';
import { parse } from 'csv-parse/sync';

const { MONGODB_PROCESO } = config;

let client = null;
let db = null;

async function connectProcesoDB() {
    try {
        if (db) {
            console.log('✅ Ya existe una conexión activa a la base de datos proceso');
            return db;
        }

        console.log('🔌 Conectando a la base de datos proceso...');

        // Crear cliente de MongoDB
        client = new MongoClient(MONGODB_PROCESO, {
            serverSelectionTimeoutMS: 5000,
            socketTimeoutMS: 45000,
        });

        // Conectar al servidor
        await client.connect();

        // Verificar la conexión
        await client.db().admin().ping();
        console.log('✅ Conectado exitosamente a la base de datos proceso');

        // Obtener la base de datos
        db = client.db();

        return db;
    } catch (error) {
        console.error('❌ Error conectando a la base de datos:', error.message);
        throw error;
    }
}

async function closeConnection() {
    try {
        if (client) {
            await client.close();
            client = null;
            db = null;
            console.log('🔌 Conexión cerrada correctamente');
        }
    } catch (error) {
        console.error('❌ Error cerrando la conexión:', error.message);
        throw error;
    }
}

function leerCSV(rutaArchivo) {
    const fileContent = fs.readFileSync(rutaArchivo, 'utf-8');

    const records = parse(fileContent, {
        columns: true,           // Primera línea como encabezados
        skip_empty_lines: true,  // Saltar líneas vacías
        trim: true,              // Quitar espacios en blanco
        cast: true,              // Convertir tipos automáticamente
        relax_quotes: true       // Más tolerante con comillas
    });

    return records;
}


async function main() {
    try {
        // Conectar a la base de datos
        const database = await connectProcesoDB();

        // Obtener colecciones
        const personalCollection = database.collection('personals');
        const serialCollection = database.collection('seriales');
        const carnetCollection = database.collection('carnets');

        const personalsArray = await personalCollection.find().toArray();

        const opCarnet = [];

        for (const personal of personalsArray) {
            const skuDoc = await serialCollection.findOneAndUpdate(
                { name: 'SKU' },
                { $inc: { serial: 1 } },
                { returnDocument: 'after' }
            );

            opCarnet.push({
                updateOne: {
                    filter: { SKU: skuDoc.serial },
                    update: {
                        $setOnInsert: {
                            SKU: skuDoc.serial,
                            type: 'final',
                            status: 'stock',
                            employeeId: personal._id,
                            tokenHash: null,
                            isGenerated: false,
                            vinilo: true,
                            issuedAt: null,
                            expiresAt: null,
                            user: null,
                            assignedBy: null,
                            notes: ''
                        }
                    },
                    upsert: true
                }
            });
        }

        if (opCarnet.length > 0) {
            console.log(`🌐 Creando ${opCarnet.length} carnets...`);
            const resCarnets = await carnetCollection.bulkWrite(opCarnet);
            console.log(`✅ Carnets: ${resCarnets.upsertedCount} creados, ${resCarnets.matchedCount} ya existían.`);
        }

        console.log('🏁 Migración de tablas maestras finalizada con éxito.');

    } catch (error) {
        console.error('❌ Error en el proceso:', error.message);
        console.error(error);
        process.exit(1);
    } finally {
        // Cerrar la conexión al finalizar
        await closeConnection();
    }
}

// Ejecutar el script
main();

