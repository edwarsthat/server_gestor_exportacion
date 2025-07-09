import { dataRepository } from "../../api/data.js";
import { successResponseRoutes } from "../helpers/responses.js";


export const apiSocketData = {
    get_data_clientes: async () => {
        const response = await dataRepository.get_data_clientes();
        return successResponseRoutes(response);
    },
    get_data_cargos: async (req) => {
        const response = await dataRepository.get_data_cargos(req)
        return successResponseRoutes(response)
    },
    get_data_tipoFruta: async () => {
        const response = await dataRepository.get_data_tipoFruta()
        return successResponseRoutes(response)
    },
    get_data_clientesNacionales: async () => {
        const response = await dataRepository.get_data_clientesNacionales()
        return successResponseRoutes(response)
    },
    get_data_proveedores: async (req) => {
        const response = await dataRepository.get_data_proveedores(req)
        return successResponseRoutes(response)
    },
    get_data_cuartosDesverdizados: async () => {
        const response = await dataRepository.get_data_cuartosDesverdizados()
        return successResponseRoutes(response)
    },
    get_data_EF8: async () => {
        const response = await dataRepository.get_data_EF8()
        return successResponseRoutes(response)
    }
}
