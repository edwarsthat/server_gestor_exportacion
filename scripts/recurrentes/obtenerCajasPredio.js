// scripts/11ModificarTipoDefFrutaLotes.mjs
import { connectProcesoDB } from "../../DB/mongoDB/config/config.js";
import { defineContenedores } from "../../DB/mongoDB/schemas/contenedores/schemaContenedores.js";
import { defineLotes } from "../../DB/mongoDB/schemas/lotes/schemaLotes.js";



async function modificar_tipoFruta() {
    const db = await connectProcesoDB("mongodb://localhost:27017/proceso");


    try {
        const ContenedoresDb = await defineContenedores(db);
        const LoteDB = await defineLotes(db);
        let total = 0;

        const contenedores = await ContenedoresDb.find({}, { _id: 1, numeroContenedor: 1, pallets: 1 }).lean().exec();


        const lotes = await LoteDB.find({ predio: "655e68b24e055637327c2f6c", fecha_creacion: { $gte: new Date("2025-01-01T00:00:00.000Z"), $lt: new Date("2026-01-01T00:00:00.000Z") } }, { _id: 1, predio: 1 }).lean().exec();
        console.log("Total Lotes encontrados:", lotes.length);
        const lotesids = lotes.map(l => l._id.toString());

        for (const contenedor of contenedores) {
            if (!contenedor.pallets) continue;
            for (const pallet of contenedor.pallets) {
                if (!pallet.EF1) continue;
                for (const item of pallet.EF1) {
                    if (lotesids.includes(item.lote.toString())) {
                        total++;
                    }
                }
            }
        }
        console.log("Total coincidencias:", total);


    } catch (err) {
        console.error("Error en la migración de tipoFruta → ObjectId:", err);
        process.exitCode = 1;
    } finally {
        await db.close().catch(() => { });
    }
}

modificar_tipoFruta();
