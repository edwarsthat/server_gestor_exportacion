import { FileService } from "../../services/helpers/FileService.js"
import { executeQueryTask } from "../../utils/wrappers.js"

export class InformesCalidadController {
    static async get_calidad_informes_imagenDefecto(req) {
        return await executeQueryTask(async () => {
            const { data: datos } = req
            const { data } = datos
            const response = await FileService.readFileAsBase64(data, "STORAGE")
            return response //! quitar el prefijo data:...;base64, cuando se actualice el cliente
        })
    }
}