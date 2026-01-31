import { procesoEventEmitter } from "../../../events/eventos.js";
import { InventariosHistorialRepository } from "../../Class/Inventarios.js";
import { InventariosService } from "../../services/inventarios.js";
import { registrarPasoLog } from "../helper/logs.js";
import { InventariosValidations } from "../../validations/inventarios.js";
import { LotesRepository } from "../../Class/Lotes.js";
import { executeQueryTask, executeTransactionalTask } from "../../utils/wrappers.js";
import config from "../../../src/config/index.js";
import { buildDateRangeFilter } from "../utils/filtros.js";
import { ConstantesDelSistema } from "../../Class/ConstantesDelSistema.js";
import { dataService } from "../../services/data.js";
import { dataRepository } from "../data.js";
import { CanastillasRepository } from "../../Class/CanastillasRegistros.js";
import { VariablesDelSistema } from "../../Class/VariablesDelSistema.js";


export class InventarioFrutaSinProcesarController {

    static async put_inventarios_frutaSinProcesar_directoNacional(req) {
        const { user } = req;
        InventariosValidations.put_inventarios_frutaSinProcesar_directoNacional().parse(req.data);

        await executeTransactionalTask(req, async (session, log) => {
            if (!user._id) {
                throw new Error("No se encontró el usuario en la base de datos");
            }
            const { data, lote, action, __v } = req.data
            const loteId = lote._id || data.lote;

            const checkVersion = await InventariosService.check_inventarioVersion(config.INVENTARIO_FRUTA_SIN_PROCESAR, __v)
            if (!checkVersion) {
                throw new Error("La versión del inventario ha cambiado. Por favor, recargue la página e intente de nuevo.");
            }

            const itemInOrdenVaceo = await InventariosService.item_in_ordenVaceo(loteId)
            if (!itemInOrdenVaceo) {
                throw new Error("El lote ya está en la orden de vaceo, no se puede procesar como directo nacional.");
            }

            if (
                !data.canastillas ||
                data.canastillas <= 0 ||
                !isFinite(data.canastillas) ||
                isNaN(data.canastillas)) {
                throw new Error("El valor de canastillas debe ser mayor a 0.");
            }

            const kilos = lote.promedio * data.canastillas;
            if (kilos > lote.kilos) {
                throw new Error("No se puede procesar más kilos de los que hay en el lote.");
            }
            if (typeof kilos !== "number" || isNaN(kilos) || !isFinite(kilos)) {
                throw new Error("El valor de kilos debe ser un número.");
            }
            const queryLote = {
                $inc: {
                    directoNacional: kilos,
                    kilosProcesados: kilos,
                },
                infoSalidaDirectoNacional: {
                    ...data,
                    user: user._id,
                }
            };

            await LotesRepository.actualizar_lote(
                { _id: loteId },
                queryLote,
                { new: true, user: user, action: action, session: session, calculateFields: true }
            );
            await registrarPasoLog(log._id, "LotesRepository.actualizar_lote", "Completado", `Lote ${loteId} actualizado con directoNacional: ${lote.promedio * data.canastillas}`);

            const descripcion = `Directo Nacional - Canastillas decrementadas: ${data.canastillas}`
            await InventariosService.modificarRestarInventarioFrutaSinProocesar(data.canastillas, user, action, lote, session, descripcion);
        });

        procesoEventEmitter.emit("server_event", {
            action: "directo_nacional",
            data: {}
        });
    }
    static async get_inventarios_historialDirectoNacional_registros(req) {
        return await executeQueryTask(async () => {
            const { data } = req
            if (!data.filtro || (!data.filtro.fechaInicio && !data.filtro.fechaFin)) {
                throw new Error("No se proporcionó ningún filtro.");
            }
            const { fechaInicio, fechaFin } = data.filtro
            const queryBase = {
                infoSalidaDirectoNacional: { $exists: true }
            }

            const query = buildDateRangeFilter(fechaInicio, fechaFin, 'infoSalidaDirectoNacional.fecha', queryBase)

            const lotes = await LotesRepository.get_data({
                query: query,
                select: {
                    enf: 1,
                    promedio: 1,
                    tipoFruta: 1,
                    __v: 1,
                    infoSalidaDirectoNacional: 1,
                    directoNacional: 1
                },
                limit: 500,
                populate: [
                    { path: 'predio', select: 'PREDIO' },
                    { path: 'tipoFruta' },
                    { path: "infoSalidaDirectoNacional.user", select: "usuario nombre apellido" }
                ]
            });

            return lotes
        });
    }
    static async post_inventarios_ingreso_lote(req) {
        const { user } = req;

        await executeTransactionalTask(req, async (session, log) => {
            if (!user && !user._id) {
                throw new Error("No se encontró el usuario en la base de datos");
            }
            const inventarioID = config.INVENTARIO_FRUTA_SIN_PROCESAR;
            if (!inventarioID) {
                throw new Error("No se encontró el inventario en la base de datos");
            }
            const { action, data } = req; // 'data' aquí es el body que llega de la red
            const { dataLote: datosValidados, dataCanastillas } = InventariosValidations.post_inventarios_ingreso_lote().parse(data);
            await registrarPasoLog(log._id, "InventariosValidations.post_inventarios_ingreso_lote", "Completado");

            //la idea es quitar esto cuando se actualice los proveedores para uqe funcione con los _id de la fruta
            const tipoFruta = await ConstantesDelSistema.get_constantes_sistema_tipo_frutas2(datosValidados.tipoFruta)
            if (tipoFruta.length === 0) {
                throw new Error("No se encontró el tipo de fruta");
            }

            const [{ precioId, proveedor }, ef1] = await Promise.all([
                InventariosService.obtenerPrecioProveedor(datosValidados.predio, datosValidados.tipoFruta, session),
                dataService.get_ef1_serial(datosValidados.fecha_estimada_llegada),
            ])
            await registrarPasoLog(log._id, "Promise.all obtener precio, proveedor, ef1 y tipo de fruta", "Completado");

            //! aqui se debe cambiar el ipo de fruta en un futuro para que valide el _id del tipo de fruta
            if (datosValidados.GGN) {
                InventariosService.validarGGN(proveedor, tipoFruta[0].tipoFruta, user)
                await registrarPasoLog(log._id, "InventariosService.validarGGN", "Completado");
            }

            const query = InventariosService.construirQueryIngresoLote(datosValidados, ef1, precioId, user);
            await registrarPasoLog(log._id, "InventariosService.construirQueryIngresoLote", "Completado");

            //Se crean los datos del registro de canastillas
            const dataRegistro = InventariosService.crearRegistroInventarioCanastillas({
                destino: config.ID_CELIFRUT,
                origen: datosValidados.predio,
                observaciones: "ingreso lote",
                fecha: datosValidados.fecha_estimada_llegada,
                canastillas: dataCanastillas.canastillasPropias,
                canastillasPrestadas: dataCanastillas.canastillasPrestadas,
                accion: "ingreso",
                user
            })
            await registrarPasoLog(log._id, "InventariosService.crearRegistroInventarioCanastillas", "Completado");

            const lote = await LotesRepository.addLote(query, { session, user: user._id, action: action });
            await registrarPasoLog(log._id, "LotesRepository.addLote", "Completado");

            await InventariosHistorialRepository.put_inventarioSimple(
                { _id: inventarioID },
                { $push: { inventario: { lote: lote._id, canastillas: Number(lote.canastillas || 0) } }, $inc: { __v: 1 } },
                { session, user: user._id, action: "ingreso_lote", operation: "ingreso", skipAudit: false }
            );
            await registrarPasoLog(log._id, "VariablesDelSistema.ingresarInventario", "Completado");


            //!Estos quedan pendientes por pruebas unitarias y por mejorar logica para robuztes de los datos
            await InventariosService
                .ajustarCanastillasProveedorCliente(datosValidados.predio, -Number(dataCanastillas.canastillasPropias || 0), user, session);
            await registrarPasoLog(log._id, "InventariosService.ajustarCanastillasProveedorCliente", "Completado");

            await InventariosService
                .ajustarCanastillasProveedorCliente(config.ID_CELIFRUT, Number(dataCanastillas.canastillasPropias || 0), user, session);
            await registrarPasoLog(log._id, "InventariosService.ajustarCanastillasProveedorCliente", "Completado");
            //!Estos quedan pendientes por pruebas unitarias y por mejorar logica para robuztes de los datos

            await CanastillasRepository.post_data(dataRegistro, { session: session, user: user._id, action: action });
            await registrarPasoLog(log._id, "CanastillasRepository.post_data", "Completado");

            await dataRepository.incrementar_serial("EF1-", session);
            await registrarPasoLog(log._id, "dataService.incrementar_serial", "Completado");

            //este metodo tambien toca mejorarlo, que no sea un json y que sea parte del mongo para transacciones
            await VariablesDelSistema
                .modificar_canastillas_inventario(dataCanastillas.canastillasPrestadas, "canastillasPrestadas")
            await registrarPasoLog(log._id, "VariablesDelSistema.modificar_canastillas_inventario", "Completado");
        })

        procesoEventEmitter.emit("server_event", {
            action: "add_lote",
        });
    }
}