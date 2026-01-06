import { db } from "../../../DB/mongoDB/config/init.js";
import { InventariosLogicError } from "../../../Error/logicLayerError.js";
import { InventariosHistorialRepository } from "../../Class/Inventarios.js";
import { LogsRepository } from "../../Class/LogsSistema.js";
import { LotesRepository } from "../../Class/Lotes.js";
import { LotesHelper } from "../../helper/lotes.js";
import { registrarPasoLog } from "../helper/logs.js";
import { ErrorInventarioLogicHandlers } from "../utils/errorsHandlers.js";
import { filtroFechaInicioFin } from "../utils/filtros.js";

export class InventarioDescarteController {
    static async get_inventarios_historiales_registros_ingresosDescartes(req) {
        try {
            const { data } = req
            const { fechaInicio, fechaFin, tipoFruta, EF, areaSeleccion, descarte } = data.filtro
            let lote
            let query = {
                estado: 'ACTIVO',
                loteType: { $in: ["Lote", "Loteef8"] },
            }
            if (tipoFruta) query.tipoFruta = tipoFruta;
            if (areaSeleccion) query.area = areaSeleccion
            if (descarte) query.tipoDescarte = descarte

            query = filtroFechaInicioFin(fechaInicio, fechaFin, query, 'fechaIngreso')

            if (EF !== "") {
                lote = await LotesRepository.getLotes2({
                    query: {
                        enf: EF,
                    },
                    select: { enf: 1 }
                })

                if (lote.length === 0) {
                    throw new InventariosLogicError(470, `Error ${err.type}: ${err.message}`)
                } else {
                    query.lote = lote[0]._id
                }
            }

            const inventario = await InventariosHistorialRepository.get_inventario_descarteMaquila_generico({
                query,
                sort: { createdAt: -1 },
                populate: [
                    { path: 'tipoFruta', select: "tipoFruta" },
                    { path: 'lote', select: "enf" },
                    { path: 'tipoDescarte', select: "nombre inventario descripcion" },
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
    static async put_inventarios_inventarioDescarte_modificar_ingreso(req) {
        const { user } = req
        const { action, _id, kilosIniciales } = req.data
        let log
        log = await LogsRepository.create({
            user: user._id,
            action: action,
            acciones: [{ paso: "Inicio de la función", status: "Iniciado", timestamp: new Date() }]
        })

        const session = await db.InventarioActualDescarte.db.startSession();

        try {
            await session.withTransaction(async () => {
                const itemModificado = await InventariosHistorialRepository.actualizar_ingreso_descarte(
                    { _id: _id },
                    { kilosIniciales: kilosIniciales, kilosActuales: kilosIniciales },
                    { session }
                )
                await registrarPasoLog(log?._id, "InventariosHistorialRepository.actualizar_ingreso_descarte", `Se actualizó el ingreso del descarte ${_id}`);
                // Crear movimiento de MODIFICACION adicional
                await db.InventarioMovimientoDescarte.create([{
                    registroDescarte: itemModificado._id,
                    tipoMovimiento: 'MODIFICACION',
                    tipoRegistro: itemModificado.loteType,
                    kilos: itemModificado.kilosIniciales,
                    kilosRestantes: itemModificado.kilosActuales,
                    fechaMovimiento: new Date(),
                    user: user,
                    destino: `INVENTARIO_${itemModificado.area}`
                }], { session });
                await registrarPasoLog(log?._id, "db.InventarioMovimientoDescarte.create", `Se creó el movimiento de MODIFICACION adicional para el descarte ${_id}`);

                console.log(itemModificado)
                await LotesHelper.actualizar_lotes_helper(
                    itemModificado.lote,
                    { [`descartes.${itemModificado.tipoDescarte._id}`]: itemModificado.kilosActuales },
                    session
                )
                await registrarPasoLog(log?._id, "LotesHelper.actualizar_lotes_helper", `Se actualizó el lote ${itemModificado.lote}`);
            })

        } catch (error) {
            console.error(`[ERROR][${new Date().toISOString()}]`, error);
            await ErrorInventarioLogicHandlers(error, log)
        } finally {
            await registrarPasoLog(log?._id, "Finalizado", "Iniciado", "Finalizado");
            await session.endSession();
        }
    }
}