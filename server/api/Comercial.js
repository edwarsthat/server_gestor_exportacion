const { ComercialLogicError } = require("../../Error/logicLayerError");
const { ProcessError } = require("../../Error/ProcessError");
const { RecordCreacionesRepository } = require("../archive/ArchiveCreaciones");
const { RecordModificacionesRepository } = require("../archive/ArchivoModificaciones");
const { ClientesRepository } = require("../Class/Clientes");
const { ContenedoresRepository } = require("../Class/Contenedores");
const { LotesRepository } = require("../Class/Lotes");
const { PreciosRepository } = require("../Class/Precios");
const { ProveedoresRepository } = require("../Class/Proveedores");
const { ComercialValidationsRepository } = require("../validations/Comercial");
const { filtroFechaInicioFin, filtroPorSemana } = require("./utils/filtros");
const { getISOWeek } = require('date-fns')
const { z } = require('zod')

// const nodemailer = require('nodemailer');

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
                    select: {
                        PREDIO: 1,
                        'ICA.code': 1,
                        SISPAP: 1,
                        GGN: 1,
                        "CODIGO INTERNO": 1,
                        canastillas: 1
                    }
                }
            } else if (data === 'all') {
                query = {
                    limit: 'all',
                    select: { PREDIO: 1, 'ICA.code': 1, SISPAP: 1, GGN: 1, "CODIGO INTERNO": 1 }
                }
            } else {
                throw new Error("Error en los parametros de busqueda")
            }

            return await ProveedoresRepository.get_proveedores(query);
        } catch (err) {
            if (err.status === 522) {
                throw err
            }
            throw new ComercialLogicError(480, `Error ${err.type}: ${err.message}`)
        }
    }
    static async get_comercial_proveedores_elementos(req) {
        try {
            const { data, user } = req || {};
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
            throw new ComercialLogicError(480, `Error ${err.type}: ${err.message}`)
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
            throw new ComercialLogicError(480, `Error ${err.type}: ${err.message}`)
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
            throw new ComercialLogicError(480, `Error ${err.type}: ${err.message}`)
        }
    }
    static async put_comercial_proveedores_modify_proveedor(req) {
        try {
            const { data: datos, user } = req
            const { _id, data, action } = datos

            ComercialValidationsRepository.val_proveedores_informacion_post_put_data(data)

            const proveedorOld = await ProveedoresRepository.get_proveedores({
                ids: [_id]
            })
            const newProveedor = await ProveedoresRepository.actualizar_proveedor(
                { _id },
                data
            );
            // Registrar modificación Clientes
            await RecordModificacionesRepository.post_record_modification(
                action,
                user,
                {
                    modelo: "Proveedor",
                    documentoId: newProveedor._id,
                    descripcion: `Se modifico el proveedor `,
                },
                proveedorOld[0],
                newProveedor,
                { _id, data, action }
            );
        } catch (err) {
            if (err.status === 523 || err.status === 522) {
                throw err
            }
            throw new ComercialLogicError(480, `Error ${err.type}: ${err.message}`)
        }
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
            const proveedor = await ProveedoresRepository.addProveedor(nuevoPredioConPrecio, user._id);

            const documento = {
                modelo: "Proveedor",
                _id: proveedor._id,
            }

            await RecordCreacionesRepository.post_record_creaciones(
                "post_comercial_proveedores_add_proveedor",
                user,
                documento,
                proveedor,
                "Creacion de proveedor"
            )

        } catch (err) {

            if (err.status === 521) {
                throw err
            }
            throw new ComercialLogicError(480, `Error ${err.type}: ${err.message}`)
        }
    }
    //#region Precios
    //#region clientes
    static async get_comercial_clientes() {
        try {
            return await ClientesRepository.get_clientes();
        } catch (err) {
            if (err.status === 522) {
                throw err
            }
            throw new ComercialLogicError(480, `Error ${err.type}: ${err.message}`)
        }
    }
    static async post_comercial_clientes(req) {
        try {
            const { user } = req
            const { data } = req.data
            const cliente = await ClientesRepository.post_cliente(data, user)

            const documento = {
                modelo: "Cliente",
                _id: cliente._id,
            }
            await RecordCreacionesRepository.post_record_creaciones(
                "post_comercial_clientes",
                user,
                documento,
                cliente,
                "Creacion de cliente"
            )
        } catch (err) {
            console.log(err)
            if (err.status === 521) {
                throw err
            }
            throw new ComercialLogicError(480, `Error ${err.type}: ${err.message}`)
        }
    }
    static async put_comercial_clientes(req) {
        try {
            const { user } = req
            const { _id, data, action } = req.data
            delete data._id
            const clienteOld = await ClientesRepository.get_clientes({
                ids: [_id]
            })

            const newCliente = await ClientesRepository.actualizar_cliente(
                { _id },
                data
            );
            // Registrar modificación Clientes
            const modificado = Object.keys(data).reduce((acu, item) => acu += item + " - ", "")

            await RecordModificacionesRepository.post_record_modification(
                action,
                user,
                {
                    modelo: "Cliente",
                    documentoId: newCliente._id,
                    descripcion: `Se modifico ${modificado} `,
                },
                clienteOld[0],
                newCliente,
                { _id, data, action }
            );

        } catch (err) {
            if (err.status === 521) {
                throw err
            }
            throw new ComercialLogicError(480, `Error ${err.type}: ${err.message}`)
        }
    }
    static async put_comercial_clientes_estado(req) {
        try {
            const { user } = req
            const { _id, action } = req.data

            const clienteOld = await ClientesRepository.get_clientes({
                ids: [_id]
            })

            const newCliente = await ClientesRepository.actualizar_cliente(
                { _id },
                {
                    $set: {
                        activo: clienteOld[0].activo ? false : true
                    }
                }
            );

            await RecordModificacionesRepository.post_record_modification(
                action,
                user,
                {
                    modelo: "Cliente",
                    documentoId: newCliente._id,
                    descripcion: `Se modifico el estado del cliente`,
                },
                clienteOld[0],
                newCliente,
                { _id, action }
            );

        } catch (err) {
            if (err.status === 521) {
                throw err
            }
            throw new ComercialLogicError(480, `Error ${err.type}: ${err.message}`)
        }
    }
    static async get_comercial_clientesNacionales() {
        try {
            const [clientes, numeroClientes] = await Promise.all([
                ClientesRepository.get_clientesNacionales(),
                ClientesRepository.get_numero_clientesNacionales()
            ])
            return {
                clientes,
                cantidad: numeroClientes
            }
        } catch (err) {
            if (err.status === 522) {
                throw err
            }
            throw new ComercialLogicError(480, `Error ${err.type}: ${err.message}`)
        }
    }
    static async put_comercial_clientes_clienteNacional(req) {
        try {
            const { user } = req
            const { data, action } = req.data

            ComercialValidationsRepository.put_comercial_clientes_clienteNacional().parse(data)
            const clienteOld = await ClientesRepository.get_clientesNacionales({
                ids: [data._id]
            })

            if (!clienteOld || clienteOld.length === 0) {
                throw new ComercialLogicError(404, "Cliente nacional no encontrado")
            }

            const newCliente = await ClientesRepository.actualizar_clienteNacional(
                { _id: data._id },
                {
                    $set: {
                        cliente: data.cliente,
                        ubicacion: data.ubicacion,
                        canastillas: data.canastillas
                    }
                }
            );

            await RecordModificacionesRepository.post_record_modification(
                action,
                user,
                {
                    modelo: "ClienteNacional",
                    documentoId: newCliente._id,
                    descripcion: `Se modificaron los datos del cliente nacional`,
                },
                clienteOld[0],
                newCliente,
                { data, action }
            );

        } catch (err) {
            // ZodError: errores de validación con mensaje claro
            if (err instanceof z.ZodError) {
                const errores = err.errors.map(e => `${e.path[0]}: ${e.message}`).join(" | ")
                throw new ComercialLogicError(480, `Error de validación: ${errores}`)
            }

            // Error conocido con status custom
            if (err.status === 521) {
                throw err
            }

            // Error genérico
            throw new ComercialLogicError(480, `Error ${err.type ?? "desconocido"}: ${err.message}`)
        }

    }
    //#regionend
    //#region ingresos
    static async post_comercial_contenedor(req) {
        try {
            const { data: datos, user } = req
            const { data, action } = datos

            const newCont = await ContenedoresRepository.crearContenedor(data, user._id);

            const documento = {
                modelo: "Cliente",
                _id: newCont._id,
            }

            await RecordCreacionesRepository.post_record_creaciones(
                action,
                user,
                documento,
                newCont,
                `Creacion de contenedor ${newCont.numeroContenedor}`
            )

        } catch (err) {
            if (err.status === 521) {
                throw err
            }
            throw new ComercialLogicError(480, `Error ${err.type}: ${err.message}`)
        }
    }
    static async post_comercial_clienteNacional(req) {
        try {
            const { user } = req
            const { data, action } = req.data

            console.log(req)
            const parsedData = ComercialValidationsRepository.val_post_comercial_clienteNacional().parse(data);
            const cliente = await ClientesRepository.post_cliente_nacional(parsedData);

            const documento = {
                modelo: "Cliente nacional",
                _id: cliente._id,
            }

            await RecordCreacionesRepository.post_record_creaciones(
                action,
                user,
                documento,
                cliente,
                `Creación de cliente nacional: ${cliente.cliente || cliente._id}`
            )

        } catch (err) {
            console.log(err)
            if (err.status === 521) {
                throw err
            }
            throw new ComercialLogicError(480, `Error ${err.type}: ${err.message}`)
        }
    }
    //#endregion
    //#region formularios
    static async put_comercial_reclamacionCalidad_contenedor(req) {
        try {
            const { form, paths } = req
            const { contenedor } = form
            //se obtiene  el contenedor a modifiar
            const foundContenedor = await ContenedoresRepository.get_Contenedores_sin_lotes({
                query: { numeroContenedor: Number(contenedor) },
                select: { infoContenedor: 1 },
            });

            if (foundContenedor.length <= 0) throw new Error("Contenedor no encontrado")

            // Actualizar contenedor con pallets modificados
            await ContenedoresRepository.actualizar_contenedor(
                { _id: foundContenedor[0]._id },
                {
                    reclamacionCalidad: {
                        ...form,
                        archivosSubidos: paths
                    }
                }
            );


            // // Configura el transporte con los datos de Mailgun
            // let transporter = nodemailer.createTransport({
            //     host: 'smtp.mailgun.org',
            //     port: 587,
            //     secure: false, // true para 465, false para otros puertos
            //     auth: {
            //         user: '@celifrut.com', // Reemplaza con tu usuario (por ejemplo, postmaster@tudominio.com)
            //         pass:  // Reemplaza con tu API key de Mailgun
            //     }
            // });

            // // Define los detalles del correo
            // let mailOptions = {
            //     from: '"Tu Nombre" <transformaciondigital@celifrut.com>', // Remitente
            //     to: correo, // Destinatario
            //     subject: 'Correo enviado con Mailgun y Node.js',
            //     text: 'Este es un correo de prueba enviado usando Mailgun SMTP en Node.js.'
            // };

            // // Envía el correo
            // transporter.sendMail(mailOptions, (error, info) => {
            //     if (error) {
            //         return console.error('Error al enviar el correo:', error);
            //     }
            //     console.log('Correo enviado:', info.response);
            // });


            // transporter.sendMail(mailOptions, (error, info) => {
            //     if (error) {
            //         return console.log('Error al enviar el correo: ', error);
            //     }
            //     console.log('Correo enviado: %s', info.messageId);
            // });


        } catch (err) {
            if (err.status === 521) {
                throw err
            }
            throw new ComercialLogicError(480, `Error ${err.type}: ${err.message}`)
        }
    }
    //#endregion
    //#region formularios
    static async get_comercial_formularios_reclamacionesCalidad_numeroElementos() {
        try {
            const contenedores = await ContenedoresRepository.obtener_cantidad_contenedores({
                reclamacionCalidad: { $exists: true }
            })
            return contenedores
        } catch (err) {
            if (err.status === 524) {
                throw err
            }
            throw new ComercialLogicError(480, `Error ${err.type}: ${err.message}`)
        }
    }
    static async get_comercial_formularios_reclamacionesCalidad_contenedores(req) {
        try {
            const { page } = req.data
            const resultsPerPage = 25
            const contenedores = await ContenedoresRepository.get_Contenedores_sin_lotes({
                query: {
                    reclamacionCalidad: { $exists: true }
                },
                skip: (page - 1) * resultsPerPage,
                limit: resultsPerPage,
                select: { numeroContenedor: 1, infoContenedor: 1, reclamacionCalidad: 1 }
            })
            return contenedores
        } catch (err) {
            if (err.status === 522) {
                throw err
            }
            throw new ComercialLogicError(480, `Error ${err.type}: ${err.message}`)
        }
    }
    static async get_comercial_formularios_reclamacionCalidad_archivo(req) {
        try {
            const { path } = req.data
            const response = ContenedoresRepository.obtener_archivos_contenedores(path)
            return response
        }
        catch (err) {
            if (err.status === 522) {
                throw err
            }
            throw new ComercialLogicError(480, `Error ${err.type}: ${err.message}`)
        }
    }
    //#endregion


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
    static async get_comercial_precios_registros_precios_proveedor(req) {
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

                // if (user.Rol > 2) {
                //     filter = {
                //         ...filter,
                //         activo: true
                //     }
                // }

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
    static async put_comercial_registroPrecios_proveedores_comentario(req) {
        try {
            const { data, user } = req
            const { _id, comentario, action } = data

            const precio = await PreciosRepository.get_precios({
                ids: [_id]
            })

            const newPrecio = await PreciosRepository.actualizar_precio(
                { _id },
                { $set: { comentario } }
            )

            // Registrar modificación Contenedores
            await RecordModificacionesRepository.post_record_contenedor_modification(
                action,
                user,
                {
                    modelo: "precio",
                    documentoId: _id,
                    descripcion: `Se modifico el comentario del precio`,
                },
                precio[0],
                newPrecio,
                { _id, comentario, action }
            );

        } catch (err) {
            if (err.status === 523) {
                throw err
            }
            throw new ProcessError(480, `Error ${err.type}: ${err.message}`)
        }
    }
    static async get_comercial_precios_registros_precios_proveedores(req) {
        try {

            const { page = 1, filtro } = req.data || {}
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
            console.log(err)
            if (err.status === 522) {
                throw err
            }
            throw new ProcessError(480, `${err.type}: ${err.message}`)
        }
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

}

module.exports.ComercialRepository = ComercialRepository
