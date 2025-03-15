
const { ProcesoRepository } = require("../api/Proceso");
const { successResponseRoutes } = require("../routes/helpers/responses");
class socketMobileRepository {
    static async get_proceso_aplicaciones_listaEmpaque_lotes() {
        const response = await ProcesoRepository.get_proceso_aplicaciones_listaEmpaque_lotes()
        return successResponseRoutes(response)
    }
    static async get_proceso_aplicaciones_listaEmpaque_contenedores() {
        const response = await ProcesoRepository.get_proceso_aplicaciones_listaEmpaque_contenedores()
        return successResponseRoutes(response)
    }
    static async add_settings_pallet(req) {
        const { data, user } = req;
        const contenedores = await ProcesoRepository.add_settings_pallet(data, user.user);
        return { status: 200, message: 'Ok', data: contenedores }
    }
    static async put_proceso_aplicaciones_listaEmpaque_agregarItem(data) {
        try {
            const response = await ProcesoRepository.put_proceso_aplicaciones_listaEmpaque_agregarItem(data);
            return successResponseRoutes(response)
        } catch (err) {
            throw new Error(err)
        }
    }
    static async eliminar_item_lista_empaque(req) {
        const { data, user } = req;
        const contenedores = await ProcesoRepository.eliminar_item_lista_empaque(data, user.user);
        return { status: 200, message: 'Ok', data: contenedores }
    }
    static async restar_item_lista_empaque(req) {
        const { data, user } = req;
        const contenedores = await ProcesoRepository.restar_item_lista_empaque(data, user.user);
        return { status: 200, message: 'Ok', data: contenedores }
    }
    static async mover_item_lista_empaque(req) {
        const { data, user } = req;
        await ProcesoRepository.mover_item_lista_empaque(data, user.user);

        return {
            status: 200,
            message: 'Ok'
        }

    }

    static async liberar_pallets_lista_empaque(req) {
        const { data, user } = req;
        const contenedores = await ProcesoRepository.liberar_pallets_lista_empaque(data, user.user);
        return { status: 200, message: 'Ok', data: contenedores }
    }
    static async put_proceso_aplicaciones_listaEmpaque_Cerrar(data) {
        await ProcesoRepository.put_proceso_aplicaciones_listaEmpaque_Cerrar(data);
        return successResponseRoutes()
    }
    static async modificar_items_lista_empaque(datos) {
        const { user, data } = datos;
        await ProcesoRepository.modificar_items_lista_empaque(data, user.user)
        return { status: 200, message: 'Ok' }

    }
}

module.exports.socketMobileRepository = socketMobileRepository;
