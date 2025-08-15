import { ContabilidadRepository } from "../../api/Contabilidad.js";
import { successResponseRoutes } from "../helpers/responses.js";

export const apiSocketContabilidad = {
    get_contabilidad_informes_calidad: async (data) => {
        const response = await ContabilidadRepository.get_contabilidad_informes_calidad(data);
        return successResponseRoutes(response);
    },
    get_contabilidad_informes_calidad_numeroElementos: async () => {
        const response = await ContabilidadRepository.get_contabilidad_informes_calidad_numeroElementos();
        return successResponseRoutes(response);
    },
}
