/**
 * @file Script para normalizar lista de empaque usando MongoDB nativo
 * @description Conexión directa a la base de datos 'proceso' sin Mongoose
 */

import { MongoClient, ObjectId } from 'mongodb';
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
        const itemsPallet = database.collection('itempallets');
        const indicadores = database.collection('indicadores');
        const recordLotes = database.collection('recordlotes');
        const lotes = database.collection('lotes');


        const cursor = await indicadores.find().toArray();

        const tipoFruta = {
            "686e6b450c34dee069775d4e": "Limon",
            "686e6b940c34dee069775d4f": "Naranja",
            "6877f45ae35ac9d2a0ab08e4": "Mandarina",
        }

        console.log(`📊 Total de indicadores encontrados desde el 20 de octubre de 2025: ${cursor.length}`);

        for (const indicador of cursor) {
            // Ajustar fecha con offset de Colombia (UTC-5, sumar 5 horas)
            const fechaIndicador = new Date(indicador.fecha_creacion);
            fechaIndicador.setHours(fechaIndicador.getHours() + 5);

            // Calcular inicio y fin del día en Colombia
            const inicioDia = new Date(fechaIndicador);
            inicioDia.setHours(0, 0, 0, 0);
            inicioDia.setHours(inicioDia.getHours() - 5); // Restar 5 horas para convertir a UTC

            const finDia = new Date(fechaIndicador);
            finDia.setHours(23, 59, 59, 999);
            finDia.setHours(finDia.getHours() - 5); // Restar 5 horas para convertir a UTC

            const items = await itemsPallet.find({
                fecha: {
                    $gte: inicioDia,
                    $lte: finDia
                }
            }).toArray();

            const records = await recordLotes.find({
                createdAt: {
                    $gte: inicioDia,
                    $lte: finDia
                },
                operacionRealizada: "vaciarLote"
            }).toArray();

            const totalexportacion = {}
            const totalProcesado = {}

            for (const item of items) {
                if (!totalexportacion[item.tipoFruta.toString()]) {
                    totalexportacion[item.tipoFruta.toString()] = {};
                }
                if (!totalexportacion[item.tipoFruta.toString()][item.calidad.toString()]) {
                    totalexportacion[item.tipoFruta.toString()][item.calidad.toString()] = {};
                }
                if (!totalexportacion[item.tipoFruta.toString()][item.calidad.toString()][item.calibre]) {
                    totalexportacion[item.tipoFruta.toString()][item.calidad.toString()][item.calibre] = 0;
                }
                totalexportacion[item.tipoFruta.toString()][item.calidad.toString()][item.calibre] += item.kilos;
            }

            for (const item of records) {
                console.log(item._id );

                const lote = await lotes.findOne({ _id: new ObjectId(item.documento._id) });
                if(!totalProcesado[tipoFruta[lote.tipoFruta.toString()]]) {
                    totalProcesado[tipoFruta[lote.tipoFruta.toString()]] = 0;
                }
                totalProcesado[tipoFruta[lote.tipoFruta.toString()]] += item.documento.$inc.kilosVaciados;
            }
            console.log(totalexportacion);
            // Actualizar el indicador con los nuevos datos
            await indicadores.updateOne(
                { _id: indicador._id },
                { $set: { 
                    kilos_exportacion: totalexportacion,
                    kilos_procesados: totalProcesado
                } }
            );

            console.log(`✅ Indicador ${indicador._id} actualizado con kilos_exportacion.`);
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
