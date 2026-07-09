/**
 * @file Script para convertir campo user de String a ObjectId
 * @description Convierte el campo user de tipo String a ObjectId en lotes, loteef8 y lotemaquila
 */

import { MongoClient, ObjectId } from 'mongodb';
import config from '../../../src/config/index.js';
import fs from 'fs';
import { parse } from 'csv-parse/sync';
import { buildDateRangeFilter } from '../../../server/api/utils/filtros.js';

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
        const contenedoresCollections = database.collection('contenedors')
        const lotesCollections = database.collection('lotes');
        const itemPalletsCollection = database.collection('itempallets')

        const filtroFecha = buildDateRangeFilter('2026-06-15', '2026-07-08', 'infoContenedor.fechaCreacion');
        const contenedores = await contenedoresCollections.find(filtroFecha).toArray();

        const contenedoresGGN = contenedores.filter(c => c.infoContenedor.GGN)
        const contenedoresIds = contenedoresGGN.map(c => c._id)

        const itemPallets = await itemPalletsCollection.find({ contenedor: { $in: contenedoresIds } }).toArray();
        const lotesIds = [...new Set(itemPallets.map(i => i.lote.toString()))]

        const lotesMap = new Map(
            lotesIds.map(id => [id, { _id: new ObjectId(id), kilosGGN: 0 }])
        )

        const itemsAModificar = []

        for (const item of itemPallets) {
            if (item.GGN) continue

            const lote = lotesMap.get(item.lote.toString())
            lote.kilosGGN += item.kilos ?? 0

            itemsAModificar.push(item._id)
        }

        const operacionesLotes = [...lotesMap.values()]
            .filter(lote => lote.kilosGGN > 0)
            .map(lote => ({
                updateOne: {
                    filter: { _id: lote._id },
                    update: { $inc: { 'salidaExportacion.kilosGGN': lote.kilosGGN } }
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

