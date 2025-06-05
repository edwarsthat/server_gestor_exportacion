
import { rustRcpClient } from "../../../config/grpcRust.js";
import { dataRepository } from "../../api/data.js";
import { successResponseRoutes } from "../helpers/responses.js";
import { cleanForRust } from "./utils/cleanData.js";


export const apiSocketPython = {
    get_python_data_porcentageExportacion: async (req) => {

        const { data } = req;

        const predictionData = await dataRepository.get_data_historicos_para_modelo_python(req);

        const dataReq = {
            userInput: data,
            predictionData
        };

        const payload = {
            data: JSON.stringify(cleanForRust(dataReq)),
            server: "python",
            action: "get_python_data_porcentageExportacion"
        };

        const responseStr = await rustRcpClient.sendData(payload);
        const response = JSON.parse(responseStr);
        console.log(response)

        return successResponseRoutes(response);
    }
}
