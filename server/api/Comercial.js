const { ProcessError } = require("../../Error/ProcessError");
const { ClientesRepository } = require("../Class/Clientes");
const { LotesRepository } = require("../Class/Lotes");
const { PreciosRepository } = require("../Class/Precios");
const { ProveedoresRepository } = require("../Class/Proveedores");
const { ComercialValidationsRepository } = require("../validations/Comercial");

class ComercialRepository {

    //#region proveedores
    static async get_sys_proveedores(data) {
        let query
        try {

            ComercialValidationsRepository.val_get_sys_proveedores(data)

            if (data === 'activos') {
                query = {
                    query: { activo: true },
                    limit: 'all',
                    select: { PREDIO: 1, 'ICA.code': 1, SISPAP: 1, GGN: 1 }
                }
            } else if (data === 'all') {
                query = {
                    limit: 'all',
                    select: { PREDIO: 1, 'ICA.code': 1, SISPAP: 1, GGN: 1 }
                }
            } else {
                throw new Error("Error en los parametros de busqueda")
            }

            return await ProveedoresRepository.get_proveedores(query);
        } catch (err) {
            if (err.status === 522) {
                throw err
            }
            throw new ProcessError(480, `Error ${err.type}: ${err.message}`)
        }
    }
    static async get_comercial_proveedores_elementos(req, user) {
        try {
            const { page, filtro } = req || {}
            const resultsPerPage = 25;
            let filter
            let query

            if (filtro) {
                ComercialValidationsRepository
                    .val_comercial_proveedores_informacion_proveedores_cantidad_datos(filtro);
                filter = ComercialValidationsRepository
                    .query_comercial_proveedores_informacion_proveedores_cantidad_datos(filtro);

                if (user.Rol > 2) {
                    filter = {
                        ...filter,
                        activo: true
                    }
                }

                query = {
                    skip: (page - 1) * resultsPerPage,
                    query: filter
                }
            } else {
                query = {
                    limit: 'all'
                }
            }


            const registros = await ProveedoresRepository.get_proveedores(query)

            return registros
        } catch (err) {
            if (err.status === 522) {
                throw err
            }
            throw new ProcessError(480, `Error ${err.type}: ${err.message}`)
        }
    }
    static async get_comercial_precios_proveedores_registros() {
        try {

            const query = {
                limit: 'all'
            }

            const registros = await ProveedoresRepository.get_proveedores(query)
            return registros

        } catch (err) {
            if (err.status === 522) {
                throw err
            }
            throw new ProcessError(480, `Error ${err.type}: ${err.message}`)
        }
    }
    static async get_comercial_proveedores_numero_elementos(req, user) {
        try {
            const { filtro } = req

            ComercialValidationsRepository
                .val_comercial_proveedores_informacion_proveedores_cantidad_datos(filtro);
            let query = ComercialValidationsRepository
                .query_comercial_proveedores_informacion_proveedores_cantidad_datos(filtro)

            if (user.Rol > 2) {
                query = {
                    ...query,
                    activo: true
                }
            }

            const registros = await ProveedoresRepository.get_cantidad_proveedores(query)
            return registros

        } catch (err) {
            if (err.status === 522) {
                throw err
            }
            throw new ProcessError(480, `Error ${err.type}: ${err.message}`)
        }
    }
    static async put_comercial_proveedores_modify_proveedor(req, user) {
        try {

            const { _id, data, action } = req

            ComercialValidationsRepository.val_proveedores_informacion_post_put_data(data)

            await ProveedoresRepository.modificar_proveedores(
                _id,
                data,
                action,
                user
            )
        } catch (err) {

            if (err.status === 521) {
                throw err
            }
            throw new ProcessError(480, `Error ${err.type}: ${err.message}`)
        }
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
    static async post_comercial_proveedores_add_proveedor(req, user) {
        try {
            const { data } = req

            const predio = await ProveedoresRepository.get_proveedores({
                query: { "CODIGO INTERNO": 0 }
            })

            ComercialValidationsRepository.val_proveedores_informacion_post_put_data(data);

            const nuevoPredioConPrecio = {
                ...data,
                precio: predio[0].precio
            }

            // Se crea el registro
            await ProveedoresRepository.addProveedor(nuevoPredioConPrecio, user._id);

        } catch (err) {

            if (err.status === 521) {
                throw err
            }
            throw new ProcessError(480, `Error ${err.type}: ${err.message}`)
        }
    }


    //#region Precios
    static async post_comercial_precios_add_precio(req) {
        try {
            const { data } = req

            ComercialValidationsRepository.val_post_comercial_precios_add_precio(data);

            await PreciosRepository.post_precio(data)

        } catch (err) {

            if (err.status === 521) {
                throw err
            }
            throw new ProcessError(480, `Error ${err.type}: ${err.message}`)
        }
    }
    static async get_comercial_precios_cantidad_registros() {
        try {
            const response = await PreciosRepository.get_cantidad_precios()
            return response;
        } catch (err) {
            if (err.status === 524) {
                throw err
            }
            throw new ProcessError(475, `Error ${err.type}: ${err.message}`)
        }
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
