/**
 * @file Script para convertir campo user de String a ObjectId
 * @description Convierte el campo user de tipo String a ObjectId en lotes, loteef8 y lotemaquila
 */

import { MongoClient, ObjectId } from 'mongodb';
import config from '../../../src/config/index.js';

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

        // Obtener colecciones (MongoDB pluraliza automáticamente los nombres de modelo)
        const recordlotesCollection = database.collection('recordlotes');
        const loteCollection = database.collection('lotes');
        const frutaProcesadaCollection = database.collection('frutaprocesadas');


        const recordlotes = await recordlotesCollection.find({
            operacionRealizada: "vaciarLote"
        }).toArray();

        const lotesIdsTotal = recordlotes.map(record => new ObjectId(record.documento._id));

        const lotesIds = [...new Set(lotesIdsTotal)];

        const lotes = await loteCollection.find({
            _id: { $in: lotesIds }
        }).toArray();

        console.log(lotes.length);

        // ObjectId por defecto si no se puede convertir el user
        const DEFAULT_USER_ID = new ObjectId("66c757fbaa4aa86aef8ff001");

        // Función helper para convertir user a ObjectId de forma segura
        const convertToObjectId = (userId) => {
            try {
                // Si ya es un ObjectId, devolverlo
                if (userId instanceof ObjectId) {
                    return userId;
                }
                // Si es un string válido, convertirlo
                if (typeof userId === 'string' && ObjectId.isValid(userId)) {
                    return new ObjectId(userId);
                }
                // Si no se puede convertir, usar el default
                return DEFAULT_USER_ID;
            } catch (error) {
                // En caso de cualquier error, usar el default
                return DEFAULT_USER_ID;
            }
        };

        // Array para acumular todos los registros a insertar
        const registrosToInsert = [];

        console.log(`📊 Procesando ${recordlotes.length} records...`);

        for (const record of recordlotes) {
            const lote = lotes.find(lote => lote._id.toString() === record.documento._id.toString());
            if (lote) {
                const newRegistro = {
                    loteId: lote._id,
                    loteType: "Lote",
                    proceso: "Vaceo",
                    tipoFruta: lote.tipoFruta,
                    predio: lote.predio,
                    promedio: lote.promedio,
                    canastillas: Math.round(record.documento.$inc.kilosVaciados / lote.promedio),
                    user: convertToObjectId(record.user),
                    fechaProcesamiento: record.fecha,
                    createdAt: record.createdAt,
                    updatedAt: record.updatedAt
                };

                registrosToInsert.push(newRegistro);
            }
        }

        console.log(`✅ Se crearon ${registrosToInsert.length} registros para insertar`);

        // Insertar todos los registros de una vez
        if (registrosToInsert.length > 0) {
            console.log('💾 Insertando registros en la colección frutaprocesada...');
            const result = await frutaProcesadaCollection.insertMany(registrosToInsert);
            console.log(`✅ Se insertaron ${result.insertedCount} registros exitosamente`);

            // Verificar que realmente se insertaron
            const count = await frutaProcesadaCollection.countDocuments();
            console.log(`📊 Total de documentos en frutaprocesada: ${count}`);

            // Mostrar un ejemplo de los datos insertados
            const sample = await frutaProcesadaCollection.findOne({});
            console.log('📄 Ejemplo de registro insertado:', JSON.stringify(sample, null, 2));
        } else {
            console.log('⚠️ No hay registros para insertar');
        }

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

