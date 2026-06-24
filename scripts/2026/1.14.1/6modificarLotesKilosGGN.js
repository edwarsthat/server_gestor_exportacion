/**
 * @file Script para convertir campo user de String a ObjectId
 * @description Convierte el campo user de tipo String a ObjectId en lotes, loteef8 y lotemaquila
 */

import { MongoClient, ObjectId } from 'mongodb';
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
        const LOTES_IDS = [
            "6a36cba448af730ba841c9dd",
            "6a36c79f48af730ba841c850"
        ]
        const CONTENEDOR = "6a36a43848af730ba841a754"
        // Obtener colecciones
        const lotesCollections = database.collection('lotes');
        const itemPalletsCollection = database.collection('itempallets')

        const LOTES_OBJECT_IDS = LOTES_IDS.map(id => new ObjectId(id))
        const CONTENEDOR_OBJECT_ID = new ObjectId(CONTENEDOR)

        const lotes = await lotesCollections.find({
            _id: { $in: LOTES_OBJECT_IDS }
        }).toArray()

        const itemPallets = await itemPalletsCollection.find({
            lote: { $in: LOTES_OBJECT_IDS },
            contenedor: CONTENEDOR_OBJECT_ID
        }).toArray()


        const lotesMap = new Map(
            lotes.map(l => [l._id.toString(), l])
        )

        const itemsAModificar = []

        for (const item of itemPallets) {
            if(item.GGN) continue
            const lote = lotesMap.get(item.lote.toString())
            lote.salidaExportacion.kilosGGN += item.kilos ?? 0

            itemsAModificar.push(item._id)
        }

        const operacionesLotes = lotes.map(lote => ({
            updateOne: {
                filter: { _id: lote._id },
                update: { $set: { 'salidaExportacion.kilosGGN': lote.salidaExportacion.kilosGGN } }
            }
        }))

        if (operacionesLotes.length > 0) {
            const resultadoLotes = await lotesCollections.bulkWrite(operacionesLotes)
            console.log(`✅ Lotes modificados: ${resultadoLotes.modifiedCount} de ${operacionesLotes.length}`)
        } else {
            console.log('⚠️ No hay lotes para modificar')
        }

        const operacionesItemPallets = itemsAModificar.map(id => ({
            updateOne: {
                filter: { _id: id },
                update: { $set: { GGN: true } }
            }
        }))

        if (operacionesItemPallets.length > 0) {
            const resultadoItemPallets = await itemPalletsCollection.bulkWrite(operacionesItemPallets)
            console.log(`✅ ItemPallets modificados: ${resultadoItemPallets.modifiedCount} de ${operacionesItemPallets.length}`)
        } else {
            console.log('⚠️ No hay itemPallets para modificar')
        }



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

