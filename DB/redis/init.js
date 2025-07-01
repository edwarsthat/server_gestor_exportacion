// init.js
import { createClient } from "redis";

let client = null;

const crearNuevoCliente = async () => {
    const c = createClient({
        socket: {
            reconnectStrategy: (retries) => {
                if (retries > 10) return new Error('¡No puedo más, me rindo!');
                return Math.min(retries * 100, 3000); // espera entre reintentos
            }
        }
    });
    c.on("error", err => console.error("[REDIS][ERROR]", err));
    c.on("end", () => { console.warn("[REDIS] Conexión finalizada") });
    c.on("reconnecting", () => console.warn("[REDIS] Intentando reconectar..."));
    try {
        await c.connect();
        console.log("[REDIS] Cliente conectado con éxito.");
    } catch (err) {
        console.error("[REDIS] No fue posible conectar:", err);
        throw err;
    }
    return c;
};

function timeoutPromise(promise, ms = 1000) {
    return Promise.race([
        promise,
        new Promise((_, reject) => setTimeout(() => reject(new Error("Timeout")), ms))
    ]);
}

export const getRedisClient = async () => {
    if (!client) {
        console.log("Redis no existe. Creando uno nuevo.");
        client = await crearNuevoCliente();
    } else {
        console.log("¿Está abierto Redis?", client.isOpen);

        try {
            const pong = await timeoutPromise(client.ping(), 2000); // 2 segundos de paciencia
            console.log("Pong de Redis:", pong);
        } catch (err) {
            console.error("[REDIS] Ping falló o tardó demasiado, recreando cliente...", err);
            client = await crearNuevoCliente();
        }
    }
    return client;
};
