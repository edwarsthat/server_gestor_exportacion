import { CargosPersonalControllerRepository } from "../../api/talentoHumano/CargosPersonal.js"
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
    get_talentoHumano_personal_numeroRegistros: async () => {
        const data = await PersonalControllerRepository.get_talentoHumano_personal_numeroRegistros()
        return successResponseRoutes(data)
    },
    put_talentoHumano_cargos_modificarCargo: async (req) => {
        await CargosPersonalControllerRepository.put_talentoHumano_cargos_modificarCargo(req)
        return successResponseRoutes()
    },
}