import { procesoEventEmitter } from "../../events/eventos.js";
import { InventariosHistorialRepository } from "../Class/Inventarios.js";
import { INVENTARIOS_PROCESO } from "../config/procesoData.js";


export class ModificarRepository {
    static async put_inventarioLogistica_frutaSinProcesar_modificar_canastillas(req) {
        const { data } = req
        const { _id, canastillas } = data

        await InventariosHistorialRepository.put_inventarioSimple(
            {
                _id: INVENTARIOS_PROCESO.INVENTARIO_FRUTA_SIN_PROCESAR,
                "inventario.lote": _id
            },
            {
                $set: { "inventario.$.canastillas": canastillas } // modifica solo ese elemento
            }
        );
        procesoEventEmitter.emit("server_event", {
            action: "add_lote",
        });

    }
}
