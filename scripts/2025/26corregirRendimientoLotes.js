/**
 * @file Script para normalizar lista de empaque usando MongoDB nativo
 * @description Conexión directa a la base de datos 'proceso' sin Mongoose
 */

import { MongoClient } from 'mongodb';
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



async function main() {
    try {
        // Conectar a la base de datos
        const database = await connectProcesoDB();

        // Obtener colecciones
        const lotes = database.collection('lotes');

        // Obtener todos los lotes
        const lotesDocs = await lotes.find({}).toArray();
        console.log('📄 Lotes encontrados:', lotesDocs.length);

        let lotesActualizados = 0;
        let lotesOmitidos = 0;
        let erroresEncontrados = 0;

        console.log('\n🔄 Iniciando procesamiento de lotes...\n');

        for (const lote of lotesDocs) {
            try {

                const { kilosVaciados, salidaExportacion, rendimiento } = lote;
                const newRendimiento = kilosVaciados === 0 ? 0 : ((salidaExportacion.totalKilos * 100) / kilosVaciados);

                if (rendimiento !== newRendimiento) {
                    // Actualizar el lote con el nuevo rendimiento
                    const resultado = await lotes.updateOne(
                        { _id: lote._id },
                        { $set: { rendimiento: newRendimiento } }
                    );


                    if (resultado.modifiedCount === 1) {
                        console.log(`   ✅ Lote ${lote._id} actualizado. Nuevo rendimiento: ${rendimiento.toFixed(2)}%`);
                        lotesActualizados++;
                    } else {
                        console.log(`   ⏭️  Lote ${lote._id} no requiere actualización.`);
                        lotesOmitidos++;
                    }
                } else {
                    console.log(`   ⏭️  Lote ${lote._id} ya tiene el rendimiento correcto.`);
                    lotesOmitidos++;
                }

            } catch (error) {
                console.error(`   ❌ Error procesando lote ${lote._id}:`, error.message);
                erroresEncontrados++;
            }
        }

        console.log('\n✅ Proceso completado exitosamente');
        console.log('📊 Resumen de lotes procesados:');
        console.log(`   ✅ Lotes actualizados: ${lotesActualizados}`);
        console.log(`   ⏭️  Lotes omitidos: ${lotesOmitidos}`);
        console.log(`   ❌ Errores encontrados: ${erroresEncontrados}`);

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
