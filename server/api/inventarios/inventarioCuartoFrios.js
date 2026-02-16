import { procesoEventEmitter } from "../../../events/eventos.js";
import { ItemPalletRepository } from "../../Class/Contenedores.js";
import { CuartosFriosRepository } from "../../Class/Inventarios.js";
import { CuartosFrios } from "../../store/CuartosFrios.js";
import { executeQueryTask, executeTransactionalTask } from "../../utils/wrappers.js";
import { InventariosValidations } from "../../validations/inventarios.js";
import { registrarPasoLog } from "../helper/logs.js";

export class InventarioCuartoFriosController {
    static async get_inventarios_cuartosFrios() {
        return await executeQueryTask(async () => {
            return await CuartosFrios.get_cuartosFrios();
        })
    }
    static async get_inventarios_cuartosFrios_listaEmpaque() {
        return await executeQueryTask(async () => {
            const cuartosFrios = await CuartosFrios.get_cuartosFrios({ select: { inventario: 1, nombre: 1 } });
            const inventarioTotal = []
            const infoCuartos = []
            for (const cuarto of cuartosFrios) {
                inventarioTotal.push(...cuarto.inventario)
                infoCuartos.push({ _id: cuarto._id, nombre: cuarto.nombre })
            }
            return { inventarioTotal, infoCuartos }
        })
    }
    static async get_inventarios_cuartosFrios_detalles(req) {
        return await executeQueryTask(async () => {
            const { data } = req.data
            const itemPallets = await ItemPalletRepository.get_data({
                query: { _id: data.inventario },
                populate: [
                    { path: "contenedor", select: "numeroContenedor" },
                    { path: "pallet", select: "numeroPallet" },
                    {
                        path: 'lote',
                        select: 'enf predio',
                        populate: {
                            path: 'predio',
                            select: 'PREDIO',

                        }
                    }
                ]
            });
            return itemPallets
        })
    }
    static async put_inventarios_cuartosFrios_salida_item(req) {
        const { user } = req;
        if (!user || !user._id) {
            throw new Error("No se encontró el usuario")
        }
        await executeTransactionalTask(req, async (session, log) => {
            const parseData = InventariosValidations.put_inventarios_cuartosFrios_salida_item().parse(req.data.data)

            const { itemsIds, cuartoId } = parseData
            const fecha = new Date();
            let operation = "";
            const idsLimpios = []
            const incObj = {}

            const cuartosFrios = await CuartosFriosRepository.get_data({ query: { _id: cuartoId } }, { session });
            if (cuartosFrios.length === 0) throw new Error("No se encontró el cuarto frío");
            const cuartoFrio = cuartosFrios[0];
            await registrarPasoLog(log, "Salida de cajas del cuarto " + cuartoFrio.nombre, "Salida", "Cajas", "Cuarto frío", user._id, session)
            for (const itemId of itemsIds) {
                let item = null
                try {
                    item = await ItemPalletRepository.actualizar_data(
                        { _id: itemId, fecha_salida_cuartoFrio: { $exists: false } },
                        { fecha_salida_cuartoFrio: fecha },
                        { session }
                    )
                } catch {
                    continue
                }
                if (!item) continue

                idsLimpios.push(item._id)
                const { cajas, tipoCaja, tipoFruta, kilos } = item

                if (!incObj[`totalFruta.${tipoFruta._id}.kilos`]) incObj[`totalFruta.${tipoFruta._id}.kilos`] = 0;
                if (!incObj[`totalFruta.${tipoFruta._id}.cajas`]) incObj[`totalFruta.${tipoFruta._id}.cajas`] = 0;

                incObj[`totalFruta.${tipoFruta._id}.kilos`] -= Number.isFinite(kilos) && kilos > 0 ? kilos : 0;
                incObj[`totalFruta.${tipoFruta._id}.cajas`] -= Number.isFinite(cajas) && cajas > 0 ? cajas : 0;
                operation += `${cajas} cajas de ${tipoCaja}, `
            }
            await registrarPasoLog(log, "Salida de cajas del cuarto " + cuartoFrio.nombre, "Salida", "Cajas", "Cuarto frío", user._id, session)
            if (idsLimpios.length === 0) throw new Error("No se encontraron items válidos para dar salida del cuarto frío");

            await CuartosFrios.actualizar_cuartoFrio(
                { _id: cuartoId },
                {
                    $pull: { inventario: { $in: idsLimpios } },
                    $inc: incObj
                },
                {
                    action: "Salida",
                    operation: operation,
                    description: 'Salida de cajas del cuarto ' + cuartoFrio.nombre,
                    user: user._id,
                    session
                }
            );
            await registrarPasoLog(log, "Salida de cajas del cuarto " + cuartoFrio.nombre, "Salida", "Cajas", "Cuarto frío", user._id, session)
        })

        procesoEventEmitter.emit("server_event", {
            action: "lista_empaque_update",
        });
        procesoEventEmitter.emit("listaempaque_update");

        return true
    }
}