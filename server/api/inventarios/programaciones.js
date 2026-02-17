import { executeQueryTask, executeTransactionalTask } from "../../utils/wrappers.js";
import { InventariosValidations } from "../../validations/inventarios.js";
import { ContenedoresRepository } from "../../Class/Contenedores.js";
import { registrarPasoLog } from "../helper/logs.js";

export class ProgramacionesController {
    static async get_inventarios_programaciones_contenedores(req) {

        return await executeQueryTask(async () => {
            const parseReq = InventariosValidations.get_inventarios_programaciones_contenedores().parse(req.data);
            const { fecha } = parseReq;

            const fechaActual = new Date(fecha);
            const year = fechaActual.getUTCFullYear();
            const month = fechaActual.getUTCMonth();

            const startDate = new Date(Date.UTC(year, month, 1));
            const endDate = new Date(Date.UTC(year, month + 1, 1));

            const query = {
                "infoContenedor.fechaInicio": {
                    $gte: startDate,
                    $lt: endDate
                }
            };

            const response = await ContenedoresRepository.get_Contenedores_sin_lotes({
                select: { infoContenedor: 1, numeroContenedor: 1, __v: 1, GGN: 1, pais_destino: 1 },
                query: query,
                populate: [
                    {
                        path: "infoContenedor.tipoFruta",
                        select: "tipoFruta"
                    },
                    {
                        path: "infoContenedor.clienteInfo",
                        select: "CLIENTE"
                    },
                    {
                        path: "infoContenedor.calidad",
                        select: "nombre"
                    }
                ]
            });
            return response;
        })
    }
    static async put_inventarios_programacion_contenedores(req) {
        const { user } = req;
        if (!user || !user._id) {
            throw new Error("Usuario no autenticado");
        }
        await executeTransactionalTask(req, async (session, log) => {

            const parseData = InventariosValidations.put_inventarios_programacion_contenedores().parse(req.data);
            const { data, idContenedor } = parseData;

            const query = { $set: {} }
            const setObj = Reflect.get(query, '$set');

            Reflect.set(setObj, "GGN", data.GGN);
            Reflect.set(setObj, "pais_destino", data.pais_destino);
            delete data.GGN;
            delete data.pais_destino;

            Object.keys(data).forEach(key => {
                Reflect.set(setObj, `infoContenedor.${key}`, Reflect.get(data, key));
            })

            await ContenedoresRepository.actualizar_data(
                { _id: idContenedor },
                query,
                { user: user._id, session }
            );
            await registrarPasoLog(log._id, "ContenedoresRepository.actualizar_data", "Completado");
        })
    }
}