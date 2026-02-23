import { procesoEventEmitter } from "../../../events/eventos.js";
import { ContenedoresRepository, ItemPalletRepository } from "../../Class/Contenedores.js";
import { CuartosFriosRepository } from "../../Class/Inventarios.js";
import { have_lote_GGN_export } from "../../controllers/validations.js";
import { LotesHelper } from "../../helper/lotes.js";
import { ProcesoService } from "../../services/proceso.js";
import { executeTransactionalTask } from "../../utils/wrappers.js";
import { ProcesoValidations } from "../../validations/proceso.js";
import { registrarPasoLog } from "../helper/logs.js";
import { checkFinalizadoLote } from "../utils/lotesFunctions.js";

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
                throw new Error(`El lote ${lotes[0].enf} ya se encuentra finalizado, no se puede modificar`);
            }

            const GGN = have_lote_GGN_export(lotes[0], contenedor[0], item)
            await registrarPasoLog(log._id, "Revisa si tiene GGN", "Completado", `Tiene GGN: ${GGN}`);

            const kilos = Number(tipoCaja.split('-')[1].replace(",", ".")) * cajas
            await registrarPasoLog(log._id, "ProcesoService.crearCopiaProfundaPallets", "Completado");

            await ProcesoService.modificarLoteListaEmpaqueAddItem(item, kilos, _id, user._id, session)
            await registrarPasoLog(log._id, "ProcesoService.modifiarContenedorPalletsListaEmpaque", "Completado");
            await ProcesoService.modifiarContenedorPalletsListaEmpaque(lotes, pallet, item, kilos, _id, GGN, user._id, session)
            await registrarPasoLog(log._id, "ProcesoService.ingresarDataExportacionDiaria", "Completado");
            await ProcesoService.ingresarDataExportacionDiaria(tipoFruta, calidad, calibre, kilos)
            await registrarPasoLog(log._id, "Operación completada exitosamente", "Completado", null, { session });
        });

        procesoEventEmitter.emit("server_event", {
            action: "lista_empaque_update",
        });
        procesoEventEmitter.emit("listaempaque_update");


    }
    static async put_proceso_aplicaciones_listaEmpaque_moverItems(req) {
        const { user } = req
        if (!user || !user._id) throw new Error("Usuario no identificado")

        const { seleccionado, contenedor2, cajas, action } = req.data;

        if (seleccionado.length !== 0 && contenedor2.pallet !== "" && cajas === 0) {
            await this.mover_item_entre_contenedores(req, seleccionado, contenedor2, action, user);
        }

        else if (seleccionado.length !== 0 && contenedor2.pallet !== "" && cajas !== 0) {
            await this.restar_mover_contenedor_contenedor(req, seleccionado, contenedor2, cajas, action, user)
        }

        procesoEventEmitter.emit("listaempaque_update");

    }
    static async mover_item_entre_contenedores(req, seleccionado, contenedor2, action, user) {

        const { _id: id2, pallet: pallet2 } = contenedor2

        await executeTransactionalTask(req, async (session, log) => {

            const contenedores = await ProcesoService.obtenerContenedorLotesModificar(contenedor2, session)
            await registrarPasoLog(log._id, "ProcesoService.obtenerContenedorLotesModificar", "Completado");

            const newPallet = await ContenedoresRepository.getPallets({ query: { contenedor: id2, numeroPallet: pallet2 } }, session);

            if (newPallet.length === 0) {
                throw new Error(`El pallet ${pallet2} no existe en el contenedor ${contenedores[0].numeroContenedor}`);
            }
            const itemsPallet = await ContenedoresRepository.getItemsPallets({ ids: seleccionado }, session);
            if (itemsPallet.length !== seleccionado.length) {
                throw new Error(`Alguno de los items seleccionados no existe`);
            }
            const cont = await ContenedoresRepository.getContenedores({ ids: [id2] }, session);
            if (cont.length === 0) {
                throw new Error(`El contenedor del item seleccionado no existe`);
            }

            for (const idItem of itemsPallet) {

                // if (checkFinalizadoLote(idItem.lote)) {
                //     throw new ProcessError(400, `El lote ${idItem.lote.enf} ya se encuentra finalizado, no se puede modificar`);
                // }
                const GGN = have_lote_GGN_export(idItem.lote, cont[0])

                await ContenedoresRepository.actualizar_contenedor(
                    { _id: idItem.contenedor._id },
                    { $inc: { totalCajas: -idItem.cajas, totalKilos: -idItem.kilos } },
                    { session, new: true, action: action, user: user._id });

                const itemPallet = await ContenedoresRepository.actualizar_palletItem(
                    { _id: idItem._id },
                    { contenedor: id2, pallet: newPallet[0]._id, GGN: GGN },
                    { session, user: user._id, action: action }
                )

                await LotesHelper.actualizar_lotes_helper(
                    { _id: itemPallet.lote },
                    { $addToSet: { "salidaExportacion.contenedores": id2 } },
                    { session, user: user._id, action: action }
                );

                await ContenedoresRepository.actualizar_contenedor(
                    { _id: id2 },
                    { $inc: { totalCajas: idItem.cajas, totalKilos: idItem.kilos } },
                    { session, new: true, action: action, user: user._id });

            }

            await registrarPasoLog(log._id, "ContenedoresRepository.actualizar_palletItem", "Completado");
        })

        procesoEventEmitter.emit("server_event", {
            action: "lista_empaque_update",
        });
        procesoEventEmitter.emit("listaempaque_update");
    }
    static async restar_mover_contenedor_contenedor(req, seleccionado, contenedor2, cajas, action, user) {

        const { _id: id2, pallet: pallet2 } = contenedor2

        await executeTransactionalTask(req, async (session, log) => {


            const contenedores = await ProcesoService.obtenerContenedorLotesModificar(contenedor2, session)
            await registrarPasoLog(log._id, "ProcesoService.obtenerContenedorLotesModificar", "Completado");

            const newPallet = await ContenedoresRepository.getPallets({ query: { contenedor: id2, numeroPallet: pallet2 } }, session);

            if (newPallet.length === 0) {
                throw new Error(`El pallet ${pallet2} no existe en el contenedor ${contenedores[0].numeroContenedor}`);
            }
            const oldItemPallet = await ContenedoresRepository.getItemsPallets({ query: { _id: seleccionado[0] } }, session);
            if (oldItemPallet.length === 0) {
                throw new Error(`El item seleccionado no existe`);
            }
            if (cajas > oldItemPallet[0].cajas) {
                throw new Error(`No se pueden mover ${cajas} cajas, el item solo tiene ${oldItemPallet[0].cajas} cajas`);
            }

            const kilos = cajas * Number(oldItemPallet[0].tipoCaja.split("-")[1].replace(",", "."));

            // if (checkFinalizadoLote(oldItemPallet[0].lote)) {
            //     throw new ProcessError(400, `El lote ${oldItemPallet[0].lote.enf} ya se encuentra finalizado, no se puede modificar`);
            // }
            const GGN = have_lote_GGN_export(oldItemPallet[0].lote, contenedores[0])

            if (cajas === oldItemPallet[0].cajas) {
                await ContenedoresRepository.deleteItemPallet({ _id: oldItemPallet[0]._id }, { session, action: action, user: user._id });
                await registrarPasoLog(log._id, "Contenedor actualizado", "Completado", `Contenedor ID: ${oldItemPallet[0].contenedor._id}, Cajas restadas: ${cajas}, Kilos restados: ${kilos}`);
            } else {
                await ContenedoresRepository.actualizar_palletItem(
                    { _id: oldItemPallet[0]._id },
                    { $inc: { cajas: -cajas, kilos: -kilos } },
                    { session, user: user._id, action: action }
                )
                await registrarPasoLog(log._id, "Contenedor actualizado", "Completado", `Contenedor ID: ${oldItemPallet[0].contenedor._id}, Cajas restadas: ${cajas}, Kilos restados: ${kilos}`);
            }

            await ContenedoresRepository.actualizar_contenedor(
                { _id: oldItemPallet[0].contenedor._id },
                { $inc: { totalCajas: -cajas, totalKilos: -kilos } },
                { session, new: true, action: action, user: user._id });

            await registrarPasoLog(log._id, "Contenedor actualizado", "Completado", `Contenedor ID: ${oldItemPallet[0].contenedor._id}, Cajas restadas: ${cajas}, Kilos restados: ${kilos}`);

            await ContenedoresRepository.actualizar_contenedor(
                { _id: id2 },
                { $inc: { totalCajas: cajas, totalKilos: kilos } },
                { session, new: true, action: action, user: user._id });

            await registrarPasoLog(log._id, "Contenedor actualizado", "Completado", `Contenedor ID: ${id2}, Cajas restadas: ${cajas}, Kilos restados: ${kilos}`);

            const newItem = {
                pallet: newPallet[0]._id,
                contenedor: id2,
                lote: oldItemPallet[0].lote._id,
                tipoCaja: oldItemPallet[0].tipoCaja,
                calidad: oldItemPallet[0].calidad._id,
                calibre: oldItemPallet[0].calibre,
                tipoFruta: oldItemPallet[0].tipoFruta,
                cajas: cajas,
                kilos: kilos,
                fecha: oldItemPallet[0].fecha,
                usuario: user._id,
                GGN: GGN,
                SISPAP: oldItemPallet[0].SISPAP,
                loteType: oldItemPallet[0].loteType,
            }
            await ContenedoresRepository.addItemPallet(newItem, session);

            await LotesHelper.actualizar_lotes_helper(
                { _id: oldItemPallet[0].lote._id },
                { $addToSet: { "salidaExportacion.contenedores": id2 } },
                { session, user: user._id, action: action }
            );
            await registrarPasoLog(log._id, "Lote actualizado", "Completado", `Lote ID: ${oldItemPallet[0].lote.enf}, Se agregó el contenedor: ${contenedores[0].numeroContenedor}`);
        });

        procesoEventEmitter.emit("server_event", {
            action: "lista_empaque_update",
        });
        procesoEventEmitter.emit("listaempaque_update");


    }
}