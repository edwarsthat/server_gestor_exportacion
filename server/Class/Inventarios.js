import { db } from "../../DB/mongoDB/config/init.js";

export class InventariosHistorialRepository {
    static async crearInventarioDescarte(data){
        try {
            const { inventario, kilos_ingreso = 0, kilos_salida = 0, fecha } = data;
            
            const nuevoInventario = new db.InventarioDescarte({
                fecha: fecha || new Date(),
                inventario,
                kilos_ingreso,
                kilos_salida
            });
            
            const resultado = await nuevoInventario.save();
            return resultado;
        } catch (error) {
            throw new Error(`Error al crear inventario descarte: ${error.message}`);
        }
    }
}