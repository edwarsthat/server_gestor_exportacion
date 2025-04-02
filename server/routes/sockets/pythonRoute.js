// const { clientGRPC } = require("../../../src/config/conexionGRPC");
const RustRcp = require("../../../config/grpcRust");
const { successResponseRoutes } = require("../helpers/responses");
// const { routerPythonData } = require("../pythonServer");
const RustRcpClient = new RustRcp("0.0.0.0", 5000);

const apiSocketPython = {
    get_python_data_porcentageExportacion: async (req) => {
        const { data } = req
        // clientGRPC.GetData(data, (error, response) => {
        //     if (error) {
        //         console.error("❌ Error en gRPC:", error);
        //         throw new routerPythonData(700, "Error en gRPC" + error.meesage)
        //     }
        //     console.log(response.values)
        // });
        await RustRcpClient.connect();

        const responseStr = await RustRcpClient.sendData({ ...data, server: "python" });
        const response = JSON.parse(responseStr)

        return successResponseRoutes(response)

    }
}

module.exports.apiSocketPython = apiSocketPython