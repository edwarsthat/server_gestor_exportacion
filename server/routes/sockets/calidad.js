const { CalidadRepository } = require("../../api/Calidad")
const { successResponseRoutes } = require("../helpers/responses")

const apiSocketCalidad = {
    //#region historial
    get_calidad_historial_calidadInterna: async (data) => {
        const response = await CalidadRepository.get_calidad_historial_calidadInterna(data)
        return successResponseRoutes(response)
    },
    get_calidad_historial_calidadInterna_numeroElementos: async () => {
        const response = await CalidadRepository.get_calidad_historial_calidadInterna_numeroElementos()
        return successResponseRoutes(response)
    },
    put_calidad_historial_calidadInterna: async (data) => {
        await CalidadRepository.put_calidad_historial_calidadInterna(data)
        return successResponseRoutes()
    },
    get_calidad_historial_clasificacionDescarte: async (data) => {
        const response = await CalidadRepository.get_calidad_historial_clasificacionDescarte(data)
        return successResponseRoutes(response)
    },
    put_calidad_historial_clasficacionDescarte: async (data) => {
        await CalidadRepository.put_calidad_historial_clasficacionDescarte(data)
        return successResponseRoutes()
    },
    //#endregion 
    //#region informes
    get_calidad_informes_lotesInformesProveedor: async (data) => {
        const response = await CalidadRepository.get_calidad_informes_lotesInformesProveedor(data);
        return successResponseRoutes(response)
    },
    get_calidad_informes_imagenDefecto: async (data) => {
        const response = await CalidadRepository.get_calidad_informes_imagenDefecto(data)
        return successResponseRoutes(response)
    },
    get_calidad_informes_observacionesCalidad: async () => {
        const response = await CalidadRepository.get_calidad_informes_observacionesCalidad()
        return successResponseRoutes(response)
    },
    get_calidad_informes_contenedoresLote: async (data) => {
        const response = await CalidadRepository.get_calidad_informes_contenedoresLote(data)
        return successResponseRoutes(response)
    },
    get_calidad_informes_informeProveedor_numeroElementos: async () => {
        const response = await CalidadRepository.get_calidad_informes_informeProveedor_numeroElementos()
        return successResponseRoutes(response)
    },
    put_calidad_informes_loteFinalizarInforme: async (data) => {
        await CalidadRepository.put_calidad_informes_loteFinalizarInforme(data)
        return successResponseRoutes()
    },
    put_calidad_informes_aprobacionComercial: async (data) => {
        await CalidadRepository.put_calidad_informes_aprobacionComercial(data)
        return successResponseRoutes()
    },
    put_calidad_informe_noPagarBalinLote: async (data) => {
        await CalidadRepository.put_calidad_informe_noPagarBalinLote(data)
        return successResponseRoutes()
    },
    //#endregion
    //#region ingresos calidad
    get_calidad_ingresos_clasificacionDescarte: async () => {
        const response = await CalidadRepository.get_calidad_ingresos_clasificacionDescarte();
        return successResponseRoutes(response)
    },
    put_calidad_ingresos_clasificacionDescarte: async (data) => {
        await CalidadRepository.put_calidad_ingresos_clasificacionDescarte(data)
        return successResponseRoutes()
    },
    get_calidad_ingresos_calidadInterna: async () => {
        const response = await CalidadRepository.get_calidad_ingresos_calidadInterna();
        return successResponseRoutes(response)
    },
    put_calidad_ingresos_calidadInterna: async (data) => {
        await CalidadRepository.put_calidad_ingresos_calidadInterna(data)
        return successResponseRoutes()
    },
    get_calidad_ingresos_inspeccionFruta: async () => {
        const response = await CalidadRepository.get_calidad_ingresos_inspeccionFruta();
        return successResponseRoutes(response)
    },
    put_calidad_ingresos_inspeccionFruta: async (req) => {
        await CalidadRepository.put_calidad_ingresos_inspeccionFruta(req)
        return successResponseRoutes()
    },
    get_calidad_ingresos_operariosVolanteCalidad: async () => {
        const response = await CalidadRepository.get_calidad_ingresos_operariosVolanteCalidad()
        return successResponseRoutes(response)
    },
    post_calidad_ingresos_volanteCalidad: async (data) => {
        await CalidadRepository.post_calidad_ingresos_volanteCalidad(data)
        return successResponseRoutes()
    },
    get_calidad_ingresos_higienePersonal: async () => {
        const response = await CalidadRepository.get_calidad_ingresos_higienePersonal()
        return successResponseRoutes(response)
    },
    post_calidad_ingresos_higienePersonal: async (data) => {
        await CalidadRepository.post_calidad_ingresos_higienePersonal(data)
        return successResponseRoutes()
    },
    get_calidad_ingresos_tiposFormularios: async () => {
        const response = await CalidadRepository.get_calidad_ingresos_tiposFormularios();
        return successResponseRoutes(response)
    },
    post_calidad_ingresos_crearFormulario: async (data) => {
        await CalidadRepository.post_calidad_ingresos_crearFormulario(data)
        return successResponseRoutes()
    },
    get_calidad_ingresos_formulariosCalidad: async () => {
        const response = await CalidadRepository.get_calidad_ingresos_formulariosCalidad();
        return successResponseRoutes(response)
    },
    put_calidad_ingresos_formulariosCalidad: async (data) => {
        await CalidadRepository.put_calidad_ingresos_formulariosCalidad(data);
        return successResponseRoutes()
    },
    //#endregion
    //#region formularios
    get_calidad_formulario_volanteCalidad: async (data) => {
        const response = await CalidadRepository.get_calidad_formulario_volanteCalidad(data)
        return successResponseRoutes(response)
    },
    get_calidad_formulario_higienePersonal: async (data) => {
        const response = await CalidadRepository.get_calidad_formulario_higienePersonal(data)
        return successResponseRoutes(response)
    },
    get_calidad_formulario_limpiezaDiaria: async (data) => {
        const response = await CalidadRepository.get_calidad_formulario_limpiezaDiaria(data);
        return successResponseRoutes(response)
    },
    get_calidad_formulario_limpiezaDiaria_numeroElementos: async () => {
        const response = await CalidadRepository.get_calidad_formulario_limpiezaDiaria_numeroElementos();
        return successResponseRoutes(response)
    },
    get_calidad_formulario_limpiezaMensual: async (data) => {
        const response = await CalidadRepository.get_calidad_formulario_limpiezaMensual(data);
        return successResponseRoutes(response)
    },
    get_calidad_formulario_limpiezaMensual_numeroElementos: async () => {
        const response = await CalidadRepository.get_calidad_formulario_limpiezaMensual_numeroElementos();
        return successResponseRoutes(response)
    },
    get_calidad_formulario_controlPlagas: async (data) => {
        const response = await CalidadRepository.get_calidad_formulario_controlPlagas(data);
        return successResponseRoutes(response)
    },
    get_calidad_formulario_controlPlagas_numeroElementos: async () => {
        const response = await CalidadRepository.get_calidad_formulario_controlPlagas_numeroElementos();
        return successResponseRoutes(response)

    },

    //#endregion
}

module.exports.apiSocketCalidad = apiSocketCalidad
