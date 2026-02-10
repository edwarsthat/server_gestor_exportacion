import { ContabilidadRepository } from "../../api/Contabilidad.js";
import { InformesContabilidadController } from "../../api/contabilidad/Informes.js";
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
    },

    //Actualizar tarifa de flete por kg de un proveedor. Jp
    put_flete_proveedor: async (data) => {
        const response = await ContabilidadRepository.put_contabilidad_proveedor_flete(data);
        return successResponseRoutes(response);
    },

    get_contabilidad_informe_fletes: async (data,) => {
        const response = await ContabilidadRepository.get_contabilidad_informe_fletes(data);
        return successResponseRoutes(response);
    },

    // Actualizar agrupacion de fletes compuestos. Jp
    put_contabilidad_agrupar_fletes_compuestos: async (data) => {
        const response = await ContabilidadRepository.agrupar_fletes_compuestos(data);
        return successResponseRoutes(response);
    },

    get_contabilidad_informeMaquila_resumenInforme: async (data) => {
        const response = await InformesContabilidadController.get_contabilidad_informeMaquila_resumenInforme(data);
        return successResponseRoutes(response);
    }

}
