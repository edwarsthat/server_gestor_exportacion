/**
 * @file Script para normalizar lista de empaque usando MongoDB nativo
 * @description Conexión directa a la base de datos 'proceso' sin Mongoose
 */

import { MongoClient } from 'mongodb';
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
 * Obtiene el multiplicador de kilos según el tipo de caja
 * @param {string} tipoCaja - Tipo de caja (ej: "Caja-4.5")
 * @returns {number} Multiplicador de kilos
 */
function obtenerMultiplicador(tipoCaja) {
    const s = tipoCaja == null ? "" : String(tipoCaja);
    const i = s.lastIndexOf("-");
    const m = i >= 0 ? Number(s.slice(i + 1)) : NaN;
    return Number.isFinite(m) && m > 0 ? m : 1;
}

/**
 * Calcula la información de salida de exportación basada en los items de pallets
 * @param {Array} itemPallets - Items de pallets del lote
 * @param {boolean} loteGGN - Si el lote tiene certificación GGN
 * @returns {Object} Datos de salidaExportacion
 */

async function main() {
    try {
        // Conectar a la base de datos
        const database = await connectProcesoDB();

        // Obtener colecciones
        const collection = database.collection('contenedors');

        console.log('\n📊 Buscando documentos con pallets como array...\n');

        // Buscar todos los documentos donde pallets es un array
        const documentos = await collection.find({
            pallets: { $type: 'array' }
        }).toArray();

        console.log(`📦 Total de documentos encontrados: ${documentos.length}\n`);

        if (documentos.length === 0) {
            console.log('✅ No hay documentos con pallets como array');
            return;
        }

        const parseMult = {};
        let actualizados = 0;
        let errores = 0;

        // Procesar cada documento
        for (const cont of documentos) {
            try {
                let totalKilos = 0;
                let totalCajas = 0;

                console.log(`📝 Contenedor ID: ${cont._id}`);
                console.log(`   Número de pallets: ${cont.pallets.length}`);

                // Recorrer cada pallet del contenedor
                for (const pallet of cont.pallets) {
                    // Verificar si existe EF1 (items del pallet)
                    if (pallet.EF1 && Array.isArray(pallet.EF1)) {
                        for (const item of pallet.EF1) {
                            const cajasItem = item.cajas || 0;
                            const tipoCaja = item.tipoCaja || '';

                            // Calcular multiplicador si no está en cache
                            if (!parseMult[tipoCaja]) {
                                parseMult[tipoCaja] = obtenerMultiplicador(tipoCaja);
                            }

                            const mult = parseMult[tipoCaja];
                            const kilosItem = cajasItem * mult;

                            totalKilos += kilosItem;
                            totalCajas += cajasItem;
                        }
                    }
                }

                console.log(`   Total Kilos calculados: ${totalKilos.toFixed(2)}`);
                console.log(`   Total Cajas calculadas: ${totalCajas}`);

                // Actualizar el documento con los totales calculados
                const resultado = await collection.updateOne(
                    { _id: cont._id },
                    {
                        $set: {
                            totalKilos: totalKilos,
                            totalCajas: totalCajas
                        }
                    }
                );

                if (resultado.modifiedCount > 0) {
                    console.log(`   ✅ Actualizado correctamente\n`);
                    actualizados++;
                } else {
                    console.log(`   ⚠️  No se modificó (valores ya existentes)\n`);
                }

            } catch (error) {
                console.error(`   ❌ Error procesando contenedor ${cont._id}:`, error.message);
                errores++;
            }
        }

        console.log('\n' + '='.repeat(60));
        console.log('📊 RESUMEN DE LA ACTUALIZACIÓN');
        console.log('='.repeat(60));
        console.log(`Total documentos procesados: ${documentos.length}`);
        console.log(`Actualizados exitosamente: ${actualizados}`);
        console.log(`Errores: ${errores}`);
        console.log('='.repeat(60) + '\n');

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
