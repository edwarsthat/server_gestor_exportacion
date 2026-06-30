import { REGISTRY } from "./registry.js";

export function initBridge(io) {
    for (const { emitter, events } of REGISTRY) {
        for (const [event, config] of Object.entries(events)) {
            emitter.on(event, (data) => {
                try {
                    const room = config.withId && data?.id
                        ? `${config.room}_${data.id}`
                        : config.room;
                    io.to(room).emit(event, data);
                } catch (error) {
                    console.error(`[bridge] Error en evento "${event}":`, error);
                }
            });
        }
    }
}
