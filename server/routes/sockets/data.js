import { IngresosCalidadController } from "../../api/calidad/ingresosCalidad.js";
import { dataRepository } from "../../api/data.js";
import { crearExcelController } from "../../api/data/crearExcel.controller.js";
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
    get_data_tipoFruta2: async () => {
        const response = await dataRepository.get_data_tipoFruta2()
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
    get_data_proveedores2: async () => {
        const response = await dataRepository.get_data_proveedores2()
        return successResponseRoutes(response)
    },
    get_data_cuartosDesverdizados: async () => {
        const response = await dataRepository.get_data_cuartosDesverdizados()
        return successResponseRoutes(response)
    },
    get_data_EF8: async () => {
        const response = await dataRepository.get_data_EF8()
        return successResponseRoutes(response)
    },
    get_data_EF1: async () => {
        const response = await dataRepository.get_data_EF1()
        return successResponseRoutes(response)
    },
    get_data_EF10: async () => {
        const response = await dataRepository.get_data_EF10()
        return successResponseRoutes(response)
    },
    get_data_cuartosFrios: async (req) => {
        const response = await dataRepository.get_data_cuartosFrios(req)
        return successResponseRoutes(response)
    },
    get_data_areasAcceso: async () => {
        const response = await dataRepository.get_data_areasAcceso()
        return successResponseRoutes(response)
    },
    get_data_cargosPersonal: async () => {
        const response = await dataRepository.get_data_cargosPersonal()
        return successResponseRoutes(response)
    },
    get_data_bootstrap: async () => {
        const response = await dataRepository.get_data_bootstrap()
        return successResponseRoutes(response)
    },
    get_data_canastillas_canastillasCelifrut: async () => {
        const response = await dataRepository.get_data_canastillas_canastillasCelifrut()
        return successResponseRoutes(response)
    },
    get_data_ingresos_tiposFormularios: async () => {
        const response = await IngresosCalidadController.get_data_ingresos_tiposFormularios();
        return successResponseRoutes(response)
    },
    get_data_formularios_calidad_campos: async () => {
        const response = await dataRepository.get_data_formularios_calidad_campos();
        return successResponseRoutes(response)
    },
    get_data_versiones: async (req) => {
        const response = await dataRepository.get_data_versiones(req);
        return successResponseRoutes(response)
    },
    get_data_insumos_creacion_carnets: async () => {
        const response = await dataRepository.get_data_insumos_creacion_carnets();
        return successResponseRoutes(response)
    },
    get_data_operarios: async () => {
        const response = await dataRepository.get_data_operarios();
        return successResponseRoutes(response)
    },
    get_data_excelPersonal: async (req) => {
        const response = await crearExcelController.documento_personal(req);
        return successResponseRoutes(response)
    }
}
