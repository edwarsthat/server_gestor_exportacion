/**
 * @file Script para modificar el campo pallets de array a número y tipoFruta/calidad a ObjectIds
 * @description Convierte el array pallets en su longitud (número) y convierte tipoFruta/calidad a ObjectIds
 */

import { MongoClient, ObjectId } from 'mongodb';
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

/**
 * Convierte un valor (string o array de strings) a ObjectId
 * @param {*} value - Valor a convertir
 * @returns {ObjectId|ObjectId[]|null} ObjectId o array de ObjectIds
 */
function convertirAObjectId(value) {
    if (!value) return null;
    
    // Si es un array
    if (Array.isArray(value)) {
        return value.map(item => {
            // Si ya es ObjectId, devolverlo tal cual
            if (item instanceof ObjectId) return item;
            // Si es string válido de 24 caracteres hex, convertir
            if (typeof item === 'string' && /^[0-9a-fA-F]{24}$/.test(item)) {
                return new ObjectId(item);
            }
            // Si ya es un objeto con _bsontype, devolverlo
            if (item && item._bsontype === 'ObjectID') return item;
            return item;
        });
    }
    
    // Si es un solo valor
    if (value instanceof ObjectId) return value;
    if (typeof value === 'string' && /^[0-9a-fA-F]{24}$/.test(value)) {
        return new ObjectId(value);
    }
    if (value && value._bsontype === 'ObjectID') return value;
    
    return value;
}

async function main() {
    try {
        // Conectar a la base de datos
        const database = await connectProcesoDB();

        // Obtener la colección de contenedores
        const collection = database.collection('contenedors');

        console.log('\n📊 Buscando documentos para procesar...\n');

        // Buscar todos los documentos (no solo los que tienen pallets como array)
        const documentos = await collection.find({}).toArray();

        console.log(`📦 Total de documentos encontrados: ${documentos.length}\n`);

        if (documentos.length === 0) {
            console.log('✅ No hay documentos para procesar');
            return;
        }

        let actualizados = 0;
        let errores = 0;
        let modificadosPallets = 0;
        let modificadosTipoFruta = 0;
        let modificadosCalidad = 0;

        // Procesar cada documento
        for (const doc of documentos) {
            try {
                console.log(`📝 Contenedor ID: ${doc._id}`);

                // Preparar objeto de actualización
                const updateObject = {};
                let hayActualizaciones = false;

                // 1. Convertir pallets de array a número si es necesario
                if (Array.isArray(doc.pallets)) {
                    const longitudArray = doc.pallets.length;
                    updateObject.pallets = longitudArray;
                    console.log(`   🔄 Convirtiendo pallets array a número: ${longitudArray}`);
                    modificadosPallets++;
                    hayActualizaciones = true;
                }

                // 2. Verificar y convertir tipoFruta en infoContenedor
                if (doc.infoContenedor?.tipoFruta) {
                    const tipoFrutaOriginal = doc.infoContenedor.tipoFruta;
                    
                    // Verificar si tiene elementos que no son ObjectId
                    let necesitaConversion = false;
                    if (Array.isArray(tipoFrutaOriginal)) {
                        necesitaConversion = tipoFrutaOriginal.some(item => {
                            return typeof item === 'string' || (item && !item._bsontype && !(item instanceof ObjectId));
                        });
                    }
                    
                    if (necesitaConversion) {
                        const tipoFrutaConvertido = convertirAObjectId(tipoFrutaOriginal);
                        updateObject['infoContenedor.tipoFruta'] = tipoFrutaConvertido;
                        console.log(`   🔄 Convirtiendo tipoFruta a ObjectIds (${tipoFrutaConvertido.length} elementos)`);
                        modificadosTipoFruta++;
                        hayActualizaciones = true;
                    }
                }

                // 3. Verificar y convertir calidad en infoContenedor
                if (doc.infoContenedor?.calidad) {
                    const calidadOriginal = doc.infoContenedor.calidad;
                    
                    // Verificar si tiene elementos que no son ObjectId
                    let necesitaConversion = false;
                    if (Array.isArray(calidadOriginal)) {
                        necesitaConversion = calidadOriginal.some(item => {
                            return typeof item === 'string' || (item && !item._bsontype && !(item instanceof ObjectId));
                        });
                    }
                    
                    if (necesitaConversion) {
                        const calidadConvertida = convertirAObjectId(calidadOriginal);
                        updateObject['infoContenedor.calidad'] = calidadConvertida;
                        console.log(`   🔄 Convirtiendo calidad a ObjectIds (${calidadConvertida.length} elementos)`);
                        modificadosCalidad++;
                        hayActualizaciones = true;
                    }
                }

                // Solo actualizar si hay cambios
                if (hayActualizaciones) {
                    console.log(`   ⚙️  Actualizando documento...`);

                    // Actualizar el documento
                    const resultado = await collection.updateOne(
                        { _id: doc._id },
                        { $set: updateObject }
                    );

                    if (resultado.modifiedCount > 0) {
                        console.log(`   ✅ Actualizado correctamente\n`);
                        actualizados++;
                    } else {
                        console.log(`   ⚠️  No se modificó\n`);
                    }
                } else {
                    console.log(`   ℹ️  No requiere actualizaciones\n`);
                }

            } catch (error) {
                console.error(`   ❌ Error procesando ${doc._id}:`, error.message);
                console.error(error);
                errores++;
            }
        }

        console.log('\n' + '='.repeat(60));
        console.log('📊 RESUMEN DE LA MIGRACIÓN');
        console.log('='.repeat(60));
        console.log(`Total documentos procesados: ${documentos.length}`);
        console.log(`Actualizados exitosamente: ${actualizados}`);
        console.log(`Modificados pallets (array → número): ${modificadosPallets}`);
        console.log(`Modificados tipoFruta (string → ObjectId): ${modificadosTipoFruta}`);
        console.log(`Modificados calidad (string → ObjectId): ${modificadosCalidad}`);
        console.log(`Errores: ${errores}`);
        console.log('='.repeat(60) + '\n');

        // Verificaciones finales
        console.log('🔍 Verificando conversiones...\n');
        
        const verificacionPallets = await collection.countDocuments({
            pallets: { $type: 'array' }
        });

        if (verificacionPallets === 0) {
            console.log('✅ Verificación pallets: Ya no hay arrays en pallets');
        } else {
            console.log(`⚠️  Advertencia: Aún quedan ${verificacionPallets} documentos con pallets como array`);
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
