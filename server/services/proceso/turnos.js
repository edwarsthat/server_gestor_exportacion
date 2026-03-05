import { getRedisClient } from "../../../DB/redis/init.js";
import { TurnoDatarepository } from "../../Class/TurnoData.js";

export class TurnosService {
    static async obtenerStatusProceso() {
        try {
            const cliente = await getRedisClient();
            const status = await cliente.get("statusProceso");
            return status ?? 'off';
        } catch {
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
    static async iniciarTurno(opts = {}) {
        try {
            const { horaInicio = new Date() } = opts;
            const cliente = await getRedisClient();

            await TurnoDatarepository.actualizar_data(
                {},
                { horaInicio: horaInicio },
                { sort: { createdAt: -1 } }
            );
            await cliente.set("statusProceso", "on");
            return true
        } catch (err) {
            throw new Error(err);
        }
    }
    static async pausarTurno(opts = {}) {
        try {
            const { hora = new Date() } = opts;

            const cliente = await getRedisClient();
            const status_proceso = await this.obtenerStatusProceso();
            if (status_proceso === 'pause') {
                throw new Error("Ya hay una pausa activa en curso.");
            }

            const newStop = {
                inicioPausa: hora,
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
    static async reiniciarTurno(opts = {}) {
        try {
            const { hora = new Date() } = opts;
            const cliente = await getRedisClient();

            const turno = await TurnoDatarepository.get_data({}, {}, { sort: { createdAt: -1 } });
            const pausas = turno?.[0]?.pausaProceso ?? [];
            const ultimaPausa = pausas[pausas.length - 1];

            const diferenciaMs = ultimaPausa?.inicioPausa
                ? hora - new Date(ultimaPausa.inicioPausa)
                : Infinity;

            if (diferenciaMs < 2 * 60 * 1000) {
                await TurnoDatarepository.actualizar_data(
                    {},
                    { $pop: { pausaProceso: 1 } },
                    { sort: { createdAt: -1 } }
                );
            } else {
                await TurnoDatarepository.actualizar_data(
                    {},
                    { $set: { "pausaProceso.$[pausa].finalPausa": hora } },
                    {
                        sort: { createdAt: -1 },
                        arrayFilters: [{ "pausa.finalPausa": null }]
                    }
                );
            }

            await cliente.set("statusProceso", "on");
            return true
        } catch (err) {
            throw new Error(err);
        }
    }
    static async finalizarTurno() {
        const cliente = await getRedisClient();

        try {
            const status_proceso = await this.obtenerStatusProceso()

            const turno = await TurnoDatarepository.get_data({}, {}, { sort: { createdAt: -1 } })
            if (turno.length === 0) {
                throw new Error("No se encontró un turno activo para finalizar.");
            }

            if (status_proceso === 'pause') {
                const array = turno[0].pausaProceso
                if (!array || array.length === 0) {
                    throw new Error("No se encontró una pausa activa para finalizar.");
                }
                const ultimaPausa = array[array.length - 1].inicioPausa;
                if (!ultimaPausa) {
                    throw new Error("La última pausa no tiene una hora de inicio válida.");
                }

                await TurnoDatarepository.actualizar_data(
                    {},
                    { $set: { horaFin: ultimaPausa } },
                    { sort: { createdAt: -1 } }
                );
                await TurnoDatarepository.actualizar_data(
                    {},
                    { $pop: { pausaProceso: 1 } },
                    { sort: { createdAt: -1 } }
                );
            } else if (status_proceso === 'on') {
                await TurnoDatarepository.actualizar_data(
                    {},
                    { $set: { horaFin: new Date() } },
                    { sort: { createdAt: -1 } }
                );
            } else {
                // Sin proceso activo, no hay datos que actualizar
            }

            return true
        } catch (err) {
            throw new Error(err);
        } finally {
            await cliente.set("statusProceso", "off");

        }
    }
}