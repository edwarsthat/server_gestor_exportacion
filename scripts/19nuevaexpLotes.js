/**
 * @file Script para normalizar lista de empaque usando MongoDB nativo
 * @description Conexión directa a la base de datos 'proceso' sin Mongoose
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
 * Obtiene el multiplicador de kilos según el tipo de caja
 * @param {string} tipoCaja - Tipo de caja (ej: "Caja-4.5")
 * @returns {number} Multiplicador de kilos
 */
function obtenerMultiplicador(tipoCaja) {
    const s = tipoCaja == null ? "" : String(tipoCaja);
    const i = s.lastIndexOf("-");
    const m = i >= 0 ? Number(s.slice(i + 1)) : NaN;
    return Number.isFinite(m) && m > 0 ? m : 1;
}

/**
 * Calcula la información de salida de exportación basada en los items de pallets
 * @param {Array} itemPallets - Items de pallets del lote
 * @param {boolean} loteGGN - Si el lote tiene certificación GGN
 * @returns {Object} Datos de salidaExportacion
 */
function calcularSalidaExportacion(itemPallets, loteGGN = false) {
    const salidaExportacion = {
        kilosGGN: 0,
        totalKilos: 0,
        totalCajas: 0,
        porCalidad: {},
        porCalibre: {},
        contenedores: []
    };

    // Maps para acumular datos temporalmente
    const calidadMap = new Map(); // calidadId -> { kilos, cajas }
    const calibreMap = new Map(); // calibre -> { kilos, cajas }
    const contenedoresSet = new Set(); // Usar string para comparación correcta

    for (const item of itemPallets) {
        const mult = obtenerMultiplicador(item.tipoCaja);
        const kilos = (item.cajas || 0) * mult;
        const cajas = item.cajas || 0;

        // Sumar totales
        salidaExportacion.totalKilos += kilos;
        salidaExportacion.totalCajas += cajas;

        // Sumar kilos GGN si aplica
        if (item.GGN && loteGGN) {
            salidaExportacion.kilosGGN += kilos;
        }

        // Agrupar por calidad
        if (item.calidad) {
            const calidadId = item.calidad.toString();
            if (!calidadMap.has(calidadId)) {
                calidadMap.set(calidadId, { kilos: 0, cajas: 0 });
            }
            const calidad = calidadMap.get(calidadId);
            calidad.kilos += kilos;
            calidad.cajas += cajas;
        }

        // Agrupar por calibre
        if (item.calibre) {
            if (!calibreMap.has(item.calibre)) {
                calibreMap.set(item.calibre, { kilos: 0, cajas: 0 });
            }
            const calibre = calibreMap.get(item.calibre);
            calibre.kilos += kilos;
            calibre.cajas += cajas;
        }

        // Agregar contenedor como string para evitar duplicados
        if (item.contenedor) {
            contenedoresSet.add(item.contenedor.toString());
        }
    }

    // Convertir maps a objetos con claves dinámicas
    // Para porCalidad, usar el ObjectId como clave
    for (const [calidadId, data] of calidadMap.entries()) {
        salidaExportacion.porCalidad[calidadId] = {
            kilos: data.kilos,
            cajas: data.cajas
        };
    }

    // Para porCalibre, usar el calibre como clave
    for (const [calibre, data] of calibreMap.entries()) {
        salidaExportacion.porCalibre[calibre] = {
            kilos: data.kilos,
            cajas: data.cajas
        };
    }

    // Convertir strings de vuelta a ObjectId para contenedores
    salidaExportacion.contenedores = Array.from(contenedoresSet).map(id => new ObjectId(id));

    return salidaExportacion;
}

async function main() {
    try {
        // Conectar a la base de datos
        const database = await connectProcesoDB();

        // Obtener colecciones
        const lotes = database.collection('lotes');
        const itemPallets = database.collection('itempallets');

        // Obtener todos los lotes
        const lotesDocs = await lotes.find({}).toArray();
        console.log('📄 Lotes encontrados:', lotesDocs.length);

        // Obtener todos los IDs de lotes
        const lotesIds = lotesDocs.map(doc => doc._id);

        // Obtener TODOS los itemPallets de una sola vez
        const itemPalletsDocs = await itemPallets.find({ lote: { $in: lotesIds } }).toArray();
        console.log('📄 ItemPallets encontrados:', itemPalletsDocs.length);

        // Agrupar itemPallets por lote (más eficiente que filter múltiples veces)
        const itemsPorLote = itemPalletsDocs.reduce((acc, item) => {
            const loteId = item.lote.toString();
            if (!acc[loteId]) {
                acc[loteId] = [];
            }
            acc[loteId].push(item);
            return acc;
        }, {});

        // Preparar operaciones de actualización en batch
        const operaciones = [];
        let lotesConItems = 0;
        let lotesSinItems = 0;

        for (const lote of lotesDocs) {
            const loteId = lote._id.toString();
            const itemsDelLote = itemsPorLote[loteId] || [];

            if (itemsDelLote.length === 0) {
                lotesSinItems++;
                continue;
            }

            lotesConItems++;

            // Calcular salidaExportacion
            const salidaExportacion = calcularSalidaExportacion(itemsDelLote, lote.GGN);

            // Agregar operación de actualización - usar $set para reemplazar completamente
            operaciones.push({
                updateOne: {
                    filter: { _id: lote._id },
                    update: { 
                        $set: { 
                            'salidaExportacion.totalKilos': salidaExportacion.totalKilos,
                            'salidaExportacion.totalCajas': salidaExportacion.totalCajas,
                            'salidaExportacion.porCalidad': salidaExportacion.porCalidad,
                            'salidaExportacion.porCalibre': salidaExportacion.porCalibre,
                            'salidaExportacion.contenedores': salidaExportacion.contenedores,
                            'salidaExportacion.kilosGGN': lote.kilosGGN,
                        }
                    }
                }
            });
        }

        console.log(`📊 Estadísticas:`);
        console.log(`   - Lotes con items: ${lotesConItems}`);
        console.log(`   - Lotes sin items: ${lotesSinItems}`);
        console.log(`   - Operaciones a ejecutar: ${operaciones.length}`);

        // Ejecutar actualizaciones en batch
        if (operaciones.length > 0) {
            console.log('🔄 Ejecutando actualizaciones...');
            const resultado = await lotes.bulkWrite(operaciones);
            console.log('✅ Documentos actualizados:', resultado.modifiedCount);
            console.log('📝 Documentos coincidentes:', resultado.matchedCount);
        } else {
            console.log('⚠️  No hay operaciones para ejecutar');
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
