const { ProcessError } = require("../../Error/ProcessError");
const { procesoEventEmitter } = require("../../events/eventos");
const { RecordLotesRepository } = require("../archive/ArchiveLotes");
const { ContenedoresRepository } = require("../Class/Contenedores");
const { LotesRepository } = require("../Class/Lotes");
const { VariablesDelSistema } = require("../Class/VariablesDelSistema");
const calidadFile = require('../../constants/calidad.json');
const { insumos_contenedor } = require("../functions/insumos");
const { InsumosRepository } = require("../Class/Insumos");

const path = require('path');
const fs = require("fs");

const { have_lote_GGN_export } = require("../controllers/validations");
const { filtroFechaInicioFin } = require("./utils/filtros");
const { InventariosLogicError } = require("../../Error/logicLayerError");
const { RecordModificacionesRepository } = require("../archive/ArchivoModificaciones");
const { deshidratacionLote, rendimientoLote } = require("./utils/lotesFunctions");
const ProcesoValidations = require("../validations/proceso");
const { ProcesoService } = require("../services/proceso");
const { z } = require("zod");
const { RedisRepository } = require("../Class/RedisData");


class ProcesoRepository {

    //#region aplicaciones
    static async post_proceso_aplicaciones_fotoCalidad(req) {
        try {
            const { user } = req
            const { foto, fotoName, _id } = req.data;

            // Construir el nombre del archivo
            const fileName = `${_id}_${fotoName}.png`;

            // Construir la ruta completa del archivo
            const fotoPath = path.join(
                __dirname,
                "..",
                "..",
                "fotos_frutas",
                fileName
            );

            // Eliminar el encabezado de datos URI si está presente
            const base64Data = foto.replace(/^data:image\/\w+;base64,/, "");

            fs.writeFileSync(fotoPath, base64Data, { encoding: "base64" }, err => {
                if (err) {
                    throw new ProcessError(422, `Error guardando fotos ${err.message}`)
                }
            });
            const fotos = {}
            fotos[`calidad.fotosCalidad.${fotoName}`] = fotoPath;
            const query = {
                ...fotos,
                "calidad.fotosCalidad.fechaIngreso": Date.now(),
            }
            await LotesRepository.modificar_lote_proceso(_id, query, "Agregar foto calidad", user._id);
        } catch (err) {
            if (err.status === 523) {
                throw err
            }
            throw new ProcessError(470, `Error ${err.type}: ${err.message}`)
        }
    }
    static async get_proceso_aplicaciones_fotoCalidad() {
        try {
            const haceUnMes = new Date();
            const hoy = new Date();
            haceUnMes.setMonth(haceUnMes.getMonth() - 1);
            const hoyAM = hoy.setHours(0, 0, 0, 0);
            const hoyPM = hoy.setHours(23, 59, 59, 999);
            const lotes = await LotesRepository.getLotes({
                query: {
                    $and: [
                        {
                            $or: [
                                { 'calidad.fotosCalidad': { $exists: false } },
                                { 'calidad.fotosCalidad.fechaIngreso': { $gte: new Date(hoyAM), $lt: new Date(hoyPM) } }
                            ]
                        },
                        { enf: { $regex: '^E', $options: 'i' } },
                    ],
                    $or: [
                        { fecha_ingreso_inventario: { $gte: new Date(haceUnMes) } },
                        { fechaIngreso: { $gte: new Date(haceUnMes) } }
                    ]
                },
                select: { enf: 1 }
            });
            return lotes
        } catch (err) {
            if (err.status === 522) {
                throw err
            }
            throw new ProcessError(470, `Error ${err.type}: ${err.message}`)
        }
    }

    static async get_proceso_aplicaciones_descarteLavado() {
        try {
            const data = await VariablesDelSistema.obtenerEF1Descartes();
            return data
        } catch (err) {
            if (err.status === 531) {
                throw err
            }
            throw new ProcessError(470, `Error ${err.type}: ${err.message}`)
        }
    }
    /**
     * Actualiza el descarte por lavado de un lote.
     * 
     * Este método incrementa los valores de descarteLavado en el lote correspondiente según los datos recibidos,
     * actualiza la versión del documento, realiza la deshidratación del lote, modifica el inventario de descarte,
     * y registra los kilos procesados en las variables del sistema. Finalmente, emite un evento de proceso.
     * 
     * @async
     * @param {Object} req - Objeto de solicitud que contiene la información del usuario y los datos a actualizar.
     * @param {Object} req.user - Usuario que realiza la acción.
     * @param {Object} req.data - Datos de la operación.
     * @param {string} req.data._id - ID del lote a modificar.
     * @param {Object} req.data.data - Objeto con los valores a incrementar en descarteLavado.
     * @param {string} req.data.action - Descripción de la acción para auditoría.
     * @throws {ProcessError} Si ocurre un error durante el proceso.
     */
    static async put_proceso_aplicaciones_descarteLavado(req) {
        try {
            ProcesoValidations.put_proceso_aplicaciones_descarteLavado().parse(req.data)
            const { user } = req;
            const { _id, data, action } = req.data;
            const keys = Object.keys(data);
            const query = { $inc: {} };
            let kilos = 0;
            for (let i = 0; i < keys.length; i++) {
                query.$inc[`descarteLavado.${keys[i]}`] = Math.round(data[keys[i]]);
                kilos += Math.round(data[keys[i]]);
            }

            const lote = await LotesRepository.actualizar_lote(
                { _id: _id },
                query,
                { user: user._id, action: action }
            )
            await RedisRepository.put_inventarioDescarte(data, 'descarteLavado:', lote.tipoFruta)
            await VariablesDelSistema.ingresar_kilos_procesados(kilos, lote.tipoFruta);
            await VariablesDelSistema.ingresar_kilos_procesados2(kilos, lote.tipoFruta);


            procesoEventEmitter.emit("server_event", {
                action: "descarte_change",
                data: {}
            });
        } catch (err) {
            const criticalStatus = new Set([523, 515, 518, 532]);
            if (err && criticalStatus.has(err.status)) {
                throw err;
            }
            if (err instanceof z.ZodError) {
                const errores = err.errors.map(e => `${e.path[0]}: ${e.message}`).join(" | ")
                throw new ProcessError(470, `Error de validación: ${errores}`)
            }
            throw new ProcessError(470, `Error ${err.type}: ${err.message}`)
        }
    }
    /**
     * Actualiza el descarte por Encerado de un lote.
     * 
     * Este método incrementa los valores de descarteEncerado en el lote correspondiente según los datos recibidos,
     * actualiza la versión del documento, realiza la deshidratación del lote, modifica el inventario de descarte,
     * y registra los kilos procesados en las variables del sistema. Finalmente, emite un evento de proceso.
     * 
     * @async
     * @param {Object} req - Objeto de solicitud que contiene la información del usuario y los datos a actualizar.
     * @param {Object} req.user - Usuario que realiza la acción.
     * @param {Object} req.data - Datos de la operación.
     * @param {string} req.data._id - ID del lote a modificar.
     * @param {Object} req.data.data - Objeto con los valores a incrementar en descarteEncerado.
     * @param {string} req.data.action - Descripción de la acción para auditoría.
     * @throws {ProcessError} Si ocurre un error durante el proceso.
     */
    static async put_proceso_aplicaciones_descarteEncerado(req) {
        try {
            const { user } = req;
            ProcesoValidations.put_proceso_aplicaciones_descarteEncerado().parse(req.data)
            const { _id, data, action } = req.data;
            console.log(data)

            const keys = Object.keys(data);
            const query = { $inc: {} };
            let kilos = 0;

            for (let i = 0; i < keys.length; i++) {
                if (keys[i] === 'frutaNacional') {
                    query.$inc[keys[i]] = data[keys[i]];
                    kilos += data[keys[i]];
                } else {
                    query.$inc[`descarteEncerado.${keys[i]}`] = Math.round(data[keys[i]]);
                    kilos += Math.round(data[keys[i]]);
                }
            }

            const lote = await LotesRepository.actualizar_lote(
                { _id: _id },
                query,
                { user: user._id, action: action }
            )

            await RedisRepository.put_inventarioDescarte(data, 'descarteEncerado:', lote.tipoFruta)
            await VariablesDelSistema.ingresar_kilos_procesados(kilos, lote.tipoFruta);
            await VariablesDelSistema.ingresar_kilos_procesados2(kilos, lote.tipoFruta);

            procesoEventEmitter.emit("server_event", {
                action: "descarte_change",
                data: {}
            });
        } catch (err) {
            if (err.status === 523 ||
                err.status === 515 ||
                err.status === 518 ||
                err.status === 532
            ) {
                throw err
            }
            throw new ProcessError(470, `Error ${err.type}: ${err.message}`)
        }
    }

