const { connectProcesoDB } = require("../DB/mongoDB/config/config");
const { defineLotes } = require("../DB/mongoDB/schemas/lotes/schemaLotes");


async function modificar_lotes_fecha_fecha_inicio() {
    try {
        const db = await connectProcesoDB("mongodb://localhost:27017/proceso")
        // const db = await connectProcesoDB("mongodb://admin:SwR7uJHy1cnDDH3zRVMKZFwLOvn3RQBl@localhost:27017/proceso?authSource=admin")

        const Lote = await defineLotes(db);

        const Lotes = await Lote.find().exec();

        for (const item of Lotes) {
            if (item.fechaIngreso) {
                const fecha = item.fechaIngreso;

                await Lote.findByIdAndUpdate(item._id, {
                    $set: {
                        fecha_estimada_llegada: fecha,
                        fecha_ingreso_patio: fecha,
                        fecha_salida_patio: fecha,
                        fecha_ingreso_inventario: fecha,
                        fecha_creacion: fecha
                    },
                    $unset: { fechaIngreso: '' }
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

modificar_lotes_fecha_fecha_inicio()
