import { executeQueryTask, executeTransactionalTask } from "../../utils/wrappers.js";
import { ProveedoresRepository } from "../../Class/Proveedores.js";
import { CanastillasService } from "../../services/inventarios/canastillas.js";
import { ClientesNacionalesRepository } from "../../Class/Clientes.js";
import { InventariosValidations } from "../../validations/inventarios.js";
import { registrarPasoLog } from "../helper/logs.js";
import { InventariosService } from "../../services/inventarios.js";
import { CanastillasRepository } from "../../Class/CanastillasRegistros.js";
import { buildDateRangeFilter } from "../utils/filtros.js";
import { InventariosHistorialRepository } from "../../Class/Inventarios.js";
import config from "../../../src/config/index.js";
export class CanastillasController {
    static async get_inventarios_canastillas_canastillasCelifrut() {
        return await executeQueryTask(async () => {

            const total_canastillas = await CanastillasService.get_totales_canastillas()
            const query = {
                $or: [
                    { canastillas: { $gt: 0 } }
                ]
            }

            const canastillasPrestadas = total_canastillas.canastillasPrestadas
            const arr_id = canastillasPrestadas instanceof Map
                ? Array.from(canastillasPrestadas.keys())
                : Object.keys(canastillasPrestadas || {})

            if (arr_id.length > 0) {
                query.$or.push({ _id: { $in: arr_id } })
            }


            const proveedores = await ProveedoresRepository.get_data({
                query: query,
                select: {
                    canastillas: 1, PREDIO: 1
                }
            })

            const clientes = await ClientesNacionalesRepository.get_data({
                query: query,
                select: {
                    canastillas: 1, cliente: 1
                }
            })


            return [{
                ...total_canastillas,
                proveedores: proveedores || [],
                clientes: clientes || []
            }]
        })
    }
    static async get_inventarios_historiales_canastillas_registros(req) {
        return await executeQueryTask(async () => {

            const { page = 1, filtro } = req.data || {}
            const { fechaInicio, fechaFin } = filtro || {}

            const currentPage = Number(page);
            if (isNaN(currentPage) || currentPage < 1) {
                throw new Error("Número de página inválido");
            }

            const resultsPerPage = 50;
            let skip = (currentPage - 1) * resultsPerPage

            const query = buildDateRangeFilter(fechaInicio, fechaFin, 'createdAt', {})

            const registros = await CanastillasRepository.get_data({ query: query, skip: skip, limit: resultsPerPage, sort: { createdAt: -1 } })

            return registros

        })
    }
    static async get_inventarios_historiales_numeroCanastillas_registros(req) {
        return await executeQueryTask(async () => {
            const { filtro } = req.data || {}
            let query = {}

            if (filtro) {
                const { fechaInicio, fechaFin } = filtro
                query = buildDateRangeFilter(fechaInicio, fechaFin, 'createdAt', query)
            }
            const registros = await CanastillasRepository.get_numero_registros(query)
            return registros

        })
    }
    static async put_inventarios_canastillas_celifrut(req) {
        const { user } = req
        if (!user || !user._id) throw new Error("Usuario no existe")
        await executeTransactionalTask(req, async (session, log) => {
            const parseData = InventariosValidations.put_inventarios_canastillas_celifrut().parse(req.data.data)
            const {
                destino,
                origen,
                canastillas,
                fecha,
                observaciones,
                remitente,
                destinatario
            } = parseData

            await InventariosService.ajustarCanastillasProveedorCliente(origen, -canastillas, user, session);
            await InventariosService.ajustarCanastillasProveedorCliente(destino, canastillas, user, session);
            await registrarPasoLog(log._id, "Inventarios ajustados (origen/destino)", "Completado", `origen: ${origen}, destino: ${destino}, canastillas: ${canastillas}`)

            const dataRegistroCanastillas = InventariosService.crearRegistroInventarioCanastillas({
                origen,
                destino,
                accion: "traslado",
                canastillas,
                canastillasPrestadas: 0,
                remitente,
                destinatario,
                observaciones,
                fecha,
                user: user._id
            });
            await CanastillasRepository.post_data(dataRegistroCanastillas, { session, user: user._id });
            await registrarPasoLog(log._id, "Registro de canastillas creado", "Completado");
        })
    }
    static async put_inventarios_historiales_canastillas_modificarRegistro(req) {
        const { user } = req
        if (!user || !user._id) throw new Error("Usuario no existe")
        await executeTransactionalTask(req, async (session, log) => {
            const parseData = InventariosValidations.put_inventarios_historiales_canastillas_modificarRegistro().parse(req.data)
            const { _id, data } = parseData
            const { origen, destino, cantidad, cantidadPrestadas, observaciones } = data

            const registro = await CanastillasRepository.get_data({
                query: { _id }
            })

            if (registro.length === 0) throw new Error("No se encontró el registro")
            const setUpdate = { origen, destino, observaciones }

            if (cantidad !== undefined) {
                const newCanastillas = (registro[0].cantidad.propias - cantidad) * (-1)
                await InventariosService
                    .ajustarCanastillasProveedorCliente(origen, -newCanastillas, user, session);
                await registrarPasoLog(log._id, "InventariosService.ajustarCanastillasProveedorCliente (origen)", "Completado");

                await InventariosService
                    .ajustarCanastillasProveedorCliente(destino, newCanastillas, user, session);
                await registrarPasoLog(log._id, "InventariosService.ajustarCanastillasProveedorCliente (destino)", "Completado");

                setUpdate['cantidad.propias'] = cantidad
            }

            if (cantidadPrestadas !== undefined && cantidadPrestadas !== registro[0].cantidad.prestadas) {
                const newCanastillasPrestadas = (registro[0].cantidad.prestadas - cantidadPrestadas) * (-1)

                await InventariosHistorialRepository.actualizar_data(
                    { _id: config.INVENTARIO_CANASTILLAS },
                    { $inc: { [`canastillasPrestadas.${origen}`]: newCanastillasPrestadas } },
                    { session, user: user._id }
                )

                setUpdate['cantidad.prestadas'] = cantidadPrestadas
            }

            await CanastillasRepository.actualizar_data(
                { _id },
                { $set: setUpdate },
                { session, user: user._id }
            )
            await registrarPasoLog(log._id, "CanastillasRepository.actualizar_data", "Completado");

        })
    }
    static async put_inventarios_darBaja_canastillas(req) {
        const { user } = req
        if (!user || !user._id) throw new Error("Usuario no existe")
        await executeTransactionalTask(req, async (session, log) => {
            const { canastillas, observaciones } = InventariosValidations.put_inventarios_darBaja_canastillas().parse(req.data.data)

            const total_canastillas = await CanastillasService.get_totales_canastillas()
            const canastillas_vacias = total_canastillas.canastillas_propias - total_canastillas.canastillas_llenas

            if (canastillas_vacias < canastillas) throw new Error(`No hay suficientes canastillas en inventario. Disponibles: ${canastillas_vacias}`)

            await InventariosHistorialRepository.actualizar_data(
                { _id: config.INVENTARIO_CANASTILLAS },
                { $inc: { canastillasTotal: Number(-canastillas) } },
                { session, user: user._id }
            )
            await registrarPasoLog(log._id, "InventariosHistorialRepository.actualizar_data", "Completado")

            const dataRegistroCanastillas = InventariosService.crearRegistroInventarioCanastillas({
                origen: config.ID_CELIFRUT,
                destino: config.ID_CELIFRUT,
                accion: "retiro",
                canastillas,
                canastillasPrestadas: 0,
                remitente: "N/A",
                destinatario: "N/A",
                observaciones,
                fecha: new Date(),
                user: user._id
            });
            await CanastillasRepository.post_data(dataRegistroCanastillas, { session, user: user._id });
            await registrarPasoLog(log._id, "CanastillasRepository.post_data", "Completado");

            await InventariosService.ajustarCanastillasProveedorCliente(config.ID_CELIFRUT, Number(-canastillas), user, session);
            await registrarPasoLog(log._id, "Inventarios ajustados (origen/destino)", "Completado", `se eliminan ${canastillas}`)

        })
    }
    static async put_inventarios_devolverCanastillas_prestadas(req) {
        const { user } = req
        if (!user || !user._id) throw new Error("Usuario no existe")
        await executeTransactionalTask(req, async (session, log) => {
            const {
                destino,
                canastillas,
                remitente,
                destinatario,
                observaciones
            } = InventariosValidations.put_inventarios_devolverCanastillas_prestadas().parse(req.data.data)
            
            
            const inventarioPrestadas = await InventariosHistorialRepository.get_data(
                { ids: [config.INVENTARIO_CANASTILLAS], select: { canastillasPrestadas: 1 } },
                { session }
            )
            if (inventarioPrestadas.length === 0) throw new Error("No se encontró el inventario de canastillas")

            const mapPrestadas = inventarioPrestadas[0].canastillasPrestadas
            const actual = Number(mapPrestadas?.get?.(destino) ?? mapPrestadas?.[destino] ?? 0)
            const nuevoTotal = actual - canastillas

            if (nuevoTotal < 0) throw new Error(`No hay suficientes canastillas prestadas para devolver. Disponibles: ${actual}`)

            const updatePrestadas = nuevoTotal === 0
                ? { $unset: { [`canastillasPrestadas.${destino}`]: "" } }
                : { $inc: { [`canastillasPrestadas.${destino}`]: -canastillas } }

            const response = await InventariosHistorialRepository.actualizar_data(
                { _id: config.INVENTARIO_CANASTILLAS },
                updatePrestadas,
                { session, user: user._id }
            )
            await registrarPasoLog(log._id, "InventariosHistorialRepository.actualizar_data", "Completado")

            if (!response) throw new Error("No se pudo actualizar el inventario de canastillas prestadas")
            
            const dataRegistroCanastillas = InventariosService.crearRegistroInventarioCanastillas({
                origen: config.ID_CELIFRUT,
                destino: destino,
                accion: "traslado",
                canastillas: 0,
                canastillasPrestadas: canastillas,
                remitente,
                destinatario,
                observaciones,
                fecha: new Date(),
                user: user._id
            });
            await CanastillasRepository.post_data(dataRegistroCanastillas, { session, user: user._id });
            await registrarPasoLog(log._id, "CanastillasRepository.post_data", "Completado");

        })
    }
    static async post_inventarios_canastillas_agregar(req) {
        const { user } = req
        if (!user || !user._id) throw new Error("Usuario no existe")
        await executeTransactionalTask(req, async (session, log) => {
            const { canastillas, remitente, destinatario, observaciones } = InventariosValidations.post_inventarios_canastillas_agregar().parse(req.data.data)

            await InventariosHistorialRepository.actualizar_data(
                { _id: config.INVENTARIO_CANASTILLAS },
                { $inc: { canastillasTotal: canastillas } },
                { session, user: user._id }
            )
            await registrarPasoLog(log._id, "InventariosHistorialRepository.actualizar_data", "Completado")

            await InventariosService
                .ajustarCanastillasProveedorCliente(config.ID_CELIFRUT, canastillas, user, session);
            await registrarPasoLog(log._id, "InventariosService.ajustarCanastillasProveedorCliente", "Completado");

            const dataRegistroCanastillas = InventariosService.crearRegistroInventarioCanastillas({
                origen: config.ID_CELIFRUT,
                destino: config.ID_CELIFRUT,
                accion: "creacion",
                canastillas,
                canastillasPrestadas: 0,
                remitente,
                destinatario,
                observaciones,
                fecha: new Date(),
                user: user._id
            });
            await CanastillasRepository.post_data(dataRegistroCanastillas, { session, user: user._id });
            await registrarPasoLog(log._id, "CanastillasRepository.post_data", "Completado");
        })
    }
}