    static async get_proceso_aplicaciones_listaEmpaque_contenedores() {
        try {
            const contenedores = await ContenedoresRepository.getContenedores({
                select: { numeroContenedor: 1, infoContenedor: 1, pallets: 1 },
                query: { 'infoContenedor.cerrado': false }
            });
            return contenedores
        } catch (err) {
            if (err.status === 522) {
                throw err
            }
            throw new ProcessError(470, `Error ${err.type}: ${err.message}`)
        }
    }
    static async get_proceso_aplicaciones_listaEmpaque_lotes() {
        try {
            // Obtener la fecha actual en Colombia
            const ahora = new Date();

            // Crear fechaInicio (comienzo del día en Colombia, pero en UTC)
            const fechaInicio = new Date(Date.UTC(
                ahora.getFullYear(),
                ahora.getMonth(),
                ahora.getDate() - 1,
                0, 0, 0, 0
            ));

            // Crear fechaFin (final del día en Colombia, pero en UTC)
            const fechaFin = new Date();


            let query = {
                operacionRealizada: 'vaciarLote'
            }

            query = filtroFechaInicioFin(fechaInicio, fechaFin, query, 'fecha')

            const recordLotes = await RecordLotesRepository.getVaciadoRecord({ query: query })
            const lotesIds = recordLotes.map(lote => lote.documento._id);

            const lotes = await LotesRepository.getLotes({
                ids: lotesIds,
                limit: recordLotes.length,
                select: { enf: 1, promedio: 1, tipoFruta: 1, __v: 1 }
            });
            const resultado = recordLotes.map(item => {
                const lote = lotes.find(lote => lote._id.toString() === item.documento._id);
                if (lote) {
                    if (Object.prototype.hasOwnProperty.call(item.documento, "$inc")) {
                        item.documento = { ...lote, kilosVaciados: item.documento.$inc.kilosVaciados }
                        return (item)
                    }
                    else {
                        return item
                    }
                }
                return null
            }).filter(item => item !== null);
            return resultado
        } catch (err) {
            if (err.status === 522) {
                throw err
            }
            throw new ProcessError(470, `Error ${err.type}: ${err.message}`)
        }
    }
    static async put_proceso_aplicaciones_listaEmpaque_addSettings(req) {
        try {
            const { user } = req;
            const { _id, pallet, settings, action } = req.data;
            const { tipoCaja, calidad, calibre } = settings;

            const query = {}

            //se obtiene  el contenedor a modifiar
            const contenedor = await ContenedoresRepository.get_Contenedores_sin_lotes({
                ids: [_id],
                select: { infoContenedor: 1, pallets: 1 },
                populate: {
                    path: 'infoContenedor.clienteInfo',
                    select: 'CLIENTE PAIS_DESTINO',
                }
            });

            // Crear copia profunda de los pallets
            const palletsModificados = JSON.parse(JSON.stringify(contenedor[0].pallets));
            const palletSeleccionado = palletsModificados[pallet].settings;

            Object.assign(palletSeleccionado, { calidad, calibre, tipoCaja });

            query.pallets = palletsModificados

            //se mira si es la primera moficiacion para agregar la fecha de inicio
            if (!Object.prototype.hasOwnProperty.call(
                contenedor[0].infoContenedor, "fechaInicioReal"
            )) {
                query["infoContenedor.fechaInicioReal"] = new Date();
            }

            // Actualizar contenedor con pallets modificados
            await ContenedoresRepository.actualizar_contenedor(
                { _id },
                query
            );

            // Registrar modificación
            await RecordModificacionesRepository.post_record_contenedor_modification(
                action,
                user,
                {
                    modelo: "Contenedor",
                    documentoId: _id,
                    descripcion: `Se configuró el pallet ${pallet}`,
                },
                contenedor[0].pallets[pallet],
                palletSeleccionado,
                { _id, pallet, settings, action }
            );


            procesoEventEmitter.emit("listaempaque_update");
        } catch (err) {
            if (
                err.status === 522 ||
                err.status === 523 ||
                err.status === 423 ||
                err.status === 610

            ) {
                throw err
            }
            throw new ProcessError(470, `${err.type}: ${err.message}`)
        }
    }
    static async put_proceso_aplicaciones_listaEmpaque_agregarItem(req) {
        const { user } = req;

        try {
            await ProcesoValidations.put_proceso_aplicaciones_listaEmpaque_agregarItem(req.data)

            const { _id, pallet, item, action } = req.data;
            const { cajas, lote, calidad, tipoFruta } = item

            const { contenedor, lotes } = await ProcesoService.getContenedorAndLote(lote, _id);


            // Crear copia profunda de los pallets
            const palletsModificados = JSON.parse(JSON.stringify(contenedor[0].pallets));
            const palletSeleccionado = palletsModificados[pallet].EF1;
            const loteModificado = JSON.parse(JSON.stringify(lotes[0]));

            const GGN = have_lote_GGN_export(loteModificado, contenedor[0], item)

            //copia del original
            const copiaPallets = JSON.parse(JSON.stringify(contenedor[0].pallets));

            // Actualizar contenedor con pallets modificados
            await ProcesoService.modificarSumarItemCopiaPallet(palletSeleccionado, item, lotes, GGN)

            await ContenedoresRepository.actualizar_contenedor(
                { _id },
                {
                    $set: { [`pallets.${pallet}.EF1`]: palletSeleccionado }
                }
            );

            // Registrar modificación Contenedores
            await RecordModificacionesRepository.post_record_contenedor_modification(
                action,
                user,
                {
                    modelo: "Contenedor",
                    documentoId: _id,
                    descripcion: `Se sumaron ${cajas} en el pallet ${pallet}`,
                },
                copiaPallets[pallet],
                palletsModificados[pallet],
                { _id, pallet, item, action }
            );

            //modificar el predio
            const { query, antes, kilos } = await ProcesoService.crearQueryLoteIngresoItemListaEmpaque(item, loteModificado, _id, GGN)

            const newLote = await LotesRepository.modificar_lote_proceso(
                lote,
                query,
                "Ingresar exportacion",
                user._id
            )

            // Registrar modificación
            const newData = {
                [calidadFile[calidad]]: newLote[calidadFile[calidad]],
                kilosGGN: newLote.kilosGGN,
                deshidratacion: newLote.deshidratacion,
                rendimiento: newLote.rendimiento,
            }

            await RecordModificacionesRepository.post_record_contenedor_modification(
                action,
                user,
                {
                    modelo: "Lote",
                    documentoId: newLote._id,
                    descripcion: `Modificar los kilos exportacion se sumaron ${kilos} an calidad ${calidad}`,
                },
                antes,
                newData,
                { _id, pallet, item, action }
            );

            // await VariablesDelSistema.ingresar_exportacion(kilos, lote.tipoFruta)
            await VariablesDelSistema.ingresar_kilos_procesados2(kilos, tipoFruta)
            await VariablesDelSistema.ingresar_exportacion2(kilos, tipoFruta)

            procesoEventEmitter.emit("server_event", {
                action: "lista_empaque_update",
            });
            procesoEventEmitter.emit("listaempaque_update");

        } catch (err) {
            if (
                err.status === 610 ||
                err.status === 523
            ) {
                throw err
            }
            throw new ProcessError(470, `Error ${err.type}: ${err.message}`)
        }
    }
    static async put_proceso_aplicaciones_listaEmpaque_modificarItem_desktop(req) {
        // const pilaFunciones = [];
        const { user } = req
        try {
            await ProcesoValidations.put_proceso_aplicaciones_listaEmpaque_modificarItem_desktop(req.data)

            const { _id, pallet, seleccion, data, action } = req.data
            const { calidad, calibre, cajas, tipoCaja } = data

            //se obtiene  el contenedor a modifiar
            const contenedor = await ContenedoresRepository.get_Contenedores_sin_lotes({
                ids: [_id],
                select: { infoContenedor: 1, pallets: 1 },
                populate: {
                    path: 'infoContenedor.clienteInfo',
                    select: 'CLIENTE PAIS_DESTINO',
                }
            })
            // Crear copia profunda de los pallets
            const palletsModificados = JSON.parse(JSON.stringify(contenedor[0].pallets));
            const palletSeleccionado = palletsModificados[pallet].EF1[seleccion];

            // Almacenar datos previos
            const oldData = { ...palletSeleccionado };

            //se obtienen los kilos viejos que se restan y los kilos nuevos que se suman
            const oldKilos = Number(oldData.tipoCaja.split('-')[1].replace(",", ".")) * oldData.cajas
            const newKilos = Number(palletSeleccionado.tipoCaja.split('-')[1].replace(",", ".")) * cajas

            if (newKilos === 0) {
                //se elimina el elemento si es 0
                palletsModificados[pallet].EF1.splice(seleccion, 1);
            } else {
                // Aplicar modificaciones
                Object.assign(palletSeleccionado, { calidad, calibre, cajas, tipoCaja });
            }

            // Actualizar contenedor con pallets modificados
            await ContenedoresRepository.actualizar_contenedor(
                { _id },
                { pallets: palletsModificados }
            );

            // Registrar modificación
            await RecordModificacionesRepository.post_record_contenedor_modification(
                action,
                user,
                {
                    modelo: "Contenedor",
                    documentoId: _id,
                    descripcion: `Actualización pallet ${pallet}, posición ${seleccion}`,
                },
                oldData,
                palletSeleccionado,
                { pallet, seleccion }
            );

            //se obtiene el lote
            const lote = await LotesRepository.getLotes({
                ids: [oldData.lote],
                select: { predio: 1, [calidadFile[oldData.calidad]]: 1, kilosGGN: 1 }
            });

            //se guarda el registro
            const antes = {
                [calidadFile[oldData.calidad]]: lote[0][calidadFile[oldData.calidad]],
            }

            //el objeto de modificacion de lotes
            const query = {
                $inc: {

                }
            }

            if (calidad === oldData.calidad) {
                const total = newKilos - oldKilos
                query.$inc[calidadFile[palletSeleccionado.calidad]] = total
            } else {
                query.$inc[calidadFile[oldData.calidad]] = -oldKilos
                query.$inc[calidadFile[palletSeleccionado.calidad]] = newKilos
            }

            //se mira si se deben sumar kilosGNN
            if (have_lote_GGN_export(lote[0].predio, contenedor[0], oldData)) {
                const total = newKilos - oldKilos
                query.$inc.kilosGGN = total
                antes.kilosGGN = lote[0].kilosGGN
            }

            const newLote = await LotesRepository.modificar_lote_proceso(
                oldData.lote,
                query,
                "Cambiar tipo de exportacion",
                user
            )

            const newData = {
                [calidadFile[oldData.calidad]]: newLote[calidadFile[oldData.calidad]],
                kilosGGN: newLote.kilosGGN
            }
            // Registrar modificación

            await RecordModificacionesRepository.post_record_contenedor_modification(
                action,
                user,
                {
                    modelo: "Lote",
                    documentoId: lote[0]._id,
                    descripcion: `Modificar los kilos GGN se sumaron ${newKilos} se restaron ${oldKilos}`,
                },
                antes,
                newData,
                { _id, pallet, seleccion, data }
            );

            //se mira si es fruta de hoy para restar de las variables del proceso
            const fechaSeleccionada = new Date(palletSeleccionado.fecha)
            const hoy = new Date()
            // Ajustamos la fecha seleccionada restando 5 horas:
            fechaSeleccionada.setHours(fechaSeleccionada.getHours() - 5);

            // Ahora comparamos solo día, mes y año:
            if (
                fechaSeleccionada.getFullYear() === hoy.getFullYear() &&
                fechaSeleccionada.getMonth() === hoy.getMonth() &&
                fechaSeleccionada.getDate() === hoy.getDate()
            ) {
                await VariablesDelSistema.ingresar_kilos_procesados2(-oldKilos, palletSeleccionado.tipoFruta)
                await VariablesDelSistema.ingresar_exportacion2(-oldKilos, palletSeleccionado.tipoFruta)

                await VariablesDelSistema.ingresar_kilos_procesados2(newKilos, palletSeleccionado.tipoFruta)
                await VariablesDelSistema.ingresar_exportacion2(newKilos, palletSeleccionado.tipoFruta)
            }


            procesoEventEmitter.emit("server_event", {
                action: "lista_empaque_update",
            });

        } catch (err) {
            if (
                err.status === 610 ||
                err.status === 523
            ) {
                throw err
            }
            throw new ProcessError(470, `Error ${err.type}: ${err.message}`)
        }
    }
    static async put_proceso_aplicaciones_listaEmpaque_eliminarItem_desktop(req) {
        const { user } = req;
        try {
            const { _id, pallet, seleccion, action } = req.data

            const contenedor = await ContenedoresRepository.get_Contenedores_sin_lotes({
                ids: [_id],
                select: { infoContenedor: 1, pallets: 1 },
                populate: {
                    path: 'infoContenedor.clienteInfo',
                    select: 'CLIENTE PAIS_DESTINO',
                }
            })

            const palletsModificados = JSON.parse(JSON.stringify(contenedor[0].pallets));
            const palletSeleccionado = palletsModificados[pallet].EF1[seleccion];

            const copiaPallet = JSON.parse(JSON.stringify(contenedor[0].pallets));
            const copiaPalletSeleccionado = copiaPallet[pallet].EF1[seleccion];

            const kilos = Number(palletSeleccionado.tipoCaja.split('-')[1].replace(",", ".")) * palletSeleccionado.cajas

            palletsModificados[pallet].EF1.splice(seleccion, 1);

            // Actualizar contenedor con pallets modificados
            await ContenedoresRepository.actualizar_contenedor(
                { _id },
                { pallets: palletsModificados }
            );

            // Registrar modificación
            await RecordModificacionesRepository.post_record_contenedor_modification(
                action,
                user,
                {
                    modelo: "Contenedor",
                    documentoId: _id,
                    descripcion: `Se eliminó el item ${seleccion} en el pallet ${pallet}`,
                },
                copiaPallet[pallet],
                palletsModificados[pallet],
                { pallet, seleccion }
            );


            //se obtiene el lote
            const lote = await LotesRepository.getLotes({
                ids: [copiaPalletSeleccionado.lote],
                select: { predio: 1, [calidadFile[palletSeleccionado.calidad]]: 1, exportacionGGN: 1 }
            });

            //El objeto que lleva la data vieja para el registro
            const oldDataRegistro = {
                [calidadFile[palletSeleccionado.calidad]]: lote[0][calidadFile[palletSeleccionado.calidad]]
            }

            //El objeto que va a modificar la coleccion, se suma -kilos ya calculados
            const query = {
                $inc: {
                    [calidadFile[palletSeleccionado.calidad]]: -kilos
                }
            }

            //se mira si se deben sumar kilosGNN
            if (have_lote_GGN_export(lote[0].predio, contenedor[0], copiaPalletSeleccionado)) {
                query.$inc.kilosGGN = -kilos
                oldDataRegistro.kilosGGN = lote[0].kilosGGN
            }

            const newLote = await LotesRepository.modificar_lote_proceso(
                copiaPalletSeleccionado.lote,
                query,
                "Cambiar tipo de exportacion",
                user
            )

            //Objeto que lleva el registor de como quedo la data del elemento
            const newDataRegistro = {
                [calidadFile[palletSeleccionado.calidad]]: newLote[calidadFile[palletSeleccionado.calidad]]
            }

            //Se mira si se modificaron los kilosGGN para guardar en el objeto de registro
            if ("kilosGGN" in oldDataRegistro) {
                newDataRegistro.kilosGGN = newLote.kilosGGN
            }

            // Registrar modificación
            await RecordModificacionesRepository.post_record_contenedor_modification(
                action,
                user,
                {
                    modelo: "Lote",
                    documentoId: lote[0]._id,
                    descripcion: `Se eliminan kilos de exportacion ${kilos}`,
                },
                oldDataRegistro,
                newDataRegistro,
                { _id, pallet, seleccion, action }
            );

            //se mira si es fruta de hoy para restar de las variables del proceso
            const fechaSeleccionada = new Date(copiaPalletSeleccionado.fecha)
            const hoy = new Date()
            // Ajustamos la fecha seleccionada restando 5 horas:
            fechaSeleccionada.setHours(fechaSeleccionada.getHours() - 5);

            // Ahora comparamos solo día, mes y año:
            if (
                fechaSeleccionada.getFullYear() === hoy.getFullYear() &&
                fechaSeleccionada.getMonth() === hoy.getMonth() &&
                fechaSeleccionada.getDate() === hoy.getDate()
            ) {
                await VariablesDelSistema.ingresar_kilos_procesados2(-kilos, copiaPalletSeleccionado.tipoFruta)
                await VariablesDelSistema.ingresar_exportacion2(-kilos, copiaPalletSeleccionado.tipoFruta)
            }

            procesoEventEmitter.emit("server_event", {
                action: "lista_empaque_update",
            });

        } catch (err) {
            if (
                err.status === 610 ||
                err.status === 523 ||
                err.status === 522
            ) {
                throw err
            }
            throw new ProcessError(470, `Error ${err.type}: ${err.message}`)
        }
    }
    static async put_proceso_aplicaciones_listaEmpaque_eliminarItems(req) {
        const { user } = req;
        try {
            await ProcesoValidations.put_proceso_aplicaciones_listaEmpaque_eliminarItems(req.data)
            const { _id, pallet, seleccion, action } = req.data;

            //se modifica el contenedor
            const { lotesArrIds, itemsDelete, contenedor } = await ProcesoService.eliminar_items_contenedor(_id, seleccion, pallet, action, user)

            const lotes = await LotesRepository.getLotes({
                ids: lotesArrIds,
                limite: 'all'
            })

            //objeto con los datos de los lotes viejos
            const oldLotes = lotes.map(i => {
                return {
                    _id: i._id,
                    enf: i.enf,
                    calidad1: i.calidad1,
                    calidad15: i.calidad15,
                    calidad2: i.calidad2,
                    deshidratacion: i.deshidratacion,
                    rendimiento: i.rendimiento
                }
            })

            //se recorren para restar los kilos en los lotes
            const hoy = new Date()
            for (let i = 0; i < itemsDelete.length; i++) {
                await ProcesoService.restar_kilos_lote(
                    itemsDelete[i], lotes, contenedor, hoy
                )
            }

            await ProcesoService.guardar_cambios_lotes(
                lotes, action, user, _id, oldLotes
            )

            procesoEventEmitter.emit("server_event", {
                action: "lista_empaque_update",
            });
            procesoEventEmitter.emit("listaempaque_update");


        } catch (err) {
            if (
                err.status === 610 ||
                err.status === 523 ||
                err.status === 522
            ) {
                throw err
            }
            throw new ProcessError(470, `Error ${err.type}: ${err.message}`)
        }
    }
    static async put_proceso_aplicaciones_listaEmpaque_restarItem(req) {

        try {
            const { user } = req;

            ProcesoValidations.put_proceso_aplicaciones_listaEmpaque_restarItem(req.data)
            const { action, _id, pallet, seleccion, cajas } = req.data;
            //se modifica el contenedor
            const { copiaItemSeleccionado, contenedor, itemSeleccionado } = await ProcesoService.restarItem_contenedor(
                _id, pallet, seleccion, cajas, action, user
            )
            //se moficia el lote
            const { lote, kilos } = await ProcesoService.restarItem_lote(
                copiaItemSeleccionado, cajas, contenedor, user, action
            )
            //se modifica las variables del sistema
            await ProcesoService.restarItem_variablesSistema(
                itemSeleccionado, kilos, lote
            )

            procesoEventEmitter.emit("proceso_event", {});
            procesoEventEmitter.emit("listaempaque_update");


        } catch (err) {
            console.log(err)
            if (
                err.status === 610 ||
                err.status === 523 ||
                err.status === 522
            ) {
                throw err
            }
            throw new ProcessError(470, `Error ${err.type}: ${err.message}`)

        }
    }
    static async put_proceso_aplicaciones_listaEmpaque_moverItems(req) {
        const { user } = req
        const { contenedor1, contenedor2, cajas, action } = req.data;

        if (contenedor1.pallet !== "" && contenedor2.pallet !== "" && cajas === 0) {
            await this.mover_item_entre_contenedores(contenedor1, contenedor2, action, user);
        }

        else if (contenedor1.pallet !== "" && contenedor2.pallet !== "" && cajas !== 0) {
            await this.restar_mover_contenedor_contenedor(contenedor1, contenedor2, cajas, action, user)
        }

        procesoEventEmitter.emit("listaempaque_update");

    }
    /**
     * Mueve uno o varios ítems seleccionados de un pallet de un contenedor a otro pallet de otro contenedor.
     * Actualiza los pallets de ambos contenedores y registra los cambios en los lotes y en los contenedores.
     * Si el item pasa a un contenedor GGN, ajusta los kilosGGN en el lote correspondiente.
     *
     * @param {Object} contenedor1 - Contenedor origen (de donde se extraen los ítems). Debe incluir el array 'seleccionado' con los índices a mover.
     * @param {Object} contenedor2 - Contenedor destino (donde se agregan los ítems).
     * @param {string} action - Acción para el registro de auditoría.
     * @param {Object} user - Usuario que realiza la acción.
     */
    static async mover_item_entre_contenedores(contenedor1, contenedor2, action, user) {

        try {
            const { _id: id1, pallet: pallet1 } = contenedor1
            const { _id: id2, pallet: pallet2 } = contenedor2
            const seleccionOrdenado = contenedor1.seleccionado.sort((a, b) => b - a);
            let lotesIds = []

            // se obtienen los contenedores a modificar
            const contenedores = await ContenedoresRepository.get_Contenedores_sin_lotes({
                ids: [id1, id2],
                select: { infoContenedor: 1, pallets: 1, numeroContenedor: 1 },
                populate: {
                    path: 'infoContenedor.clienteInfo',
                    select: 'CLIENTE PAIS_DESTINO',
                }
            })

            const [index1, index2] = id1 === id2 ? [0, 0] : [
                contenedores.findIndex(c => c._id.toString() === id1),
                contenedores.findIndex(c => c._id.toString() === id2)
            ];

            //se crea una copa del pallet a modificar
            const palletsModificados1 = JSON.parse(JSON.stringify(contenedores[index1].pallets));
            const palletsModificados2 = JSON.parse(JSON.stringify(contenedores[index2].pallets));
            const copiaPallets1 = JSON.parse(JSON.stringify(contenedores[index1].pallets));
            const copiaPallets2 = JSON.parse(JSON.stringify(contenedores[index2].pallets));


            for (let i = 0; i < seleccionOrdenado.length; i++) {
                lotesIds.push(palletsModificados1[pallet1].EF1[seleccionOrdenado[i]].lote)
            }

            const lotesIdsArr = [...new Set(seleccionOrdenado.map(i => palletsModificados1[pallet1].EF1[i].lote))];

            if (lotesIdsArr.length > 0) {

                const lotes = await LotesRepository.getLotes({ ids: lotesIds, limit: 'all' });
                const oldLotes = lotes.map(l => ({ _id: l._id, enf: l.enf, contenedores: l.contenedores }));
                const operationsLotes = [];

                // have_lote_GGN_export(lote[0].predio, contenedor[0], copiaPalletSeleccionado)
                for (let i = 0; i < seleccionOrdenado.length; i++) {

                    // se mira si el item pasa a un contenedor GGN y se agrega o se quita
                    const itemSplice = palletsModificados1[pallet1].EF1.splice(seleccionOrdenado[i], 1)[0]
                    const lote = lotes.find(l => l._id.toString() === itemSplice.lote)

                    const oldGGN = have_lote_GGN_export(lote, contenedores[index1], palletsModificados1)
                    const GGN = have_lote_GGN_export(lote, contenedores[index2], palletsModificados2)

                    palletsModificados2[pallet2].EF1.push({ ...itemSplice, GGN });

                    const kilos = itemSplice.cajas * Number(itemSplice.tipoCaja.split('-')[1].replace(",", "."))

                    let updateLote = { $addToSet: { contenedores: id2 } };
                    if (oldGGN && !GGN) {
                        updateLote.$inc = { kilosGGN: -kilos };
                    } else if (!oldGGN && GGN) {
                        updateLote.$inc = { kilosGGN: kilos };
                    }
                    operationsLotes.push({ updateOne: { filter: { _id: lote._id }, update: updateLote } });
                }

                await LotesRepository.bulkWrite(operationsLotes);

                const newLotes = lotes.map(i => {
                    return {
                        _id: i._id,
                        enf: i.enf,
                        contenedores: contenedores[index2].numeroContenedor,
                    }
                })

                // Registrar modificación de los lotes
                const documentosAfectadosLotes = newLotes.map(l => ({
                    modelo: "Lote", // o el nombre del modelo que estés utilizando
                    documentoId: l._id,
                    descripcion: `Se agrego nuevo contenedor en el enf ${l.enf}`,
                }));

                await RecordModificacionesRepository.post_record_contenedor_modification(
                    action,
                    user,
                    documentosAfectadosLotes, // aquí pasas el array de documentos afectados
                    oldLotes,
                    newLotes,
                    { contenedor1, contenedor2, action, user }
                );
            }

            // Actualizar los contenedores en la base de datos
            const operationsContenedores = [
                { updateOne: { filter: { _id: contenedores[index2]._id }, update: { $set: { [`pallets.${pallet2}`]: palletsModificados2[pallet2] } } } },
                { updateOne: { filter: { _id: contenedores[index1]._id }, update: { $set: { [`pallets.${pallet1}`]: palletsModificados1[pallet1] } } } }
            ];
            await ContenedoresRepository.bulkWrite(operationsContenedores);

            await RecordModificacionesRepository.post_record_contenedor_modification(
                action,
                user,
                [
                    { modelo: "Contenedor", documentoId: id1, descripcion: `Se movieron los ítems ${seleccionOrdenado} del pallet ${pallet1}` },
                    { modelo: "Contenedor", documentoId: id2, descripcion: `Se agregaron ítems al pallet ${pallet2}` },
                ],
                [copiaPallets1[pallet1], copiaPallets2[pallet2]],
                [palletsModificados1[pallet1], palletsModificados2[pallet2]],
                { contenedor1, contenedor2, action, user }
            );

            // }
            procesoEventEmitter.emit("server_event", {
                action: "lista_empaque_update",
            });
            procesoEventEmitter.emit("listaempaque_update");

        } catch (err) {
            if (
                err.status === 610 ||
                err.status === 523
            ) {
                throw err
            }
            throw new ProcessError(470, `Error ${err.type}: ${err.message}`)
        }
    }
    /**
     * Mueve una cantidad de cajas de un item de un pallet de un contenedor a otro pallet de otro contenedor.
     * Si el número de cajas en el origen llega a 0, el item se elimina del pallet origen.
     * Si el item ya existe en el pallet destino, suma las cajas; si no, lo crea.
     * También actualiza los kilos GGN si corresponde y registra las modificaciones.
     *
     * @param {Object} contenedor1 - Contenedor origen (de donde se restan cajas).
     * @param {Object} contenedor2 - Contenedor destino (donde se suman cajas).
     * @param {number} cajas - Cantidad de cajas a mover.
     * @param {string} action - Acción para el registro de auditoría.
     * @param {Object} user - Usuario que realiza la acción.
     */
    static async restar_mover_contenedor_contenedor(contenedor1, contenedor2, cajas, action, user) {
        try {
            const { _id: id1, pallet: pallet1 } = contenedor1
            const { _id: id2, pallet: pallet2 } = contenedor2
            const seleccionOrdenado = contenedor1.seleccionado.sort((a, b) => b - a);

            // se obtienen los contenedores a modificar
            const contenedores = await ContenedoresRepository.get_Contenedores_sin_lotes({
                ids: [id1, id2],
                select: { infoContenedor: 1, pallets: 1, numeroContenedor: 1 },
                populate: {
                    path: 'infoContenedor.clienteInfo',
                    select: 'CLIENTE PAIS_DESTINO',
                }
            })

            const [index1, index2] = id1 === id2 ? [0, 0] : [
                contenedores.findIndex(c => c._id.toString() === id1),
                contenedores.findIndex(c => c._id.toString() === id2)
            ];
            //se crea una copa del pallet a modificar
            const palletsModificados1 = JSON.parse(JSON.stringify(contenedores[index1].pallets));
            const palletsModificados2 = JSON.parse(JSON.stringify(contenedores[index2].pallets));
            const copiaPallets1 = JSON.parse(JSON.stringify(contenedores[index1].pallets));
            const copiaPallets2 = JSON.parse(JSON.stringify(contenedores[index2].pallets));

            const itemSeleccionado = palletsModificados1[pallet1].EF1[seleccionOrdenado[0]];
            const newCajas = itemSeleccionado.cajas - cajas
            const lotesIds = itemSeleccionado.lote

            const lotes = await LotesRepository.getLotes({ ids: lotesIds, limit: 'all' });

            const oldGGN = have_lote_GGN_export(lotes[0], contenedores[index1], palletsModificados1)
            const GGN = have_lote_GGN_export(lotes[0], contenedores[index2], palletsModificados2)

            const kilos = cajas * Number(itemSeleccionado.tipoCaja.split('-')[1].replace(",", "."))
            console.log(kilos)
            // se busca si el elemento del contenedor2 tiene un elemento igual
            const index = palletsModificados2[pallet2].EF1.findIndex(item => (
                item.lote === itemSeleccionado.lote &&
                item.calidad === itemSeleccionado.calidad &&
                item.calibre === itemSeleccionado.calibre &&
                item.tipoCaja === itemSeleccionado.tipoCaja
            ))

            if (newCajas === 0) {

                // si no se encuentra se agrega un nuevo item a EF1
                if (index === -1) {
                    const itemSplice = palletsModificados1[pallet1].EF1.splice(seleccionOrdenado[0], 1)[0]
                    palletsModificados2[pallet2].EF1.push({ ...itemSplice, GGN });
                }
                // si si, se agregan las nuevas cajas a el item de EF1
                else {
                    palletsModificados2[pallet2].EF1[index].cajas += cajas
                    palletsModificados1[pallet1].EF1.splice(seleccionOrdenado[0], 1);
                }

            } else {
                itemSeleccionado.cajas = newCajas
                // si no se encuentra se agrega un nuevo item a EF1
                if (index === -1) {
                    const itemCopia = JSON.parse(JSON.stringify(itemSeleccionado));
                    itemCopia.cajas = cajas
                    palletsModificados2[pallet2].EF1.push(itemCopia);

                    itemSeleccionado.cajas = newCajas
                } else {
                    palletsModificados2[pallet2].EF1[index].cajas += cajas
                    itemSeleccionado.cajas = newCajas
                }
            }

            // Construye dinámicamente el objeto $set
            const update1 = { $set: {} };
            update1.$set[`pallets.${pallet2}`] = palletsModificados2[pallet2];

            const update2 = { $set: {} };
            update2.$set[`pallets.${pallet1}`] = palletsModificados1[pallet1];

            // BulkWrite sólo toca ese índice en cada documento
            const operations = [
                {
                    updateOne: {
                        filter: { _id: contenedores[index2]._id },
                        update: update1
                    }
                },
                {
                    updateOne: {
                        filter: { _id: contenedores[index1]._id },
                        update: update2
                    }
                }
            ];

            await ContenedoresRepository.bulkWrite(operations)

            const documentosAfectados = [
                {
                    modelo: "Contenedor",
                    documentoId: id1,
                    descripcion: `Se movio los item ${seleccionOrdenado} en el pallet ${pallet1}`,
                },
                {
                    modelo: "Contenedor",
                    documentoId: id2,
                    descripcion: `Se le agregaron item al  pallet ${pallet1}`,
                },
            ]

            const antes = [
                copiaPallets1[pallet1], copiaPallets2[pallet2]
            ]

            const despues = [
                palletsModificados1[pallet1], palletsModificados2[pallet2]
            ]
            // Registrar modificación
            await RecordModificacionesRepository.post_record_contenedor_modification(
                action,
                user,
                documentosAfectados,
                antes,
                despues,
                { contenedor1, contenedor2, action, user }
            );

            //Se modifican los lotes
            //se obtienen los lotes 
            if (GGN !== oldGGN) {
                const oldLote = JSON.parse(JSON.stringify(lotes[0]))
                let query = {}
                if (GGN && !oldGGN) {
                    query.$inc = { kilosGGN: kilos }
                } else if (!GGN && oldGGN) {
                    query.$inc = { kilosGGN: -kilos }
                }

                const newLote = await LotesRepository.modificar_lote_proceso(
                    lotes[0]._id,
                    query,
                    "Modificar GGN",
                    user._id
                )

                await RecordModificacionesRepository.post_record_contenedor_modification(
                    action,
                    user,
                    {
                        modelo: "Lotes",
                        documentoId: lotes[0]._id,
                        descripcion: `Se modifico los kilosGGN ${kilos}`,
                    },
                    oldLote,
                    newLote,
                    { contenedor1, contenedor2, action, user }
                );
            }

            procesoEventEmitter.emit("server_event", {
                action: "lista_empaque_update",
            });
            procesoEventEmitter.emit("listaempaque_update");

        } catch (err) {
            console.log(err)
            if (
                err.status === 610 ||
                err.status === 523
            ) {
                throw err
            }
            throw new ProcessError(470, `Error ${err.type}: ${err.message}`)
        }
    }
    static async put_proceso_aplicaciones_listaEmpaque_liberarPallet(req) {
        const { user } = req;
        const { _id, pallet, item, action } = req.data;
        const { rotulado, paletizado, enzunchado, estadoCajas, estiba } = item
        const query = {};

        //se obtiene  el contenedor a modifiar
        const contenedor = await ContenedoresRepository.get_Contenedores_sin_lotes({
            ids: [_id],
            select: { infoContenedor: 1, pallets: 1 },
            populate: {
                path: 'infoContenedor.clienteInfo',
                select: 'CLIENTE PAIS_DESTINO',
            }
        });

        // Crear copia profunda de los pallets
        const palletsModificados = JSON.parse(JSON.stringify(contenedor[0].pallets));
        const palletSeleccionado = palletsModificados[pallet].listaLiberarPallet;

        Object.assign(palletSeleccionado, { rotulado, paletizado, enzunchado, estadoCajas, estiba });

        query.pallets = palletsModificados

        // Actualizar contenedor con pallets modificados
        await ContenedoresRepository.actualizar_contenedor(
            { _id },
            query
        );

        // Registrar modificación
        await RecordModificacionesRepository.post_record_contenedor_modification(
            action,
            user,
            {
                modelo: "Contenedor",
                documentoId: _id,
                descripcion: `Se libero el pallet ${pallet}`,
            },
            contenedor[0].pallets[pallet],
            palletSeleccionado,
            { _id, pallet, item, action }
        );


        procesoEventEmitter.emit("listaempaque_update");
    }
    static async put_proceso_aplicaciones_listaEmpaque_modificarItems(req) {

        try {
            ProcesoValidations.put_proceso_aplicaciones_listaEmpaque_modificarItems(req.data)
            console.log(req.data)
            const { user } = req;
            const { _id, pallet, seleccion, data, action } = req.data;
            const { calidad, tipoCaja, calibre } = data
            const lotesIds = []
            //se obtiene  el contenedor a modifiar
            const contenedor = await ContenedoresRepository.get_Contenedores_sin_lotes({
                ids: [_id],
                select: { infoContenedor: 1, pallets: 1 },
                populate: {
                    path: 'infoContenedor.clienteInfo',
                    select: 'CLIENTE PAIS_DESTINO',
                }
            })

            // Crear copia profunda de los pallets
            const palletsModificados = JSON.parse(JSON.stringify(contenedor[0].pallets));
            const copiaPallets = JSON.parse(JSON.stringify(contenedor[0].pallets));

            for (let i = 0; i < seleccion.length; i++) {
                const palletSeleccionado = palletsModificados[pallet].EF1[seleccion[i]];
                lotesIds.push(palletSeleccionado.lote)
                Object.assign(palletSeleccionado, { calidad, calibre, tipoCaja });
            }

            // Actualizar contenedor con pallets modificados
            await ContenedoresRepository.actualizar_contenedor(
                { _id },
                { pallets: palletsModificados }
            );

            // Registrar modificación
            await RecordModificacionesRepository.post_record_contenedor_modification(
                action,
                user,
                {
                    modelo: "Contenedor",
                    documentoId: _id,
                    descripcion: `Actualización pallet ${pallet}, posición ${seleccion}`,
                },
                copiaPallets[pallet].EF1,
                palletsModificados[pallet].EF1,
                { pallet, seleccion }
            );

            //se modifican los lotes
            const lotesSet = new Set(lotesIds);
            const lotesArr = [...lotesSet];

            const lotes = await LotesRepository.getLotes({
                ids: lotesArr
            })

            //objeto con los datos de los lotes viejos
            const oldLotes = lotes.map(i => {
                return {
                    _id: i._id,
                    enf: i.enf,
                    calidad1: i.calidad1,
                    calidad15: i.calidad15,
                    calidad2: i.calidad2,
                    deshidratacion: i.deshidratacion,
                    rendimiento: i.rendimiento
                }
            })

            const lotesModificados = JSON.parse(JSON.stringify(lotes));

            for (let i = 0; i < seleccion.length; i++) {
                const itemSeleccionadoOld = copiaPallets[pallet].EF1[seleccion[i]];
                const itemSeleccionadoNew = palletsModificados[pallet].EF1[seleccion[i]];

                if (itemSeleccionadoOld.tipoCaja !== itemSeleccionadoNew.tipoCaja ||
                    itemSeleccionadoOld.calidad !== itemSeleccionadoNew.calidad) {
                    const oldKilos = itemSeleccionadoOld.cajas * Number(itemSeleccionadoOld.tipoCaja.split("-")[1].replace(",", "."));
                    const newKilos = itemSeleccionadoNew.cajas * Number(itemSeleccionadoNew.tipoCaja.split("-")[1].replace(",", "."));

                    const loteIndex = lotesModificados.findIndex(lote => lote._id.toString() === itemSeleccionadoOld.lote);
                    lotesModificados[loteIndex][calidadFile[itemSeleccionadoOld.calidad]] += - oldKilos;
                    lotesModificados[loteIndex][calidadFile[itemSeleccionadoNew.calidad]] += newKilos;

                    lotesModificados[loteIndex].deshidratacion = await deshidratacionLote(lotesModificados[loteIndex])
                    lotesModificados[loteIndex].rendimiento = await rendimientoLote(lotesModificados[loteIndex])

                    // si se restan los kilos ggn
                    if (have_lote_GGN_export(lotesModificados[loteIndex], contenedor[0], itemSeleccionadoOld)) {
                        lotesModificados[loteIndex].kilosGGN += - oldKilos;
                        lotesModificados[loteIndex].kilosGGN += newKilos;
                    }
                }
            }


            const operations = lotesModificados.map(loteDoc => ({
                updateOne: {
                    filter: { _id: loteDoc._id },
                    update: {
                        $set: {
                            calidad1: loteDoc.calidad1,
                            calidad15: loteDoc.calidad15,
                            calidad2: loteDoc.calidad2,
                            kilosGGN: loteDoc.kilosGGN,
                            deshidratacion: loteDoc.deshidratacion,
                            rendimiento: loteDoc.rendimiento
                            // Agrega aquí otros campos que necesites actualizar
                        }
                    }
                }
            }));


            await LotesRepository.bulkWrite(operations);

            // Registrar modificación de los lotes
            const documentosAfectados = lotes.map(l => ({
                modelo: "Lote", // o el nombre del modelo que estés utilizando
                documentoId: l._id,
                descripcion: `Se modificaron kilos de ${l._id} el enf ${l.enf}`,
            }));


            //objeto con los datos de los lotes viejos
            const newLotes = lotesModificados.map(i => {
                return {
                    _id: i._id,
                    enf: i.enf,
                    calidad1: i.calidad1,
                    calidad15: i.calidad15,
                    calidad2: i.calidad2,
                    deshidratacion: i.deshidratacion,
                    rendimiento: i.rendimiento
                }
            })

            await RecordModificacionesRepository.post_record_contenedor_modification(
                action,
                user,
                documentosAfectados, // aquí pasas el array de documentos afectados
                oldLotes,
                newLotes,
                { _id }
            );

            procesoEventEmitter.emit("server_event", {
                action: "lista_empaque_update",
            });
            procesoEventEmitter.emit("listaempaque_update");


        } catch (err) {
            console.log(err)
            if (
                err.status === 610 ||
                err.status === 523 ||
                err.status === 522
            ) {
                throw err
            }
            throw new ProcessError(470, `Error ${err.type}: ${err.message}`)

        }
    }
    static async put_proceso_aplicaciones_listaEmpaque_Cerrar(req) {
        try {
            const { user } = req;
            const { _id, action } = req.data;
            const contenedor = await ContenedoresRepository.getContenedores({ ids: [_id] });
            const lista = await insumos_contenedor(contenedor[0])
            const listasAlias = Object.keys(lista);
            const idsInsumos = await InsumosRepository.get_insumos({
                query: {
                    codigo: { $in: listasAlias },
                }
            })
            const listaInsumos = {};
            idsInsumos.forEach(item => {
                listaInsumos[`insumosData.${item._id.toString()}`] = lista[item.codigo]
            })
            // Actualizar contenedor con pallets modificados
            const newContenedor = await ContenedoresRepository.actualizar_contenedor(
                { _id },
                {
                    ...listaInsumos,
                    'infoContenedor.cerrado': true,
                    'infoContenedor.fechaFinalizado': new Date(),
                }
            );

            // Registrar modificación
            await RecordModificacionesRepository.post_record_contenedor_modification(
                action,
                user,
                {
                    modelo: "Contenedor",
                    documentoId: _id,
                    descripcion: `Se cerro el contenedor ${contenedor[0].numeroContenedor}`,
                },
                contenedor[0],
                newContenedor,
                { _id, action }
            );



            procesoEventEmitter.emit("listaempaque_update");

        } catch (err) {
            if (
                err.status === 522 ||
                err.status === 523 ||
                err.status === 423

            ) {
                throw err
            }
            throw new ProcessError(470, `Error ${err.type}: ${err.message}`)
        }
    }

