import { executeQueryTask } from "../../utils/wrappers.js";
import config from "../../../src/config/index.js";
import { InventariosHistorialRepository } from "../../Class/Inventarios.js";
export class CanastillasController {
    static async get_inventarios_canastillas_canastillasCelifrut() {
        return await executeQueryTask(async () => {
            const inventarioID = config.INVENTARIO_FRUTA_SIN_PROCESAR;
            const inventario = await InventariosHistorialRepository.get_data({
                ids: [inventarioID],
            });
            return inventario
        })
    }
}