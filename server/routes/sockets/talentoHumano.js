import { CargosPersonalControllerRepository } from "../../api/talentoHumano/CargosPersonal.js"
import { successResponseRoutes } from "../helpers/responses.js"

export const apiSocketTalentoHumano = {
    post_talentoHumano_personal_ingresoPersonal: async (data) => {
        await PersonalApiRepository.post_talentoHumano_personal_ingresoPersonal(data)
        return successResponseRoutes()
    },
    get_talentoHumano_cargosPersonal_ingresoPersonal: async () => {
        const data = await CargosPersonalControllerRepository.get_talentoHumano_cargosPersonal_ingresoPersonal()
        return successResponseRoutes(data)
    },
    post_talentoHumano_cargos_ingresoCargo: async (data) => {
        await CargosPersonalControllerRepository.post_talentoHumano_cargos_ingresoCargo(data)
        return successResponseRoutes()
    },
}