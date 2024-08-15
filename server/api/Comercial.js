const { ProveedoresRepository } = require("../Class/Proveedores");

class ComercialRepository {
    static async get_proveedores() {
        return await ProveedoresRepository.get_proveedores();
    }
    static async inactivar_Proveedor(data, user) {
        const { _id, action } = data
        const query = [{
            $set: {
                activo: { $not: "$activo" }
            }
        }]
        await ProveedoresRepository.modificar_proveedores(
            _id,
            query,
            action,
            user
        )
    }
    static async addProveedor(req, user) {
        const { data } = req
        console.log(data)
        await ProveedoresRepository.addProveedor(data, user)
    }
    static async modificar_proveedor(req, user) {
        const { _id, data, action } = req
        await ProveedoresRepository.modificar_proveedores(
            _id,
            data,
            action,
            user
        )
    }
    static async obtener_precio_proveedores(req) {
        const { data } = req
        const response = await ProveedoresRepository.get_proveedores({
            id: data,
            select: { precio: 1 }
        })
        return response
    }
    static async ingresar_precio_fruta(req, user) {
        const { action, data } = req
        const { precio, tipoFruta } = data
        const keys = Object.keys(precio);
        const info = {};
        for (let i = 0; i < keys.length; i++) {
            let key2 = `precio.${tipoFruta}.${keys[i]}`
            info[key2] = precio[keys[i]]
        }
        await ProveedoresRepository.modificar_varios_proveedores({}, { $set: info }, action, user)
    }
}

module.exports.ComercialRepository = ComercialRepository