    //#endregion


    static async getInventario() {

        //JS SERVER

        const inventario = await VariablesDelSistema.getInventario();
        const inventarioKeys = Object.keys(inventario)

        const lotes = await LotesRepository.getLotes({
            ids: inventarioKeys,
            select: {
                __v: 1,
                clasificacionCalidad: 1,
                nombrePredio: 1,
                fecha_ingreso_patio: 1,
                fecha_salida_patio: 1,
                fecha_ingreso_inventario: 1,
                fecha_creacion: 1,
                fecha_estimada_llegada: 1,
                observaciones: 1,
                tipoFruta: 1,
                promedio: 1,
                enf: 1,
                kilosVaciados: 1,
                not_pass: 1
            }
        });

        // se agrega las canastillas en inventario
        const resultado = inventarioKeys.map(id => {
            const lote = lotes.find(lote => lote._id.toString() === id.toString());

            if (lote) {
                return {
                    ...lote.toObject(),
                    inventario: inventario[id]
                }
            }
            return null
        }).filter(item => item !== null);

        const query_lotes_camino = {
            fecha_ingreso_inventario: { $exists: false },
            fechaIngreso: { $exists: false },
        }

        const lotes_camino = await LotesRepository.getLotes({
            query: query_lotes_camino,
            select: {
                fecha_ingreso_patio: 1,
                fecha_salida_patio: 1,
                fecha_ingreso_inventario: 1,
                fecha_creacion: 1,
                fecha_estimada_llegada: 1,
                __v: 1,
                clasificacionCalidad: 1,
                nombrePredio: 1,
                observaciones: 1,
                tipoFruta: 1,
                kilosVaciados: 1,
                kilos_estimados: 1,
                canastillas_estimadas: 1
            }
        })

        return [...resultado, ...lotes_camino]
    }





