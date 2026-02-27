import { executeQueryTask } from "../../utils/wrappers.js";
import { ProveedoresRepository } from "../../Class/Proveedores.js";
import { CanastillasService } from "../../services/inventarios/canastillas.js";
import { ClientesNacionalesRepository } from "../../Class/Clientes.js";
export class CanastillasController {
    static async get_inventarios_canastillas_canastillasCelifrut() {
        return await executeQueryTask(async () => {

            const total_canastillas = await CanastillasService.get_totales_canastillas()
            const query = {
                $or: [
                    { canastillas: { $gt: 0 } }
                ]
            }

            const canastillasPrestadas = total_canastillas.canastillasPrestadas
            const arr_id = canastillasPrestadas instanceof Map
                ? Array.from(canastillasPrestadas.keys())
                : Object.keys(canastillasPrestadas || {})

            if (arr_id.length > 0) {
                query.$or.push({ _id: { $in: arr_id } })
            }


            const proveedores = await ProveedoresRepository.get_data({
                query: query,
                select: {
                    canastillas: 1, PREDIO: 1
                }
            })

            const clientes = await ClientesNacionalesRepository.get_data({
                query: query,
                select: {
                    canastillas: 1, cliente: 1
                }
            })


            return [{
                ...total_canastillas,
                proveedores: proveedores || [],
                clientes: clientes || []
            }]
        })
    }
}
