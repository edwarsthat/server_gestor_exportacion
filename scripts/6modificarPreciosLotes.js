const { connectProcesoDB } = require("../DB/mongoDB/config/config");
const { defineLotes } = require("../DB/mongoDB/schemas/lotes/schemaLotes");


async function modificar_lotes_fecha_fecha_inicio() {
    try {
        const db = await connectProcesoDB("mongodb://localhost:27017/proceso")

        const Lote = await defineLotes(db);

        const Lotes = await Lote.find().exec();

        for (const item of Lotes) {

            await Lote.findByIdAndUpdate(item._id, {
                $set: {
                    precio: "67bf3f580121ef23a740d6f1",

                }
            }, {
                new: true,
                runValidators: true
            });
        }
        await db.close();
    } catch (err) {
        console.log(err)
    }




}

modificar_lotes_fecha_fecha_inicio()