    static async obtener_historial_decarte_lavado_proceso(user) {
        const recordLotes = await RecordLotesRepository.getRecordLotes({
            query: {
                operacionRealizada: 'ingresar_descarte_lavado',
            },
            user: user
        })
        const lotesIds = recordLotes.map(lote => lote.documento._id);
        const lotes = await LotesRepository.getLotes({
            ids: lotesIds,
            select: { enf: 1, promedio: 1, tipoFruta: 1 }
        });
        const resultado = recordLotes.map(item => {
            const lote = lotes.find(lote => lote._id.toString() === item.documento._id);
            if (lote) {
                if (Object.prototype.hasOwnProperty.call(item.documento, "$inc")) {
                    item.documento = { ...lote, descartes: item.documento.$inc }
                    return (item)
                }
                else {
                    return item
                }

            }
            return null
        }).filter(item => item !== null);

        return resultado
    }
    static async obtener_historial_decarte_encerado_proceso(user) {
        const recordLotes = await RecordLotesRepository.getRecordLotes({
            user: user,
            query: {
                operacionRealizada: 'ingresar_descarte_encerado'
            }
        })
        const lotesIds = recordLotes.map(lote => lote.documento._id);
        const lotes = await LotesRepository.getLotes({
            ids: lotesIds,
            select: { enf: 1, promedio: 1, tipoFruta: 1 }
        });
        const resultado = recordLotes.map(item => {
            const lote = lotes.find(lote => lote._id.toString() === item.documento._id);
            if (lote) {
                if (Object.prototype.hasOwnProperty.call(item.documento, "$inc")) {
                    item.documento = { ...lote, descartes: item.documento.$inc }
                    return (item)
                }
                else {
                    return item
                }

            }
            return null
        }).filter(item => item !== null);
        return resultado
    }
    static async obtener_historial_fotos_calidad_proceso(user) {
        const recordLotes = await RecordLotesRepository.getRecordLotes({
            user: user,
            query: {
                operacionRealizada: 'Agregar foto calidad'
            }

        });
        const lotesIds = recordLotes.map(lote => lote.documento._id);
        const lotes = await LotesRepository.getLotes({
            ids: lotesIds,
            select: { enf: 1, tipoFruta: 1 }
        });
        const resultado = recordLotes.map(item => {
            const lote = lotes.find(lote => lote._id.toString() === item.documento._id);
            if (lote) {
                return { ...item._doc, lote: lote }
            }
            return null
        }).filter(item => item !== null);
        return resultado
    }
    static async obtener_foto_calidad(url) {
        const data = fs.readFileSync(url)
        const base64Image = data.toString('base64');
        return base64Image
    }


