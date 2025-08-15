import { connectProcesoDB, connectCatalogosDB } from "../DB/mongoDB/config/config.js";
import { defineTipoFrutas } from "../DB/mongoDB/schemas/catalogs/schemaTipoFruta.js";
import { definePrecios } from "../DB/mongoDB/schemas/precios/schemaPrecios.js";

async function modificar_tipoFruta() {
    const db = await connectProcesoDB("mongodb://localhost:27017/proceso");
    const dbC = await connectCatalogosDB("mongodb://localhost:27017/catalogos");

    try {
        const preciosDB = await definePrecios(db);
        const TipoFrutaDB = await defineTipoFrutas(dbC);

        // 1) Trae catálogo y crea un mapa: nombre -> ObjectId
        const tipoFrutas = await TipoFrutaDB.find({}, { _id: 1, tipoFruta: 1, calidades: 1 }).lean().exec();
        const mapNombreAId = new Map(tipoFrutas.map(tf => [String(tf.tipoFruta).trim(), tf._id]));
        const mapCalidadesAid = new Map(
            tipoFrutas.flatMap(tf =>
                (tf.calidades || []).map(c => [c.nombre, String(c._id).trim()]) // clave, valor
            )
        );
        // 2) Trae SOLO lo necesario de lotes
        const precios = await preciosDB.find({}, { _id: 1, tipoFruta: 1, "1": 1, "15": 1, "2": 1 }).lean().exec();

        // 3) Arma operaciones en bloque
        const ops = [];
        for (const precio of precios) {
            const actual = precio.tipoFruta;
            // Si ya es ObjectId, sáltalo (evita re-escribir lo mismo)
            const esObjectId = actual && typeof actual === "object" && actual._bsontype === "ObjectID";

            const idCalidad1 = mapCalidadesAid.get("1-" + precio.tipoFruta);
            const idCalidad15 = mapCalidadesAid.get("1.5-" + precio.tipoFruta);
            const idCalidad2 = mapCalidadesAid.get("2-" + precio.tipoFruta);

            if (!esObjectId) {
                const idNuevo = mapNombreAId.get(String(actual).trim());
                if (idNuevo) {
                    ops.push({
                        updateOne: {
                            filter: { _id: precio._id },
                            update: {
                                $set: {
                                    tipoFruta: idNuevo,
                                    [`exportacion.${idCalidad1}`]: precio[1],
                                    [`exportacion.${idCalidad15}`]: precio[15],
                                    [`exportacion.${idCalidad2}`]: precio[2]

                                }
                            }
                        }
                    });
                }
            }
        }
        console.log(JSON.stringify(ops, null, 2));
        if (ops.length === 0) {
            console.log("Nada que actualizar. Todo ya estaba en ObjectId o no hubo match en el catálogo.");
            return;
        }

        // 4) Ejecuta el bulk
        const res = await preciosDB.bulkWrite(ops, { ordered: false });
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
