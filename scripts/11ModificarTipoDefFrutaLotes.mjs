// scripts/11ModificarTipoDefFrutaLotes.mjs
import { connectProcesoDB, connectCatalogosDB } from "../DB/mongoDB/config/config.js";
import { defineTipoFrutas } from "../DB/mongoDB/schemas/catalogs/schemaTipoFruta.js";
import { defineLotes } from "../DB/mongoDB/schemas/lotes/schemaLotes.js";

async function modificar_tipoFruta() {
    // const db = await connectProcesoDB("mongodb://localhost:27017/proceso");
    // const dbC = await connectCatalogosDB("mongodb://localhost:27017/catalogos");

    const db = await connectProcesoDB("mongodb://admin:SwR7uJHy1cnDDH3zRVMKZFwLOvn3RQBl@localhost:27017/proceso?authSource=admin")
    const dbC = await connectCatalogosDB("mongodb://admin:SwR7uJHy1cnDDH3zRVMKZFwLOvn3RQBl@localhost:27017/catalogos?authSource=admin");

    try {
        const LoteDB = await defineLotes(db);
        const TipoFrutaDB = await defineTipoFrutas(dbC);

        // 1) Trae catálogo y crea un mapa: nombre -> ObjectId
        const tipoFrutas = await TipoFrutaDB.find({}, { _id: 1, tipoFruta: 1 }).lean().exec();
        const mapNombreAId = new Map(tipoFrutas.map(tf => [String(tf.tipoFruta).trim(), tf._id]));

        // 2) Trae SOLO lo necesario de lotes
        const lotes = await LoteDB.find({}, { _id: 1, tipoFruta: 1 }).lean().exec();

        // 3) Arma operaciones en bloque
        const ops = [];
        for (const lote of lotes) {
            const actual = lote.tipoFruta;
            // Si ya es ObjectId, sáltalo (evita re-escribir lo mismo)
            const esObjectId = actual && typeof actual === "object" && actual._bsontype === "ObjectID";

            if (!esObjectId) {
                const idNuevo = mapNombreAId.get(String(actual).trim());
                if (idNuevo) {
                    ops.push({
                        updateOne: {
                            filter: { _id: lote._id },
                            update: { $set: { tipoFruta: idNuevo } }
                        }
                    });
                }
            }
        }

        if (ops.length === 0) {
            console.log("Nada que actualizar. Todo ya estaba en ObjectId o no hubo match en el catálogo.");
            return;
        }

        // 4) Ejecuta el bulk
        const res = await LoteDB.bulkWrite(ops, { ordered: false });
        console.log(`Actualización completada ✓
- matched:   ${res.matchedCount ?? res.result?.nMatched ?? 0}
- modified:  ${res.modifiedCount ?? res.result?.nModified ?? 0}
- upserts:   ${res.upsertedCount ?? 0}
- ops totales: ${ops.length}`);

    } catch (err) {
        console.error("Error en la migración de tipoFruta → ObjectId:", err);
        process.exitCode = 1;
    } finally {
        await db.close().catch(() => { });
        await dbC.close().catch(() => { });
    }
}

modificar_tipoFruta();
