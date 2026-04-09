/**
 * @file Script para convertir campo user de String a ObjectId
 * @description Convierte el campo user de tipo String a ObjectId en lotes, loteef8 y lotemaquila
 */

import { MongoClient } from 'mongodb';
import config from '../../src/config/index.js';
import ExcelJS from 'exceljs';
import path from 'path';

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
        const lotesCollection = database.collection('lotes');
        const lotes = await lotesCollection.find({
            fecha_creacion: {
                $gte: new Date('2026-03-01'),
                $lte: new Date('2026-03-31T23:59:59.999Z'),
            },
        }).toArray();

        const descartesCollection = database.collection('descartes');
        const descartes = await descartesCollection.find({}).toArray();
        const descartesMap = new Map(descartes.map(descarte => [descarte._id.toString(), descarte]));

        const calidadesCollection = database.collection('calidades');
        const calidades = await calidadesCollection.find({}).toArray();
        const calidadesMap = new Map(calidades.map(calidad => [calidad._id.toString(), calidad]));

        const tipoFrutaCollection = database.collection('tipoFruta');
        const tiposFruta = await tipoFrutaCollection.find({}).toArray();
        const tipoFrutaMap = new Map(tiposFruta.map(tipo => [tipo._id.toString(), tipo]));

        const prediosCollection = database.collection('proveedors');
        const predios = await prediosCollection.find({}).toArray();
        const prediosMap = new Map(predios.map(predio => [predio._id.toString(), predio]));

        const out = [];
        for (const lote of lotes) {

            const objLote = {
                enf: lote.enf,
                predio: prediosMap.get(lote.predio?.toString())?.PREDIO || 'Desconocido',
                fecha_creacion: lote.fecha_creacion,
                kilos: lote.kilos,
                kilosVaciados: lote.kilosVaciados,
                kilosProcesados: lote.kilosProcesados,
                deshidratacion: lote.deshidratacion,
                kilosDeshidratados: lote.deshidratacion * lote.kilos,
                kilosExportacion: lote?.salidaExportacion?.totalKilos || 0,
                tipoFruta: tipoFrutaMap.get(lote.tipoFruta?.toString())?.tipoFruta || 'Desconocido',
            }

            if (lote.descartes) {
                Object.entries(lote.descartes).forEach(([descarteId, kilos]) => {
                    if (descarteId.toString() === "690f643bbe7e33ae39bda1c6") {
                        const clasificacion = lote.calidad?.clasificacionCalidad;
                        if (clasificacion) {
                            Object.entries(clasificacion).forEach(([tipoDescarte, cantidad]) => {
                                if (['user', 'fecha'].includes(tipoDescarte)) return;
                                objLote[`descarte_${tipoDescarte || 'Desconocida'}`] = cantidad * kilos;
                            });
                        }
                    } else {
                        const descarte = descartesMap.get(descarteId.toString());
                        objLote[`${descarte?.descripcion || 'Desconocida'}`] = kilos;
                    }
                });
            }

            if (lote.salidaExportacion?.porCalidad) {
                Object.entries(lote.salidaExportacion.porCalidad).forEach(([calidadId, kilos]) => {
                    const calidad = calidadesMap.get(calidadId.toString());
                    objLote[`exportacion_${calidad?.nombre || 'Desconocida'}`] = kilos.kilos;
                });
            }

            out.push(objLote);
        }

        // Recolectar todas las columnas dinámicas (descartes y exportaciones)
        const allKeys = [...new Set(out.flatMap(o => Object.keys(o)))];

        const workbook = new ExcelJS.Workbook();
        const sheet = workbook.addWorksheet('Lotes');

        sheet.columns = allKeys.map(key => ({ header: key, key, width: 20 }));

        for (const row of out) {
            sheet.addRow(row);
        }

        const fecha = new Date().toISOString().slice(0, 10);
        const outputPath = path.join('scripts', 'out', `lotes_exportacion_${fecha}.xlsx`);
        await workbook.xlsx.writeFile(outputPath);

        console.log(`✅ Total lotes procesados: ${out.length}`);
        console.log(`📁 Archivo guardado en: ${outputPath}`);

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

