/**
 * @file Script para cambiar un id de pais en GGN.paises de los proveedores
 * @description En la coleccion proveedores, dentro del array GGN.paises, reemplaza
 *              el ObjectId 699daaa6221afb642c1012fd por 699daaa6221afb642c101309
 */

import { MongoClient, ObjectId } from 'mongodb';
import config from '../../../src/config/index.js';

const { MONGODB_PROCESO } = config;

const ID_VIEJO = new ObjectId('699daaa6221afb642c1012fd');
const ID_NUEVO = new ObjectId('699daaa6221afb642c101309');

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

        // Obtener coleccion
        const proveedoresCollection = database.collection('proveedors');

        // Reemplazar el id viejo por el nuevo en cada elemento del array GGN.paises
        const result = await proveedoresCollection.updateMany(
            { 'GGN.paises': ID_VIEJO },
            { $set: { 'GGN.paises.$[elem]': ID_NUEVO } },
            { arrayFilters: [{ elem: ID_VIEJO }] }
        );

        console.log(`✅ Documentos coincidentes: ${result.matchedCount} | Modificados: ${result.modifiedCount}`);

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
