import { executeQueryTask, executeTransactionalTask } from "../../utils/wrappers.js";
import { InventariosValidations } from "../../validations/inventarios.js";
import { ContenedoresRepository } from "../../Class/Contenedores.js";
import { registrarPasoLog } from "../helper/logs.js";
import { contenedorEmitter } from "../../../events/emitters.js";

export class ProgramacionesController {
    static async get_inventarios_programaciones_contenedores(req) {

        return await executeQueryTask(async () => {
            const parseReq = InventariosValidations.get_inventarios_programaciones_contenedores().parse(req.data);
            const { semanas } = parseReq;

            semanas.map(({ week, year }) => {
                const start = new Date(year, 0, 1);

                const daysOffset = (week - 1) * 7;
                start.setDate(start.getDate() + daysOffset);

                // (getDay() devuelve 0 para domingo, lo cambiamos a 7 para que la resta funcione)
                const dayOfWeek = start.getDay() || 7;
                start.setDate(start.getDate() - dayOfWeek + 1);
                start.setHours(0, 0, 0, 0);

                const end = new Date(start);
                end.setDate(start.getDate() + 6);
                end.setHours(23, 59, 59, 999);

                return {
                    "infoContenedor.fechaInicio": { $gte: start, $lte: end }
                };
            });

            const response = await ContenedoresRepository.get_Contenedores_sin_lotes({
                query: {
                    numeroContenedor: { $exists: true },
                    cancelado: false
                },
                select: { infoContenedor: 1, numeroContenedor: 1, __v: 1, GGN: 1, pais_destino: 1 },
                populate: [
                    {
                        path: "infoContenedor.clienteInfo",
                        select: "CLIENTE"
                    },
                    {
                        path: "infoContenedor.calidadData",
                        select: "nombre"
                    }
                ]
            });
            return response;
        })
    }
    static async get_inventarios_ordenesDeCompra() {
        return await executeQueryTask(async () => {
            const query = {
                "numeroContenedor": { $exists: false },
                "cancelado": false
            };
            const response = await ContenedoresRepository.get_data({
                select: { infoContenedor: 1, ordenCompra: 1, __v: 1, GGN: 1, pais_destino: 1 },
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
                        path: "infoContenedor.pais_destino",
                        select: "nombre"
                    },
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
    static async put_inventarios_programaciones_asignar_contenedor(req) {
        const { user } = req;
        if (!user || !user._id) {
            throw new Error("Usuario no autenticado");
        }
        await executeTransactionalTask(req, async (session, log) => {
            const parseData = InventariosValidations.put_inventarios_programaciones_asignar_contenedor().parse(req.data)
            const { data } = parseData;

            await ContenedoresRepository.actualizar_data(
                { _id: data.ordenId },
                {
                    $set: {
                        numeroContenedor: data.numeroContenedor,
                        "infoContenedor.fechaInicio": data.fecha,
                    }
                },
                { user: user._id, session }
            )
            await registrarPasoLog(log._id, "ContenedoresRepository.actualizar_data", "Completado");
            contenedorEmitter.emit(
                "crearOrdenCompra", {
                action: 'put_inventarios_programaciones_asignar_contenedor',
                _id: data.ordenId,
                numeroContenedor: data.numeroContenedor,
                "infoContenedor.fechaInicio": data.fecha
            });
        })
    }
    static async delete_inventarios_cancelar_ordenCompra(req) {
        const { user } = req;
        if (!user || !user._id) {
            throw new Error("Usuario no autenticado");
        }
        await executeTransactionalTask(req, async (session, log) => {
            const parseData = InventariosValidations.delete_inventarios_cancelar_ordenCompra().parse(req.data)
            const { _id } = parseData
            await ContenedoresRepository.actualizar_data(
                { _id: _id },
                {
                    $set: {
                        cancelado: true,
                    }
                },
                { user: user._id, session }
            )
            await registrarPasoLog(log._id, "ContenedoresRepository.actualizar_data", "Completado");
            contenedorEmitter.emit(
                "crearOrdenCompra", {
                action: 'delete_inventarios_cancelar_ordenCompra',
                _id: _id
            });

        })
    }
}