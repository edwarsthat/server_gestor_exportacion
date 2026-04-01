import { FileService } from "../../services/helpers/FileService.js"
import { executeQueryTask } from "../../utils/wrappers.js"

export class InformesCalidadController {
    static async get_calidad_informes_imagenDefecto(req) {
        return await executeQueryTask(async () => {
            const { data: datos } = req
            const { data } = datos
            console.log('PATH RECIBIDO:', JSON.stringify(data))
            const response = await FileService.readFileAsBase64(data, "STORAGE")
            return response.replace(/^data:[^;]+;base64,/, "") //debe quitarse
        })
    }
}