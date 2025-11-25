/**
 * @file Script para convertir campo user de String a ObjectId
 * @description Convierte el campo user de tipo String a ObjectId en lotes, loteef8 y lotemaquila
 */

import { MongoClient } from 'mongodb';
import config from '../../src/config/index.js';
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
        const despachoDescarte = database.collection('historialdespachodescartes');
        const descartesCollection = database.collection('descartes');

        // Obtener todos los documentos
        const despachoDocs = await despachoDescarte.find({}).toArray();
        const descartes = await descartesCollection.find({}).toArray();

        console.log('📄 Documentos encontrados:', despachoDocs.length);

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

        for (const doc of despachoDocs) {
            const updateDoc = { $set: {} };
            let hasChanges = false;

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
                // Si es un string que parece ObjectId válido
                else if (typeof doc.tipoFruta === 'string' && /^[0-9a-fA-F]{24}$/.test(doc.tipoFruta)) {
                    updateDoc.$set.tipoFruta = new ObjectId(doc.tipoFruta);
                    hasChanges = true;
                }
                // Tipo desconocido
                else {
                    console.error(`❌ Tipo de fruta desconocido "${doc.tipoFruta}" (tipo: ${typeof doc.tipoFruta}) para doc ${doc._id}`);
                }
            }

            const newDescartes = {};

            // Procesar descarteEncerado
            if (doc.descarteEncerado) {
                for (const [key, value] of Object.entries(doc.descarteEncerado)) {
                    const descarteId = descartesMap.get(key);

                    if (!descarteId) {
                        console.error(`❌ No se encontró descarte "${key}" para doc ${doc._id}`);
                        continue;
                    }

                    newDescartes[`ENCERADO:${descarteId.toString()}`] = value;
                }
            }

            // Procesar descarteLavado
            if (doc.descarteLavado) {
                for (const [key, value] of Object.entries(doc.descarteLavado)) {
                    const descarteId = descartesMap.get(key);

                    if (!descarteId) {
                        console.error(`❌ No se encontró descarte "${key}" para doc ${doc._id}`);
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
            }
        }

        // Ejecutar operación bulk si hay cambios
        if (bulkOps.length > 0) {
            console.log(`🔄 Actualizando ${bulkOps.length} documentos...`);

            const result = await despachoDescarte.bulkWrite(bulkOps, {
                ordered: false
            });

            console.log('✅ Resultado:');
            console.log(`   - Modificados: ${result.modifiedCount}`);
            console.log(`   - Coincidentes: ${result.matchedCount}`);

            if (result.writeErrors && result.writeErrors.length > 0) {
                console.error(`⚠️  Errores: ${result.writeErrors.length}`);
                result.writeErrors.forEach(err => {
                    console.error(`   Error en índice ${err.index}:`, err.errmsg);
                });
            }
        } else {
            console.log('ℹ️  No hay documentos para actualizar');
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