    static async get_record_lote_recepcion_pendiente(req) {
        const { page } = req
        const resultsPerPage = 50;
        const query = {
            operacionRealizada: 'lote_recepcion_pendiente'
        }
        const registros = await RecordLotesRepository.getRecordLotes({
            skip: (page - 1) * resultsPerPage,
            limit: resultsPerPage,
            query: query
        })

        const lotesArrIds = registros.map(lote => lote.documento._id)
        const lotesSetIds = new Set(lotesArrIds)
        const ids = [...lotesSetIds]

        const lotes = await LotesRepository.getLotes({
            ids: ids,
            select: { tipoFruta: 1, placa: 1, observaciones: 1 }
        })
        const result = registros.map(registro => {
            const lote = lotes.find(item => item._id.toString() === registro.documento._id)

            return {
                ...registro._doc,
                documento: {
                    ...registro.documento,
                    predio: {
                        ...lote.predio._doc
                    },
                    tipoFruta: lote.tipoFruta,
                    placa: lote.placa,
                    observaciones: lote.observaciones
                }
            }
        })
        return result
    }
    static async get_record_lote_ingreso_inventario(req) {
        const { page } = req
        const resultsPerPage = 50;
        const query = {
            operacionRealizada: 'send_lote_to_inventario'
        }
        const registros = await RecordLotesRepository.getRecordLotes({
            skip: (page - 1) * resultsPerPage,
            limit: resultsPerPage,
            query: query
        })

        const lotesArrIds = registros.map(lote => lote.documento._id)
        const lotesSetIds = new Set(lotesArrIds)
        const ids = [...lotesSetIds]

        const lotes = await LotesRepository.getLotes({
            ids: ids,
            select: {
                tipoFruta: 1,
            }
        })
        const result = registros.map(registro => {
            const lote = lotes.find(item => item._id.toString() === registro.documento._id)

            return {
                ...registro._doc,
                documento: {
                    ...registro.documento,
                    predio: {
                        ...lote.predio._doc
                    },
                    tipoFruta: lote.tipoFruta,
                }
            }
        })
        return result
    }


