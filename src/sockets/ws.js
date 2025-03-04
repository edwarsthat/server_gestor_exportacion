const { BadGetwayError } = require("../../Error/ConnectionErrors");
const { HandleErrors } = require("../../Error/recordErrors");
const { AccessError } = require("../../Error/ValidationErrors");
const { procesoEventEmitter } = require("../../events/eventos");
const { UserRepository } = require("../../server/auth/users");
const { apiSocket } = require("../../server/desktop/reduce");
const { socketMobileRepository } = require("../../server/mobile/socket");



function initSockets(io) {
    // Middleware de autenticación para Socket.IO



    io.use((socket, next) => {
        UserRepository.authenticateTokenSocket(socket, next)
    });

    async function sendData(data) {
        io.emit('servidor', data)
    };


    procesoEventEmitter.on('predio_vaciado', (data) => {
        console.log(data)
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

    procesoEventEmitter.on('proceso_event', (data) => {
        try {
            io.emit("proceso_event", data);
        } catch (error) {
            console.error('Error en proceso_event:', error);
        }
    });
    procesoEventEmitter.on('server_event', (data) => {
        try {
            io.emit("server_event", data);
        } catch (error) {
            console.error('Error en nuevo_predio:', error);
        }
    })



    io.on("connection", socket => {
        console.log("an user has connected");
        let ongoingRequests = {};
        socket.on("Desktop2", async (data, callback) => {
            try {
                // If the request is already ongoing, return
                if (ongoingRequests[data.data.action]) {
                    return;
                }
                const user = await UserRepository.authenticateToken(data.token)
                data = { ...data, user: user }

                // Mark the request as ongoing
                ongoingRequests[data.data.action] = true;
                const autorizado2 = await UserRepository.autentificacionPermisos2(data);
                if (!autorizado2) {
                    throw new AccessError(412, `Acceso no autorizado ${data.data.action}`);
                }

                if (!Object.prototype.hasOwnProperty.call(apiSocket, data.data.action))
                    throw new BadGetwayError(501, `Error badGetWay ${data.data.action} no existe`)


                const response = await apiSocket[data.data.action](data, sendData);

                const newToken = UserRepository.generateAccessToken({
                    user: data.user.user,
                    cargo: data.user.cargo,
                    _id: data.user._id,
                    Rol: data.user.Rol,
                })

                callback({ ...response, token: newToken })
            } catch (err) {
                console.log("Error socket: ", err);
                await HandleErrors.addError(err)

                if (![401, 402, 403, 404, 405].includes(err.status)) {
                    const newToken = data.user ? UserRepository.generateAccessToken({
                        user: data.user.user,
                        cargo: data.user.cargo,
                        _id: data.user._id,
                        Rol: data.user.Rol,

                    }) : null;
                    callback({ ...err, token: newToken });
                } else {
                    callback(err);
                }
            } finally {
                console.log(ongoingRequests)
                if (data && data.data && data.data.action) {
                    delete ongoingRequests[data.data.action]
                }
            }
        })
        socket.on("Mobile", async (data, callback) => {
            try {
                // If the request is already ongoing, return
                if (ongoingRequests[data.data.action]) {
                    return;
                }
                const user = await UserRepository.authenticateToken(data.token)
                data = { ...data, user: user }

                // Mark the request as ongoing
                ongoingRequests[data.data.action] = true;
                const autorizado2 = await UserRepository.autentificacionPermisos2(data);

                if (!autorizado2) {
                    throw new AccessError(412, `Acceso no autorizado ${data.data.action}`);
                }

                if (!Object.prototype.hasOwnProperty.call(socketMobileRepository, data.data.action))
                    throw new BadGetwayError(501, `Error badGetWay ${data.data.action} no existe`)
                const response = await socketMobileRepository[data.data.action](data);
                callback(response)
            } catch (err) {
                await HandleErrors.addError(err)
                console.log("Error socket mobile: ", err);
                if (![401, 402, 403, 404, 405].includes(err.status)) {
                    const newToken = data.user ? UserRepository.generateAccessToken({
                        user: data.user.user,
                        cargo: data.user.cargo
                    }) : null;
                    if (!err.status) {
                        callback({ message: err.message, status: 401, token: newToken });
                    }
                    callback({ ...err, token: newToken });
                } else {
                    callback(err);
                }
            } finally {
                delete ongoingRequests[data.data.action]
            }
        })
    });
}

module.exports.initSockets = initSockets
