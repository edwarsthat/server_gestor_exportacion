import { InventariosHistorialRepository } from "../Class/Inventarios.js";
import config from "../../src/config/index.js";

export class InventarioSimpleHelper {
    static async set_inventario_fruta_sin_procesar(_id, canastillas, user, session) {
        const inventarioFrutaSinProcesarId = config.INVENTARIO_FRUTA_SIN_PROCESAR;
        const options = {
            session,
            user,
            action: `Actualizar inventario fruta sin procesar - Lote: ${_id}, Canastillas: ${canastillas}`
        };
        // Intentar actualizar en inventario normal usando operador posicional
        let resultado = await InventariosHistorialRepository.put_inventarioSimple(
            {
                _id: inventarioFrutaSinProcesarId,
                "inventario.lote": _id
            },
            {
                $set: { "inventario.$.canastillas": Number(canastillas) },
                $inc: { __v: 1 }
            },
            options
        );
        if (resultado && resultado.modifiedCount > 0) {
            return { tipo: 'normal', actualizado: true };
        }

        // Intentar actualizar en inventarioMaquila
        resultado = await InventariosHistorialRepository.put_inventarioSimple(
            {
                _id: inventarioFrutaSinProcesarId,
                "inventarioMaquila.lote": _id
            },
            {
                $set: { "inventarioMaquila.$.canastillas": Number(canastillas) },
                $inc: { __v: 1 }
            },
            options
        );
        if (resultado && resultado.modifiedCount > 0) {
            return { tipo: 'maquila', actualizado: true };
        }

        // No existe, agregarlo a inventario normal
        await InventariosHistorialRepository.put_inventarioSimple(
            { _id: inventarioFrutaSinProcesarId },
            {
                $push: { inventario: { lote: _id, canastillas: Number(canastillas) } },
                $inc: { __v: 1 }
            },
            options
        );
        return { tipo: 'normal', creado: true };
    }
}