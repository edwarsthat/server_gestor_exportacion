import { getRedisClient } from "../../../DB/redis/init.js";
import { TurnoDatarepository } from "../../Class/TurnoData.js";

export class TurnosService {
    static async obtenerStatusProceso() {
        try {
            const cliente = await getRedisClient();
            const status = await cliente.get("statusProceso");
            return status ?? 'off';
        } catch (err) {
            return 'off';
        }
    }
    static async crearTurno() {
        try {
            await TurnoDatarepository.post_data({});
            return true
        } catch (err) {
            throw new Error(err);
        }
    }
    static async iniciarTurno() {
        try {
            const cliente = await getRedisClient();

            await TurnoDatarepository.actualizar_data(
                {},
                { horaInicio: new Date() },
                { sort: { createdAt: -1 } }
            );
            await cliente.set("statusProceso", "on");
            return true
        } catch (err) {
            throw new Error(err);
        }
    }
    static async pausarTurno() {
        try {
            const cliente = await getRedisClient();
            const newStop = {
                inicioPausa: new Date(),
                finalPausa: null,
                Observacion: null,
            }
            await TurnoDatarepository.actualizar_data(
                {},
                { $push: { pausaProceso: newStop } },
                { sort: { createdAt: -1 } }
            );
            await cliente.set("statusProceso", "pause");
            return true
        } catch (err) {
            throw new Error(err);
        }
    }
    static async reiniciarTurno() {
        try {
            const cliente = await getRedisClient();

            await TurnoDatarepository.actualizar_data(
                {},
                { $set: { "pausaProceso.$[pausa].finalPausa": new Date() } },
                {
                    sort: { createdAt: -1 },
                    arrayFilters: [{ "pausa.finalPausa": null }]
                }
            );

            await cliente.set("statusProceso", "on");
            return true
        } catch (err) {
            throw new Error(err);
        }
    }
    static async finalizarTurno() {
        try {
            const cliente = await getRedisClient();
            await TurnoDatarepository.actualizar_data(
                {},
                { horaFin: new Date() },
                { sort: { createdAt: -1 } }
            );
            await cliente.set("statusProceso", "off");
            return true
        } catch (err) {
            throw new Error(err);
        }
    }
}