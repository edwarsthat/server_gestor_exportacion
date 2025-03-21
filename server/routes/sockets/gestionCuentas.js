const { gestionCuentasRepository } = require("../../api/gestionCuentas")
const { successResponseRoutes } = require("../helpers/responses")


const apiSocketGestionCuentas = {
    get_gestionCuentas_cargos: async (req) => {
        const response = await gestionCuentasRepository.get_gestionCuentas_cargos(req)
        return successResponseRoutes(response)
    },
    put_gestionCuentas_cargos: async (data) => {
        await gestionCuentasRepository.put_gestionCuentas_cargos(data);
        return successResponseRoutes()
    },
    delete_gestionCuentas_cargos: async (req) => {
        await gestionCuentasRepository.delete_gestionCuentas_cargos(req)
        return successResponseRoutes()
    },
}

module.exports.apiSocketGestionCuentas = apiSocketGestionCuentas
