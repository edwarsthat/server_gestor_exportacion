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
        const proveedoresCollection = database.collection('proveedors');

        // Obtener todos los paises y crear un mapa nombre(minusculas) -> _id
        const paisesDocs = await paisesCollection.find({}).toArray();
        const paisesMap = new Map();
        paisesDocs.forEach(pais => {
            paisesMap.set(pais.nombre.trim().toLowerCase(), pais._id);
        });

        console.log(paisesMap);
        console.log(`Se encontraron ${paisesDocs.length} paises en la coleccion`);
        console.log('Mapa de paises cargado:');
        paisesMap.forEach((id, nombre) => console.log(`  "${nombre}" -> ${id}`));

        // Obtener todos los clientes que tienen PAIS_DESTINO
        const proveedores = await proveedoresCollection.find({}).toArray();
        console.log(`\nSe encontraron ${proveedores.length} clientes con PAIS_DESTINO`);

        let actualizados = 0;
        const paisesNoEncontrados = new Set();

        for (const proveedor of proveedores) {
            let paisesGGN = proveedor.GGN.paises;
            // Si es un string suelto, convertirlo a array
            if (typeof paisesGGN === 'string') {
                paisesGGN = [paisesGGN];
            }

            // Si no es un array, saltar
            if (!Array.isArray(paisesGGN)) {
                console.log(` no es array ni string, saltando (tipo: ${typeof paisesGGN})`);
                continue;
            }

            if (paisesGGN.length === 0) {
                console.log(`no tiene strings en GGN.paises, saltando`);
                continue;
            }

            console.log(`\n  proveedor: ${proveedor.PREDIO}`);
            console.log(`    original: ${JSON.stringify(paisesGGN)}`);


            const nuevoPaisDestino = [];

            for (const paisStr of paisesGGN) {
                const normalizado = paisStr.trim().toLowerCase();
                const paisId = paisesMap.get(normalizado);

                console.log(paisId);
                console.log(normalizado);

                if (paisId) {
                    nuevoPaisDestino.push(paisId);
                    console.log(`    "${paisStr}" -> "${normalizado}" -> ENCONTRADO (${paisId})`);
                } else {
                    paisesNoEncontrados.add(paisStr);
                    console.log(`    "${paisStr}" -> "${normalizado}" -> NO ENCONTRADO`);
                }
            }

            console.log(`    Resultado: ${JSON.stringify(nuevoPaisDestino)}`);

            await proveedoresCollection.updateOne(
                { _id: proveedor._id },
                { $set: { 'GGN.paises': nuevoPaisDestino } }
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