    static async obtener_status_proceso() {
        const status = await VariablesDelSistema.obtener_status_proceso()
        return status
    }
    static async get_status_pausa_proceso() {
        const status = VariablesDelSistema.get_status_pausa_proceso()
        return status
    }
    static async obtener_predio_procesando() {
        const predio = await VariablesDelSistema.obtener_predio_procesando()
        return predio
    }

    static async obtenerHistorialLotes(data) {
        try {

            const { fechaInicio, fechaFin } = data
            let query = {
                operacionRealizada: 'vaciarLote'
            }

            query = filtroFechaInicioFin(fechaInicio, fechaFin, query, 'fecha')

            const recordLotes = await RecordLotesRepository.getVaciadoRecord({ query: query })
            const lotesIds = recordLotes.map(lote => lote.documento._id);

            const lotes = await LotesRepository.getLotes({
                ids: lotesIds,
                limit: recordLotes.length,
                select: { enf: 1, promedio: 1, tipoFruta: 1, __v: 1 }
            });
            const resultado = recordLotes.map(item => {
                const lote = lotes.find(lote => lote._id.toString() === item.documento._id);
                if (lote) {
                    if (Object.prototype.hasOwnProperty.call(item.documento, "$inc")) {
                        item.documento = { ...lote, kilosVaciados: item.documento.$inc.kilosVaciados }
                        return (item)
                    }
                    else {
                        return item
                    }
                }
                return null
            }).filter(item => item !== null);
            return resultado
        } catch (err) {
            if (err.status === 522) {
                throw err
            }
            throw new InventariosLogicError(470, `Error ${err.type}: ${err.message}`)
        }
    }


