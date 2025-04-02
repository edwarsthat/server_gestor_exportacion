// tcpClient.js
const net = require("net");

class RustRcp {
    constructor(host, port) {
        this.host = host;
        this.port = port;
        this.client = null;
        this.isConnected = false;
    }

    // Método para crear la conexión
    connect() {
        return new Promise((resolve, reject) => {
            this.client = net.createConnection({ host: this.host, port: this.port }, () => {
                console.log("Conectado al servidor");
                this.isConnected = true;
                resolve();
            });

            this.client.once("data", (data) => {
                console.log("Datos recibidos:", data.toString());
            });

            this.client.on("error", (err) => {
                console.error("Error en la conexión:", err);
                reject(err);
            });

            this.client.on("end", () => {
                console.log("Desconectado del servidor");
                this.isConnected = false;
            });
        });
    }

    // Método para enviar datos con el formato { action: "asda", data: [...] }
    sendData(data) {
        return new Promise((resolve, reject) => {
            if (!this.isConnected) {
                reject("No estás conectado al servidor");
                return;
            }

            const dataToSend = JSON.stringify(data);

            // Usamos once para que solo se escuche el primer evento "data"
            this.client.once("data", (data) => {
                // Se resuelve la promesa cuando se recibe la respuesta
                resolve(data.toString());
            });

            this.client.write(dataToSend, (err) => {
                if (err) {
                    reject("Error al enviar los datos: " + err);
                }
            });
        });
    }

    // Método para desconectar
    disconnect() {
        if (this.client) {
            this.client.end();
        }
    }
}

module.exports = RustRcp;
