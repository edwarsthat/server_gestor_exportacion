const { connectProcesoDB } = require("../DB/mongoDB/config/config");
const { Clientes } = require("../DB/mongoDB/schemas/clientes/schemaClientes");

const updateContenedores = async () => {
    let db
    try {
        db = await connectProcesoDB();
        await Clientes.updateMany({}, { $set: { activo: true } });
        console.log("Modificado con éxito");
    } catch (error) {
        console.error("Error al modificar:", error);
    } finally {
        // Cierra la conexión después de la operación
        await db.close();
    }
};

updateContenedores();