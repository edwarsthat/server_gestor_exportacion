/**
 * @file Script para migrar PAIS_DESTINO de clientes de strings a ObjectId
 * @description Lee el array de strings de PAIS_DESTINO de cada cliente, normaliza los nombres,
 * busca el _id correspondiente en la colección pais y actualiza el campo con el nuevo formato
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

async function main() {
    try {
        const database = await connectProcesoDB();
        const lotesCollection = database.collection('lotes');
        const proveedoresCollection = database.collection('proveedors');
        const itemPalletsCollection = database.collection('itempallets')


        const lotes = await lotesCollection.find(
            {
                fecha_creacion: {
                    $gte: new Date('2026-01-01'),
                    $lt: new Date('2027-01-01'),
                },
            },
        ).toArray();

        const predioIds = [...new Set(lotes.map(l => l.predio))];
        const predios = await proveedoresCollection.find(
            { _id: { $in: predioIds.map(id => id) } },
            { projection: { GGN: 1, PREDIO: 1 } }
        ).toArray();

        const predioMap = Object.fromEntries(predios.map(p => [p._id.toString(), p]));

        const lotesConPredio = lotes.map(lote => ({
            ...lote,
            predio: lote.predio ? predioMap[lote.predio.toString()] ?? lote.predio : null,
        }));

        for (const lote of lotesConPredio) {

            const itemPallets = await itemPalletsCollection.aggregate([
                { $match: { lote: lote._id } },
                {
                    $lookup: {
                        from: 'contenedors',
                        localField: 'contenedor',
                        foreignField: '_id',
                        as: 'contenedor',
                    },
                },
                { $unwind: { path: '$contenedor', preserveNullAndEmptyArrays: true } },
            ]).toArray();

            if (itemPallets.length === 0) continue

            let kilosGGN = 0;
            for(const item of itemPallets){
                if(!lote.GGN) continue
                if(!item.contenedor.GGN) continue
                
                const pais_destino = item.contenedor.pais_destino
                const paises_lote = lote.predio.GGN.paises

                if(!paises_lote.some(pais => pais.equals(pais_destino))) continue

                kilosGGN += item.kilos
            }

            await lotesCollection.updateOne(
                { _id: lote._id },
                { $set: { 'salidaExportacion.kilosGGN': kilosGGN } }
            );

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
