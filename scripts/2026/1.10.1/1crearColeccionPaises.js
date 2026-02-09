/**
 * @file Script para crear e insertar países en la colección pais
 * @description Inserta los países desde paisesEXP.json normalizando los nombres
 */

import { MongoClient } from 'mongodb';
import { readFile } from 'fs/promises';
import config from '../../../src/config/index.js';

const { MONGODB_PROCESO } = config;

let client = null;
let db = null;

function normalizarNombre(nombre) {
    return nombre
        .trim()
        .toLowerCase()
        .split(/\s+/)
        .map(palabra => palabra.charAt(0).toUpperCase() + palabra.slice(1))
        .join(' ');
}

async function connectProcesoDB() {
    try {
        if (db) {
            console.log('Ya existe una conexion activa a la base de datos proceso');
            return db;
        }

        console.log('Conectando a la base de datos proceso...');

        client = new MongoClient(MONGODB_PROCESO, {
            serverSelectionTimeoutMS: 5000,
            socketTimeoutMS: 45000,
        });

        await client.connect();
        await client.db().admin().ping();
        console.log('Conectado exitosamente a la base de datos proceso');

        db = client.db();
        return db;
    } catch (error) {
        console.error('Error conectando a la base de datos:', error.message);
        throw error;
    }
}

async function closeConnection() {
    try {
        if (client) {
            await client.close();
            client = null;
            db = null;
            console.log('Conexion cerrada correctamente');
        }
    } catch (error) {
        console.error('Error cerrando la conexion:', error.message);
        throw error;
    }
}

async function main() {
    try {
        const rawData = await readFile(
            new URL('../../../constants/paisesEXP.json', import.meta.url),
            'utf-8'
        );
        const paises = JSON.parse(rawData);

        const database = await connectProcesoDB();
        const paisesCollection = database.collection('pais');

        const documentos = paises.map((nombre, index) => ({
            nombre: normalizarNombre(nombre),
            codigo: String(index + 1).padStart(3, '0'),
            activo: true,
        }));

        console.log('Paises a insertar:');
        documentos.forEach(doc => console.log(`  - ${doc.codigo}: ${doc.nombre}`));

        const result = await paisesCollection.insertMany(documentos);
        console.log(`Se insertaron ${result.insertedCount} paises correctamente.`);

    } catch (error) {
        console.error('Error en el proceso:', error.message);
        console.error(error);
        process.exit(1);
    } finally {
        await closeConnection();
    }
}

main();
