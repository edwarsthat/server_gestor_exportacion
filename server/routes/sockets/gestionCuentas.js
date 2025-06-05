import { gestionCuentasRepository } from "../../api/gestionCuentas.js";
import { successResponseRoutes } from "../helpers/responses.js";

export const apiSocketGestionCuentas = {
    //#region cargos
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
    post_gestionCuentas_cargo: async (data) => {
        await gestionCuentasRepository.post_gestionCuentas_cargo(data)
        return successResponseRoutes()
    },
    //#endregion
    //#region usuarios
    get_gestionCuentas_usuarios: async (data) => {
        const response = await gestionCuentasRepository.get_gestionCuentas_usuarios(data)
        return successResponseRoutes(response)
    },
    post_gestionCuentas_usuario: async (data) => {
        await gestionCuentasRepository.post_gestionCuentas_usuario(data)
        return successResponseRoutes()
    },
    put_gestionCuentas_usuarioEstado: async (data) => {
        await gestionCuentasRepository.put_gestionCuentas_usuarioEstado(data);
        return successResponseRoutes()
    },
    put_gestionCuentas_usuario: async (data) => {
        await gestionCuentasRepository.put_gestionCuentas_usuario(data);
        return successResponseRoutes()
    },
    //#endregion
}
