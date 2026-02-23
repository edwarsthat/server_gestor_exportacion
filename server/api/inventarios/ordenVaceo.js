import config from "../../../src/config/index.js";
import mongoose from "mongoose";
import { InventariosHistorialRepository } from "../../Class/Inventarios.js";
import { executeQueryTask, executeTransactionalTask } from "../../utils/wrappers.js";
import { IndicadoresAPIRepository } from "../IndicadoresAPI.js";
import { LotesHelper } from "../../helper/lotes.js";
import { InventariosValidations } from "../../validations/inventarios.js";
import { InventariosService } from "../../services/inventarios.js";
import { registrarPasoLog } from "../helper/logs.js";
import { procesoEventEmitter } from "../../../events/eventos.js";
import { EventsController } from "../events.js";
import { InventariosRepository } from "../inventarios.js";


export class OrdenVaceoController {
    static async get_inventarios_ordenVaceo_inventario() {
        return await executeQueryTask(async () => {
            const inventarioID = config.INVENTARIO_FRUTA_SIN_PROCESAR;
            if (!inventarioID) {
                throw new Error("No se encontró el inventario");
            }
            const [resultado, resultadoMaquila] = await Promise.all([
                InventariosHistorialRepository.getInventarioFrutaSinProcesar({
                    ids: [inventarioID]
                }),
                InventariosHistorialRepository.getInventarioFrutaSinProcesarMaquila({
                    ids: [inventarioID]
                })
            ]);
            const concatResult = resultado.concat(resultadoMaquila);
            return concatResult
        })
    }
    static async put_inventarios_ordenVaceo_vacear(req) {
        const { user, data } = req;
        let lote

        InventariosValidations.put_inventarios_ordenVaceo_vacear().parse(data);
        const { _id, kilosVaciados, action } = data;

        await executeTransactionalTask(req, async (session, log) => {

            const loteAnterior = await InventariosService.probar_deshidratacion_loteProcesando(user)
            await registrarPasoLog(log._id, "InventariosService.probar_deshidratacion_loteProcesando", "Completado");

            // Obtener datos del ítem para saber cuántas canastillas restar
            const item = await InventariosHistorialRepository.get_item_frutaSinProcesar(_id);
            if (!item || !item.canastillas) {
                throw new Error("No se encontró el item en el inventario");
            }

            // Actualizar lote actual (Kilos y Estado)
            const query = {
                $inc: {
                    kilosVaciados: kilosVaciados,
                },
                finalizado: false,
                fechaProceso: new Date()
            }
            lote = await LotesHelper.actualizar_lotes_helper(
                { _id: _id },
                query,
                {
                    user: user._id, action: "vaciarLote", canastillas: item.canastillas,
                    vaciar: true, session
                }
            )
            await registrarPasoLog(log._id, "LotesRepository.modificar_lote", "Completado", `Se modificó el lote con ID ${_id} para vaciarlo, kilosVaciados: ${kilosVaciados}`);

            const descripcion = `Vaceo - Canastillas decrementadas: ${item.canastillas}`
            await InventariosService.modificarRestarInventarioFrutaSinProocesar(parseInt(item.canastillas), user, action, lote, session, descripcion);
            console.log("item", item)
            await InventariosHistorialRepository.put_borrar_item_ordenVaceo(item.lote, session);
            await registrarPasoLog(
                log._id,
                "InventariosHistorialRepository.put_borrar_item_ordenVaceo",
                "Completado",
                `Se eliminó el item ${item._id} del inventario de fruta sin procesar`);

            if (loteAnterior !== null) {
                await LotesHelper.actualizar_lotes_helper(
                    { _id: loteAnterior._id },
                    { finalizado: true },
                    { user: user, action: "finalizado", session }
                );
                await registrarPasoLog(log._id, "LotesHelper.actualizar_lote", "Completado", `Se actualizó el lote ${loteAnterior._id} a finalizado: true`);
            }

            if (!lote || !lote.tipoFruta || !lote.tipoFruta._id) {
                throw new Error("No se encontró el lote en la base de datos");
            }
            await IndicadoresAPIRepository.put_indicadores_actualizar_indicador(
                { $inc: { [`kilos_vaciados.${lote.tipoFruta._id.toString()}`]: Number(kilosVaciados) } }, session
            );
            await registrarPasoLog(log._id, "IndicadoresAPIRepository.put_indicadores_actualizar_indicador", "Completado", `Se actualizó el indicador kilos_vaciados con ${kilosVaciados} kilos del tipo de fruta ${lote.tipoFruta._id.toString()}`);
        })

        //para el dashboard/SmartTV
        EventsController.emitSnapshot();

        //para lista de empaque
        procesoEventEmitter.emit("predio_vaciado", {
            predio: lote
        });
        //para el desktop app
        procesoEventEmitter.emit("server_event", {
            action: "inventario_frutaSinProcesar",
            data: {
                predio: lote
            }
        });
    }
    static async get_inventarios_ordenVaceo_ordenVaceo() {
        return await executeQueryTask(async () => {
            return await InventariosRepository.get_inventarios_ordenVaceo()
        })
    }
    static async put_inventarios_ordenVaceo_modificar(req) {
        const { user } = req;
        if (!user || !user._id) {
            throw new Error("No se encontró el usuario en la petición");
        }

        await executeTransactionalTask(req, async (session, log) => {
            const { data, __v } = req.data;
            // Validar data
            if (!Array.isArray(data)) {
                throw new Error("El campo 'data' debe ser un array");
            }
            //se valida que los ids sean validos
            const ids = data.map(id => {
                if (typeof id !== 'string' || !mongoose.Types.ObjectId.isValid(id)) {
                    throw new Error(`ID inválido: ${id}`);
                }
                return new mongoose.Types.ObjectId(id);
            });

            // Validar __v
            if (typeof __v !== 'number') {
                throw new Error("El campo '__v' debe ser un número");
            }
            const inventarioID = config.INVENTARIO_ORDEN_VACEO;
            if (!inventarioID) {
                throw new Error("No se encontró el ID del inventario de orden de vaciado");
            }

            await InventariosHistorialRepository.put_inventarioSimple(
                { _id: inventarioID, __v: __v },
                { $set: { ordenVaceo: ids }, $inc: { __v: 1 } },
                { session, user: user._id, action: "ingreso_ordenVaceo", operation: "ingreso", skipAudit: false }
            );
            await registrarPasoLog(log._id, "InventariosHistorialRepository.put_inventarioSimple", "Completado");
        });
        procesoEventEmitter.emit("server_event", {
            action: "modificar_orden_vaceo",
            data: {}
        });
    }
}

