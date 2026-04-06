import { executeTransactionalTask } from "../../utils/wrappers.js";
import { ProcesoValidations } from "../../validations/proceso.js";
import { FileService } from "../../services/helpers/FileService.js";
import { LotesHelper } from "../../helper/lotes.js";
import { registrarPasoLog } from "../helper/logs.js";

export class ProcesoCalidadController {
    static async post_proceso_aplicaciones_fotoCalidad(req) {
            const { user } = req
            if (!user || !user._id) {
                throw new Error('Usuario no autenticado');
            }

        await executeTransactionalTask(req, async (session, log) => {

            const parseData = ProcesoValidations.post_proceso_aplicaciones_fotoCalidad().parse(req.data);

            const { foto, fotoName, _id } = parseData;

            const fotoNormalizada = foto.startsWith('data:') ? foto : `data:image/jpeg;base64,${foto}`;
            const fotoPath = await FileService.saveBase64File(fotoNormalizada, 'calidad/fotosCalidad', 'STORAGE');
            await registrarPasoLog(log._id, "se guarda la imagen", "Completado", `Lote ${_id} foto ${fotoName}`);

            const fotos = {}
            fotos[`calidad.fotosCalidad.${fotoName}`] = fotoPath;
            const query = {
                ...fotos,
                "calidad.fotosCalidad.fechaIngreso": Date.now(),
            }

            await LotesHelper.actualizar_lotes_helper(
                { _id: _id },
                query,
                { 
                    new: true, 
                    user: user._id, 
                    action: "post_proceso_aplicaciones_fotoCalidad", 
                    session 
                }
            );
            await registrarPasoLog(log._id, "se actualiza el lote con la ruta de la imagen", "Completado", `Lote ${_id} actualizado con foto ${fotoName}`);

        })

    }
}
