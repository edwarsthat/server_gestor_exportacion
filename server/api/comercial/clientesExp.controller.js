import { ClientesRepository } from "../../Class/Clientes.js";
import { executeQueryTask } from "../../utils/wrappers.js";

export class ClientesExpController {
    static async get_comercial_clientes() {
        return await executeQueryTask(async () => {
            return await ClientesRepository.get_data({
                populate: [
                    {
                        path: 'PAIS_DESTINO.codigo'
                    }
                ]
            });
        });
    }
}