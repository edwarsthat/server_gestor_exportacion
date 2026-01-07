/**
 * @file Script para convertir campo user de String a ObjectId
 * @description Convierte el campo user de tipo String a ObjectId en lotes, loteef8 y lotemaquila
 */

import { MongoClient } from 'mongodb';
import config from '../../../src/config/index.js';
import { ObjectId } from 'mongodb';

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
        const descompuestaCollection = database.collection('frutadescompuestas');
        const descartesCollection = database.collection('descartes');

        // Actualizar directamente los documentos que no tienen el campo
        console.log('🔄 Iniciando proceso de actualización...');

        const docs = await descompuestaCollection.find({}).toArray();
        const descartes = await descartesCollection.find({}).toArray();


        // Crear un Map para búsquedas O(1)
        const descartesMap = new Map(
            descartes.map(d => [d.nombre, d._id])
        );

        // Mapa de conversión de frutas
        const frutasMap = {
            "Naranja": "686e6b940c34dee069775d4f",
            "Limon": "686e6b450c34dee069775d4e",
            "Mandarina": "6877f45ae35ac9d2a0ab08e4"
        };
        // Array para operaciones bulk
        const bulkOps = [];
        let procesados = 0;
        let conCambios = 0;

        console.log(`📊 Total de documentos encontrados: ${docs.length}`);

        for (const doc of docs) {
            const updateDoc = { $set: {} };
            let hasChanges = false;
            procesados++;

            // Procesar tipoFruta
            if (doc.tipoFruta) {
                // Si ya es ObjectId, no hacer nada
                if (doc.tipoFruta instanceof ObjectId) {
                    // No necesita conversión
                }
                // Si es un string de nombre de fruta
                else if (typeof doc.tipoFruta === 'string' && frutasMap[doc.tipoFruta]) {
                    updateDoc.$set.tipoFruta = new ObjectId(frutasMap[doc.tipoFruta]);
                    hasChanges = true;
                }
                // Si es un string que parece ObjectId válido (24 caracteres hex)
                else if (typeof doc.tipoFruta === 'string' && /^[0-9a-fA-F]{24}$/.test(doc.tipoFruta)) {
                    updateDoc.$set.tipoFruta = new ObjectId(doc.tipoFruta);
                    hasChanges = true;
                }
                // Tipo desconocido
                else if (doc.tipoFruta !== "" && doc.tipoFruta !== null) {
                    // Solo advertir si tiene valor
                    console.warn(`⚠️ Tipo de fruta desconocido "${doc.tipoFruta}" (tipo: ${typeof doc.tipoFruta}) para doc ${doc._id}`);
                }
            }

            // Procesar user
            if (doc.user) {
                // Si ya es ObjectId, no hacer nada
                if (doc.user instanceof ObjectId) {
                    // No necesita conversión
                }
                // Si es un string que parece ObjectId válido
                else if (typeof doc.user === 'string' && /^[0-9a-fA-F]{24}$/.test(doc.user)) {
                    updateDoc.$set.user = new ObjectId(doc.user);
                    hasChanges = true;
                }
                // Tipo desconocido
                else {
                    console.warn(`⚠️ Campo 'user' con formato desconocido "${doc.user}" (tipo: ${typeof doc.user}) para doc ${doc._id}`);
                }
            }

            const newDescartes = {};

            // Procesar descarteEncerado
            if (doc.descarteEncerado) {
                for (const [key, value] of Object.entries(doc.descarteEncerado)) {
                    if (Number(value) === 0) continue;

                    const descarteId = descartesMap.get(key);

                    if (!descarteId) {
                        console.warn(`⚠️ Validación: No se encontró descarte Encerado "${key}" para doc ${doc._id}`);
                        continue;
                    }
                    newDescartes[`ENCERADO:${descarteId.toString()}`] = value;
                }
            }

            // Procesar descarteLavado
            if (doc.descarteLavado) {
                for (const [key, value] of Object.entries(doc.descarteLavado)) {
                    if (Number(value) === 0) continue;

                    const descarteId = descartesMap.get(key);

                    if (!descarteId) {
                        console.warn(`⚠️ Validación: No se encontró descarte Lavado "${key}" para doc ${doc._id}`);
                        continue;
                    }
                    newDescartes[`LAVADO:${descarteId.toString()}`] = value;
                }
            }

            // Agregar newDescartes al update si hay datos
            if (Object.keys(newDescartes).length > 0) {
                updateDoc.$set.descartes = newDescartes;
                hasChanges = true;
            }

            // Solo agregar a bulk si hay cambios
            if (hasChanges) {
                bulkOps.push({
                    updateOne: {
                        filter: { _id: doc._id },
                        update: updateDoc
                    }
                });
                conCambios++;
            }
        }
        console.log(`📝 Se prepararon ${procesados} operaciones de actualización.`);
        console.log(`📝 Se prepararon ${conCambios} operaciones de actualización.`);
        console.log(`📝 Se prepararon ${bulkOps.length} operaciones de actualización.`);

        if (bulkOps.length > 0) {
            console.log('🚀 Ejecutando bulkWrite...');
            const result = await descompuestaCollection.bulkWrite(bulkOps);

            console.log('✅ Resultado de la actualización:');
            console.log(`   - Documentos coincidentes: ${result.matchedCount}`);
            console.log(`   - Documentos modificados: ${result.modifiedCount}`);
            console.log(`   - Documentos insertados: ${result.insertedCount}`);
            console.log(`   - Documentos eliminados: ${result.deletedCount}`);
        } else {
            console.log('ℹ️ No hay cambios pendientes para aplicar.');
        }

        console.log('\n✅ Proceso completado exitosamente');

    } catch (error) {
        console.error('❌ Error en el proceso:', error.message);
        console.error(error);
        process.exit(1);
    } finally {
        await closeConnection();
    }
}

// Ejecutar el script
main();
