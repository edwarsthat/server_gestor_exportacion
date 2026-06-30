import { procesoEventEmitter } from "../../../events/eventos.js";
import { ContenedoresRepository, ItemPalletRepository } from "../../Class/Contenedores.js";
import { CuartosFriosRepository } from "../../Class/Inventarios.js";
import { have_lote_GGN_export } from "../../controllers/validations.js";
import { LotesHelper } from "../../helper/lotes.js";
import { ProcesoService } from "../../services/proceso.js";
import { AppError } from "../../utils/ErrorHandler.js";
import { executeTransactionalTask, executeQueryTask } from "../../utils/wrappers.js";
import { ProcesoValidations } from "../../validations/proceso.js";
import { registrarPasoLog } from "../helper/logs.js";
import { checkFinalizadoLote } from "../utils/lotesFunctions.js";

export class ListaEmpaqueController {
    static async put_proceso_pallet_eviarCuartoFrio(req) {
        const { user } = req;
        if (!user || !user._id) throw new AppError(401, "Usuario no identificado");

        await executeTransactionalTask(req, async (session, log) => {

            const parseData = ProcesoValidations.put_proceso_pallet_eviarCuartoFrio().parse(req.data.data);

            const { seleccion, cuartoFrio: cuartoFrioId } = parseData;
            let tipoFrutaObj = {}
            let operation = "";
            const idsLimpios = []


            const newDate = new Date();
            const cuartosFrios = await CuartosFriosRepository.get_data({ query: { _id: cuartoFrioId } }, { session });
            if (cuartosFrios.length === 0) throw new AppError(404, "No se encontraron cuartos frío");
            const cuartoFrio = cuartosFrios[0];
            if (!cuartoFrio.inventario) throw new AppError(422, "El cuarto frío no tiene inventario asignado");

            for (const itemId of seleccion) {
                let item = null;
                try {
                    item = await ItemPalletRepository.actualizar_data(
                        { _id: itemId, fecha_cuartofrio: { $exists: false } },
                        { $set: { fecha_cuartofrio: newDate } },
                        { session, returnDocument: 'after' }
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

            if (idsLimpios.length === 0) throw new AppError(422, "No se encontraron ítems válidos para enviar a cuarto frío");

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
        if (!user || !user._id) throw new AppError(401, "Usuario no identificado");

        await executeTransactionalTask(req, async (session, log) => {

            const parseData = ProcesoValidations.put_proceso_aplicaciones_listaEmpaque_agregarItem().parse(req.data)
            const { _id, pallet, item } = parseData;
            const { lote, calidad, tipoFruta, calibre, cajas, tipoCaja } = item

            const { contenedor, lotes } = await ProcesoService.getContenedorAndLote(lote, _id, session);

            if (checkFinalizadoLote(lotes[0])) {
                throw new AppError(409, `El lote ${lotes[0].enf} ya está finalizado y no se puede modificar`);
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
        if (!user || !user._id) throw new AppError(401, "Usuario no identificado")

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
                throw new AppError(404, `El pallet ${pallet2} no existe en el contenedor ${contenedores[0].numeroContenedor}`);
            }
            const itemsPallet = await ContenedoresRepository.getItemsPallets({ ids: seleccionado }, session);
            if (itemsPallet.length !== seleccionado.length) {
                throw new AppError(404, "Alguno de los ítems seleccionados no existe");
            }
            const cont = await ContenedoresRepository.getContenedores({ ids: [id2] }, session);
            if (cont.length === 0) {
                throw new AppError(404, "El contenedor de destino no existe");
            }
            const calibres = cont[0].infoContenedor.calibres.map(c => c.toString());

            for (const idItem of itemsPallet) {
                if (!calibres.includes(idItem.calibre.toString())) {
                    throw new AppError(400, `El ítem con calibre ${idItem.calibre} no está permitido en el contenedor ${cont[0].numeroContenedor}`);
                }
            }

            for (const idItem of itemsPallet) {

                // if (checkFinalizadoLote(idItem.lote)) {
                //     throw new ProcessError(400, `El lote ${idItem.lote.enf} ya se encuentra finalizado, no se puede modificar`);
                // }
                const GGN = have_lote_GGN_export(idItem.lote, cont[0])

                await ContenedoresRepository.actualizar_contenedor(
                    { _id: idItem.contenedor._id },
                    { $inc: { totalCajas: -idItem.cajas, totalKilos: -idItem.kilos } },
                    { session, returnDocument: 'after', action: action, user: user._id });

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
                    { session, returnDocument: 'after', action: action, user: user._id });

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
                throw new AppError(404, `El pallet ${pallet2} no existe en el contenedor ${contenedores[0].numeroContenedor}`);
            }
            const oldItemPallet = await ContenedoresRepository.getItemsPallets({ query: { _id: seleccionado[0] } }, session);
            if (oldItemPallet.length === 0) {
                throw new AppError(404, "El ítem seleccionado no existe");
            }
            if (cajas > oldItemPallet[0].cajas) {
                throw new AppError(422, `No se pueden mover ${cajas} cajas, el ítem solo tiene ${oldItemPallet[0].cajas} disponibles`);
            }

            const calibres = contenedores[0].infoContenedor.calibres.map(c => c.toString());
            if (!calibres.includes(oldItemPallet[0].calibre.toString())) {
                throw new AppError(400, `El ítem con calibre ${oldItemPallet[0].calibre} no está permitido en el contenedor ${contenedores[0].numeroContenedor}`);
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
                { session, returnDocument: 'after', action: action, user: user._id });

            await registrarPasoLog(log._id, "Contenedor actualizado", "Completado", `Contenedor ID: ${oldItemPallet[0].contenedor._id}, Cajas restadas: ${cajas}, Kilos restados: ${kilos}`);

            await ContenedoresRepository.actualizar_contenedor(
                { _id: id2 },
                { $inc: { totalCajas: cajas, totalKilos: kilos } },
                { session, returnDocument: 'after', action: action, user: user._id });

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
                user: user._id,
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
    static async put_proceso_aplicaciones_listaEmpaque_Cerrar(req) {
        const { user } = req;
        const { _id, action } = req.data;

        if (!user || !user._id) throw new AppError(401, "Usuario no identificado");

        await executeTransactionalTask(req, async (session, log) => {
            const itemPallets = await ItemPalletRepository.get_data(
                {
                    query: {
                        contenedor: _id
                    }
                },
                session
            );

            if (itemPallets.length === 0)
                throw new AppError(422, "El contenedor no tiene cajas registradas para exportación");

            const cajaSinCuartoFrio = itemPallets.find(item => !item.fecha_cuartofrio);
            if (cajaSinCuartoFrio)
                throw new AppError(422, "Todas las cajas deben pasar por cuarto frío antes de cerrar el contenedor");

            await ContenedoresRepository.actualizar_contenedor(
                { _id },
                {
                    'infoContenedor.cerrado': true,
                    'infoContenedor.fechaFinalizado': new Date(),
                },
                { user: user._id, action, session }
            );
            await registrarPasoLog(log._id, "ContenedoresRepository.actualizar_contenedor", "Completado");
        });
        procesoEventEmitter.emit("listaempaque_update");
    }
    static async get_proceso_aplicaciones_listaEmpaque_contenedores() {
        return await executeQueryTask(async () => {
            const contenedores = await ContenedoresRepository.get_Contenedores_sin_lotes({
                select: { numeroContenedor: 1, infoContenedor: 1, },
                query: {
                    'infoContenedor.cerrado': false,
                    numeroContenedor: { $exists: true, $ne: null },
                },
                populate: [
                    {
                        path: 'infoContenedor.clienteInfo',
                        select: 'CLIENTE',
                    },
                    {
                        path: 'infoContenedor.calidad',
                        select: 'nombre',
                    },
                ]
            });
            return contenedores
        });
    }
}