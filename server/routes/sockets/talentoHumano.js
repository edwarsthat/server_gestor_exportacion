
export const apiSocketTalentoHumano = {
    post_talentoHumano_personal_ingresoPersonal: async (data) => {
        await PersonalApiRepository.post_talentoHumano_personal_ingresoPersonal(data)
        return successResponseRoutes()
    },
}