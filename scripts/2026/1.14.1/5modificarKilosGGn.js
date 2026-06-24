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

        // Obtener colecciones
        const lotesCollections = database.collection('lotes');
        const contCollections = database.collection('contenedors');
        const itemPalletsCollection = database.collection('itempallets')

        const contenedor = await contCollections.findOne({ numeroContenedor: 1723 })

        if (!contenedor) {
            console.log('⚠️ No se encontró ningún contenedor con numeroContenedor = 1723');
            return;
        }

        const itemPalletsContenedor = await itemPalletsCollection.find({
            contenedor: contenedor._id
        }).toArray()

        const operaciones = itemPalletsContenedor.map(item => ({
            updateOne: {
                filter: { _id: item._id },
                update: { $set: { GGN: true } }
            }
        }))

        if (operaciones.length > 0) {
            const resultado = await itemPalletsCollection.bulkWrite(operaciones)
            console.log(`✅ ItemPallets modificados: ${resultado.modifiedCount} de ${operaciones.length}`)
        } else {
            console.log('⚠️ No hay itemPallets para modificar')
        }

        const lotesArrIds = [...new Set(itemPalletsContenedor.map(c => c.lote.toString()))]
            .map(id => new ObjectId(id))

        const lotes = await lotesCollections.find({
            _id: { $in: lotesArrIds }
        }).toArray()

        lotes.forEach(lote => {
            if (!lote.salidaExportacion) lote.salidaExportacion = {}
            lote.salidaExportacion.kilosGGN = 0
        })

        const lotesIds = lotes.map( l => l._id )


        const itemsPallets = await itemPalletsCollection.find({
            lote: { $in: lotesIds }
        }).toArray()


        const lotesMap = new Map(
            lotes.map(l => [l._id.toString(), l])
        )

        for(const item of itemsPallets) {
            if(!item.GGN) continue

            const lote = lotesMap.get(item.lote.toString())
            if (!lote) continue

            lote.salidaExportacion.kilosGGN += item.kilos ?? 0
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

