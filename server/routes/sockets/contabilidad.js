import { ContabilidadRepository } from "../../api/Contabilidad.js";
import { InformesContabilidadController } from "../../api/contabilidad/Informes.js";
import { successResponseRoutes } from "../helpers/responses.js";

export const apiSocketContabilidad = {
    get_contabilidad_informes_calidad: async (data) => {
        const response = await InformesContabilidadController.get_contabilidad_informes_calidad(data);
        return successResponseRoutes(response);
    },
    get_contabilidad_informes_calidad_numeroElementos: async () => {
        const response = await ContabilidadRepository.get_contabilidad_informes_calidad_numeroElementos();
        return successResponseRoutes(response);
    },
    get_contabilidad_informe_lote_detalle: async (data) => {
        const response = await ContabilidadRepository.get_contabilidad_informe_lote_detalle(data);
        return successResponseRoutes(response);
    },
    get_contabilidad_informesMaquila_calidad: async (data) => {
        const response = await ContabilidadRepository.get_contabilidad_informesMaquila_calidad(data);
        return successResponseRoutes(response);
    },
    get_contabilidad_informesMaquila_calidad_numeroElementos: async (data) => {
        const response = await ContabilidadRepository.get_contabilidad_informesMaquila_calidad_numeroElementos(data);
        return successResponseRoutes(response);
    },
    get_contabilidad_informeMaquila_loteMaquila_detalle: async (data) => {
        const response = await ContabilidadRepository.get_contabilidad_informeMaquila_loteMaquila_detalle(data);
        return successResponseRoutes(response);
    }
}
