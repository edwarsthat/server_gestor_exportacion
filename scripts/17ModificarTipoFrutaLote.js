// scripts/11ModificarTipoDefFrutaLotes.mjs
import mongoose from "mongoose";
import { connectProcesoDB } from "../DB/mongoDB/config/config.js";
import { defineLotes } from "../DB/mongoDB/schemas/lotes/schemaLotes.js";

async function modificar_tipoFruta() {
    const db = await connectProcesoDB("mongodb://localhost:27017/proceso");

    try {
        const LoteDB = await defineLotes(db);
        const lotes = await LoteDB.find({ tipoFruta: { $type: "string" } }).lean().exec();

        for (const lote of lotes) {
            if (mongoose.isValidObjectId(lote.tipoFruta)) {
                await LoteDB.updateOne(
                    { _id: lote._id },
                    { $set: { tipoFruta: new mongoose.Types.ObjectId(lote.tipoFruta) } }
                );
            } else {
                console.warn("tipoFruta no válido:", lote._id, lote.tipoFruta);
            }
        }


    } catch (err) {
        console.error("Error en la migración de tipoFruta → ObjectId:", err);
        process.exitCode = 1;
    } finally {
        await db.close().catch(() => { });
    }
}

modificar_tipoFruta();
