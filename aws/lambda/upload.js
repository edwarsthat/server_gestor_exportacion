const { iniciarRedisDB } = require("../../DB/redis/init");
const { ConnectAWS_Error, PilaAccess_Error } = require("../../Error/ConnectionErrors")
const fs = require('fs');
const syncEventManager = require("../../events/eventos");
const pilaPath = 'C:/Users/SISTEMA/Documents/Servidor/Servidor3.0/aws/pilaSync.json'

class UploaAWSRepository {
    static async upload_item_inventario_fruta_sin_procesar(lote, canastillas) {
        try {
            const data = {
                _id: lote._id,
                enf: lote.enf,
                predio: lote.predio,
                fechaIngreso: lote.fechaIngreso,
                tipoFruta: lote.tipoFruta,
                clasificacionCalidad: lote.clasificacionCalidad,
                observaciones: lote.observaciones,
                promedio: lote.promedio,
                inventario: canastillas
            }
            const responseJSON = await fetch("https://7vdbitqlwz4nnzhu5knlpfdaam0emuka.lambda-url.us-east-2.on.aws/", {
                method: "PUT",
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    inventario: [data]
                })
            })
            //si no se pudo por problemas en el internet
            if (responseJSON.status !== 200) {
                await this.guardar_datos_para_sincronisar({
                    _id: lote._id,
                    data: data,
                    action: "upload_item_inventario_fruta_sin_procesar",
                    timeStamp: new Date(),
                    code: responseJSON.status,
                    errorMessage: responseJSON.message
                })
                throw new ConnectAWS_Error()
            }

            const response = await responseJSON.json();
            console.log(response)
        } catch (err) {
            throw new ConnectAWS_Error(401, `Error subiendo el inventario ${err.message}`)
        }
    }
    static async eliminar_item_inventario_fruta_sin_procesar(lote) {
        try {
            const responseJSON = await fetch("https://rjpse7qizk5e5wfoajkor5ubwm0ibpni.lambda-url.us-east-2.on.aws/", {
                method: "PUT",
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    lote: lote._id
                })
            });

            //si no se pudo por problemas en el internet
            if (responseJSON.status !== 200) {
                await this.guardar_datos_para_sincronisar({
                    _id: lote._id,
                    action: "eliminar_item_inventario_fruta_sin_procesar",
                    timeStamp: new Date(),
                    code: responseJSON.status,
                    errorMessage: responseJSON.message
                })
                throw new ConnectAWS_Error()
            }

            const response = await responseJSON.json();
            console.log(response)
        } catch (err) {
            throw new ConnectAWS_Error(401, `Error subiendo el inventario ${err.message}`)
        }
    }
    static async modificar_item_inventario_fruta_sin_procesar(lote, data) {
        try {
            const responseJSON = await fetch("https://qxlo7h7lnazjvlx6jhlw7c6cwe0sxetm.lambda-url.us-east-2.on.aws/", {
                method: "PUT",
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    lote: lote._id,
                    data: data
                })
            })
            //si no se pudo por problemas en el internet
            if (responseJSON.status !== 200) {
                await this.guardar_datos_para_sincronisar({
                    _id: lote._id,
                    data: data,
                    action: "modificar_item_inventario_fruta_sin_procesar",
                    timeStamp: new Date(),
                    code: responseJSON.status,
                    errorMessage: responseJSON.message
                })
                throw new ConnectAWS_Error()
            }

            const response = await responseJSON.json();
            console.log(response)
        } catch (err) {
            throw new ConnectAWS_Error(401, `Error modificando el inventario ${err.message}`)
        }
    }
    static async guardar_datos_para_sincronisar(data) {
        const clientePromise = iniciarRedisDB();
        const cliente = await clientePromise
        try {
            await cliente.set("ErrorConexionAWS", "true")
            syncEventManager.emit("ErrorConexionAWS");

            const pilaJSON = fs.readFileSync(pilaPath);
            const pila = JSON.parse(pilaJSON);

            pila.push(data)

            const newPilaJSON = JSON.stringify(pila);
            fs.writeFileSync(pilaPath, newPilaJSON);

        } catch (err) {
            throw new PilaAccess_Error(401, `Error subiendo el inventario ${err.message}`)
        } finally {
            await cliente.quit();
        }
    }
}

module.exports.UploaAWSRepository = UploaAWSRepository
