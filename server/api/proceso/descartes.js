import mongoose from "mongoose";
import { DescartesRepository } from "../../Class/Descartes.js";
import { FrutaProcesada } from "../../Class/frutaProcesada.js";
import { IndicadoresService } from "../../services/indicadores.js";
import { executeTransactionalTask } from "../../utils/wrappers.js";
import { ProcesoValidations } from "../../validations/proceso.js";
import { ProcesoService } from "../../services/proceso.js";
import { registrarPasoLog } from "../helper/logs.js";
import { procesoEventEmitter } from "../../../events/eventos.js";
import { InventariosHistorialRepository } from "../../Class/Inventarios.js";

export class DescartesControllers {
    static async put_proceso_aplicaciones_descarte(req) {
        const { user } = req;
        if (!user || !user._id) {
            throw new Error("No se encontró el usuario")
        }
        await executeTransactionalTask(req, async (session, log) => {
            const dataValidate = ProcesoValidations.put_proceso_aplicaciones_descarteEncerado().parse(req.data)

            const { action, data: inputData, registroFrutaProcesada, tipo } = dataValidate;
            const { descarte, canastillas, kilos } = inputData;

            //se obtiene el registro de fruta procesada y el descarte
            const [registroProcesoDocs, descartesDataDocs] = await Promise.all([
                FrutaProcesada.get_data({
                    ids: [registroFrutaProcesada],
                    populate: [
                        { path: 'tipoFruta', select: 'tipoFruta' }
                    ]
                }),
                DescartesRepository.get_data({ ids: [descarte] })
            ])
            //se valida que se haya encontrado el registro de fruta procesada y el descarte
            if (registroProcesoDocs.length === 0) {
                throw new Error("No se encontró el registro de fruta procesada")
            }
            if (descartesDataDocs.length === 0) {
                throw new Error("No se encontró el descarte")
            }
            //se valida que se haya encontrado el registro de fruta procesada y el descarte
            const registroProceso = registroProcesoDocs[0];
            if (!kilos && !canastillas) {
                throw new Error("No se encontró el peso o las canastillas")
            }

            const query = {
                $inc: {
                    kilosProcesados: kilos,
                    [`descartes.${descarte}`]: kilos
                }
            };
            //se modifica el lote
            const lote = await ProcesoService.modificarLotedescartes(registroProceso.loteId, query, user, action, session)
            await registrarPasoLog(log._id, "ProcesoService.modificarLotedescartes", "Completado", `Lote ID: ${registroProceso.loteId},`);
            if (!lote) {
                throw new Error("No se encontró el lote")
            }
            if (!lote.tipoFruta || !lote.tipoFruta._id) {
                throw new Error("No se encontró el tipo de fruta")
            }
            if (!mongoose.isValidObjectId(lote.tipoFruta._id)) {
                throw new Error("El tipo de fruta no es válido")
            }
            if (!lote.enf) {
                throw new Error("El lote no tiene enf")
            }
            //se ingresan los indicadores
            await IndicadoresService.put_indicadores_actualizar_indicador(
                { $inc: { [`kilos_procesados.${lote.tipoFruta._id.toString()}`]: kilos } }, session
            );
            await registrarPasoLog(
                log._id,
                "IndicadoresService.put_indicadores_actualizar_indicador",
                "Completado",
                `Se actualizó el indicador kilosProcesadosHoy con ${kilos} kilos del tipo de fruta ${lote.tipoFruta._id.toString()}`);
            //se crea el registro del descarte
            const data = {
                lote: lote._id,
                tipoFruta: lote.tipoFruta._id,
                area: tipo,
                tipoDescarte: descarte,
                kilos: kilos,
                canastillas: canastillas,
                loteType: registroProceso.loteType
            }
            await InventariosHistorialRepository.add_elemento_inventarioDescartes(data, user._id, { session });
            //se modifica el cardex de inventario descarte si aplica
            if (lote.enf.startsWith("EF1-") || lote.enf.startsWith("Celifrut-")) {
                await InventariosHistorialRepository.put_cardex_invetariosdescartes(
                    {},
                    {
                        $inc: {
                            [`kilos_ingreso.${lote.tipoFruta._id.toString()}.${tipo}.${descarte}`]: Number(kilos),
                        },
                    },
                    {
                        sort: { fecha: -1 },
                        new: true,
                        session,
                    }
                );
            }
            await registrarPasoLog(
                log._id,
                "Modificar inventario descartes",
                "Completado",
                `Se modificó el inventario de descarte y la métrica kilosProcesadosHoy con ${kilos} kilos del tipo de fruta ${lote.tipoFruta._id.toString()}`);
        });

        procesoEventEmitter.emit("server_event", {
            action: "descarte_change",
            data: {}
        });
    }
}