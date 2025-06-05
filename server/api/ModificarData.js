import { procesoEventEmitter } from "../../events/eventos.js";
import { VariablesDelSistema } from "../Class/VariablesDelSistema.js";

export class ModificarRepository {
    static async put_inventarioLogistica_frutaSinProcesar_modificar_canastillas(req) {
        const { data } = req
        const { _id, canastillas } = data
        await VariablesDelSistema.ingresarInventario(_id, canastillas)
        procesoEventEmitter.emit("server_event", {
            section: "inventario_fruta_sin_procesar",
            action: "modificar_inventario",
            data: {}
        });

    }
}
