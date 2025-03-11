const { ProcessError } = require("../../Error/ProcessError");
const { ClientesRepository } = require("../Class/Clientes");
const { LotesRepository } = require("../Class/Lotes");
const { PreciosRepository } = require("../Class/Precios");
const { ProveedoresRepository } = require("../Class/Proveedores");
const { ComercialValidationsRepository } = require("../validations/Comercial");
const { filtroFechaInicioFin, filtroPorSemana } = require("./utils/filtros");
const { getISOWeek } = require('date-fns')

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
    static async get_comercial_proveedores_elementos(req) {
        try {
            const { data, user } = req;
            const { page, filtro } = data || {}
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
    static async get_comercial_proveedores_numero_elementos(req) {
        try {
            const { data, user } = req;
            const { filtro } = data

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
    static async put_comercial_proveedores_modify_proveedor(req) {
        try {
            const { data: datos, user } = req
            const { _id, data, action } = datos

            ComercialValidationsRepository.val_proveedores_informacion_post_put_data(data)

            await ProveedoresRepository.modificar_proveedores(
                _id,
                data,
                action,
                user.user
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
    static async post_comercial_proveedores_add_proveedor(req) {
        try {
            const { data: datos, user } = req
            const { data } = datos

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
            const { data: datos, user } = req;

            const { data } = datos
            const [yearStr, weekStr] = data.week.split("-W");
            const year = parseInt(yearStr, 10);
            const week = parseInt(weekStr, 10);

            data.week = week
            data.year = year

            ComercialValidationsRepository.val_post_comercial_precios_add_precio(data);

            const precio = await PreciosRepository.post_precio(data)


            const query = {
                _id: { $in: data.predios }
            }

            const new_data = { [`precio.${data.tipoFruta}`]: precio._id }

            await ProveedoresRepository.modificar_varios_proveedores(
                query, new_data
            )


            const simple = new Date(year, 0, 1 + (week - 1) * 7);
            const dow = simple.getDay();

            const ISOweekStart = new Date(simple);
            if (dow === 0) {
                ISOweekStart.setDate(simple.getDate() - 6);
            } else {
                ISOweekStart.setDate(simple.getDate() - (dow - 1));
            }

            const ISOweekEnd = new Date(ISOweekStart);
            ISOweekEnd.setDate(ISOweekStart.getDate() + 7);

            let lotesQuery = {}

            lotesQuery = filtroFechaInicioFin(ISOweekStart, ISOweekEnd, lotesQuery, "fecha_ingreso_patio")

            lotesQuery.tipoFruta = data.tipoFruta

            const lotes = await LotesRepository.getLotes({
                query: lotesQuery,
                select: { predio: 1, precio: 1, tipoFruta: 1 }
            })


            for (const lote of lotes) {

                if (precio.predios.includes(lote.predio._id.toString())) {
                    lote.precio = precio._id

                    await LotesRepository.modificar_lote_proceso(
                        lote._id,
                        lote,
                        "Cambiar precio",
                        user
                    )
                }
            }


        } catch (err) {

            if (err.status === 521) {
                throw err
            }
            throw new ProcessError(480, `Error ${err.type}: ${err.message}`)
        }
    }
    static async put_comercial_precios_precioLotes(req) {
        try {
            const { data: datos, user } = req
            const { data } = datos

            let lotesQuery = {}

            lotesQuery.enf = data.enf

            const lotes = await LotesRepository.getLotes({
                query: lotesQuery,
                select: { predio: 1, precio: 1, tipoFruta: 1, fecha_ingreso_patio: 1 }
            })

            console.log(lotes)
            const fecha = new Date(lotes[0].fecha_ingreso_patio);
            const year = fecha.getFullYear();
            const week = getISOWeek(fecha);

            data.week = week
            data.year = year

            ComercialValidationsRepository.val_post_comercial_precios_add_precio_lote(data);

            const precio = await PreciosRepository.post_precio({ ...data, tipoFruta: lotes[0].tipoFruta })

            for (const lote of lotes) {

                lote.precio = precio._id

                await LotesRepository.modificar_lote_proceso(
                    lote._id,
                    lote,
                    "Cambiar precio lote",
                    user.user
                )
            }


        } catch (err) {

            if (err.status === 521) {
                throw err
            }
            throw new ProcessError(480, `Error ${err.type}: ${err.message}`)
        }
    }
    static async put_comercial_precios_proveedores_precioFijo(req) {
        try {

            const { data } = req


            const query = { _id: { $in: data } }; // Busca documentos cuyo _id esté en la lista
            const update = [
                { $set: { precioFijo: { $not: "$precioFijo" } } }
            ];

            await ProveedoresRepository.modificar_varios_proveedores(
                query,
                update
            )

        } catch (err) {

            if (err.status === 522) {
                throw err
            }
            throw new ProcessError(480, `Error ${err.type}: ${err.message}`)
        }
    }
    static async get_comercial_precios_registros_precios_proveedor(req, user) {
        try {
            const { page, filtro } = req || {}
            const resultsPerPage = 50;
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
    static async get_comercial_precios_registros_precios_proveedores(req) {
        try {
            const { data: datos } = req;

            const { data } = datos;
            const { page = 1, filtro } = data || {}
            const resultsPerPage = 50;
            const skip = (page - 1) * resultsPerPage;

            ComercialValidationsRepository
                .val_get_comercial_precios_registros_filtro(filtro);

            let query = { skip };
            let queryNumber = {}

            if (filtro) {
                let filter = {};
                // Actualiza filter con el manejo de fechas.

                filter = filtroPorSemana(filtro.fechaInicio, filtro.fechaFin, filter);

                // Asigna tipoFruta si existe
                if (filtro.tipoFruta) {
                    filter.tipoFruta = filtro.tipoFruta;
                }
                // Asigna proveedor en filter.predios si existe
                if (filtro.proveedor) {
                    filter.predios = { $in: filtro.proveedor };
                }

                query = { skip, query: filter };
                queryNumber = filter;

            }

            const registros = await PreciosRepository.get_precios(query)
            const response = await PreciosRepository.get_cantidad_precios(queryNumber)

            return { registros: registros, numeroRegistros: response }
        } catch (err) {
            if (err.status === 522) {
                throw err
            }
            throw new ProcessError(480, `Error ${err.type}: ${err.message}`)
        }
    }


    static async get_clientes() {
        return await ClientesRepository.get_clientes();
    }
    static async obtener_clientes_historial_contenedores() {
        try {
            return await ClientesRepository.get_clientes({
                query: { activo: true },
                select: { CLIENTE: 1 }
            });
        } catch (err) {
            if (err.status === 522) {
                throw err
            }
            throw new ProcessError(480, `Error ${err.type}: ${err.message}`)
        }
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
