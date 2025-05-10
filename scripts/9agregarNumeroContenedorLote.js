const { connectProcesoDB } = require("../DB/mongoDB/config/config");
const {
    defineContenedores,
} = require("../DB/mongoDB/schemas/contenedores/schemaContenedores");
const { defineLotes } = require("../DB/mongoDB/schemas/lotes/schemaLotes");

async function modificar_lotes_contenedores() {
    const db = await connectProcesoDB("mongodb://admin:SwR7uJHy1cnDDH3zRVMKZFwLOvn3RQBl@localhost:27017/sistema?authSource=admin")
        // const db = await connectProcesoDB("mongodb://localhost:27017/proceso")

    try {
        const LoteDB = await defineLotes(db);
        const ContenedorDB = await defineContenedores(db);

        const contenedores = await ContenedorDB.find().lean().exec();
        const lotesObj = {};

        for (const contenedor of contenedores) {
            for (const pallet of contenedor.pallets) {
                if (!pallet.EF1.length || pallet.EF1.length === 0) {
                    continue;
                }
                for (const item of pallet.EF1) {
                    if (!(item.lote in lotesObj)) {
                        lotesObj[item.lote] = new Set();
                    }
                    lotesObj[item.lote].add(contenedor._id);
                }
            }
        }

        // Convertir los Sets a Arrays y preparar las operaciones de actualización
        const updatePromises = Object.entries(lotesObj).map(([loteId, contenedoresSet]) => {
            return LoteDB.findByIdAndUpdate(
                loteId,
                { $set: { contenedores: Array.from(contenedoresSet) } },
                { new: true }
            );
        });

        // Actualizar los lotes que no están en lotesObj con un array vacío
        const updateEmptyPromise = LoteDB.updateMany(
            { _id: { $nin: Object.keys(lotesObj) } },
            { $set: { contenedores: [] } }
        );

        // Ejecutar todas las actualizaciones
        const [resultados, emptyResults] = await Promise.all([
            Promise.all(updatePromises),
            updateEmptyPromise
        ]);

        console.log("Lotes actualizados con contenedores:", resultados.length);
        console.log("Lotes actualizados con array vacío:", emptyResults.modifiedCount);

        await db.close();
    } catch (err) {
        console.log(err);
    } finally {
        await db.close();
    }
}

modificar_lotes_contenedores();
