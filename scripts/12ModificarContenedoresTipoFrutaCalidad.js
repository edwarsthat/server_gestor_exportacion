// scripts/11ModificarTipoDefFrutaLotes.mjs
import { connectProcesoDB, connectCatalogosDB } from "../DB/mongoDB/config/config.js";
import { defineTipoFrutas } from "../DB/mongoDB/schemas/catalogs/schemaTipoFruta.js";
import { defineContenedores } from "../DB/mongoDB/schemas/contenedores/schemaContenedores.js";

async function modificar_tipoFruta() {
    const db = await connectProcesoDB("mongodb://localhost:27017/proceso");
    const dbC = await connectCatalogosDB("mongodb://localhost:27017/catalogos");

    try {
        const ContenedoresDb = await defineContenedores(db);
        const TipoFrutaDB = await defineTipoFrutas(dbC);

        // 1) Trae catálogo y crea un mapa: nombre -> ObjectId
        const tipoFrutas = await TipoFrutaDB.find({}, { _id: 1, tipoFruta: 1, calidades: 1 }).lean().exec();
        const mapCalidadesAid = new Map(
            tipoFrutas.flatMap(tf =>
                (tf.calidades || []).map(c => [c.nombre, String(c._id).trim()]) // clave, valor
            )
        );
        const mapNombreAId = new Map(tipoFrutas.map(tf => [String(tf.tipoFruta).trim(), String(tf._id).trim()]));
        // 2) Trae SOLO lo necesario de lotes
        const contenedores = await ContenedoresDb.find({}, { _id: 1, numeroContenedor: 1, pallets: 1, infoContenedor: 1 }).lean().exec();

        // 3) Arma operaciones en bloque
        const ops = [];
        for (const contenedor of contenedores) {
            if (!contenedor.infoContenedor && !contenedor.infoContenedor.calidad && !contenedor.infoContenedor.tipoFruta) continue;
            const arrCalidad = []
            const tipoFrutaCont = contenedor.infoContenedor.tipoFruta;
            const idNuevoFruta = tipoFrutaCont === 'Mixto' ?  ["686e6b450c34dee069775d4e", "686e6b940c34dee069775d4f"] : [mapNombreAId.get(String(tipoFrutaCont).trim())];


            for (const calidad of contenedor.infoContenedor.calidad) {
                if (tipoFrutaCont === 'Mixto') {
                    arrCalidad.push(...mapCalidadesAid.values())
                } else {
                    const calidadCont = calidad + "-" + tipoFrutaCont
                    const idCalidad = mapCalidadesAid.get(calidadCont);
                    arrCalidad.push(idCalidad);
                }
            }
            if (!contenedor.pallets || contenedor.pallets.length === 0) continue;
            const copiaPallet = structuredClone(contenedor.pallets);
            for (const pallet of copiaPallet) {
                if (!pallet.EF1) continue;
                for (const item of pallet.EF1) {
                    if (!item.tipoFruta) {
                        item.tipoFruta = String(tipoFrutaCont).trim();
                    }
                    const calidadCont = item.calidad + "-" + item.tipoFruta
                    item.calidad = mapCalidadesAid.get(calidadCont);
                    item.tipoFruta = mapNombreAId.get(String(item.tipoFruta).trim());

                }

            }
            ops.push({
                updateOne: {
                    filter: { _id: contenedor._id },
                    update: {
                        $set: {
                            "infoContenedor.calidad": arrCalidad,
                            "infoContenedor.tipoFruta": idNuevoFruta,
                            "pallets": copiaPallet
                        }
                    }
                }
            });

        }

        if (ops.length === 0) {
            console.log("Nada que actualizar. Todo ya estaba en ObjectId o no hubo match en el catálogo.");
            return;
        }

        // 4) Ejecuta el bulk
        const res = await ContenedoresDb.bulkWrite(ops, { ordered: false });
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
