const { connectProcesoDB } = require("../DB/mongoDB/config/config");
const { defineLotes } = require("../DB/mongoDB/schemas/lotes/schemaLotes");
const { defineproveedores } = require("../DB/mongoDB/schemas/proveedores/schemaProveedores");

async function modificar_lotes_quitar_GGN() {
    // const db = await connectProcesoDB("mongodb://admin:SwR7uJHy1cnDDH3zRVMKZFwLOvn3RQBl@localhost:27017/proceso?authSource=admin")
    const db = await connectProcesoDB("mongodb://localhost:27017/proceso")

    try {
        const LoteDB = await defineLotes(db);
        await defineproveedores(db);

        const lotes = await LoteDB.find()
            .populate({
                path: 'predio',
                select: 'PREDIO ICA GGN SISPAP '
            })
            .lean()
            .exec();

        for (const lote of lotes) {
            if (!lote.predio || !lote.predio.GGN) {
                console.log(lote._id)
                continue
            }
            if (lote.predio.GGN.code === '' || lote.predio.GGN.code === undefined || lote.predio.GGN.code === null) {
                console.log(lote._id);
                await LoteDB.updateOne(
                    { _id: lote._id },
                    { $set: { kilosGGN: 0, GGN: false } }
                );
                continue

            }
            if (lote.kilosGGN > 0) {
                const kilos = lotes.calidad1 + lotes.calidad2 + lotes.calidad15
                if (lote.kilosGGN > kilos) {
                    await LoteDB.updateOne(
                        { _id: lote._id },
                        { $set: { kilosGGN: kilos, GGN: true } }
                    );
                    continue

                } else {
                    await LoteDB.updateOne(
                        { _id: lote._id },
                        { $set: { GGN: true } }
                    );
                    continue

                }
            }
            if (!(lote.predio.GGN.code === '' && lote.predio.GGN.code === undefined && lote.predio.GGN.code === null)) {
                await LoteDB.updateOne(
                    { _id: lote._id },
                    { $set: { GGN: true } }
                );
                continue
            } else {
                await LoteDB.updateOne(
                    { _id: lote._id },
                    { $set: { GGN: false } }
                );
                continue
            }
        }
        await db.close();
    } catch (err) {
        console.log(err);
    } finally {
        await db.close();
    }
}

modificar_lotes_quitar_GGN();
