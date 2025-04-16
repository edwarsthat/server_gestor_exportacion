
const { connectProcesoDB } = require("../DB/mongoDB/config/config");
const { defineLotes } = require("../DB/mongoDB/schemas/lotes/schemaLotes");


async function modificar_actualizar_aprobacion() {
    try {
        const db = await connectProcesoDB("mongodb://localhost:27017/proceso")

        const Lote = await defineLotes(db);

        const Lotes = await Lote.find().exec();

        for (const item of Lotes) {
            if (item.aprobacionComercial) {

                await Lote.findByIdAndUpdate(item._id, {
                    $set: {
                        aprobacionProduccion: true,
                    },
                }, {
                    new: true,
                    runValidators: true
                });
            }
        }
        await db.close();

    } catch (err) {
        console.log(err)
    }

}

modificar_actualizar_aprobacion()

