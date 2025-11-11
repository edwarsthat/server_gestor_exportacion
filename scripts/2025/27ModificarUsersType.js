/**
 * @file Script para convertir campo user de String a ObjectId
 * @description Convierte el campo user de tipo String a ObjectId en lotes, loteef8 y lotemaquila
 */

import { MongoClient, ObjectId } from 'mongodb';
import config from '../../src/config/index.js';

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

/**
 * Convierte el campo user de String a ObjectId en una colección
 * @param {Collection} collection - La colección de MongoDB
 * @param {string} collectionName - Nombre de la colección para logging
 * @returns {Object} Estadísticas de la operación
 */
async function convertUserField(collection, collectionName) {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`📋 Procesando colección: ${collectionName}`);
    console.log('='.repeat(60));

    // Buscar documentos donde user es string
    const documentos = await collection.find({
        user: { $type: 'string' }
    }).toArray();

    console.log(`📦 Documentos con user tipo String: ${documentos.length}`);

    if (documentos.length === 0) {
        console.log('✅ No hay documentos para actualizar');
        return { actualizados: 0, errores: 0, omitidos: 0 };
    }

    let actualizados = 0;
    let errores = 0;
    let omitidos = 0;

    for (const doc of documentos) {
        try {
            const userId = doc.user;

            // Verificar si el user es un string válido para ObjectId
            if (!userId || userId.length !== 24) {
                console.log(`⚠️  ID ${doc._id}: user inválido o vacío - "${userId}"`);
                omitidos++;
                continue;
            }

            // Verificar si es un ObjectId válido
            if (!ObjectId.isValid(userId)) {
                console.log(`⚠️  ID ${doc._id}: user no es un ObjectId válido - "${userId}"`);
                omitidos++;
                continue;
            }

            // Convertir a ObjectId
            const userObjectId = new ObjectId(userId);

            // Actualizar el documento
            const resultado = await collection.updateOne(
                { _id: doc._id },
                { $set: { user: userObjectId } }
            );

            if (resultado.modifiedCount > 0) {
                console.log(`✅ ID ${doc._id}: user convertido de String a ObjectId`);
                actualizados++;
            } else {
                console.log(`⚠️  ID ${doc._id}: no se pudo actualizar`);
                omitidos++;
            }

        } catch (error) {
            console.error(`❌ Error procesando documento ${doc._id}:`, error.message);
            errores++;
        }
    }

    console.log(`\n📊 Resumen ${collectionName}:`);
    console.log(`   ✅ Actualizados: ${actualizados}`);
    console.log(`   ⏭️  Omitidos: ${omitidos}`);
    console.log(`   ❌ Errores: ${errores}`);

    return { actualizados, errores, omitidos };
}

async function main() {
    try {
        // Conectar a la base de datos
        const database = await connectProcesoDB();

        // Obtener colecciones (MongoDB pluraliza automáticamente los nombres de modelo)
        const lotes = database.collection('lotes');
        const loteef8 = database.collection('loteef8');
        const lotemaquilas = database.collection('lotemaquilas');

        console.log('\n🚀 Iniciando conversión de campo user de String a ObjectId...\n');

        // Procesar cada colección
        const resultadoLotes = await convertUserField(lotes, 'lotes');
        const resultadoLoteEf8 = await convertUserField(loteef8, 'loteef8');
        const resultadoLoteMaquila = await convertUserField(lotemaquilas, 'lotemaquilas');

        // Resumen final
        const totalActualizados = resultadoLotes.actualizados + resultadoLoteEf8.actualizados + resultadoLoteMaquila.actualizados;
        const totalOmitidos = resultadoLotes.omitidos + resultadoLoteEf8.omitidos + resultadoLoteMaquila.omitidos;
        const totalErrores = resultadoLotes.errores + resultadoLoteEf8.errores + resultadoLoteMaquila.errores;

        console.log('\n' + '='.repeat(60));
        console.log('📊 RESUMEN GENERAL');
        console.log('='.repeat(60));
        console.log(`✅ Total actualizados: ${totalActualizados}`);
        console.log(`⏭️  Total omitidos: ${totalOmitidos}`);
        console.log(`❌ Total errores: ${totalErrores}`);
        console.log('='.repeat(60));
        console.log('\n✅ Proceso completado exitosamente');

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

