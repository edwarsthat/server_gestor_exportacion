import { ComercialRepository } from "../../api/Comercial.js";
import { successResponseRoutes } from "../helpers/responses.js";

export const apiSocketComercial = {
    //#region precio proveedores
    get_comercial_precios_proveedores_registros: async () => {
        const response = await ComercialRepository.get_comercial_precios_proveedores_registros();
        return successResponseRoutes(response)
    },
    get_comercial_precios_registros_precios_proveedores: async (data) => {
        const response = await ComercialRepository.get_comercial_precios_registros_precios_proveedores(data);
        return successResponseRoutes(response)
    },
    put_comercial_precios_proveedores_precioFijo: async (data) => {
        await ComercialRepository.put_comercial_precios_proveedores_precioFijo(data)
        return successResponseRoutes()
    },
    post_comercial_precios_add_precio: async (data) => {
        await ComercialRepository.post_comercial_precios_add_precio(data)
        return successResponseRoutes()
    },
    put_comercial_precios_precioLotes: async (data) => {
        await ComercialRepository.put_comercial_precios_precioLotes(data)
        return successResponseRoutes()
    },
    put_comercial_registroPrecios_proveedores_comentario: async (data) => {
        await ComercialRepository.put_comercial_registroPrecios_proveedores_comentario(data)
        return successResponseRoutes()
    },
    //#endregion
    //#region proveedores
    get_comercial_proveedores_elementos: async (data) => {
        const proveedores = await ComercialRepository.get_comercial_proveedores_elementos(data);
        return successResponseRoutes(proveedores)
    },
    get_comercial_proveedores_numero_elementos: async (data) => {
        const response = await ComercialRepository.get_comercial_proveedores_numero_elementos(data)
        return successResponseRoutes(response)
    },
    put_comercial_proveedores_modify_proveedor: async (data) => {
        await ComercialRepository.put_comercial_proveedores_modify_proveedor(data)
        return successResponseRoutes()
    },
    post_comercial_proveedores_add_proveedor: async (data) => {
        await ComercialRepository.post_comercial_proveedores_add_proveedor(data)
        return successResponseRoutes()
    },
    //#endregion
    //#region clientes
    get_comercial_clientes: async () => {
        const response = await ComercialRepository.get_comercial_clientes();
        return successResponseRoutes(response)
    },
    post_comercial_clientes: async (data) => {
        await ComercialRepository.post_comercial_clientes(data)
        return successResponseRoutes()
    },
    put_comercial_clientes: async (data) => {
        await ComercialRepository.put_comercial_clientes(data)
        return successResponseRoutes()
    },
    put_comercial_clientes_estado: async (req) => {
        await ComercialRepository.put_comercial_clientes_estado(req)
        return successResponseRoutes()
    },
    get_comercial_clientesNacionales: async (data) => {
        const proveedores = await ComercialRepository.get_comercial_clientesNacionales(data);
        return successResponseRoutes(proveedores)
    },
    put_comercial_clientes_clienteNacional: async (data) => {
        const proveedores = await ComercialRepository.put_comercial_clientes_clienteNacional(data);
        return successResponseRoutes(proveedores)
    },
    //#endregion
    //#region ingresos contendores
    post_comercial_contenedor: async (data) => {
        await ComercialRepository.post_comercial_contenedor(data)
        return successResponseRoutes()
    },
    post_comercial_clienteNacional: async (data) => {
        await ComercialRepository.post_comercial_clienteNacional(data)
        return successResponseRoutes()
    },
    //#endregion
    //#region formularios clientes
    get_comercial_formularios_reclamacionesCalidad_numeroElementos: async () => {
        const response = await ComercialRepository.get_comercial_formularios_reclamacionesCalidad_numeroElementos()
        return successResponseRoutes(response)
    },
    get_comercial_formularios_reclamacionesCalidad_contenedores: async (data) => {
        const response = await ComercialRepository.get_comercial_formularios_reclamacionesCalidad_contenedores(data)
        return successResponseRoutes(response)
    },
    get_comercial_formularios_reclamacionCalidad_archivo: async (data) => {
        const response = await ComercialRepository.get_comercial_formularios_reclamacionCalidad_archivo(data)
        return successResponseRoutes(response)
    },
    get_comercial_precios_registros_precios_proveedores_numeroElementos: async (data) => {
        const response = await ComercialRepository.get_comercial_precios_registros_precios_proveedores_numeroElementos(data)
        return successResponseRoutes(response)
    }
    //#endregion
}
