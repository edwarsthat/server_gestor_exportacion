/**
 * @file Script para colapsar todos los paises de la Union Europea a un solo id en proveedores
 * @description En la coleccion proveedors, dentro del array GGN.paises, reemplaza cualquiera
 *              de los ids de la UE (699daaa6221afb642c1012fd, 699daaa6221afb642c10130f) por
 *              699daaa6221afb642c101309 y elimina duplicados resultantes.
 */

import { MongoClient, ObjectId } from 'mongodb';
import config from '../../../src/config/index.js';

const { MONGODB_PROCESO } = config;

// Id destino al que se colapsa toda la UE
const ID_UE = new ObjectId('699daaa6221afb642c101309');
// Ids de la UE que deben colapsarse hacia ID_UE
const IDS_A_COLAPSAR = [
    new ObjectId('699daaa6221afb642c1012fd'),
    new ObjectId('699daaa6221afb642c10130f'),
];

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

        // Obtener coleccion
        const proveedoresCollection = database.collection('proveedors');

        // Colapsa cualquier id de la UE a ID_UE y deduplica con $setUnion
        const result = await proveedoresCollection.updateMany(
            { 'GGN.paises': { $in: IDS_A_COLAPSAR } },
            [
                {
                    $set: {
                        'GGN.paises': {
                            $setUnion: [
                                {
                                    $map: {
                                        input: '$GGN.paises',
                                        as: 'p',
                                        in: {
                                            $cond: [
                                                { $in: ['$$p', IDS_A_COLAPSAR] },
                                                ID_UE,
                                                '$$p',
                                            ],
                                        },
                                    },
                                },
                                [],
                            ],
                        },
                    },
                },
            ]
        );

        console.log(`✅ Documentos coincidentes: ${result.matchedCount} | Modificados: ${result.modifiedCount}`);

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
