const { BadGetwayError, ErrorUndefinedData } = require("../../Error/ConnectionErrors");
const { HandleErrors } = require("../../Error/recordErrors");
const { AccessError } = require("../../Error/ValidationErrors");
const { procesoEventEmitter } = require("../../events/eventos");
const { UserRepository } = require("../../server/auth/users");
const { apiSocket } = require("../../server/desktop/reduce");
const { apiSocketCalidad } = require("../../server/routes/sockets/calidad");
const { apiSocketComercial } = require("../../server/routes/sockets/comercial");
const { apiSocketData } = require("../../server/routes/sockets/data");
const { apiSocketGestionCuentas } = require("../../server/routes/sockets/gestionCuentas");
const { apiSockectIndicadores } = require("../../server/routes/sockets/indicadores");
const { apiSocketInventarios } = require("../../server/routes/sockets/inventarios");
const { apiSocketProceso } = require("../../server/routes/sockets/proceso");
const { apiSocketPython } = require("../../server/routes/sockets/pythonRoute");
const { apiSocketSistema } = require("../../server/routes/sockets/sistema");
const { apiSocketTransporte } = require("../../server/routes/sockets/transporte");



function initSockets(io) {
    // Middleware de autenticación para Socket.IO



    io.use(async (socket, next) => {
        try {
            await UserRepository.authenticateTokenSocket(socket, next);
        } catch (err) {
            next(err);
        }
    });

    async function sendData(data) {
        io.emit('servidor', data)
    };


    procesoEventEmitter.on('predio_vaciado', (data) => {
        try {
            io.emit("predio_vaciado", data);
        } catch (error) {
            console.error('Error en predio_vaciado:', error);
        }
    })
    procesoEventEmitter.on('listaempaque_update', () => {
        try {
            io.emit("listaempaque_update");
        } catch (error) {
            console.error('Error en listaempaque_update:', error);
        }
    })
    procesoEventEmitter.on('status_proceso', (data) => {
        try {
            io.emit("status_proceso", data);
        } catch (error) {
            console.error('Error en status_proceso:', error);
        }
    })

    // procesoEventEmitter.on('proceso_event', (data) => {
    //     try {
    //         io.emit("proceso_event", data);
    //     } catch (error) {
    //         console.error('Error en proceso_event:', error);
    //     }
    // });
    procesoEventEmitter.on('server_event', (data) => {
        try {
            io.emit("server_event", data);
        } catch (error) {
            console.error('Error en nuevo_predio:', error);
        }
    })



    io.on("connection", socket => {
        console.log("an user has connected");
        console.log("Conexiones activas:", io.engine.clientsCount);

        const handleRequest = async (data, callback, repository) => {
            try {

                const user = await UserRepository.authenticateToken(data.token)
                data.user = user;

                const autorizado2 = await UserRepository.autentificacionPermisos2(data);
                if (!autorizado2) {
                    throw new AccessError(412, `Acceso no autorizado ${data.data.action}`);
                }

                if (!Object.prototype.hasOwnProperty.call(repository, data.data.action)) {
                    throw new BadGetwayError(501, `Error badGetWay: la acción ${data.data.action} no existe`);
                }

                const response = await repository[data.data.action](data, sendData);
                callback(response);

            } catch (err) {
                await HandleErrors.addError(err);
                callback(err);
            }
        }


        socket.on("Desktop2", async (data, callback) => {
            if (!data || !data.data || !data.data.action) {
                return callback(new ErrorUndefinedData(425, "Petición inválida: falta 'action'"));
            }
            const dominio = data.data.action.split("_")[1]
            if (dominio === "inventarios") {
                handleRequest(data, callback, apiSocketInventarios);
            } else if (dominio === "comercial") {
                handleRequest(data, callback, apiSocketComercial);
            } else if (dominio === "calidad") {
                handleRequest(data, callback, apiSocketCalidad);
            } else if (dominio === "sistema") {
                handleRequest(data, callback, apiSocketSistema);
            } else if (dominio === "indicadores") {
                handleRequest(data, callback, apiSockectIndicadores);
            } else if (dominio === "proceso") {
                handleRequest(data, callback, apiSocketProceso);
            } else if (dominio === "data") {
                handleRequest(data, callback, apiSocketData);
            } else if (dominio === "gestionCuentas") {
                handleRequest(data, callback, apiSocketGestionCuentas);
            } else if (dominio === "transporte") {
                handleRequest(data, callback, apiSocketTransporte);
            } else if (dominio === "python") {
                handleRequest(data, callback, apiSocketPython);
            }
            else {
                handleRequest(data, callback, apiSocket);
            }
        })

        socket.on("disconnect", () => {
            console.log("Un usuario se ha desconectado.");
            console.log("Conexiones activas:", io.engine.clientsCount);
        });

    });
}

module.exports.initSockets = initSockets
