import { executeQueryTask, executeTransactionalTask } from "../../utils/wrappers.js";
import { ProveedoresRepository } from "../../Class/Proveedores.js";
import { CanastillasService } from "../../services/inventarios/canastillas.js";
import { ClientesNacionalesRepository } from "../../Class/Clientes.js";
import { InventariosValidations } from "../../validations/inventarios.js";
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
    static async put_inventarios_canastillas_celifrut(req) {
        const { user } = req
        if(!user || !user._id) throw new Error("Usuario no existe")

        await executeTransactionalTask(req, async (session, log) => {
            const parseData = InventariosValidations.put_inventarios_canastillas_celifrut().parse(req.data)
            const { id, destino, origen, observaciones, fecha, canastillas, canastillasPrestadas, accion, remitente, destinatario } = parseData

        })
    }
}
