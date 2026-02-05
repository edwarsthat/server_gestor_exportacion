import { UserRepository } from "../../auth/users.js";
import { successResponseRoutes } from "../helpers/responses.js"; 

export  const apiSocketAuth = {

    post_auth_recuperar_password: async (data) => {
        await UserRepository.crear_codigo_recuperacion(data.usuario);
        return successResponseRoutes();
    },

    post_auth_reset_password: async (data) => {
        await UserRepository.reset_password_con_codigo(data);
        return successResponseRoutes();
    }
};