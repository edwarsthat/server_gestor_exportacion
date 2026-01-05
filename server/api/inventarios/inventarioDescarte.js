import { InventariosLogicError } from "../../../Error/logicLayerError.js";
import { InventariosHistorialRepository } from "../../Class/Inventarios.js";
import { filtroFechaInicioFin } from "../utils/filtros.js";

export class InventarioDescarteController {
    static async get_inventarios_historiales_registros_ingresosDescartes(req) {
        try {
            const { data } = req
            const { fechaInicio, fechaFin, tipoFruta } = data.filtro

            let query = {
                estado: 'ACTIVO',
                loteType: { $in: ["Lote", "Loteef8"] },
            }
            if (tipoFruta) query.tipoFruta = tipoFruta;

            query = filtroFechaInicioFin(fechaInicio, fechaFin, query, 'fechaIngreso')


            const inventario = await InventariosHistorialRepository.get_inventario_descarteMaquila_generico({
                query,
                populate: [
                    { path: 'tipoFruta', select: "tipoFruta" },
                    { path: 'lote', select: "enf" },
                    { path: 'tipoDescarte', select: "nombre inventario" },
                ]
            })

            return inventario
        } catch (err) {
            console.error(err)
            if (err.status === 522) {
                throw err
            }
            throw new InventariosLogicError(470, `Error ${err.type}: ${err.message}`)
        }
    }

}