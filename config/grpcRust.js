const net = require("net");

class RustRcp {
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
                // console.error("❌ Error en la conexión:", err);
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

        // console.log("🔁 Iniciando intento de reconexión cada 15s...");

        this.retryTimer = setInterval(() => {
            if (!this.isConnected) {
                // console.log("🔍 Intentando reconectar al servidor Rust...");
                this.connect().catch(() => { }); // Don't spam errors
            }
        }, this.reconnectInterval);
    }

    sendData(data) {
        return new Promise((resolve, reject) => {
            if (!this.isConnected) {
                return reject("⛔ No estás conectado al servidor");
            }

            const dataToSend = JSON.stringify(data);
            this.client.once("data", (data) => {
                resolve(data.toString());
            });

            this.client.write(dataToSend, (err) => {
                if (err) reject("💥 Error al enviar los datos: " + err);
            });
        });
    }

    disconnect() {
        if (this.client) this.client.end();
    }
}

// Creamos una sola instancia global
const rustRcpClient = new RustRcp("127.0.0.1", 5000);

// Exportamos la instancia y un método para inicializar
module.exports = {
    rustRcpClient,
    initRustRcp: () => rustRcpClient.connect()
};
