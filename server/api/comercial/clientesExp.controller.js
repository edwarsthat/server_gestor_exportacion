import mongoose from "mongoose";
import { ClientesRepository } from "../../Class/Clientes.js";
import { Seriales } from "../../Class/Seriales.js";
import { executeQueryTask, executeTransactionalTask } from "../../utils/wrappers.js";
import { ComercialValidationsRepository } from "../../validations/Comercial.js";
import { registrarPasoLog } from "../helper/logs.js";

export class ClientesExpController {
    static async get_comercial_clientes() {
        return await executeQueryTask(async () => {
            return await ClientesRepository.get_data({
                populate: [
                    {
                        path: 'PAIS_DESTINO.codigo'
                    }
                ]
            });
        });
    }
    static async post_comercial_clientes(req) {
        const { user } = req
        if (!user || !user._id) throw new Error("Usuario no encontrado")

        await executeTransactionalTask(req, async (session, log) => {
            const parseData = ComercialValidationsRepository.post_comercial_clientes().parse(req.data)
            const { data } = parseData
            const serial = await Seriales.modificar_seriales({ name: "Cliente" }, { $inc: { serial: 1 } }, { session })
            if (!serial || typeof serial.serial !== "number") {
                throw new Error("Error al obtener serial")
            }
            data.CODIGO = serial.serial
            await ClientesRepository.post_data(data, { user: user._id, session })
            await registrarPasoLog(log._id, "post_comercial_clientes", "Completado")
        })
    }
    static async put_comercial_clientes(req) {
        const { user } = req
        if (!user || !user._id) throw new Error("Usuario no encontrado")

        await executeTransactionalTask(req, async (session, log) => {
            const parseData = ComercialValidationsRepository.put_comercial_clientes().parse(req.data)
            const { _id, data } = parseData

            await ClientesRepository.actualizar_data(
                { _id: _id },
                { $set: { ...data, user: user._id } },
                { session }
            );
            await registrarPasoLog(log._id, "put_comercial_clientes", "Completado")
        })
    }
    static async put_comercial_clientes_estado(req) {
        const { user } = req
        if (!user || !user._id) throw new Error("Usuario no encontrado")

        await executeTransactionalTask(req, async (session, log) => {
            const { _id } = req.data
            if (!mongoose.isValidObjectId(_id)) {
                throw new Error("ID no valido")
            }
            const clienteOld = await ClientesRepository.get_data({ ids: [_id], select: "activo" }, { session })
            if (!clienteOld || clienteOld.length === 0) {
                throw new Error("Cliente no encontrado")
            }

            await ClientesRepository.actualizar_data(
                { _id },
                {
                    $set: {
                        activo: !clienteOld[0].activo,
                        user: user._id
                    }
                },
                { session }
            );
            await registrarPasoLog(log._id, "put_comercial_clientes_estado", "Completado")
        })
    }
}