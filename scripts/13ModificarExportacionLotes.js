
import { connectProcesoDB, connectCatalogosDB } from "../DB/mongoDB/config/config.js";
import { defineContenedores } from "../DB/mongoDB/schemas/contenedores/schemaContenedores.js";
import { defineLotes } from "../DB/mongoDB/schemas/lotes/schemaLotes.js";

async function modificar_exportacion() {
    // const db = await connectProcesoDB("mongodb://localhost:27017/proceso");
    // const dbC = await connectCatalogosDB("mongodb://localhost:27017/catalogos");

    const db = await connectProcesoDB("mongodb://admin:SwR7uJHy1cnDDH3zRVMKZFwLOvn3RQBl@localhost:27017/proceso?authSource=admin")
    const dbC = await connectCatalogosDB("mongodb://admin:SwR7uJHy1cnDDH3zRVMKZFwLOvn3RQBl@localhost:27017/catalogos?authSource=admin");

    try {
        const LoteDB = await defineLotes(db);
        const ContenedoresDB = await defineContenedores(db);

        // 1) Trae catálogo y crea un mapa: nombre -> ObjectId
        const contenedores = await ContenedoresDB.find({}, { _id: 1, pallets: 1, infoContenedor: 1, numeroContenedor: 1 }).lean().exec();
        // 2) Trae SOLO lo necesario de lotes
        const lotes = await LoteDB.find({}, { _id: 1, calidad1: 1, calidad15: 1, calidad2: 1 }).lean().exec();

        // 3) Arma operaciones en bloque
        const ops = [];

        const objLotes = {};
        for (const contenedor of contenedores) {
            for (const pallet of contenedor.pallets) {
                for (const item of pallet.EF1) {
                    const { lote, calidad, tipoCaja, cajas } = item
                    if (!calidad) continue;

                    if (!(lote in objLotes)) {
                        objLotes[lote] = {}
                    }
                    if (!(`${contenedor._id}.${calidad}` in objLotes[lote])) {
                        objLotes[lote][`${contenedor._id}.${calidad}`] = 0
                    }

                    const kilos = cajas * Number(tipoCaja.split("-")[1])
                    if (Number.isNaN(kilos)) continue;
                    objLotes[lote][`${contenedor._id}.${calidad}`] += kilos
                }
            }
        }
        // let i = 0;
        for (const lote of lotes) {
            const exportacion = objLotes[lote._id] || {};
            const $set = {};

            for (const [contId, calObj] of Object.entries(exportacion)) {
                if (!calObj || !contId) {
                    continue;
                }
                if (Number.isNaN(calObj)) {
                    continue;
                }
                $set[`exportacion.${contId}`] = calObj
            }
            if (Object.keys($set).length === 0) { continue; }
            ops.push({
                updateOne: {
                    filter: { _id: lote._id },
                    update: { $set }
                }
            })
        }

        if (ops.length === 0) {
            console.log("Nada que actualizar. Todo ya estaba en ObjectId o no hubo match en el catálogo.");
            return;
        }

        // 4) Ejecuta el bulk
        const res = await LoteDB.bulkWrite(ops, { ordered: false, strict: false });
        console.log(`Actualización completada ✓
        - matched:   ${res.matchedCount ?? res.result?.nMatched ?? 0}
        - modified:  ${res.modifiedCount ?? res.result?.nModified ?? 0}
        - upserts:   ${res.upsertedCount ?? 0}
        - ops totales: ${ops.length}`);

    } catch (err) {
        console.error("Error en la migración de exportacion → ObjectId:", err);
        process.exitCode = 1;
    } finally {
        await db.close().catch(() => { });
        await dbC.close().catch(() => { });
    }
}

modificar_exportacion();
