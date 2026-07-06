import { VehiculoRegistro } from "../../Class/VehiculosRegistros.js";
import { executeQueryTask } from "../../utils/wrappers.js";


export class transporteDocumentosController {
    static async get_transporte_documentos_programacionMula_contenedores(req) {
        return await executeQueryTask(async () => {

            const { page } = req.data
            const resultsPerPage = 50;
            const response = await VehiculoRegistro.get_data({
                skip: (page - 1) * resultsPerPage,
                limit: resultsPerPage,
                populate: {
                    path: 'contenedor',
                    select: 'numeroContenedor infoContenedor',
                    populate: [
                        {
                            path: 'infoContenedor.clienteInfo',
                            select: 'CLIENTE',
                        }
                    ]
                },
                sort: { 'fecha': -1 },
            });
            return response;

        })
    }
}