import { procesoEventEmitter } from "../../../events/eventos.js";
import { ItemPalletRepository } from "../../Class/Contenedores.js";
import { CuartosFriosRepository } from "../../Class/Inventarios.js";
import { have_lote_GGN_export } from "../../controllers/validations.js";
import { executeTransactionalTask } from "../../utils/wrappers.js";
import { ProcesoValidations } from "../../validations/proceso.js";
import { registrarPasoLog } from "../helper/logs.js";

export class ListaEmpaqueController {
    static async put_proceso_pallet_eviarCuartoFrio(req) {
        const { user } = req;
        if (!user || !user._id) throw new Error("Usuario no identificado");

        await executeTransactionalTask(req, async (session, log) => {

            const parseData = ProcesoValidations.put_proceso_pallet_eviarCuartoFrio().parse(req.data.data);

            const { seleccion, cuartoFrio: cuartoFrioId } = parseData;
            let tipoFrutaObj = {}
            let operation = "";
            const idsLimpios = []


            const newDate = new Date();
            const cuartosFrios = await CuartosFriosRepository.get_data({ query: { _id: cuartoFrioId } }, { session });
            if (cuartosFrios.length === 0) throw new Error("No se encontraron cuartos frios");
            const cuartoFrio = cuartosFrios[0];
            if (!cuartoFrio.inventario) throw new Error("El cuarto frio no tiene inventario");

            for (const itemId of seleccion) {
                let item = null;
                try {
                    item = await ItemPalletRepository.actualizar_data(
                        { _id: itemId, fecha_cuartofrio: { $exists: false } },
                        { fecha_cuartofrio: newDate, },
                        { session, new: true }
                    );
                } catch {
                    continue;
                }
                if (!item) continue;

                idsLimpios.push(item._id);
                const { cajas, tipoCaja, tipoFruta, kilos } = item;
                if (!tipoFrutaObj[`totalFruta.${tipoFruta._id}.cajas`]) tipoFrutaObj[`totalFruta.${tipoFruta._id}.cajas`] = 0;
                if (!tipoFrutaObj[`totalFruta.${tipoFruta._id}.kilos`]) tipoFrutaObj[`totalFruta.${tipoFruta._id}.kilos`] = 0;

                tipoFrutaObj[`totalFruta.${tipoFruta._id}.cajas`] += Number.isFinite(cajas) && cajas > 0 ? cajas : 0;
                tipoFrutaObj[`totalFruta.${tipoFruta._id}.kilos`] += (Number.isFinite(kilos) && kilos > 0 ? kilos : 0);
                operation += `${cajas} cajas de ${tipoCaja}, `
            }

            if (idsLimpios.length === 0) throw new Error("No se encontraron items válidos para enviar a cuarto frío");

            await CuartosFriosRepository.actualizar_data(
                { _id: cuartoFrio._id },
                {
                    $addToSet: {
                        inventario: { $each: idsLimpios }
                    },
                    $inc: tipoFrutaObj
                },
                {
                    action: "Ingreso",
                    operation: operation,
                    description: 'Se agregó cajas a ' + cuartoFrio.nombre,
                    user: user._id,
                    session
                }
            );

            await registrarPasoLog(log._id, "Operación completada exitosamente", "Completado", null, { session });
        });


        procesoEventEmitter.emit("server_event", {
            action: "lista_empaque_update",
        });
        procesoEventEmitter.emit("listaempaque_update");

        return true;
    }
    static async put_proceso_aplicaciones_listaEmpaque_agregarItem(req) {
        const { user } = req;
        if (!user || !user._id) throw new Error("Usuario no identificado");

        await executeTransactionalTask(req, async (session, log) => {

            const parseData = ProcesoValidations.put_proceso_aplicaciones_listaEmpaque_agregarItem().parse(req.data)
            const { _id, pallet, item } = parseData;
            const { lote, calidad, tipoFruta, calibre, cajas, tipoCaja } = item

            const { contenedor, lotes } = await ProcesoService.getContenedorAndLote(lote, _id, session);

            if (checkFinalizadoLote(lotes[0])) {
                throw new ProcessError(400, `El lote ${lotes[0].enf} ya se encuentra finalizado, no se puede modificar`);
            }

            const GGN = have_lote_GGN_export(lotes[0], contenedor[0], item)
            await registrarPasoLog(log._id, "Revisa si tiene GGN", "Completado", `Tiene GGN: ${GGN}`);

            const kilos = Number(tipoCaja.split('-')[1].replace(",", ".")) * cajas
            await registrarPasoLog(log._id, "ProcesoService.crearCopiaProfundaPallets", "Completado");

            await ProcesoService.modificarLoteListaEmpaqueAddItem(item, kilos, _id, logData, session)
            await ProcesoService.modifiarContenedorPalletsListaEmpaque(lotes, pallet, item, kilos, _id, GGN, logData, session)
            await ProcesoService.ingresarDataExportacionDiaria(tipoFruta, calidad, calibre, kilos, logData)
        });

        procesoEventEmitter.emit("server_event", {
            action: "lista_empaque_update",
        });
        procesoEventEmitter.emit("listaempaque_update");


    }
}