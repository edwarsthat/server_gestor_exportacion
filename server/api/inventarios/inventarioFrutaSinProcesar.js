import { procesoEventEmitter } from "../../../events/eventos.js";
import { InventariosHistorialRepository } from "../../Class/Inventarios.js";
import { LotesHelper } from "../../helper/lotes.js";
import { InventariosService } from "../../services/inventarios.js";
import { registrarPasoLog } from "../helper/logs.js";
import { IndicadoresAPIRepository } from "../IndicadoresAPI.js";
import { InventariosValidations } from "../../validations/inventarios.js";
import { LotesRepository } from "../../Class/Lotes.js";
import { executeQueryTask, executeTransactionalTask } from "../../utils/wrappers.js";
import config from "../../../src/config/index.js";
import { buildDateRangeFilter } from "../utils/filtros.js";


export class InventarioFrutaSinProcesarController {
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
    static async put_inventarios_frutaSinProcesar_directoNacional(req) {
        const { user } = req;
        InventariosValidations.put_inventarios_frutaSinProcesar_directoNacional().parse(req.data);

        await executeTransactionalTask(req, async (session, log) => {
            if (!user._id) {
                throw new Error("No se encontró el usuario en la base de datos");
            }
            const { data, lote, action, __v } = req.data
            const loteId = lote._id || data.lote;

            const checkVersion = await InventariosService.check_inventarioVersion(config.INVENTARIO_FRUTA_SIN_PROCESAR, __v)
            if (!checkVersion) {
                throw new Error("La versión del inventario ha cambiado. Por favor, recargue la página e intente de nuevo.");
            }

            const itemInOrdenVaceo = await InventariosService.item_in_ordenVaceo(loteId)
            if (!itemInOrdenVaceo) {
                throw new Error("El lote ya está en la orden de vaceo, no se puede procesar como directo nacional.");
            }

            if (
                !data.canastillas ||
                data.canastillas <= 0 ||
                !isFinite(data.canastillas) ||
                isNaN(data.canastillas)) {
                throw new Error("El valor de canastillas debe ser mayor a 0.");
            }

            const kilos = lote.promedio * data.canastillas;
            if (kilos > lote.kilos) {
                throw new Error("No se puede procesar más kilos de los que hay en el lote.");
            }
            if (typeof kilos !== "number" || isNaN(kilos) || !isFinite(kilos)) {
                throw new Error("El valor de kilos debe ser un número.");
            }
            const queryLote = {
                $inc: {
                    directoNacional: kilos,
                    kilosProcesados: kilos,
                },
                infoSalidaDirectoNacional: {
                    ...data,
                    user: user._id,
                }
            };

            await LotesRepository.actualizar_lote(
                { _id: loteId },
                queryLote,
                { new: true, user: user, action: action, session: session, calculateFields: true }
            );
            await registrarPasoLog(log._id, "LotesRepository.actualizar_lote", "Completado", `Lote ${loteId} actualizado con directoNacional: ${lote.promedio * data.canastillas}`);

            const descripcion = `Directo Nacional - Canastillas decrementadas: ${data.canastillas}`
            await InventariosService.modificarRestarInventarioFrutaSinProocesar(data.canastillas, user, action, lote, session, descripcion);
        });

        procesoEventEmitter.emit("server_event", {
            action: "directo_nacional",
            data: {}
        });
    }
    static async get_inventarios_historialDirectoNacional_registros(req) {
        return await executeQueryTask(async () => {
            const { data } = req
            if (!data.filtro || (!data.filtro.fechaInicio && !data.filtro.fechaFin)) {
                throw new Error("No se proporcionó ningún filtro.");
            }
            const { fechaInicio, fechaFin } = data.filtro
            const queryBase = {
                infoSalidaDirectoNacional: { $exists: true }
            }

            const query = buildDateRangeFilter(fechaInicio, fechaFin, 'infoSalidaDirectoNacional.fecha', queryBase)

            const lotes = await LotesRepository.get_data({
                query: query,
                select: {
                    enf: 1,
                    promedio: 1,
                    tipoFruta: 1,
                    __v: 1,
                    infoSalidaDirectoNacional: 1,
                    directoNacional: 1
                },
                limit: 500,
                populate: [
                    { path: 'predio', select: 'PREDIO' },
                    { path: 'tipoFruta' },
                    { path: "infoSalidaDirectoNacional.user", select: "usuario nombre apellido" }
                ]
            });

            return lotes
        });
    }
}