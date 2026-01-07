/**
 * @file Script para migrar estructura de inventariodescartes
 * @description Convierte la estructura anidada de kilos_salida y kilos_ingreso a un Map plano de ObjectId -> Kilogramos
 */

import { MongoClient } from 'mongodb';
import config from '../../../src/config/index.js';

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

        client = new MongoClient(MONGODB_PROCESO, {
            serverSelectionTimeoutMS: 5000,
            socketTimeoutMS: 45000,
        });

        await client.connect();
        await client.db().admin().ping();
        console.log('✅ Conectado exitosamente a la base de datos proceso');

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
        const database = await connectProcesoDB();
        const collection = database.collection('inventariodescartes');
        const descartesCollection = database.collection('descartes');

        console.log('🔄 Iniciando proceso de migración de iventariodescartes...');

        const docs = await collection.find({}).toArray();
        const descartes = await descartesCollection.find({}).toArray();

        // Mapa de conversión de frutas (Nombres a ObjectIds)
        const frutasMap = {
            "Naranja": "686e6b940c34dee069775d4f",
            "Limon": "686e6b450c34dee069775d4e",
            "Mandarina": "6877f45ae35ac9d2a0ab08e4"
        };
        const areaMap = {
            "descarteLavado": "LAVADO",
            "descarteEncerado": "ENCERADO"
        };

        const bulkOps = [];
        let procesados = 0;
        let conCambios = 0;

        console.log(`📊 Total de documentos encontrados: ${docs.length}`);

        for (const doc of docs) {
            const updateDoc = { $set: {} };
            let hasChanges = false;
            procesados++;

            if (doc.kilos_salida) {
                for (const fruta of Object.keys(doc.kilos_salida)) {
                    const frutaId = frutasMap[fruta];
                    if (!frutaId) {
                        // Se puede descomentar si se quiere ver advertencias por cada fruta desconocida
                        // console.warn(`⚠️ [SALIDA] Fruta/Key desconocida '${fruta}' en doc ${doc._id}. Se omitirá.`);
                        continue;
                    }
                    if (typeof doc.kilos_salida[fruta] !== 'object') continue;

                    for (const area of Object.keys(doc.kilos_salida[fruta])) {
                        const areaId = areaMap[area];
                        if (!areaId) {
                            // console.warn(`⚠️ [SALIDA] Area/Key desconocida '${area}' en doc ${doc._id}. Se omitirá.`);
                            continue;
                        }
                        for (const [key, value] of Object.entries(doc.kilos_salida[fruta][area])) {
                            const descarteId = descartes.find(descarte => descarte.nombre === key);
                            if (!descarteId) {
                                console.warn(`⚠️ [SALIDA] Descarte/Key desconocida '${key}' en doc ${doc._id}. Se omitirá.`);
                                continue;
                            }
                            updateDoc.$set[`kilos_salida.${frutaId}.${areaId}.${descarteId._id.toString()}`] = Number(value);
                            hasChanges = true;
                        }
                    }
                }
            }

            if (doc.kilos_ingreso) {
                for (const fruta of Object.keys(doc.kilos_ingreso)) {
                    const frutaId = frutasMap[fruta];
                    if (!frutaId) {
                        // console.warn(`⚠️ [INGRESO] Fruta/Key desconocida '${fruta}' en doc ${doc._id}. Se omitirá.`);
                        continue;
                    }
                    if (typeof doc.kilos_ingreso[fruta] !== 'object') continue;

                    for (const area of Object.keys(doc.kilos_ingreso[fruta])) {
                        const areaId = areaMap[area];
                        if (!areaId) {
                            // console.warn(`⚠️ [INGRESO] Area/Key desconocida '${area}' en doc ${doc._id}. Se omitirá.`);
                            continue;
                        }
                        for (const [key, value] of Object.entries(doc.kilos_ingreso[fruta][area])) {
                            const descarteId = descartes.find(descarte => descarte.nombre === key);
                            if (!descarteId) {
                                console.warn(`⚠️ [INGRESO] Descarte/Key desconocida '${key}' en doc ${doc._id}. Se omitirá.`);
                                continue;
                            }
                            updateDoc.$set[`kilos_ingreso.${frutaId}.${areaId}.${descarteId._id.toString()}`] = Number(value);
                            hasChanges = true;
                        }
                    }
                }
            }

            if (doc.inventario) {
                for (const fruta of Object.keys(doc.inventario)) {
                    const frutaId = frutasMap[fruta];
                    if (!frutaId) {
                        // console.warn(`⚠️ [INGRESO] Fruta/Key desconocida '${fruta}' en doc ${doc._id}. Se omitirá.`);
                        continue;
                    }
                    if (typeof doc.inventario[fruta] !== 'object') continue;

                    for (const area of Object.keys(doc.inventario[fruta])) {
                        const areaId = areaMap[area];
                        if (!areaId) {
                            // console.warn(`⚠️ [INGRESO] Area/Key desconocida '${area}' en doc ${doc._id}. Se omitirá.`);
                            continue;
                        }
                        for (const [key, value] of Object.entries(doc.inventario[fruta][area])) {
                            const descarteId = descartes.find(descarte => descarte.nombre === key);
                            if (!descarteId) {
                                console.warn(`⚠️ [INGRESO] Descarte/Key desconocida '${key}' en doc ${doc._id}. Se omitirá.`);
                                continue;
                            }
                            updateDoc.$set[`inventario.${frutaId}.${areaId}.${descarteId._id.toString()}`] = Number(value);
                            hasChanges = true;
                        }
                    }
                }
            }

            // Si el objeto resultante está vacío (porque todo era 0), Mongoose/Mongo guardará un mapa vacío {}. 
            // Si queremos eliminar el campo si está vacío, usaríamos $unset. Pero el schema tiene default {}.

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
        console.log(`📝 Se prepararon ${bulkOps.length} operaciones de actualización.`);
        console.log(`📝 Se prepararon ${conCambios} operaciones de actualización.`);
        console.log(`📝 Se prepararon ${procesados} operaciones de actualización.`);
        if (bulkOps.length > 0) {
            console.log('🚀 Ejecutando bulkWrite...');
            // ERROR CORREGIDO: Usar 'collection' en lugar de 'descompuestaCollection'
            const result = await collection.bulkWrite(bulkOps);

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
