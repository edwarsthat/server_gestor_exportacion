
import { connectProcesoDB, connectCatalogosDB } from "../../DB/mongoDB/config/config.js";
import { defineLotes } from "../../DB/mongoDB/schemas/lotes/schemaLotes.js";
import { definePrecios } from "../../DB/mongoDB/schemas/precios/schemaPrecios.js";
import { defineproveedores } from "../../DB/mongoDB/schemas/proveedores/schemaProveedores.js";
import fs from 'fs';
import path from 'path';


async function obtener_lotes_precios_json() {
    const db = await connectProcesoDB("mongodb://localhost:27017/proceso");
    const dbC = await connectCatalogosDB("mongodb://localhost:27017/catalogos");

    try {
        const LoteDB = await defineLotes(db);
        await defineproveedores(db);
        await definePrecios(db)

        const populateLote = [
            { path: 'predio', select: 'PREDIO ICA GGN SISPAP' },
            { path: 'precio', select: 'descarte frutaNacional exportacion' }
        ]

        const lotes = await LoteDB.find({
            fecha_creacion: { $gte: new Date("2025-01-01T00:00:00Z") },
            predio: "655e68b24e055637327c2f06"
        })
            .select({ kilos: 1, exportacion: 1, precio: 1, predio: 1, tipoFruta: 1, descarteLavado: 1, descarteEncerado: 1, frutaNacional: 1, enf: 1, directoNacional: 1 })
            .populate(populateLote)
            .lean().exec();

        const out = []

        for (const lote of lotes) {
            const lotObj = {}
            lotObj._id = lote._id;
            lotObj.kilos = lote.kilos;
            lotObj.frutaNacional = lote.frutaNacional;
            lotObj.directoNacional = lote.directoNacional;
            lotObj.enf = lote.enf;
            lotObj.predio = lote.predio ? lote.predio.PREDIO : null;
            lotObj["precio.Descarte"] = lote.precio ? lote.precio.descarte : null;
            lotObj["precio.FrutaNacional"] = lote.precio ? lote.precio.frutaNacional : null;

            const descartesLavadoKeys = Object.keys(lote.descarteLavado || {});
            const descartesEnceradoKeys = Object.keys(lote.descarteEncerado || {});
            const exportacionExportacionCont = Object.keys(lote.exportacion || {});
            const preciosExportacionKeys = Object.keys(lote.precio ? lote.precio.exportacion || {} : {});

            for (const key of descartesLavadoKeys) {
                lotObj[`descarteLavado_${key}`] = lote.descarteLavado[key];
            }

            for (const key of descartesEnceradoKeys) {
                lotObj[`descarteEncerado_${key}`] = lote.descarteEncerado[key];
            }

            for (const key of preciosExportacionKeys) {
                lotObj[`precio.${key}`] = lote.precio.exportacion[key];
            }

            for (const key of exportacionExportacionCont) {
                const exportacionCalidadKeys = Object.keys(lote.exportacion[key] || {});
                for (const subKey of exportacionCalidadKeys) {
                    lotObj[`exportacion.${subKey}`] = lote.exportacion[key][subKey];
                }
            }
            
            out.push(lotObj);

        }

        // Generar CSV
        if (out.length > 0) {
            // Obtener todas las columnas únicas
            const allKeys = new Set();
            out.forEach(obj => {
                Object.keys(obj).forEach(key => allKeys.add(key));
            });
            
            const headers = Array.from(allKeys);
            
            // Crear el contenido CSV
            let csvContent = headers.join(',') + '\n';
            
            out.forEach(obj => {
                const row = headers.map(header => {
                    let value = obj[header];
                    if (value === null || value === undefined) {
                        return '';
                    }
                    // Escapar comillas y comas en los valores
                    if (typeof value === 'string' && (value.includes(',') || value.includes('"') || value.includes('\n'))) {
                        value = '"' + value.replace(/"/g, '""') + '"';
                    }
                    return value;
                }).join(',');
                csvContent += row + '\n';
            });
            
            // Crear directorio out si no existe
            const currentDir = path.dirname(new URL(import.meta.url).pathname);
            // En Windows, necesitamos limpiar la ruta
            const cleanCurrentDir = process.platform === 'win32' && currentDir.startsWith('/') 
                ? currentDir.slice(1) 
                : currentDir;
            const outDir = path.join(cleanCurrentDir, '..', 'out');
            if (!fs.existsSync(outDir)) {
                fs.mkdirSync(outDir, { recursive: true });
            }
            
            // Guardar en archivo CSV
            const fileName = `lotes_precios_${new Date().toISOString().split('T')[0]}.csv`;
            const filePath = path.join(outDir, fileName);
            fs.writeFileSync(filePath, csvContent, 'utf8');
            console.log(`CSV guardado en: ${filePath}`);
            console.log(`Total de registros: ${out.length}`);
            console.log(`Columnas: ${headers.length}`);
        } else {
            console.log('No se encontraron datos para exportar');
        }
        
        return out;
    } catch (err) {
        console.error("Error en la migración de exportacion → ObjectId:", err);
        process.exitCode = 1;
    } finally {
        await db.close().catch(() => { });
        await dbC.close().catch(() => { });
    }
}

obtener_lotes_precios_json();
