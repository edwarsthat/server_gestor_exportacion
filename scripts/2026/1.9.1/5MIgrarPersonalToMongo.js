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


async function main() {
    try {
        // Conectar a la base de datos
        const database = await connectProcesoDB();

        // Obtener colecciones
        const cargosCollection = database.collection('cargospersonals');
        const personalCollection = database.collection('personals');


        const cargosArray = await cargosCollection.find().toArray();
        const cargosMap = new Map(cargosArray.map(cargo => [cargo.nombre, cargo]));


        const registros = leerCSV('scripts/2026/1.9.1/Credenciales.csv');
        const personalMap = new Map();
        console.log('📦 Procesando registros del CSV...');

        console.log(registros[0])
        console.log(Object.keys(registros[0]))


        for (const registro of registros) {
            // Ignorar registros sin nombre o con marcas de error/libres
            if (!registro.Nombre || registro.Nombre.includes('LIBRE') || registro.Nombre.includes('DESTRUCCION') || registro.Nombre.includes('USADO')) {
                continue;
            }

            const identificacion = registro["Identificación"];
            const llaves = Object.keys(registro);
            const sku = registro[llaves[0]];


            if (!personalMap.has(identificacion)) {
                personalMap.set(identificacion, {
                    SKU: sku,
                    nombre: registro.Nombre,
                    cargo: cargosMap.get(registro.Cargo)._id,
                    identificacion: identificacion,
                    tipoDocumento: "Cedula",
                    foto: null,
                    tipoSangre: registro["Tipo de Sangre"],
                    urlIdentificacion: null,
                    urlFotoCarnet: null,
                    estado: true,
                    carnet: null
                });
            }
        }

        const personalArray = Array.from(personalMap.values());
        console.log(personalArray)

        // --- MIGRACIÓN DE PERSONAL ---
        if (personalArray.length > 0) {
            console.log(`🌐 Sincronizando ${personalArray.length} personal...`);
            const opPersonal = Array.from(personalArray).map(personal => ({
                updateOne: {
                    filter: { nombre: personal.nombre },
                    update: { $setOnInsert: { SKU: personal.SKU, nombre: personal.nombre, cargo: personal.cargo, identificacion: personal.identificacion, tipoDocumento: personal.tipoDocumento, foto: personal.foto, tipoSangre: personal.tipoSangre, urlIdentificacion: personal.urlIdentificacion, urlFotoCarnet: personal.urlFotoCarnet, estado: personal.estado, carnet: personal.carnet } },
                    upsert: true
                }
            }));
            const resPersonal = await personalCollection.bulkWrite(opPersonal);
            console.log(`✅ Personal: ${resPersonal.upsertedCount} creados, ${resPersonal.matchedCount} ya existían.`);
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

