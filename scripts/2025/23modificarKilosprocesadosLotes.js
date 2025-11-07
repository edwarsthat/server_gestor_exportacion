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
                let total = 0;
                const { descarteLavado, descarteEncerado, salidaExportacion, frutaNacional, directoNacional, kilos } = lote;

                if (!kilos || kilos === 0) {
                    console.log(`⏭️  Lote ${lote._id} omitido (kilos = ${kilos || 0})`);
                    lotesOmitidos++;
                    continue;
                }

                console.log(`\n📦 Procesando Lote ${lote._id}:`);
                console.log(`   Kilos originales: ${kilos} kg`);

                if (descarteLavado && Object.keys(descarteLavado).length > 0) {
                    const descarteL = Object.values(descarteLavado).reduce((acc, val) => acc + (val || 0), 0);
                    total += descarteL;
                    console.log(`   Descarte lavado: ${descarteL.toFixed(2)} kg`);
                }
                if (descarteEncerado && Object.keys(descarteEncerado).length > 0) {
                    const descarteE = Object.values(descarteEncerado).reduce((acc, val) => acc + (val || 0), 0);
                    total += descarteE;
                    console.log(`   Descarte encerado: ${descarteE.toFixed(2)} kg`);
                }

                if (frutaNacional) {
                    total += frutaNacional || 0;
                    console.log(`   Fruta nacional: ${frutaNacional.toFixed(2)} kg`);
                }
                if (directoNacional) {
                    total += directoNacional || 0;
                    console.log(`   Directo nacional: ${directoNacional.toFixed(2)} kg`);
                }

                if (salidaExportacion && salidaExportacion.totalKilos) {
                    total += salidaExportacion.totalKilos || 0;
                    console.log(`   Salida exportación: ${salidaExportacion.totalKilos.toFixed(2)} kg`);
                }

                const deshidratacion = parseFloat((100 - (total * 100 / kilos)).toFixed(2));
                const kilosProcesados = parseFloat(total.toFixed(2));

                console.log(`   ➡️  Kilos procesados: ${kilosProcesados} kg`);
                console.log(`   💧 Deshidratación: ${deshidratacion}%`);

                await lotes.updateOne(
                    { _id: lote._id },
                    { $set: { deshidratacion, kilosProcesados } }
                );

                lotesActualizados++;
                console.log(`   ✅ Actualizado correctamente`);

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
