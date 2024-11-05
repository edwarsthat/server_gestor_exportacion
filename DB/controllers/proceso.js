require('dotenv').config();

const net = require('net');

let rustConnectionProceso = null;

class RustConnectionProceso {
    constructor(host = process.env.RUST_MONGO_PROCESO, port = process.env.RUST_MONGO_PROCESO_PUERTO) {
        this.host = host;
        this.port = port;
        this.client = null;
        this.isConnected = false;
    }

    connect() {
        return new Promise((resolve, reject) => {
            this.client = net.createConnection({ host: this.host, port: this.port }, () => {
                console.log('Conectado al servidor Rust');
                this.isConnected = true;
                resolve();
            });

            this.client.on('error', (err) => {
                console.error('Error de conexión al servidor Rust:', err.message);
                this.isConnected = false;
                reject(err);
            });

            this.client.on('close', () => {
                console.log('Conexión cerrada con el servidor Rust');
                this.isConnected = false;
            });
        });
    }

    async sendMessage(message) {
        if (!this.isConnected) {
            throw new Error('No hay conexión establecida con el servidor Rust');
        }

        return new Promise((resolve, reject) => {
            this.client.write(JSON.stringify(message), (err) => {
                if (err) return reject(err);

                // Esperar la respuesta del servidor
                this.client.once('data', (data) => {
                    resolve(data.toString());
                });
            });
        });
    }

    close() {
        if (this.client) {
            this.client.end();
            this.isConnected = false;
            console.log('Conexión con el servidor Rust cerrada');
        }
    }
}



async function initRustProceso() {
    rustConnectionProceso = new RustConnectionProceso();

    try {
        await rustConnectionProceso.connect();
        console.log('Aplicación Node.js conectada al servidor Rust');

        module.exports.rustConnectionProceso = rustConnectionProceso
    } catch (error) {
        console.error('No se pudo conectar al servidor Rust:', error.message);
        process.exit(1); // Salir si no se puede conectar
    }

};

function getRustConnectionProceso() {
    if (!rustConnectionProceso) {
        throw new Error('La conexión con el servidor Rust no está inicializada.');
    }
    return rustConnectionProceso;
}

module.exports = {
    initRustProceso,
    getRustConnectionProceso
};


