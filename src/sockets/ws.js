import { BadGetwayError, ErrorUndefinedData } from "../../Error/ConnectionErrors.js";
import { HandleErrors } from "../../Error/recordErrors.js";
import { AccessError } from "../../Error/ValidationErrors.js";
import { procesoEventEmitter } from "../../events/eventos.js";
import { UserRepository } from "../../server/auth/users.js";
import { apiSocket } from "../../server/desktop/reduce.js";
import { apiSocketCalidad } from "../../server/routes/sockets/calidad.js";
import { apiSocketComercial } from "../../server/routes/sockets/comercial.js";
import { apiSocketContabilidad } from "../../server/routes/sockets/contabilidad.js";
import { apiSocketData } from "../../server/routes/sockets/data.js";
import { apiSocketGestionCuentas } from "../../server/routes/sockets/gestionCuentas.js";
import { apiSockectIndicadores } from "../../server/routes/sockets/indicadores.js";
import { apiSocketInventarios } from "../../server/routes/sockets/inventarios.js";
import { apiSocketProceso } from "../../server/routes/sockets/proceso.js";
import { apiSocketPython } from "../../server/routes/sockets/pythonRoute.js";
import { apiSocketSistema } from "../../server/routes/sockets/sistema.js";
import { apiSocketTalentoHumano } from "../../server/routes/sockets/talentoHumano.js";
import { apiSocketTransporte } from "../../server/routes/sockets/transporte.js";
// import mongoose from "mongoose"; .Jp
import mongoose from "mongoose";


export function initSockets(io) {
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

        const authenticatedUser = socket.user;

        const handleRequest = async (data, callback, repository, dominio = "") => {
            try {

                data.user = authenticatedUser;

                // Añadir la conexión de mongoose al objeto data .Jp
                data.conn = mongoose.connection;

                if (dominio !== "data") {
                    const autorizado2 = await UserRepository.autentificacionPermisos2(data);
                    if (!autorizado2) {
                        throw new AccessError(412, `Acceso no autorizado ${data.data.action}`);
                    }

                    if (!Object.prototype.hasOwnProperty.call(repository, data.data.action)) {
                        throw new BadGetwayError(501, `Error badGetWay: la acción ${data.data.action} no existe`);
                    }
                }

                const response = await repository[data.data.action](data, sendData);
                callback(response);

            } catch (err) {
                console.log("Error en el manejo de la solicitud:", err);
                try {
                    await HandleErrors.addError(err);
                } catch (logError) {
                    console.error("Error al registrar el error:", logError);
                }
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
                handleRequest(data, callback, apiSocketData, dominio);
            } else if (dominio === "gestionCuentas") {
                handleRequest(data, callback, apiSocketGestionCuentas);
            } else if (dominio === "transporte") {
                handleRequest(data, callback, apiSocketTransporte);
            } else if (dominio === "python") {
                handleRequest(data, callback, apiSocketPython);
            } else if (dominio === "contabilidad") {
                handleRequest(data, callback, apiSocketContabilidad);
            } else if (dominio === "talentoHumano") {
                handleRequest(data, callback, apiSocketTalentoHumano);
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
