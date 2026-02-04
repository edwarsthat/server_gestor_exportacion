/**
 * @file Script para convertir campo user de String a ObjectId
 * @description Convierte el campo user de tipo String a ObjectId en lotes, loteef8 y lotemaquila
 */

import { MongoClient } from 'mongodb';
import config from '../../../src/config/index.js';
import fs from 'fs';
import { parse } from 'csv-parse/sync';

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

function leerCSV(rutaArchivo) {
    const fileContent = fs.readFileSync(rutaArchivo, 'utf-8');

    const records = parse(fileContent, {
        columns: true,           // Primera línea como encabezados
        skip_empty_lines: true,  // Saltar líneas vacías
        trim: true,              // Quitar espacios en blanco
        cast: true,              // Convertir tipos automáticamente
        relax_quotes: true       // Más tolerante con comillas
    });

    return records;
}

function convertirAccesoTotal(accesoString) {
    if (!accesoString) return [];

    try {
        // Si ya es un array, retornarlo
        if (Array.isArray(accesoString)) {
            return accesoString;
        }

        // Limpiar espacios y parsear
        const parsed = JSON.parse(accesoString.trim());
        return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
        console.warn('Error parseando acceso:', accesoString, error);
        return [];
    }
}

async function main() {
    try {
        // Conectar a la base de datos
        const database = await connectProcesoDB();

        // Obtener colecciones
        const areasCollection = database.collection('areasfisicas');

        const registros = leerCSV('scripts/2026/1.9.1/Credenciales.csv');
        const areasUnicas = new Set();

        console.log('📦 Procesando registros del CSV...');

        for (const registro of registros) {
            // Ignorar registros sin nombre o con marcas de error/libres
            if (!registro.Nombre || registro.Nombre.includes('LIBRE') || registro.Nombre.includes('DESTRUCCION') || registro.Nombre.includes('USADO')) {
                continue;
            }

            // Recolectar Áreas de Acceso Total
            const accesos = convertirAccesoTotal(registro["Acceso Total"]);
            accesos.forEach(acceso => {
                if (acceso) areasUnicas.add(acceso.trim());
            });

            // Recolectar Áreas de Acceso Parcial (opcional, pero recomendado)
            const accesosParciales = convertirAccesoTotal(registro["Acceso Parcial"]);
            accesosParciales.forEach(acceso => {
                if (acceso) areasUnicas.add(acceso.trim());
            });
        }

        // --- MIGRACIÓN DE ÁREAS ---
        if (areasUnicas.size > 0) {
            console.log(`🌐 Sincronizando ${areasUnicas.size} áreas físicas...`);
            const opAreas = Array.from(areasUnicas).map(nombre => ({
                updateOne: {
                    filter: { nombre, sede: "Sede Principal" },
                    update: { $setOnInsert: { nombre, sede: "Sede Principal" } },
                    upsert: true
                }
            }));
            const resAreas = await areasCollection.bulkWrite(opAreas);
            console.log(`✅ Áreas: ${resAreas.upsertedCount} creadas, ${resAreas.matchedCount} ya existían.`);
        }


        console.log('🏁 Migración de tablas maestras finalizada con éxito.');

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

