import { connectProcesoDB } from "../DB/mongoDB/config/config.js";
import { defineIndicadores } from "../DB/mongoDB/schemas/indicadores/schemaIndicadoresProceso.js";

async function modificar_indicadores_tipoFrutaCalidad() {
    // const db = await connectProcesoDB("mongodb://localhost:27017/proceso");

    const db = await connectProcesoDB("mongodb://admin:SwR7uJHy1cnDDH3zRVMKZFwLOvn3RQBl@localhost:27017/proceso?authSource=admin")

    try {
        const indicadoresDB = await defineIndicadores(db);


        await indicadoresDB.updateMany(
            {
                $or: [
                    { "kilos_vaciados.Limon": { $exists: true } },
                    { "kilos_vaciados.Naranja": { $exists: true } },
                    { "kilos_vaciados.Mandarina": { $exists: true } },
                    { "kilos_procesados.Limon": { $exists: true } },
                    { "kilos_procesados.Naranja": { $exists: true } },
                    { "kilos_procesados.Mandarina": { $exists: true } },
                    { "kilos_exportacion.Limon": { $exists: true } },
                    { "kilos_exportacion.Naranja": { $exists: true } },
                    { "kilos_exportacion.Mandarina": { $exists: true } }
                ]
            },
            {
                $rename: {
                    "kilos_vaciados.Limon": "kilos_vaciados.686e6b450c34dee069775d4e",
                    "kilos_vaciados.Naranja": "kilos_vaciados.686e6b940c34dee069775d4f",
                    "kilos_vaciados.Mandarina": "kilos_vaciados.6877f45ae35ac9d2a0ab08e4",
                    "kilos_procesados.Limon": "kilos_procesados.686e6b450c34dee069775d4e",
                    "kilos_procesados.Naranja": "kilos_procesados.686e6b940c34dee069775d4f",
                    "kilos_procesados.Mandarina": "kilos_procesados.6877f45ae35ac9d2a0ab08e4",
                    "kilos_exportacion.Limon.calidad1": "kilos_exportacion.686e6b450c34dee069775d4e.6887f225e5e1fd727f8eb910",
                    "kilos_exportacion.Limon.calidad15": "kilos_exportacion.686e6b450c34dee069775d4e.688d371d142dfaceecae9958",
                    "kilos_exportacion.Limon.calidad2": "kilos_exportacion.686e6b450c34dee069775d4e.689a05d0102fb4cb445579bc",
                    "kilos_exportacion.Naranja.calidad1": "kilos_exportacion.686e6b940c34dee069775d4f.688b99b4611afbbf5e0cacb6",
                    "kilos_exportacion.Naranja.calidad15": "kilos_exportacion.686e6b940c34dee069775d4f.68966e7249e7fd7eff70c74c",
                    "kilos_exportacion.Naranja.calidad2": "kilos_exportacion.686e6b940c34dee069775d4f.68966eb849e7fd7eff70c74d",
                }
            }
        );

        // Limon
        await indicadoresDB.updateMany(
            {
                "kilos_exportacion.Limon": { $type: "object" },
                $expr: { $eq: [{ $size: { $objectToArray: "$kilos_exportacion.Limon" } }, 0] }
            },
            { $unset: { "kilos_exportacion.Limon": "" } }
        );

        // Naranja
        await indicadoresDB.updateMany(
            {
                "kilos_exportacion.Naranja": { $type: "object" },
                $expr: { $eq: [{ $size: { $objectToArray: "$kilos_exportacion.Naranja" } }, 0] }
            },
            { $unset: { "kilos_exportacion.Naranja": "" } }
        );

        // Mandarina (si aplica)
        await indicadoresDB.updateMany(
            {
                "kilos_exportacion.Mandarina": { $type: "object" },
                $expr: { $eq: [{ $size: { $objectToArray: "$kilos_exportacion.Mandarina" } }, 0] }
            },
            { $unset: { "kilos_exportacion.Mandarina": "" } }
        );




    } catch (err) {
        console.error("Error en la migración de tipoFruta → ObjectId:", err);
        process.exitCode = 1;
    } finally {
        await db.close().catch(() => { });
    }
}

modificar_indicadores_tipoFrutaCalidad();
