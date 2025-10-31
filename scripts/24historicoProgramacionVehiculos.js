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



async function main() {
    try {
        // Conectar a la base de datos
        const database = await connectProcesoDB();

        // Obtener colecciones
        const contenedors = database.collection('contenedors');
        const salidavehiculos = database.collection('salidavehiculos');
        const serialColl = database.collection('seriales');

        // Obtener todos los contenedores
        const contenedorsDocs = await contenedors.find({}).toArray();
        const serialDocs = await serialColl.find({name:"RVS-"}).toArray();
        let { name, serial } = serialDocs[0];
        console.log('📄 Contenedores encontrados:', contenedorsDocs.length);

        let registrosCreados = 0;

        for (const contenedor of contenedorsDocs) {
            if(!contenedor.infoTractoMula) continue;
            const codigo = name + serial.toString();
            const infoTractoMula = contenedor.infoTractoMula;

            const newRegistro = {
                ...infoTractoMula,
                contenedor: contenedor._id,
                tipoVehiculo: "Tractomula",
                tipoSalida: "Exportacion",
                codigo: codigo
            };

            if(contenedor.entregaPrecinto){
                newRegistro.entregaPrecinto = contenedor.entregaPrecinto;
            }

            // Crear registro en salidavehiculos
            await salidavehiculos.insertOne(newRegistro);
            console.log(`✅ Registro creado: ${codigo}`);
            
            registrosCreados++;
            serial++;
        }

        // Actualizar el serial en la colección de seriales
        await serialColl.updateOne(
            { name: "RVS-" },
            { $set: { serial: serial } }
        );

        console.log(`\n📊 Resumen:`);
        console.log(`   - Registros creados: ${registrosCreados}`);
        console.log(`   - Nuevo serial guardado: ${serial}`);



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
