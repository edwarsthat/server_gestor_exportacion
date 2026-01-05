import { CargosPersonalControllerRepository } from "../../api/talentoHumano/CargosPersonal.js"
import { DotacionCarnetsControllerRepository } from "../../api/talentoHumano/dotacion/carnets.js"
import { PersonalControllerRepository } from "../../api/talentoHumano/Personal.js"
import { successResponseRoutes } from "../helpers/responses.js"

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
}