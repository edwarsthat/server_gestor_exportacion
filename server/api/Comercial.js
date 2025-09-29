import { ComercialLogicError } from "../../Error/logicLayerError.js";
import { ProcessError } from "../../Error/ProcessError.js";
import { RecordCreacionesRepository } from "../archive/ArchiveCreaciones.js";
import { RecordModificacionesRepository } from "../archive/ArchivoModificaciones.js";
import { ClientesRepository } from "../Class/Clientes.js";
import { ContenedoresRepository } from "../Class/Contenedores.js";
import { LotesRepository } from "../Class/Lotes.js";
import { PreciosRepository } from "../Class/Precios.js";
import { ProveedoresRepository } from "../Class/Proveedores.js";
import { ComercialValidationsRepository } from "../validations/Comercial.js";
import { filtroFechaInicioFin, filtroPorSemana } from "./utils/filtros.js";
import { getISOWeek } from 'date-fns';
import { z, ZodError } from 'zod';
import nodemailer from 'nodemailer';
import config from "../../src/config/index.js";
import { ComercialService } from "../services/comercial.js";
import { LogsRepository } from "../Class/LogsSistema.js";
import { registrarPasoLog } from "./helper/logs.js";
import { db } from "../../DB/mongoDB/config/init.js";
import { Seriales } from "../Class/Seriales.js";
import { dataRepository } from "./data.js";
import { ErrorComercialLogicHandlers } from "./utils/errorsHandlers.js";
const { EMAIL, PASSWORD_EMAIL } = config;



// const nodemailer = require('nodemailer');

export class ComercialRepository {

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
            const { user } = req
            const { data, action } = req.data

            ComercialValidationsRepository.post_comercial_contenedor().parse(data);

            const objCont = await ComercialService.crear_contenedor(data)
            const newCont = await ContenedoresRepository.crearContenedor(objCont, user._id);

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
        const { user } = req
        const { data, action } = req.data

        let log;

        const session = await db.Lotes.db.startSession();

        if (!session) {
            throw new Error("No se pudo iniciar la sesión en la base de datos de catálogos");
        }

