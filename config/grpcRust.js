import net from "net";

export class RustRcp {
    constructor(host, port) {
        this.host = host;
        this.port = port;
        this.client = null;
        this.isConnected = false;
        this.reconnectInterval = 15000; // 15 seconds
        this.retryTimer = null;
    }

    connect() {
        return new Promise((resolve, reject) => {
            this.client = net.createConnection({ host: this.host, port: this.port }, () => {
                console.log("✅ Conectado al servidor Rust");
                this.isConnected = true;
                if (this.retryTimer) {
                    clearInterval(this.retryTimer);
                    this.retryTimer = null;
                }
                resolve();
            });

            this.client.on("error", (err) => {
                this.isConnected = false;
                this.startReconnectLoop();
                reject(err);
            });

            this.client.on("end", () => {
                console.log("⚠️ Desconectado del servidor");
                this.isConnected = false;
                this.startReconnectLoop();
            });
        });
    }

    startReconnectLoop() {
        if (this.retryTimer) return; // Already trying

        this.retryTimer = setInterval(() => {
            if (!this.isConnected) {
                this.connect().catch(() => { /* silencioso para no saturar */ });
            }
        }, this.reconnectInterval);
    }

    sendData(data, timeoutMs = 8000) {
        return new Promise((resolve, reject) => {
            if (!this.isConnected) {
                return reject(new Error("⛔ No estás conectado al servidor Rust"));
            }

            let settled = false
            const done = (fn, value) => {
                if (settled) return
                settled = true
                clearTimeout(timer)
                this.client.removeListener("data", onData)
                fn(value)
            }

            const onData = (incoming) => done(resolve, incoming.toString())
            const timer = setTimeout(() => done(reject, new Error(`⏱ Timeout: el servidor Rust no respondió en ${timeoutMs}ms`)), timeoutMs)

            this.client.once("data", onData)
            this.client.write(JSON.stringify(data), (err) => {
                if (err) done(reject, new Error("💥 Error al enviar datos al servidor Rust: " + err))
            })
        });
    }

    disconnect() {
        if (this.client) this.client.end();
    }
}

// Creamos una sola instancia global
export const rustRcpClient = new RustRcp("127.0.0.1", 5000);

// Exportamos la instancia y un método para inicializar
export function initRustRcp() {
    return rustRcpClient.connect();
}
