/**
 * @file Script para migrar PAIS_DESTINO de clientes de strings a ObjectId
 * @description Lee el array de strings de PAIS_DESTINO de cada cliente, normaliza los nombres,
 * busca el _id correspondiente en la colección pais y actualiza el campo con el nuevo formato
 */

import { MongoClient } from 'mongodb';
import writeXlsxFile from 'write-excel-file/node';
import 'dotenv/config';

const MONGODB_PROCESO = process.env.MONGODB_PROCESO;

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

async function main() {
    try {
        const database = await connectProcesoDB();
        const lotesCollection = database.collection('lotes');
        const proveedoresCollection = database.collection('proveedors');
        const precios = database.collection('precios');
        const calidadesCollection = database.collection('calidades');
        const descartesCollection = database.collection('descartes');

        const [lotes, calidades, descartes] = await Promise.all([
            lotesCollection.find({
                fecha_creacion: {
                    $gte: new Date('2026-01-01T00:00:00.000Z'),
                    $lte: new Date('2026-03-31T23:59:59.999Z')
                }
            }).toArray(),
            calidadesCollection.find({}).toArray(),
            descartesCollection.find({}).toArray()
        ])

        const proveedoresSetIds = new Set();
        const preciosSetIds = new Set();

        for (const lote of lotes) {
            proveedoresSetIds.add(lote.predio);
            preciosSetIds.add(lote.precio)
        }

        const [proveedores, preciosArray] = await Promise.all([
            proveedoresCollection.find({
                _id: { $in: Array.from(proveedoresSetIds) }
            }).toArray(),
            precios.find({
                _id: { $in: Array.from(preciosSetIds) }
            }).toArray()
        ]);

        const proveedoresMap = new Map(proveedores.map(d => [d._id.toString(), d]));
        const preciosMap = new Map(preciosArray.map(d => [d._id.toString(), d]));
        const descartesMap = new Map(descartes.map(d => [d._id.toString(), d]));
        const calidadesMap = new Map(calidades.map(d => [d._id.toString(), d]));

        const out = [];

        for (const lote of lotes) {
            const proveedor = proveedoresMap.get(lote.predio.toString());
            const objOut = {
                fechaIngreso: lote.fecha_creacion,
                enf: lote.enf,
                predio: proveedor ? proveedor.PREDIO : 'Desconocido',
                kilos: lote.kilos,
            };

            const precio = preciosMap.get(lote?.precio?.toString() || '');

            if (precio) {
                Object.entries(precio.exportacion).forEach(([key, value]) => {
                    const calidad = calidadesMap.get(key);
                    if (calidad) {
                        objOut[`precio_${calidad.nombre}`] = value;
                    } else {
                        console.warn(`Calidad no encontrada para precio ${precio._id}: calidad=${key}`);
                    }
                })
                objOut.descarte = precio?.descarte || 0;
                objOut.frutaNacional = precio?.frutaNacional || 0;
            }

            if (lote.salidaExportacion && lote.salidaExportacion.porCalidad) {
                Object.entries(lote.salidaExportacion.porCalidad).forEach(([key, value]) => {
                    const calidad = calidadesMap.get(key);
                    if (calidad) {
                        objOut[`kilos_${calidad.nombre}`] = value.kilos;
                    } else {
                        console.warn(`Calidad no encontrada para precio ${precio._id}: calidad=${key}`);
                    }
                })
            }

            if(lote.directoNacional){
                objOut.precio_directoNacional = precio?.directoNacional || 0;
            }

            if(lote.descartes){
                Object.entries(lote.descartes).forEach(([key, value]) => {
                    const descarte = descartesMap.get(key);
                    if (descarte) {
                        objOut[`kilos_descarte_${descarte.nombre}`] = value;
                    } else {
                        console.warn(`Descarte no encontrado para lote ${lote._id}: descarte=${key}`);
                    }
                })
            }
            if(lote.deshidratacion !== 0){
                objOut.kilosDeshidratacion = ((lote.deshidratacion / 100) * lote.kilos);
            }

            out.push(objOut);
        }

        const allKeys = [...new Set(out.flatMap(row => Object.keys(row)))];
        const schema = allKeys.map(key => {
            let type = String;
            if (key === 'fechaIngreso') {
                type = Date;
            } else {
                const firstValue = out.find(row => row[key] != null)?.[key];
                if (typeof firstValue === 'number') type = Number;
            }
            return {
                column: key,
                type,
                value: row => {
                    const v = row[key];
                    if (v == null) return null;
                    if (type === Number) return typeof v === 'number' ? v : Number(v);
                    if (type === Date) return v instanceof Date ? v : new Date(v);
                    if (typeof v === 'object') return v.toString();
                    return String(v);
                },
            };
        });

        const filePath = '/home/analista/server/server_gestor_exportacion/scripts/out/lotes_con_precios.xlsx';
        await writeXlsxFile(out, { schema, filePath, dateFormat: 'dd/mm/yyyy' });
        console.log(`Archivo generado: ${filePath}`);

    } catch (error) {
        console.error('Error en el proceso:', error.message);
        console.error(error);
        process.exit(1);
    } finally {
        await closeConnection();
    }
}

main();
