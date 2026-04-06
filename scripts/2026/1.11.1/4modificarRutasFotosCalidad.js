/**
 * @file Script para migrar rutas de calidad.fotosCalidad
 * @description Reemplaza el prefijo /opt/enterprise-projects/sistema-operativo/fotos_frutas/
 * por calidad/fotosCalidad/ en todos los lotes que tengan el campo calidad.fotosCalidad
 */

import { MongoClient } from 'mongodb';
import config from '../../../src/config/index.js';

const { MONGODB_PROCESO } = config;

let client = null;
let db = null;


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

const OLD_PREFIX = '/opt/enterprise-projects/backend/sistema-operativo/fotos_frutas/';
const NEW_PREFIX = 'calidad/fotosCalidad/';

async function main() {
    try {
        const database = await connectProcesoDB();
        const lotesCollection = database.collection('lotes');

        const lotes = await lotesCollection.find(
            { 'calidad.fotosCalidad': { $exists: true } },
            { projection: { _id: 1, 'calidad.fotosCalidad': 1 } }
        ).toArray();

        console.log(`Lotes encontrados con calidad.fotosCalidad: ${lotes.length}`);

        let actualizados = 0;
        let sinCambios = 0;

        for (const lote of lotes) {
            const fotosCalidad = lote.calidad.fotosCalidad;
            const nuevasFotos = {};
            let modificado = false;

            for (const [key, value] of Object.entries(fotosCalidad)) {
                if (typeof value === 'string' && value.startsWith(OLD_PREFIX)) {
                    const nombre = value.slice(OLD_PREFIX.length);
                    console.log(nombre)
                    nuevasFotos[key] = `${NEW_PREFIX}${nombre}`;
                    modificado = true;
                } else {
                    nuevasFotos[key] = value;
                }
            }

            if (modificado) {
                await lotesCollection.updateOne(
                    { _id: lote._id },
                    { $set: { 'calidad.fotosCalidad': nuevasFotos } }
                );
                actualizados++;
            } else {
                sinCambios++;
            }
        }

        console.log(`Lotes actualizados: ${actualizados}`);
        console.log(`Lotes sin cambios: ${sinCambios}`);

    } catch (error) {
        console.error('Error en el proceso:', error.message);
        console.error(error);
        process.exit(1);
    } finally {
        await closeConnection();
    }
}

main();