        log = await LogsRepository.create({
            user: user,
            action: action,
            acciones: [{ paso: "Inicio de la función", status: "Iniciado", timestamp: new Date() }]
        });
        try {

            const parsedData = ComercialValidationsRepository.val_post_comercial_clienteNacional().parse(data);

            await session.withTransaction(async () => {

                const serial = await Seriales.get_seriales("CN");
                await registrarPasoLog(log._id, "Seriales.get_seriales", "Completado");
                const newCodigo = serial[0].name + String(serial[0].serial)
                const newData = {
                    ...parsedData,
                    user: user._id,
                    codigo: newCodigo
                }
                await ClientesRepository.post_cliente_nacional(newData, session);
                await registrarPasoLog(log._id, "ClientesRepository.post_cliente_nacional", "Completado");
                await dataRepository.incrementar_cn_serial(session);
                await registrarPasoLog(log._id, "dataRepository.incrementar_cn_serial", "Completado");

            })

        } catch (err) {
            console.error(`[ERROR][${new Date().toISOString()}]`, err);
            await ErrorComercialLogicHandlers(err, log)
        } finally {
            await session.endSession();
            await registrarPasoLog(log._id, "Finalizo la funcion", "Completado");
        }
    }
    //#endregion
    //#region formularios
    static async put_comercial_reclamacionCalidad_contenedor(req) {
        try {
            const { form, paths } = req

            ComercialValidationsRepository.put_comercial_reclamacionCalidad_contenedor().parse(form);
            const { contenedor } = form

            // Actualizar contenedor con pallets modificados
            await ContenedoresRepository.actualizar_contenedor(
                { numeroContenedor: contenedor },
                {
                    reclamacionCalidad: {
                        ...form,
                        archivosSubidos: paths
                    }
                }
            );

            const html = `
  <h2>Nueva Reclamación de Calidad registrada</h2>
  <p>Estimado equipo,</p>
  <p>Se ha registrado una nueva reclamación de calidad con la siguiente información:</p>
  <ul>
    <li><b>Responsable:</b> ${form.responsable}</li>
    <li><b>Cargo:</b> ${form.Cargo}</li>
    <li><b>Teléfono:</b> ${form.telefono}</li>
    <li><b>Cliente:</b> ${form.cliente}</li>
    <li><b>Fecha de arribo:</b> ${form.fechaArribo}</li>
    <li><b>Contenedor:</b>${form.contenedor}</li>
    <li><b>Correo de contacto:</b> ${form.correo}</li>
  </ul>
  <h4>Detalles de la reclamación:</h4>
  <ul>
    <li><b>Kilos afectados:</b>${form.kilos}</li>
    <li><b>Cajas afectadas:</b> ${form.cajas}</li>
    <li><b>Fecha de detección:</b> ${form.fechaDeteccion}</li>
  </ul>
  <h4>Defectos reportados:</h4>
  <ul>
    <li><b>Moho encontrado:</b> ${form.moho_encontrado} (permitido: ${form.moho_permitido})</li>
    <li><b>Golpes encontrados:</b> ${form.golpes_encontrado} (permitido: ${form.golpes_permitido})</li>
    <li><b>Frío encontrado:</b> ${form.frio_encontrado} (permitido: ${form.frio_permitido})</li>
    <li><b>Maduración encontrada:</b> ${form.maduracion_encontrado} (permitido: ${form.maduracion_permitido})</li>
    <li><b>Otro defecto:</b> ${form.otroDefecto}</li>
  </ul>
  <h4>Observaciones:</h4>
  <p>${form.observaciones}</p>
  <p>Por favor, revisar la reclamación en el sistema para más información y seguimiento.</p>
  <br>
  <b>Atentamente,<br>
  Sistema de Reclamaciones - Celifrut</b>
`


            // Configura el transporte con los datos de Mailgun
            let transporter = nodemailer.createTransport({
                host: 'smtp.gmail.com',
                port: 465,
                secure: true,
                auth: {
                    user: EMAIL,
                    pass: PASSWORD_EMAIL
                }
            });

            // Define los detalles del correo
            let mailOptions = {
                from: '<sistemacelifrut@gmail.com>', // Remitente
                to: "comercial@celifrut.com , comercioexterior@celifrut.com, SIG@celifrut.com, calidad@celifrut.com, operaciones@celifrut.com", // Destinatario
                // to: "transformaciondigital@celifrut.com", // Destinatario
                subject: 'Nueva Reclamación de Calidad registrada',
                // text: 'Este es un correo de prueba enviado usando  Node.js.'
                html: html
            };

            // Espera el envío para capturar el error con el mismo catch
            await transporter.sendMail(mailOptions);
            console.log('Correo enviado con éxito.');

        } catch (err) {
            if (err.status === 521) {
                throw err
            }
            if (err instanceof ZodError) {
                const mensajeLindo = err.errors[0]?.message || "Error desconocido en los datos del lote";
                throw new ComercialLogicError(470, mensajeLindo);
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
        let log
        const { user } = req
        try {
            log = await LogsRepository.create({
                user: user._id,
                action: "mover_item_entre_contenedores",
                acciones: [{ paso: "Inicio de la función", status: "Iniciado", timestamp: new Date() }]
            })
            const { data } = req.data;
            const [yearStr, weekStr] = data.week.split("-W");
            const year = parseInt(yearStr, 10);
            const week = parseInt(weekStr, 10);

            data.week = week
            data.year = year

            ComercialValidationsRepository.val_post_comercial_precios_add_precio().parse(data);
            await registrarPasoLog(log._id, "ComercialValidationsRepository.val_post_comercial_precios_add_precio", "Completado");

            const exportacion = {};
            for (const key in data) {
                if (key.startsWith("exportacion.")) {
                    const subKey = key.split(".")[1];
                    exportacion[subKey] = Number(data[key]);
                    delete data[key];
                }
            }

            const precio = await PreciosRepository.post_precio({ ...data, exportacion })
            await registrarPasoLog(log._id, "PreciosRepository.post_precio", "Completado");

            const query = {
                _id: { $in: data.predios }
            }

            const new_data = { [`precio.${data.tipoFruta}`]: precio._id }

            await ProveedoresRepository.modificar_varios_proveedores(
                query, new_data
            )
            await registrarPasoLog(log._id, "ProveedoresRepository.modificar_varios_proveedores", "Completado");


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
            await registrarPasoLog(log._id, "LotesRepository.getLotes", "Completado");


            for (const lote of lotes) {

                if (precio.predios.includes(lote.predio._id.toString())) {
                    lote.precio = precio._id

                    await LotesRepository.actualizar_lote(
                        { _id: lote._id },
                        lote,
                        { user: user._id, action: "post_comercial_precios_add_precio" },
                        null, false
                    )
                }
            }
            await registrarPasoLog(log._id, "LotesRepository.actualizar_lote", "Completado");


        } catch (err) {
            await registrarPasoLog(log._id, "Error en post_comercial_precios_add_precio", "Completado");

            if (err.status === 521) {
                throw err
            }
            throw new ProcessError(480, `Error ${err.type}: ${err.message}`)
        } finally {
            await registrarPasoLog(log._id, "post_comercial_precios_add_precio", "Finalizado");
        }
    }
    static async put_comercial_precios_precioLotes(req) {
        try {
            const { data: datos, user } = req
            const { data, action } = datos

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

            const exportacion = {};
            for (const key in data) {
                if (key.startsWith("exportacion.")) {
                    const subKey = key.split(".")[1];
                    exportacion[subKey] = Number(data[key]);
                    delete data[key];
                }
            }

            const precio = await PreciosRepository.post_precio({ ...data, tipoFruta: lotes[0].tipoFruta, exportacion })

            for (const lote of lotes) {

                lote.precio = precio._id

                await LotesRepository.actualizar_lote(
                    { _id: lote._id },
                    lote,
                    { new: true, user: user, action: action }
                );
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

            // ComercialValidationsRepository
            //     .val_get_comercial_precios_registros_filtro(filtro);

            let query = { skip };

            if (filtro) {

                let filter = {};
                // Actualiza filter con el manejo de fechas.

                filter = filtroPorSemana(filtro.fechaInicio, filtro.fechaFin, filter);

                // Asigna tipoFruta si existe
                if (filtro.tipoFruta2 && Object.keys(filtro.tipoFruta2).length > 0) {
                    filter.tipoFruta = filtro.tipoFruta2;
                }
                // Asigna proveedor en filter.predios si existe
                if (filtro.proveedor) {
                    filter.predios = { $in: filtro.proveedor };
                }

                query = { skip, query: filter };

            }

            const registros = await PreciosRepository.get_precios(query)

            return registros
        } catch (err) {
            console.log(err)
            if (err.status === 522) {
                throw err
            }
            throw new ProcessError(480, `${err.type}: ${err.message}`)
        }
    }
    static async get_comercial_precios_registros_precios_proveedores_numeroElementos(req) {
        try {

            const { filtro } = req.data || {}

            if (filtro) {

                let filter = {};
                // Actualiza filter con el manejo de fechas.

                filter = filtroPorSemana(filtro.fechaInicio, filtro.fechaFin, filter);

                // Asigna tipoFruta si existe
                if (filtro.tipoFruta2 && Object.keys(filtro.tipoFruta2).length > 0) {
                    filter.tipoFruta = filtro.tipoFruta2;
                }
                // Asigna proveedor en filter.predios si existe
                if (filtro.proveedor) {
                    filter.predios = { $in: filtro.proveedor };
                }

                const response = await PreciosRepository.get_cantidad_precios(filter)
                return response
            }

        }
        catch (err) {
            if (err.status === 522) {
                throw err
            }
            throw new ComercialLogicError(480, `Error ${err.type}: ${err.message}`)
        }
    }
    static async get_comercial_costo_contenedores(req) {
        try {
            const { data } = req;
            const { contenedores, fechaInicio, fechaFin, clientes, tipoFruta } = data
            let query = {
                "infoContenedor.cerrado": true
            }

            //por numero de contenedores
            if (contenedores.length > 0) {
                query.numeroContenedor = { $in: contenedores }
            }
            //por clientes
            if (clientes.length > 0) {
                query["infoContenedor.clienteInfo"] = { $in: clientes }
            }
            //por tipo de fruta
            if (tipoFruta !== '') {
                query["infoContenedor.tipoFruta"] = tipoFruta
            }

            query = filtroFechaInicioFin(fechaInicio, fechaFin, query, 'infoContenedor.fechaCreacion')

            const cont = await ContenedoresRepository.getContenedores({
                query: query,
                select: {
                    numeroContenedor: 1,
                    infoContenedor: 1,
                    pallets: 1
                },
                limit: 'all'
            });
            const { dataPallets, lotes } = await ComercialService.get_lotes_de_contenedores(cont);
            const dataPalletsLength = Object.keys(dataPallets).length
            if (dataPalletsLength === 1) {
                return await ComercialService.poner_precio_lotes(lotes, dataPallets);
            } else if (dataPalletsLength > 1) {
                return await ComercialService.poner_precio_contenedores(lotes, dataPallets);
            }

            return false
        } catch (error) {
            if (error.status === 522) {
                throw error
            }
            throw new ComercialLogicError(480, `Error ${error.type}: ${error.message}`)
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

