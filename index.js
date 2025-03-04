const http = require('http');
const { Server } = require("socket.io");
const app = require('./src/app/app')
const { PORT, HOST } = require('./src/config/index')
const server = http.createServer(app);

const { initMongoDB } = require('./DB/mongoDB/config/init');
const { initSockets } = require('./src/sockets/ws');
const { initCronJobs } = require('./src/cron/jobs');

(async () => {
    try {
        await initMongoDB();

        //Configurar Socket.IO
        const io = new Server(server);
        initSockets(io);


        initCronJobs();

        server.listen(PORT, HOST, () => {
            console.log(`El servidor está escuchando en el puerto ${PORT} y la dirección IP ${HOST}.`);
        });


    } catch (err) {
        console.error('Error al iniciar el servidor:', err);
        process.exit(1);
    }
})();



