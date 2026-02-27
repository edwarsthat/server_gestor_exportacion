import { InventarioDescartesRepository, InventariosHistorialRepository } from "../../Class/Inventarios.js";
import config from "../../../src/config/index.js";

export class CanastillasService {
    static async get_totales_canastillas() {
        const inventarioID = config.INVENTARIO_CANASTILLAS;
        const inventario = await InventariosHistorialRepository.get_data({
            ids: [inventarioID],
        });
        if (inventario.length === 0) throw new Error("No se encontro el inventario de canastillas")

        if (inventario[0].canastillasPrestadas == null) throw new Error("No se encontro el inventario de canastillas prestadas")
        if (inventario[0].canastillas_propias == null) throw new Error("No se encontro el inventario de canastillas propias")
        if (inventario[0].canastillasTotal == null) throw new Error("No se encontro el inventario de canastillas total")

        const invetario_frutaSinProcesar = await InventariosHistorialRepository.get_data({
            ids: [config.INVENTARIO_FRUTA_SIN_PROCESAR],
        });
        if (invetario_frutaSinProcesar.length === 0) throw new Error("No se encontro el inventario de fruta sin procesar")

        //se obtienen lascanastillas llenas en inventario
        const inventarioIDfrutaSinProcesar = config.INVENTARIO_FRUTA_SIN_PROCESAR;
        const resultado = await InventariosHistorialRepository.get_data({
            ids: [inventarioIDfrutaSinProcesar]
        });
        if (resultado.length === 0) throw new Error("No se encontro el inventario de fruta sin procesar")

        const concatResult = [...resultado[0].inventario, ...resultado[0].inventarioMaquila];
        const total_frutaSinProcesar = concatResult.reduce((acc, item) => acc + item.canastillas, 0);

        //se obtiene las canastillas llenas de descarte
        const inventarioDescarte = await InventarioDescartesRepository.get_total_canastillas_inventario_descarte({})
        if (inventarioDescarte === null) throw new Error("No se encontro el inventario de descarte")

        const total_descarte = inventarioDescarte[0]?.totalCanastillasActuales || 0

        return {
            canastillasPrestadas: inventario[0].canastillasPrestadas,
            canastillas_propias: inventario[0].canastillas_propias,
            canastillasTotal: inventario[0].canastillasTotal,
            total_frutaSinProcesar: total_frutaSinProcesar,
            canastillas_llenas: total_descarte + total_frutaSinProcesar
        }

    }
    static async modificar_inventario_canastillas(opts = {}, session = {}) {
        const {
            canastillas_propias = null,
            canastillasPrestadas = null,
            prestamistaId = null,
        } = opts;

        //se modifica el inventario general
        const inventarioID = config.INVENTARIO_CANASTILLAS;
        const update = {};

        if( canastillas_propias ){
            update.$inc = update.$inc || {};
            update.$inc.canastillas_propias = canastillas_propias;
        }
        if (canastillasPrestadas) {
            if (!prestamistaId) {
                throw new Error("prestamistaId es obligatorio para modificar canastillas prestadas");
            }

            const valorCambio = Number(canastillasPrestadas);
            if (!Number.isFinite(valorCambio)) {
                throw new Error("canastillasPrestadas debe ser un número válido");
            }

            const inventario = await InventariosHistorialRepository.get_data(
                {
                    ids: [inventarioID],
                    select: { canastillasPrestadas: 1 }
                },
                { session }
            );
            if (inventario.length === 0) throw new Error("No se encontro el inventario de canastillas");

            const mapPrestadas = inventario[0].canastillasPrestadas;
            const actual = Number(
                mapPrestadas?.get?.(prestamistaId) ??
                mapPrestadas?.[prestamistaId] ??
                0
            );
            const nuevoTotal = actual + valorCambio;

            if (nuevoTotal < 0) {
                throw new Error("El ajuste dejaría las canastillas prestadas en negativo");
            }

            if (valorCambio < 0 && nuevoTotal === 0) {
                update.$unset = update.$unset || {};
                update.$unset[`canastillasPrestadas.${prestamistaId}`] = "";
            } else {
                update.$inc = update.$inc || {};
                update.$inc[`canastillasPrestadas.${prestamistaId}`] = valorCambio;
            }
        }

        if (Object.keys(update).length === 0) {
            return null;
        }

        await InventariosHistorialRepository.actualizar_data(
            {_id: inventarioID,}, 
            update,
            { session }
        );

    }
}
