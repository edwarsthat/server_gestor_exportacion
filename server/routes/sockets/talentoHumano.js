import { CargosPersonalControllerRepository } from "../../api/talentoHumano/CargosPersonal.js"
import { DotacionCarnetsControllerRepository } from "../../api/talentoHumano/dotacion/carnets.js"
import { PersonalControllerRepository } from "../../api/talentoHumano/Personal.js"
import { successResponseRoutes } from "../helpers/responses.js"
import { ContratosPersonalControllerRepository } from "../../api/talentoHumano/ContratosPersonal.js"

export const apiSocketTalentoHumano = {
    post_talentoHumano_personal_ingresoPersonal: async (req) => {
        await PersonalControllerRepository.post_talentoHumano_personal_ingresoPersonal(req)
        return successResponseRoutes()
    },
    post_talentoHumano_cargos_ingresoCargo: async (req) => {
        await CargosPersonalControllerRepository.post_talentoHumano_cargos_ingresoCargo(req)
        return successResponseRoutes()
    },
    post_talentoHumano_personal_cargarCedula: async (req) => {
        const data = await PersonalControllerRepository.post_talentoHumano_personal_cargarCedula(req)
        return successResponseRoutes(data)
    },
    post_talentoHumano_dotacion_carnets: async (req) => {
        await DotacionCarnetsControllerRepository.post_talentoHumano_dotacion_carnets(req)
        return successResponseRoutes()
    },
    get_talentoHumano_cargosPersonal_ingresoPersonal: async () => {
        const data = await CargosPersonalControllerRepository.get_talentoHumano_cargosPersonal_ingresoPersonal()
        return successResponseRoutes(data)
    },
    get_talentoHumano_cargos_registros: async (req) => {
        const data = await CargosPersonalControllerRepository.get_talentoHumano_cargos_registros(req)
        return successResponseRoutes(data)
    },
    get_talentoHumano_cargos_numeroRegistros: async () => {
        const data = await CargosPersonalControllerRepository.get_talentoHumano_cargos_numeroRegistros()
        return successResponseRoutes(data)
    },
    get_talentoHumano_personal_registros: async (req) => {
        const data = await PersonalControllerRepository.get_talentoHumano_personal_registros(req)
        return successResponseRoutes(data)
    },
    get_talentoHumano_personal_numeroRegistros: async (req) => {
        const data = await PersonalControllerRepository.get_talentoHumano_personal_numeroRegistros(req)
        return successResponseRoutes(data)
    },
    get_talentoHumano_personal_Imgs: async (req) => {
        const data = await PersonalControllerRepository.get_talentoHumano_personal_Imgs(req)
        return successResponseRoutes(data)
    },
    get_talentoHumano_dotacion_carnets: async (req) => {
        const data = await DotacionCarnetsControllerRepository.get_talentoHumano_dotacion_carnets(req)
        return successResponseRoutes(data)
    },
    get_talentoHumano_dotacion_carnets_count: async (req) => {
        const data = await DotacionCarnetsControllerRepository.get_talentoHumano_dotacion_carnets_count(req)
        return successResponseRoutes(data)
    },
    get_talentoHumano_dotacion_carnets_empleados: async () => {
        const data = await DotacionCarnetsControllerRepository.get_talentoHumano_dotacion_carnets_empleados()
        return successResponseRoutes(data)
    },
    put_talentoHumano_cargos_modificarCargo: async (req) => {
        await CargosPersonalControllerRepository.put_talentoHumano_cargos_modificarCargo(req)
        return successResponseRoutes()
    },
    put_talentoHumano_personal: async (req) => {
        await PersonalControllerRepository.put_talentoHumano_personal(req)
        return successResponseRoutes()
    },
    put_talentoHumano_dotacion_carnets_generar_temporal: async (req) => {
        const data = await DotacionCarnetsControllerRepository.put_talentoHumano_dotacion_carnets_generar_temporal(req)
        return successResponseRoutes(data)
    },
    put_talentoHumano_dotacion_carnets_generar_final: async (req) => {
        const data = await DotacionCarnetsControllerRepository.put_talentoHumano_dotacion_carnets_generar_final(req)
        return successResponseRoutes(data)
    },
    put_talentoHumano_personal_asignarCarnet: async (req) => {
        await PersonalControllerRepository.put_talentoHumano_personal_asignarCarnet(req)
        return successResponseRoutes()
    },
    put_talentoHumano_personal_modificar_carnet: async (req) => {
        await PersonalControllerRepository.put_talentoHumano_personal_modificar_carnet(req)
        return successResponseRoutes()
    },
    put_talentoHumano_upload_document: async (req) => {
        await PersonalControllerRepository.put_talentoHumano_upload_document(req)
        return successResponseRoutes()
    },

    //para contratos personal
    post_talentoHumano_contratosPersonal: async (req) => {
        await ContratosPersonalControllerRepository.post_talentoHumano_contratosPersonal(req)
        return successResponseRoutes()
    },

    get_talentoHumano_contratosPersonal_registros: async (req) => {
        const data = await ContratosPersonalControllerRepository.get_talentoHumano_contratosPersonal_registros(req)
        return successResponseRoutes(data)
    },

    get_talentoHumano_contratosPersonal_numeroRegistros: async (req) => {
        const data = await ContratosPersonalControllerRepository.get_talentoHumano_contratosPersonal_numeroRegistros(req)
        return successResponseRoutes(data)
    },

    put_talentoHumano_contratosPersonal: async (req) => {
        await ContratosPersonalControllerRepository.put_talentoHumano_contratosPersonal(req)
        return successResponseRoutes()
    },
}