    //! obtener el numero de elementos para paginacion

    static async obtener_cantidad_historial_espera_descargue() {
        const filtro = {
            operacionRealizada: "lote_recepcion_pendiente"
        }
        const cantidad = await RecordLotesRepository.obtener_cantidad_recordLote(filtro)
        return cantidad
    }
    static async obtener_cantidad_historial_ingreso_inventario() {
        const filtro = {
            operacionRealizada: "send_lote_to_inventario"
        }
        const cantidad = await RecordLotesRepository.obtener_cantidad_recordLote(filtro)
        return cantidad
    }


    //#endregion

    // #region PUT
    static async lote_recepcion_pendiente(req) {
        const { user, data } = req

        const { _id } = data
        const query = {
            fecha_ingreso_patio: new Date(),
        }
        await LotesRepository.modificar_lote_proceso(_id, query, 'lote_recepcion_pendiente', user)
        procesoEventEmitter.emit("inventario_fruta_sin_procesar", {});
    }
    static async send_lote_to_inventario(req) {
        const { user, data } = req

        const { _id, data: datos } = data
        const enf = await this.get_ef1()

        const query = {
            ...datos,
            enf: enf,
            fecha_salida_patio: new Date(),
            fecha_ingreso_inventario: new Date(),
        }
        const lote = await LotesRepository.modificar_lote_proceso(_id, query, 'send_lote_to_inventario', user.user)

        await VariablesDelSistema.ingresarInventario(lote._id.toString(), Number(datos.canastillas));
        await VariablesDelSistema.incrementarEF1();

        procesoEventEmitter.emit("inventario_fruta_sin_procesar", {});
    }



