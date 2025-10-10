/**
 * @file Script para normalizar lista de empaque usando MongoDB nativo
 * @description Conexión directa a la base de datos 'proceso' sin Mongoose
 */

import { MongoClient, ObjectId } from 'mongodb';
import config from '../src/config/index.js';

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
 * Crea un nuevo pallet en la colección pallets
 * @async
 * @param {import('mongodb').Collection} palletsCollection - Colección de pallets
 * @param {Object} dataPallet - Datos del pallet a crear
 * @returns {Promise<import('mongodb').InsertOneResult>} Resultado de la inserción
 */
async function crearPallet(palletsCollection, dataPallet) {
    try {
        const resultado = await palletsCollection.insertOne(dataPallet);
        console.log(`   ✅ Pallet creado con ID: ${resultado.insertedId}`);
        return resultado;
    } catch (error) {
        console.error(`   ❌ Error creando pallet:`, error.message);
        throw error;
    }
}

/**
 * Crea un nuevo item de pallet en la colección itempallets
 * @async
 * @param {import('mongodb').Collection} itemPalletsCollection - Colección de itempallets
 * @param {Object} dataItem - Datos del item a crear
 * @returns {Promise<import('mongodb').InsertOneResult>} Resultado de la inserción
 */
async function crearItemPallet(itemPalletsCollection, dataItem) {
    try {
        const resultado = await itemPalletsCollection.insertOne(dataItem);
        return resultado;
    } catch (error) {
        console.error(`      ❌ Error creando item pallet:`, error.message);
        throw error;
    }
}


async function main() {
    try {
        // Conectar a la base de datos
        const database = await connectProcesoDB();

        // Aquí puedes trabajar con tus colecciones
        // Ejemplo: obtener una colección
        const collection = database.collection('contenedors');
        const pallets = database.collection('pallets');
        const itemPallets = database.collection('itempallets');

        // Ejemplo: hacer una consulta
        const documentos = await collection.find({}).toArray();
        console.log('📄 Documentos encontrados:', documentos.length);

        let palletsOmitidos = 0;
        let itemsCreados = 0;

        for (const doc of documentos) {
            console.log(`\n🔍 Procesando contenedor: ${doc._id}`);
            console.log(`   Cantidad de pallets: ${doc.cantidadPallets || 0}`);
            console.log(`   Tiene array pallets: ${doc.pallets ? 'Sí' : 'No'}`);
            
            if (doc.pallets) {
                console.log(`   Longitud array pallets: ${doc.pallets.length}`);
            }

            // Usar la longitud del array pallets en lugar de cantidadPallets
            const totalPallets = doc.pallets?.length || 0;

            if (totalPallets === 0) {
                console.log(`   ⚠️  No hay pallets para procesar`);
                palletsOmitidos++;
                continue;
            }

            for (let i = 0; i < totalPallets; i++) {
                const pallet = doc.pallets[i];
                
                if (!pallet) {
                    console.log(`   ⚠️  Pallet ${i} no existe en el array, omitiendo...`);
                    palletsOmitidos++;
                    continue;
                }

                const nuevoPallet = {
                    numeroPallet: i + 1,
                    contenedor: doc._id,
                    tipoCaja: pallet.settings?.tipoCaja || null,
                    calidad: pallet.settings?.calidad || null,
                    calibre: pallet.settings?.calibre || null,
                    rotulado: pallet.listaLiberarPallet?.rotulado || null,
                    paletizado: pallet.listaLiberarPallet?.paletizado || null,
                    enzunchado: pallet.listaLiberarPallet?.enzunchado || null,
                    estadoCajas: pallet.listaLiberarPallet?.estadoCajas || null,
                    estiba: pallet.listaLiberarPallet?.estiba || null,
                    finalizado: true,
                    user: "66c4ca415aa7698f46d4aa12",
                    createdAt: new Date(),
                };

                // Crear el pallet en la colección
                const resultadoPallet = await crearPallet(pallets, nuevoPallet);
                const palletId = resultadoPallet.insertedId;

                // Procesar todos los items del pallet (EF1, EF2, EF3, etc.)
                for (const key in pallet) {
                    // Solo procesar las propiedades que sean arrays de items (EF1, EF2, etc.)
                    if (key.startsWith('EF') && Array.isArray(pallet[key])) {
                        for (const item of pallet[key]) {
                            if (!item || !item.lote) continue;

                            const nuevoItem = {
                                pallet: palletId,
                                contenedor: new ObjectId(doc._id),
                                lote: new ObjectId(item.lote),
                                tipoCaja: item.tipoCaja || null,
                                calibre: item.calibre || null,
                                calidad: item.calidad ? new ObjectId(item.calidad) : null,
                                fecha: item.fecha ? new Date(item.fecha) : new Date(),
                                tipoFruta: item.tipoFruta ? new ObjectId(item.tipoFruta) : null,
                                SISPAP: item.SISPAP || false,
                                GGN: item.GGN || false,
                                user: "66c4ca415aa7698f46d4aa12",
                                cajas: item.cajas || 0,
                                kilos: item.tipoCaja.split('-')[1] ? parseFloat(item.tipoCaja.split('-')[1]) * (item.cajas || 0) : 0,
                            };

                            await crearItemPallet(itemPallets, nuevoItem);
                            itemsCreados++;
                        }
                    }
                }
                
            }
        }
        
        console.log('\n📊 Resumen del proceso:');
        console.log(`   📦 Items de pallet creados: ${itemsCreados}`);
        console.log(`   ⚠️  Pallets omitidos: ${palletsOmitidos}`);
        console.log('✅ Proceso completado exitosamente');

        // Ejemplo: actualizar documentos
        // const resultadoUpdate = await collection.updateMany(
        //   { condicion: 'valor' },
        //   { $set: { campo: 'nuevo_valor' } }
        // );
        // console.log('✅ Documentos actualizados:', resultadoUpdate.modifiedCount);

    } catch (error) {
        console.error('❌ Error en el proceso:', error.message);
        process.exit(1);
    } finally {
        // Cerrar la conexión al finalizar
        await closeConnection();
    }
}

// Ejecutar el script
main();
