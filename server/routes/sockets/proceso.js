const { ProcesoRepository } = require("../../api/Proceso.mjs")
const { successResponseRoutes } = require("../helpers/responses")

const apiSocketProceso = {
    //#region aplicaciones
    post_proceso_aplicaciones_fotoCalidad: async (data) => {
        await ProcesoRepository.post_proceso_aplicaciones_fotoCalidad(data)
        return successResponseRoutes()
    },
    get_proceso_aplicaciones_fotoCalidad: async () => {
        const response = await ProcesoRepository.get_proceso_aplicaciones_fotoCalidad();
        return successResponseRoutes(response)
    },
    get_proceso_aplicaciones_descarteLavado: async () => {
        const response = await ProcesoRepository.get_proceso_aplicaciones_descarteLavado()
        return successResponseRoutes(response)
    },
    put_proceso_aplicaciones_descarteLavado: async (data) => {
        await ProcesoRepository.put_proceso_aplicaciones_descarteLavado(data)
        return successResponseRoutes()
    },
    put_proceso_aplicaciones_descarteEncerado: async (data) => {
        await ProcesoRepository.put_proceso_aplicaciones_descarteEncerado(data)
        return successResponseRoutes()
    },

    //lista de empaque
    get_proceso_aplicaciones_listaEmpaque_contenedores: async () => {
        const response = await ProcesoRepository.get_proceso_aplicaciones_listaEmpaque_contenedores()
        return successResponseRoutes(response)
    },
    get_proceso_aplicaciones_listaEmpaque_lotes: async () => {
        const response = await ProcesoRepository.get_proceso_aplicaciones_listaEmpaque_lotes();
        return successResponseRoutes(response)
    },
    put_proceso_aplicaciones_listaEmpaque_agregarItem: async (data) => {
        const response = await ProcesoRepository.put_proceso_aplicaciones_listaEmpaque_agregarItem(data);
        return successResponseRoutes(response)
    },
    put_proceso_aplicaciones_listaEmpaque_addSettings: async (data) => {
        const response = await ProcesoRepository.put_proceso_aplicaciones_listaEmpaque_addSettings(data);
        return successResponseRoutes(response)
    },
    put_proceso_aplicaciones_listaEmpaque_modificarItem_desktop: async (data) => {
        const response = await ProcesoRepository.put_proceso_aplicaciones_listaEmpaque_modificarItem_desktop(data);
        return successResponseRoutes(response)
    },
    put_proceso_aplicaciones_listaEmpaque_eliminarItem_desktop: async (data) => {
        const response = await ProcesoRepository.put_proceso_aplicaciones_listaEmpaque_eliminarItem_desktop(data);
        return successResponseRoutes(response)
    },
    put_proceso_aplicaciones_listaEmpaque_Cerrar: async (data) => {
        await ProcesoRepository.put_proceso_aplicaciones_listaEmpaque_Cerrar(data);
        return successResponseRoutes()
    },
    put_proceso_aplicaciones_listaEmpaque_eliminarItems: async (data) => {
        const response = await ProcesoRepository.put_proceso_aplicaciones_listaEmpaque_eliminarItems(data);
        return successResponseRoutes(response)
    },
    put_proceso_aplicaciones_listaEmpaque_restarItem: async (data) => {
        const response = await ProcesoRepository.put_proceso_aplicaciones_listaEmpaque_restarItem(data);
        return successResponseRoutes(response)
    },
    put_proceso_aplicaciones_listaEmpaque_moverItems: async (data) => {
        await ProcesoRepository.put_proceso_aplicaciones_listaEmpaque_moverItems(data);
        return successResponseRoutes()
    },
    put_proceso_aplicaciones_listaEmpaque_liberarPallet: async (data) => {
        const response = await ProcesoRepository.put_proceso_aplicaciones_listaEmpaque_liberarPallet(data);
        return successResponseRoutes(response)
    },
    put_proceso_aplicaciones_listaEmpaque_modificarItems: async (data) => {
        await ProcesoRepository.put_proceso_aplicaciones_listaEmpaque_modificarItems(data)
        return successResponseRoutes()
    }

    //#endregion
}

module.exports.apiSocketProceso = apiSocketProceso