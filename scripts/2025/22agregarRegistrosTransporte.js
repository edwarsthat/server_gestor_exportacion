/**
 * @file Script para modificar el campo pallets de array a número y tipoFruta/calidad a ObjectIds
 * @description Convierte el array pallets en su longitud (número) y convierte tipoFruta/calidad a ObjectIds
 */

import { MongoClient } from 'mongodb';
import config from '../../src/config/index.js';
import { parseMultTipoCaja } from '../../server/services/helpers/contenedores.js';

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

        // Obtener la colección de itempallets
        const collection = database.collection('itempallets');

        console.log('\n📊 Buscando documentos para procesar...\n');

        // Buscar todos los documentos (no solo los que tienen pallets como array)
        const documentos = await collection.find({}).toArray();

        console.log(`📦 Total de documentos encontrados: ${documentos.length}\n`);

        if (documentos.length === 0) {
            console.log('✅ No hay documentos para procesar');
            return;
        }

        let actualizados = 0;
        let errores = 0;
        let modificadosPallets = 0;
        let modificadosTipoFruta = 0;
        let modificadosCalidad = 0;

        // Procesar cada documento
        for (const doc of documentos) {
            try {
                const { cajas, tipoCaja, kilos } = doc;
                const mult = parseMultTipoCaja(tipoCaja);
                const newKilos = cajas * mult;

                if (newKilos !== kilos) {
                    console.log(`📝 Actualizando ${doc._id}: ${kilos} kg → ${newKilos} kg`);
                    
                    await collection.updateOne(
                        { _id: doc._id },
                        { $set: { kilos: newKilos } }
                    );
                    
                    actualizados++;
                    modificadosCalidad++;
                }

            } catch (error) {
                console.error(`   ❌ Error procesando ${doc._id}:`, error.message);
                console.error(error);
                errores++;
            }
        }

        console.log('\n' + '='.repeat(60));
        console.log('📊 RESUMEN DE LA MIGRACIÓN');
        console.log('='.repeat(60));
        console.log(`Total documentos procesados: ${documentos.length}`);
        console.log(`Actualizados exitosamente: ${actualizados}`);
        console.log(`Modificados pallets (array → número): ${modificadosPallets}`);
        console.log(`Modificados tipoFruta (string → ObjectId): ${modificadosTipoFruta}`);
        console.log(`Modificados calidad (string → ObjectId): ${modificadosCalidad}`);
        console.log(`Errores: ${errores}`);
        console.log('='.repeat(60) + '\n');

        // Verificaciones finales
        console.log('🔍 Verificando conversiones...\n');
        
        const verificacionPallets = await collection.countDocuments({
            pallets: { $type: 'array' }
        });

        if (verificacionPallets === 0) {
            console.log('✅ Verificación pallets: Ya no hay arrays en pallets');
        } else {
            console.log(`⚠️  Advertencia: Aún quedan ${verificacionPallets} documentos con pallets como array`);
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
