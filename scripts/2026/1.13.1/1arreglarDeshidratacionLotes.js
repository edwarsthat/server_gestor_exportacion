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



async function main() {
    try {
        // Conectar a la base de datos
        const database = await connectProcesoDB();

        // Obtener colecciones
        const lotesCollections = database.collection('lotes');

        const lotesArray = await lotesCollections.find({
                fecha_creacion: {
                    $lte: new Date('2025-12-31T23:59:59.999Z')
                }
            }).toArray();

        let actualizados = 0;
        let omitidos = 0;

        for(const lote of lotesArray){
            const kilosProcesados = lote.kilosProcesados

            if(kilosProcesados === 0 || kilosProcesados === undefined){
                omitidos++;
                continue;
            }

            const kilosAprox = Math.round(kilosProcesados * 2) / 2
            const deshidratacion = ((kilosAprox * 100) / lote.kilos)

            await lotesCollections.updateOne(
                { _id: lote._id },
                {
                    $set: { kilosProcesados, deshidratacion },
                }
            );

            actualizados++;
        }

        console.log(`✅ Actualizados: ${actualizados} | Omitidos: ${omitidos}`);

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

