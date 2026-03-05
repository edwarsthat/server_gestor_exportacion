import { executeQueryTask, executeTransactionalTask } from "../../utils/wrappers.js";
import { ProveedoresRepository } from "../../Class/Proveedores.js";
import { CanastillasService } from "../../services/inventarios/canastillas.js";
import { ClientesNacionalesRepository } from "../../Class/Clientes.js";
import { InventariosValidations } from "../../validations/inventarios.js";
import { registrarPasoLog } from "../helper/logs.js";
import { InventariosService } from "../../services/inventarios.js";
import { CanastillasRepository } from "../../Class/CanastillasRegistros.js";
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
        if (!user || !user._id) throw new Error("Usuario no existe")
        console.log(req.data)
        await executeTransactionalTask(req, async (session, log) => {
            const parseData = InventariosValidations.put_inventarios_canastillas_celifrut().parse(req.data.data)
            const {
                destino,
                origen,
                canastillas,
                fecha,
                observaciones,
                remitente,
                destinatario
            } = parseData

            await InventariosService.ajustarCanastillasProveedorCliente(origen, -canastillas, user, session);
            await InventariosService.ajustarCanastillasProveedorCliente(destino, canastillas, user, session);
            await registrarPasoLog(log._id, "Inventarios ajustados (origen/destino)", "Completado", `origen: ${origen}, destino: ${destino}, canastillas: ${canastillas}`)

            const dataRegistroCanastillas = InventariosService.crearRegistroInventarioCanastillas({
                origen,
                destino,
                accion: "traslado",
                canastillas,
                canastillasPrestadas: 0,
                remitente,
                destinatario,
                observaciones,
                fecha,
                user: user._id
            });
            await CanastillasRepository.post_data(dataRegistroCanastillas, { session, user: user._id });
            await registrarPasoLog(log._id, "Registro de canastillas creado", "Completado");
        })
    }
}
