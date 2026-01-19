import { db } from "../../../DB/mongoDB/config/init.js";
import { procesoEventEmitter } from "../../../events/eventos.js";
import { InventariosHistorialRepository } from "../../Class/Inventarios.js";
import { LogsRepository } from "../../Class/LogsSistema.js";
import { LotesHelper } from "../../helper/lotes.js";
import { InventariosService } from "../../services/inventarios.js";
import { registrarPasoLog } from "../helper/logs.js";
import { IndicadoresAPIRepository } from "../IndicadoresAPI.js";
import { ErrorInventarioLogicHandlers } from "../utils/errorsHandlers.js";

export class InventarioFrutaSinProcesarController {
    static async put_inventarios_ordenVaceo_vacear(req) {
        let log
        const { user, data } = req;
        const { _id, kilosVaciados, action } = data;

        const session = await db.Lotes.db.startSession();

        if (!session) {
            throw new Error("No se pudo iniciar la sesión en la base de datos de catálogos");
        }

        log = await LogsRepository.create({
            user: user,
            action: action,
            acciones: [{ paso: "Inicio de la función", status: "Iniciado", timestamp: new Date() }]
        });
        try {
            let lote
            const loteAnterior = await InventariosService.probar_deshidratacion_loteProcesando(user)
            await registrarPasoLog(log._id, "InventariosService.probar_deshidratacion_loteProcesando", "Completado");

            const query = {
                $inc: {
                    kilosVaciados: kilosVaciados,
                },
                finalizado: false,
                fechaProceso: new Date()
            }
            await session.withTransaction(async () => {

                const item = await InventariosHistorialRepository.get_item_frutaSinProcesar(_id);

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
                await InventariosService.modificarRestarInventarioFrutaSinProocesar(parseInt(item.canastillas), user, action, lote, log, session, descripcion);
                await InventariosHistorialRepository.put_borrar_item_ordenVaceo(session);
                await registrarPasoLog(
                    log._id,
                    "InventariosHistorialRepository.put_borrar_item_ordenVaceo",
                    "Completado",
                    `Se eliminó el item ${item._id} del inventario de fruta sin procesar`);

                if (loteAnterior !== null) {
                    await LotesHelper.actualizar_lote(
                        { _id: loteAnterior._id },
                        { finalizado: true },
                        { user: user, action: "finalizado", session }
                    );
                    await registrarPasoLog(log._id, "LotesRepository.actualizar_lote", "Completado", `Se actualizó el lote ${loteAnterior._id} a finalizado: true`);
                }

                await IndicadoresAPIRepository.put_indicadores_actualizar_indicador(
                    { $inc: { [`kilos_vaciados.${lote.tipoFruta._id.toString()}`]: Number(kilosVaciados) } }, session
                );
                await registrarPasoLog(log._id, "IndicadoresAPIRepository.put_indicadores_actualizar_indicador", "Completado", `Se actualizó el indicador kilos_vaciados con ${kilosVaciados} kilos del tipo de fruta ${lote.tipoFruta._id.toString()}`);

            });

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
        } catch (error) {
            console.error(`[ERROR][${new Date().toISOString()}]`, error);
            await ErrorInventarioLogicHandlers(error, log)
        } finally {
            await session.endSession();
            await registrarPasoLog(log._id, "Finalizo la funcion", "Completado");
        }

    }
}