
import { connectProcesoDB } from "../DB/mongoDB/config/config";
import { db } from "../DB/mongoDB/config/init.mjs";

const updateContenedores = async () => {

    try {
        await connectProcesoDB();
        await db.Clientes.updateMany({}, { $set: { activo: true } });
        console.log("Modificado con éxito");
    } catch (error) {
        console.error("Error al modificar:", error);
    } finally {
        // Cierra la conexión después de la operación
        await db.close();
    }
};

updateContenedores();