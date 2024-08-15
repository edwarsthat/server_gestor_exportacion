const { ConnectAWS_Error } = require("../Error/ConnectionErrors");
const { ProcesoRepository } = require("../server/api/Proceso");

//!funcion que agrega todo el inventario a aws

async function upload_inventario_fruta_sin_procesar() {
    try {
        const inventario = await ProcesoRepository.getInventario();
        const responseJSON = await fetch("https://7vdbitqlwz4nnzhu5knlpfdaam0emuka.lambda-url.us-east-2.on.aws/", {
            method: "PUT",
            headers: {
                'Content-Type': 'application/json' // Añade este encabezado
            },
            body: JSON.stringify({
                inventario: inventario
            })
        })
        const response = await responseJSON.json();
        console.log(response)

    } catch (err) {
        throw new ConnectAWS_Error(401, `Error subiendo el inventario ${err.message}`)
    }
}



