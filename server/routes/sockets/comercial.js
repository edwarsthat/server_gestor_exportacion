const { ComercialRepository } = require("../../api/Comercial")
const { successResponseRoutes } = require("../helpers/responses")

const apiSocketComercial = {
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
    //#endregios
}

module.exports.apiSocketComercial = apiSocketComercial
