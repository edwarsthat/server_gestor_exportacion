/**
 * @file Reporte de Volante de Calidad
 * @description Exporta los registros de volantecalidads del rango de fechas configurado,
 * resolviendo tipoFruta y operario (nombre + apellido), en el mismo formato que
 * los informes "Calidad Volante" que se envian por correo (Tipo Fruta, Unidades,
 * Peso Param, Peso R, Defectos, Calibre, Fecha, Nombre).
 */

import { MongoClient } from 'mongodb';
import ExcelJS from 'exceljs';
import config from '../../src/config/index.js';
import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const { MONGODB_PROCESO } = config;

// Rango de fechas a reportar (sobre volantecalidads.fecha)
const FECHA_INICIO = new Date('2026-07-01T05:00:00.000Z'); //se cambia la fecha en cuestion
const FECHA_FIN = new Date('2026-08-01T05:00:00.000Z');

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

        const volantesCollection = database.collection('volantecalidads');
        const tipoFrutaCollection = database.collection('tipofrutas');
        const personalCollection = database.collection('personals');

        const volantes = await volantesCollection.find({
            fecha: { $gte: FECHA_INICIO, $lte: FECHA_FIN },
        }).toArray();
        console.log(`Volantes de calidad encontrados: ${volantes.length}`);

        if (volantes.length === 0) {
            console.log('No hay registros en el rango de fechas indicado, no se genera reporte.');
            return;
        }

        const [tiposFruta, personal] = await Promise.all([
            tipoFrutaCollection.find({}).toArray(),
            personalCollection.find({}).toArray(),
        ]);
        const tiposFrutaMap = new Map(tiposFruta.map(t => [t._id.toString(), t]));
        const personalMap = new Map(personal.map(p => [p._id.toString(), p]));

        const out = volantes.map(v => {
            const tipoFruta = tiposFrutaMap.get(v.tipoFruta?.toString())?.tipoFruta || 'Desconocido';
            const operario = personalMap.get(v.operario?.toString());
            const nombre = operario ? `${operario.nombre} ${operario.apellido}` : 'Desconocido';

            return {
                tipoFruta,
                unidades: v.unidades,
                pesoParametro: v.pesoParametro,
                pesoReal: v.pesoReal,
                defectos: v.defectos,
                calibre: v.calibre,
                fecha: v.fecha,
                nombre,
            };
        }).sort((a, b) => a.fecha - b.fecha);

        const workbook = new ExcelJS.Workbook();
        const sheet = workbook.addWorksheet('Volante Calidad');
        sheet.columns = [
            { header: 'Tipo Fruta', key: 'tipoFruta', width: 14 },
            { header: 'Unidades', key: 'unidades', width: 10 },
            { header: 'Peso Param', key: 'pesoParametro', width: 12 },
            { header: 'Peso R', key: 'pesoReal', width: 10 },
            { header: 'Defectos', key: 'defectos', width: 10 },
            { header: 'Calibre', key: 'calibre', width: 10 },
            { header: 'Fecha', key: 'fecha', width: 12, style: { numFmt: 'dd/mm/yyyy' } },
            { header: 'Nombre', key: 'nombre', width: 24 },
        ];
        out.forEach(row => sheet.addRow(row));

        const outDir = path.join(__dirname, '..', 'out');
        fs.mkdirSync(outDir, { recursive: true });
        const outputPath = path.join(outDir, 'reporteVolanteCalidad.xlsx');
        await workbook.xlsx.writeFile(outputPath);

        console.log(`Filas generadas: ${out.length}`);
        console.log(`Archivo generado: ${outputPath}`);
    } catch (error) {
        console.error('Error en el proceso:', error.message);
        console.error(error);
        process.exit(1);
    } finally {
        await closeConnection();
    }
}

main();
