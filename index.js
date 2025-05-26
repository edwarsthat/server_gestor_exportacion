/**
 * @file Servidor principal Celifrut
 * @summary Entrada principal del sistema de gestión Celifrut.
 *
 * @author Edwar Stheven Ariza Torres
 * @copyright © 2025 Celifrut. Todos los derechos reservados.
 * @license PROPIEDAD PRIVADA - USO EXCLUSIVO CELIFRUT
 *
 * @description
 * Este archivo inicializa la base de datos, el servidor HTTP, los sockets, los cron jobs y la integración con servicios externos.
 *
 * ### Funcionalidades principales
 *
 * - Inicializa la conexión a MongoDB y define los esquemas.
 * - Inicializa la conexión gRPC con el servidor Rust (si está disponible).
 * - Crea el servidor HTTP y lo asocia con la aplicación Express.
 * - Inicializa los sockets en tiempo real con Socket.io.
 * - Inicializa los cron jobs programados.
 * - Inicia el servidor escuchando en el puerto y host configurados.
 *
 * ---
 *
 * Si ocurre algún error crítico durante la inicialización, el proceso termina con error.
 * 
 * @import module:DB
 */

const http = require('http');
const { Server } = require("socket.io");
const app = require('./src/app/app')
const { PORT, HOST } = require('./src/config/index')
const server = http.createServer(app);

const { initMongoDB } = require('./DB/mongoDB/config/init');
const { initSockets } = require('./src/sockets/ws');
const { initCronJobs } = require('./src/cron/jobs');
const { initRustRcp } = require('./config/grpcRust');
(async () => {
    try {
        /**
         * Inicializa la base de datos MongoDB y define los esquemas.
         * @see module:DB/mongoDB/config/init~initMongoDB
         */
        await initMongoDB();
        initRustRcp().catch(() => {
            console.warn('⚠️ No se pudo conectar al servidor Rust inicialmente. Se intentará reconectar en segundo plano.');
        });
        const io = new Server(server);
        initSockets(io);
        initCronJobs();

        server.listen(PORT, HOST, () => {
            console.log(`El servidor está escuchando en el puerto ${PORT} y la dirección IP ${HOST}.`);
        });
        // app.listen(3010, '0.0.0.0', () => {
        //     console.log('Server running on port 3010');
        // });

    } catch (err) {
        console.error('Error al iniciar el servidor:', err);
        process.exit(1);
    }
})();



