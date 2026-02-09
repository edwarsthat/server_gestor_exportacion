/**
 * @file Script para migrar PAIS_DESTINO de clientes de strings a ObjectId
 * @description Lee el array de strings de PAIS_DESTINO de cada cliente, normaliza los nombres,
 * busca el _id correspondiente en la colección pais y actualiza el campo con el nuevo formato
 */

import { MongoClient } from 'mongodb';
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
        const database = await connectProcesoDB();
        const paisesCollection = database.collection('pais');
        const clientesCollection = database.collection('clientes');

        // Obtener todos los paises y crear un mapa nombre(minusculas) -> _id
        const paisesDocs = await paisesCollection.find({}).toArray();
        const paisesMap = new Map();
        paisesDocs.forEach(pais => {
            paisesMap.set(pais.nombre.trim().toLowerCase(), pais._id);
        });

        console.log(`Se encontraron ${paisesDocs.length} paises en la coleccion`);
        console.log('Mapa de paises cargado:');
        paisesMap.forEach((id, nombre) => console.log(`  "${nombre}" -> ${id}`));

        // Obtener todos los clientes que tienen PAIS_DESTINO
        const clientes = await clientesCollection.find({ PAIS_DESTINO: { $exists: true } }).toArray();
        console.log(`\nSe encontraron ${clientes.length} clientes con PAIS_DESTINO`);

        let actualizados = 0;
        const paisesNoEncontrados = new Set();

        for (const cliente of clientes) {
            let paisDestino = cliente.PAIS_DESTINO;

            // Si es un string suelto, convertirlo a array
            if (typeof paisDestino === 'string') {
                paisDestino = [paisDestino];
            }

            // Si no es un array, saltar
            if (!Array.isArray(paisDestino)) {
                console.log(`  Cliente "${cliente.CLIENTE}" PAIS_DESTINO no es array ni string, saltando (tipo: ${typeof paisDestino})`);
                continue;
            }

            // Filtrar solo los elementos que sean strings (ignorar objetos ya migrados)
            const paisesStr = paisDestino.filter(p => typeof p === 'string');

            if (paisesStr.length === 0) {
                console.log(`  Cliente "${cliente.CLIENTE}" no tiene strings en PAIS_DESTINO, saltando`);
                continue;
            }

            console.log(`\n  Cliente: ${cliente.CLIENTE}`);
            console.log(`    PAIS_DESTINO original: ${JSON.stringify(paisesStr)}`);

            const nuevoPaisDestino = [];

            for (const paisStr of paisesStr) {
                const normalizado = paisStr.trim().toLowerCase();
                const paisId = paisesMap.get(normalizado);

                if (paisId) {
                    nuevoPaisDestino.push({
                        codigo: paisId,
                        requiereGGN: false,
                    });
                    console.log(`    "${paisStr}" -> "${normalizado}" -> ENCONTRADO (${paisId})`);
                } else {
                    paisesNoEncontrados.add(paisStr);
                    console.log(`    "${paisStr}" -> "${normalizado}" -> NO ENCONTRADO`);
                }
            }

            console.log(`    Resultado: ${JSON.stringify(nuevoPaisDestino)}`);

            await clientesCollection.updateOne(
                { _id: cliente._id },
                { $set: { PAIS_DESTINO: nuevoPaisDestino } }
            );
            actualizados++;
        }

        console.log(`\nResultados:`);
        console.log(`  Clientes actualizados: ${actualizados}`);
        if (paisesNoEncontrados.size > 0) {
            console.log(`  Paises no encontrados: ${[...paisesNoEncontrados].join(', ')}`);
        }
        console.log('Migracion de PAIS_DESTINO finalizada.');

    } catch (error) {
        console.error('Error en el proceso:', error.message);
        console.error(error);
        process.exit(1);
    } finally {
        await closeConnection();
    }
}

main();
