const { ClientesRepository } = require("../Class/Clientes");
const { LotesRepository } = require("../Class/Lotes");
const { ProveedoresRepository } = require("../Class/Proveedores");

class ComercialRepository {
    static async get_proveedores() {
        return await ProveedoresRepository.get_proveedores();
    }
    static async get_proveedores_proceso() {
        return await ProveedoresRepository.get_proveedores(
            { query: { activo: true } }
        );
    }
    static async get_clientes() {
        return await ClientesRepository.get_clientes();
    }
    static async obtener_clientes_historial_contenedores() {
        return await ClientesRepository.get_clientes({
            query: { activo: true },
            select: { CLIENTE: 1 }
        });
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
    static async modificar_estado_cliente(data, user) {
        const { _id, action } = data
        const query = [{
            $set: {
                activo: { $not: "$activo" }
            }
        }]
        await ClientesRepository.modificar_cliente(
            _id,
            query,
            action,
            user
        )
    }
    static async modificar_info_cliente(req, user) {
        const { _id, data, action } = req
        delete data._id
        await ClientesRepository.put_cliente(
            _id,
            data,
            action,
            user
        )
    }
    static async add_cliente(req, user) {
        const { data } = req
        await ClientesRepository.post_cliente(data, user)
    }
    static async lote_caso_favorita(req, user) {
        try {
            const { _id, query, action } = req


            await LotesRepository.modificar_lote_proceso(
                _id, query, action, user
            )
        } catch (err) {
            throw new Error(`Code ${err.code}: ${err.message}`);

        }
    }
    static async lote_no_pagar_balin(req, user) {
        try {
            const { _id, action } = req

            const lote = await LotesRepository.getLotes({ ids: [_id] })

            const query = { flag_balin_free: !lote[0].flag_balin_free };
            console.log(query)

            await LotesRepository.modificar_lote_proceso(
                _id, query, action, user
            )
        } catch (err) {
            throw new Error(`Code ${err.code}: ${err.message}`);

        }
    }
}

module.exports.ComercialRepository = ComercialRepository