    static async vaciarLote(req) {
        const { user: user1, data } = req
        const { user } = user1;

        const pilaFunciones = [];
        const { _id, kilosVaciados, inventario, __v } = data;

        try {

            //JS
            const query = {
                $inc: {
                    kilosVaciados: kilosVaciados,
                    __v: 1,
                },
                fechaProceso: new Date()
            }
            await LotesRepository.modificar_lote(_id, query, "vaciarLote", user, __v);


            pilaFunciones.push({
                funcion: "modificar_lote",
                datos: { _id, kilosVaciados, __v }
            })

            const lote = await LotesRepository.getLotes({ ids: [_id] });
            //condicional si es desverdizado o no
            if (lote[0].desverdizado) {
                await VariablesDelSistema.modificarInventario_desverdizado(lote[0]._id.toString(), inventario);
                pilaFunciones.push({
                    funcion: "modificar_inventario_desverdizado",
                    datos: { _id: lote[0]._id.toString(), inventario: inventario }
                })
            } else {
                await VariablesDelSistema.modificarInventario(lote[0]._id.toString(), inventario);
                pilaFunciones.push({
                    funcion: "modificar_inventario",
                    datos: { _id: lote[0]._id.toString(), inventario: inventario }
                })
            }

            const predioAnterior = await VariablesDelSistema.obtenerEF1proceso()

            await VariablesDelSistema.procesarEF1(lote[0], inventario);
            pilaFunciones.push({
                funcion: "modificar_ef1Proceso",
                datos: { ...predioAnterior }
            })

            await VariablesDelSistema.borrarDatoOrdenVaceo(lote[0]._id.toString())

            await VariablesDelSistema.ingresar_kilos_vaciados(kilosVaciados);

            //para lista de empaque
            procesoEventEmitter.emit("predio_vaciado", {
                predio: lote
            });
            0
            //para el desktop app
            procesoEventEmitter.emit("server_event", {
                action: "vaciar_lote",
                data: {
                    predio: lote
                }
            });
        } catch (err) {
            // se devuelven los elementos que se cambiaron
            for (let i = pilaFunciones.length - 1; i >= 0; i--) {
                const value = pilaFunciones[i];
                if (value.funcion === "modificar_lote") {
                    const { _id, kilosVaciados, __v } = value.datos
                    const query = {
                        $inc: {
                            kilosVaciados: - kilosVaciados,
                            __v: 1,
                        },
                        fechaProceso: new Date()
                    }
                    await LotesRepository.modificar_lote(
                        _id, query, "rectificando_moficiar_lote", user, __v + 1
                    );
                } else if (value.funcion === "modificar_inventario_desverdizado") {
                    const { _id, inventario } = value.datos
                    await VariablesDelSistema.modificarInventario_desverdizado(_id, -inventario);
                } else if (value.funcion === "modificar_inventario") {
                    const { _id, inventario } = value.datos
                    await VariablesDelSistema.modificarInventario_desverdizado(_id, -inventario);
                } else if (value.funcion === "modificar_ef1Proceso") {
                    const { _id, enf, predio, nombrePredio, tipoFruta } = value.datos
                    const lote = {
                        _id: _id,
                        enf: enf,
                        tipoFruta: tipoFruta,
                        predio: {
                            _id: predio,
                            nombrePredio: nombrePredio,
                        }
                    }
                    await VariablesDelSistema.procesarEF1(lote);
                }
            }
            throw new Error(`Code ${err.code}: ${err.message}`);

        }

    }
    static async modificar_historial_fechas_en_patio(data, user) {
        try {
            const { fecha_ingreso_patio, _id, __v, lote, action } = data
            let query = {
                "documento.fecha_ingreso_patio": new Date(fecha_ingreso_patio)
            }

            await RecordLotesRepository.modificarRecord(_id, query, __v)

            query = {
                fecha_ingreso_patio: new Date(fecha_ingreso_patio)
            }
            await LotesRepository.modificar_lote_proceso(lote, query, action, user.user)
        } catch (err) {
            throw new Error(`Error en modificar_historial_fechas_en_patio: ${err.message}`)
        }

    }
    static async modificar_historial_lote_ingreso_inventario(data, user) {
        try {
            const { query, _id, __v, lote, action } = data

            if (Number(query.canastillas) === 0) {
                throw new Error("Error, modificar_historial_lote_ingreso_inventario, canastillas estan en cero")
            }
            const promedio = Number(query.kilos) / Number(query.canastillas)

            query.promedio = promedio

            let queryModificar = {}
            Object.entries(query).forEach(([key, value]) => {
                if (key === "fecha_salida_patio") {
                    queryModificar[`documento.${key}`] = new Date(value)
                    queryModificar[`documento.fecha_ingreso_inventario`] = new Date(value)
                } else {
                    queryModificar[`documento.${key}`] = value
                }
            })

            await RecordLotesRepository.modificarRecord(_id, queryModificar, __v)

            await LotesRepository.modificar_lote_proceso(lote, query, action, user.user)

            await VariablesDelSistema.ingresarInventario(lote, Number(query.canastillas));



        } catch (err) {
            throw new Error(`Error en modificar_historial_lote_ingreso_inventario: ${err.message}`)
        }

    }

    static async directoNacional(req) {

        const user = req.user.user;
        const data = req.data

        const { _id, infoSalidaDirectoNacional, directoNacional, inventario, __v, action } = data;
        const query = {
            $inc: {
                directoNacional: directoNacional,
                __v: 1
            },
            infoSalidaDirectoNacional: infoSalidaDirectoNacional
        };
        const lote = await LotesRepository.modificar_lote(_id, query, action, user, __v);

        await VariablesDelSistema.modificarInventario(_id, inventario);
        await LotesRepository.deshidratacion(lote);

        procesoEventEmitter.emit("server_event", {
            action: "directo_nacional",
            data: {}
        });

    }



    // static async modificar_predio_proceso_listaEmpaque(req,) {
    //     const { data } = req
    //     VariablesDelSistema.modificar_predio_proceso_listaEmpaque(data)
    //     procesoEventEmitter.emit("predio_vaciado");
    // }
    static async reiniciarValores_proceso() {
        await VariablesDelSistema.reiniciarValores_proceso();
        procesoEventEmitter.emit("proceso_event", {});
    }

    static async desverdizado(req) {
        const user = req.user.user;
        const data = req.data

        const { _id, inventario, desverdizado, __v, action } = data;
        const query = {
            desverdizado: desverdizado,
            $inc: {
                __v: 1
            },
        }
        await LotesRepository.modificar_lote(_id, query, action, user, __v);

        await VariablesDelSistema.ingresarInventarioDesverdizado(_id, inventario)
        await VariablesDelSistema.modificarInventario(_id, inventario);

        procesoEventEmitter.emit("server_event", {
            action: "enviar_desverdizado",
            data: {}
        });
    }


    static async set_hora_pausa_proceso() {
        await VariablesDelSistema.set_hora_pausa_proceso();
        procesoEventEmitter.emit("status_proceso", {
            status: "pause"
        });
    }

    static async sp32_funcionamiento_maquina(data) {
        let estado_maquina = false
        const status_proceso = await VariablesDelSistema.obtener_status_proceso()
        if (Number(data) >= 1925) {
            estado_maquina = true
        }
        //al inicio maquina apagada, status off
        if (estado_maquina && status_proceso === 'off') {
            await VariablesDelSistema.set_hora_inicio_proceso();

            //se prende la maquina , continua el proceso
        } else if (estado_maquina && status_proceso === 'pause') {
            //se reanuda el proces cuando se prende la maquina
            await VariablesDelSistema.set_hora_reanudar_proceso();
            //se pausa la maquina
        } else if (!estado_maquina && status_proceso === 'on') {
            await VariablesDelSistema.set_hora_pausa_proceso()
        }

        const new_status_proceso = await VariablesDelSistema.obtener_status_proceso()

        procesoEventEmitter.emit("status_proceso", {
            status: new_status_proceso
        });
    }



    //? lista de empaque



    static async add_pallet_listaempaque(req, user) {
        const { _id, action } = req
        const newItem = {
            EF1: [],
            listaLiberarPallet: {
                rotulado: false,
                paletizado: false,
                enzunchado: false,
                estadoCajas: false,
                estiba: false
            },
            settings: {
                tipoCaja: '',
                calidad: '',
                calibre: ''
            }
        }
        const query = {
            $push: { pallets: newItem }
        }
        await ContenedoresRepository.modificar_contenedor(_id, query, user, action)
        procesoEventEmitter.emit("listaempaque_update");

    }






    //#endregion

}

module.exports.ProcesoRepository = ProcesoRepository

