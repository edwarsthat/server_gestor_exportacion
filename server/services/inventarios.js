import mongoose from "mongoose";
import { ConnectionDBError } from "../../Error/ConnectionErrors.js";
import { InventariosLogicError } from "../../Error/logicLayerError.js";
import { registrarPasoLog } from "../api/helper/logs.js";
import { obtenerEstadoDesdeAccionCanastillasInventario } from "../api/utils/diccionarios.js";
import { colombiaToUTC } from "../api/utils/fechas.js";
import { filtroFechaInicioFin } from "../api/utils/filtros.js";
import { RecordLotesRepository } from "../archive/ArchiveLotes.js";
import { CanastillasRepository } from "../Class/CanastillasRegistros.js";
import { ClientesRepository, ClientesNacionalesRepository } from "../Class/Clientes.js";
import { DespachoDescartesRepository } from "../Class/DespachoDescarte.js";
import { FrutaDescompuestaRepository } from "../Class/FrutaDescompuesta.js";
import { InventariosHistorialRepository } from "../Class/Inventarios.js";
import { LotesRepository } from "../Class/Lotes.js";
import { PreciosRepository } from "../Class/Precios.js";
import { ProveedoresRepository } from "../Class/Proveedores.js";
import { RedisRepository } from "../Class/RedisData.js";
import { UnionsRepository } from "../Class/Unions.js";
import { UsuariosRepository } from "../Class/Usuarios.js";
import { VariablesDelSistema } from "../Class/VariablesDelSistema.js";
import { CuartosDesverdizados } from "../store/CuartosDesverdizados.js";
import { parseMultTipoCaja } from "./helpers/contenedores.js";
import config from "../../src/config/index.js";
import { FrutaProcesada } from "../Class/frutaProcesada.js";
import { dataService } from "./data.js";
import { DescartesRepository } from "../Class/Descartes.js";
import { LotesHelper } from "../helper/lotes.js";

export class InventariosService {

    static async obtenerPrecioProveedor(predioId, tipoFruta, session = null) {
        if (!predioId || !tipoFruta) {
            throw new Error("PredioId y tipoFruta son requeridos en obtenerPrecioProveedor");
        }
        if (!mongoose.Types.ObjectId.isValid(predioId)) {
            throw new Error("PredioId es inválido en obtenerPrecioProveedor");
        }
        if (!mongoose.Types.ObjectId.isValid(tipoFruta)) {
            throw new Error("TipoFruta es inválido en obtenerPrecioProveedor");
        }
        const proveedorDocs = await ProveedoresRepository.get_data({
            ids: [predioId],
            select: { precio: 1, PREDIO: 1, GGN: 1 }
        }, session);

        if (!proveedorDocs || proveedorDocs.length === 0) {
            throw new Error("Proveedor no encontrado");
        }
        const proveedor = proveedorDocs[0];

        if (!proveedor.precio || !Reflect.has(proveedor.precio, tipoFruta)) {
            throw new Error(`No hay precio para la fruta ${tipoFruta}`);
        }
        const idPrecio = proveedor.precio[tipoFruta];
        if (!mongoose.Types.ObjectId.isValid(idPrecio)) {
            throw new Error("Precio inválido");
        }

        const precioDocs = await PreciosRepository.get_data({ ids: [idPrecio] }, session);
        if (!precioDocs || precioDocs.length === 0) {
            throw new Error("Precio inválido");
        }
        const precio = precioDocs[0];

        return { precioId: precio._id, proveedor: proveedor };

    }
    static construirQueryIngresoLote(datos, enf, precioId, user) {
        if (!datos || !enf || !precioId || !user) {
            throw new Error("Datos, enf, precioId y user son requeridos en construirQueryIngresoLote");
        }
        if (!datos.fecha_estimada_llegada) {
            throw new Error("Fecha de llegada es requerida en construirQueryIngresoLote");
        }
        if (!user._id) {
            throw new Error("user._id es requerido en construirQueryIngresoLote");
        }
        const fecha = new Date(datos.fecha_estimada_llegada);
        if (isNaN(fecha.getTime())) {
            throw new Error("Fecha de llegada inválida en construirQueryIngresoLote");
        }
        return {
            ...datos,
            tipoFruta: datos.tipoFruta,
            precio: precioId,
            enf,
            fecha_salida_patio: fecha,
            fecha_ingreso_patio: fecha,
            fecha_ingreso_inventario: fecha,
            user: user._id
        };
    }
    static async construirQueryIngresoLoteMaquila(datos, enf, precioId, tipoFruta, user) {
        const fecha = new Date(datos.fecha_estimada_llegada);

        return {
            ...datos,
            tipoFruta: tipoFruta._id,
            enf,
            fecha_salida_patio: fecha,
            fecha_ingreso_patio: fecha,
            fecha_ingreso_inventario: fecha,
            user: user._id,
            precio: precioId,
        };
    }
    static async incrementarEF() {
        VariablesDelSistema.incrementarEF1();
    }
    static crearRegistroInventarioCanastillas(
        {
            origen = '',
            destino = '',
            accion = '',
            canastillas = 0,
            canastillasPrestadas = 0,
            remitente = "",
            destinatario = "",
            user,
            fecha = '',
            observaciones = '',

        }
    ) {
        if (!user || !user._id) {
            throw new Error("user y user._id son requeridos");
        }
        if (!fecha) {
            throw new Error("fecha es requerida");
        }
        const fechaDate = new Date(fecha);
        if (isNaN(fechaDate.getTime())) {
            throw new Error("fecha inválida");
        }
        if (!accion) {
            throw new Error("accion es requerida");
        }

        const estado = obtenerEstadoDesdeAccionCanastillasInventario(accion)
        return {
            fecha: fechaDate,
            destino: destino,
            origen: origen,
            cantidad: {
                propias: canastillas,
                prestadas: canastillasPrestadas
            },
            observaciones: observaciones,
            referencia: "C1",
            tipoMovimiento: accion,
            estado: estado,
            usuario: {
                id: user._id,
                user: user.user
            },
            remitente: remitente,
            destinatario: destinatario
        }
    }
    static async ajustarCanastillasProveedorCliente(_id, cantidad, user, session = null) {
        if (!_id || !Number.isFinite(cantidad) || cantidad === 0) return;

        const prov = await ProveedoresRepository.actualizar_proveedores(
            { _id: _id },
            { $inc: { canastillas: cantidad } },
            { session, user: user._id },
        );

        if (prov) {
            return prov;
        }

        const cli = await ClientesRepository.actualizar_clienteNacional(
            { _id: _id },
            { $inc: { canastillas: cantidad } },
            { session, user: user._id },
        )

        if (cli) {
            return cli;
        }

        throw new ConnectionDBError(404, "No existe proveedor/cliente o el ajuste dejaría canastillas en negativo");
    }
    static async encontrarDestinoOrigenRegistroCanastillas(registros) {
        const destinosArr = registros.map(registro => registro.destino);
        const origenesArr = registros.map(registro => registro.origen);

        const ids = [...new Set([...destinosArr, ...origenesArr])];

        const proveedores = await ProveedoresRepository.get_proveedores({
            ids: ids
        })
        const clientes = await ClientesNacionalesRepository.get_data({
            ids: ids
        })

        const proveedorMap = new Map(proveedores.map(p => [p._id.toString(), p]));
        const clienteMap = new Map(clientes.map(c => [c._id.toString(), c]));

        const newRegistros = []

        for (let i = 0; i < registros.length; i++) {
            const registro = registros[i].toObject()

            const proveedorOrigen = proveedorMap.get(registro.origen);
            const clienteOrigen = clienteMap.get(registro.origen);

            const proveedorDestino = proveedorMap.get(registro.destino);
            const clienteDestino = clienteMap.get(registro.destino);

            const newOrigen = proveedorOrigen?.PREDIO || clienteOrigen?.cliente || registro.origen;
            const newDestino = proveedorDestino?.PREDIO || clienteDestino?.cliente || registro.destino;

            newRegistros.push({
                ...registro,
                origen: newOrigen,
                destino: newDestino
            })
        }
        return newRegistros
    }
    static async calcularDescartesReprocesoPredio(descarteLavado, descarteEncerado) {
        const kilosDescarteLavado =
            descarteLavado === undefined ? 0 :
                Object.values(descarteLavado).reduce((acu, item) => acu -= item, 0)
        const kilosDescarteEncerado =
            descarteEncerado === undefined ? 0 :
                Object.values(descarteEncerado).reduce((acu, item) => acu -= item, 0)

        return kilosDescarteLavado + kilosDescarteEncerado;
    }
    static async modificarInventariosDescarteReprocesoPredio(_id, descarteLavado, descarteEncerado) {
        if (descarteLavado)
            await VariablesDelSistema.modificar_inventario_descarte(_id, descarteLavado, 'descarteLavado');
        if (descarteEncerado)
            await VariablesDelSistema.modificar_inventario_descarte(_id, descarteEncerado, 'descarteEncerado');
    }
    static validarGGN(proveedores, tipoFruta, user) {
        if (!proveedores || !Array.isArray(proveedores)) throw new Error("No se proporcionaron proveedores");
        if (proveedores.length === 0) throw new Error("No se proporcionaron proveedores");
        if (proveedores.length > 1) throw new Error("Se proporcionaron más de un proveedor");
        const proveedor = proveedores[0]
        if (!(proveedor && proveedor.GGN && proveedor.GGN.fechaVencimiento)) {
            throw new Error("El predio no tiene GGN")
        }

        const fechaVencimiento = new Date(proveedor.GGN.fechaVencimiento);
        const hoy = new Date();

        if (!(fechaVencimiento instanceof Date) || isNaN(fechaVencimiento)) {
            throw new Error("El predio no tiene una fecha de vencimiento válida");
        }

        // Calcular la fecha de un mes después de hoy (ojo, JS hace la magia con los días)
        const unMesDespues = new Date(hoy);
        unMesDespues.setMonth(unMesDespues.getMonth() + 1);

        // Si la fecha está entre hoy y dentro de un mes, es "cercana"
        if (fechaVencimiento > hoy && fechaVencimiento <= unMesDespues) {
            if (!user || typeof user.Rol !== 'number') {
                throw new Error("No se proporcionó el rol del usuario");
            }
            if (user.Rol > 2) {
                throw new Error("La fecha de vencimiento está cercana.");
            }
        } else if (fechaVencimiento < hoy) {
            throw new Error("El GGN del proveedor ya expiró.");
        }

        if (!proveedor.GGN || !proveedor.GGN.code) {
            throw new Error("El predio no tiene GGN");
        }
        if (!Array.isArray(proveedor.GGN.tipo_fruta)) throw new Error("El predio no tiene GGN");


        if (
            proveedor.GGN.code &&
            proveedor.GGN.tipo_fruta.includes(tipoFruta)
        ) return true

        throw new Error("El proveedor no tiene GGN para ese tipo de fruta")
    }
    static async modificarRecordLote_regresoHistorialFrutaIngreso(_id, __v, data) {
        const query = {}
        Object.keys(data).forEach(item => {
            query[`documento.${item}`] = data[item]
        })
        query[`documento.fecha_ingreso_patio`] = data.fecha_ingreso_inventario
        query[`documento.fecha_salida_patio`] = data.fecha_ingreso_inventario
        query[`documento.fecha_estimada_llegada`] = data.fecha_ingreso_inventario

        await RecordLotesRepository.modificarRecord(
            _id,
            query,
            __v
        )
    }
    static async procesar_formulario_inventario_descarte(data, tipoFruta, session, user) {
        let totalKilos = 0;

        for (const [key, value] of Object.entries(data)) {
            totalKilos += value === '' ? 0 : parseInt(value);
            const [area, descarteId] = key.split(':');
            let kilos = value === '' ? 0 : parseInt(value);

            const registros = await InventariosHistorialRepository.get_inventario_descarteMaquila_generico({
                query: {
                    tipoFruta: tipoFruta,
                    area: area,
                    tipoDescarte: descarteId,
                    estado: "ACTIVO",
                    loteType: { $in: ["Lote", "Loteef8"] }
                },
                sort: { fechaIngreso: 1 },
            })

            if (registros.length === 0) {
                throw new InventariosLogicError(`No hay inventario suficiente para el tipo de fruta ${tipoFruta} en el área ${area} y tipo de descarte ${descarteId}`);
            }

            for (const registro of registros) {
                if (kilos <= 0) break; // Ya se descontaron todos los kilos necesarios

                // Calcular cuántos kilos se van a descontar de ESTE registro específico
                const kilosADescontar = Math.min(kilos, registro.kilosActuales);
                const kilosRestantes = registro.kilosActuales - kilosADescontar;

                // Actualizar el registro
                if (kilosRestantes > 0) {
                    await InventariosHistorialRepository.actualizar_registro_inventario_descarte(
                        { _id: registro._id },
                        { $set: { kilosActuales: kilosRestantes } },
                        { user: user._id, action: 'Actualizar inventario descarte reproceso predio', session }
                    )
                } else {
                    await InventariosHistorialRepository.actualizar_registro_inventario_descarte(
                        { _id: registro._id },
                        { $set: { kilosActuales: 0, estado: "AGOTADO" } },
                        { user: user._id, action: 'Actualizar inventario descarte reproceso predio', session }
                    )
                }

                // Registrar la SALIDA en el cardex (los kilos que realmente se descontaron)
                await InventariosHistorialRepository.put_cardex_invetariosdescartes(
                    {},
                    { $inc: { [`kilos_salida.${tipoFruta}.${area}.${descarteId}`]: kilosADescontar } },
                    { sort: { fecha: -1 }, new: true, session }
                );

                // Reducir los kilos pendientes por descontar
                kilos -= kilosADescontar;
            }

            // Verificar que se pudieron descontar todos los kilos
            if (kilos > 0) {
                throw new InventariosLogicError(`No hay inventario suficiente. Faltan ${kilos} kilos para el tipo de fruta ${tipoFruta} en el área ${area} y tipo de descarte ${descarteId}`);
            }
        }

        return totalKilos;
    }
    static async crear_lote_celifrut(tipoFruta, kilos, user, session) {
        try {
            const codigo = await dataService.get_Celifrut_serial()
            const lote = {
                enf: codigo,
                predio: config.ID_CELIFRUT,
                canastillas: '0',
                kilos: kilos,
                placa: 'AAA000',
                tipoFruta: tipoFruta,
                observaciones: 'Reproceso',
                promedio: Number(kilos) / (tipoFruta === 'Naranja' ? 19 : 20),
                "fecha_estimada_llegada": new Date(),
                "fecha_ingreso_patio": new Date(),
                "fecha_salida_patio": new Date(),
                "fecha_ingreso_inventario": new Date(),
            }

            const newLote = await LotesRepository.addLote(lote, user, { session });
            const update = {
                $inc: {
                    kilosVaciados: newLote.kilos,
                },
                fechaProceso: new Date()
            }
            await LotesRepository.actualizar_lote(
                { _id: newLote._id },
                update,
                { calculateFields: true, vaciar: true, session })
            await dataService.modificar_Celifrut_serial(session);
            return newLote
        } catch (error) {
            console.error("Error creando lote Celifrut:", error);
            throw new Error(`Error creando lote Celifrut: ${error.message}`);
        }
    }
    static async revisar_cambio_registro_despachodescarte(_id, newData) {
        let cambioFruta = false
        let cambioIventario = false
        const registro = await DespachoDescartesRepository.get_historial_descarte({
            ids: [_id]
        })

        if (registro.length < 0) throw new Error("El id del registro no existe")

        if (newData.tipoFruta !== registro[0].tipoFruta) cambioFruta = true

        if (newData.kilos !== registro[0].kilos) cambioIventario = true

        return { cambioFruta, cambioIventario, registro: registro[0] }

    }
    static async revisar_cambio_registro_frutaDescompuestae(_id, newData) {
        let cambioFruta = false
        let cambioIventario = false
        const registro = await FrutaDescompuestaRepository.get_fruta_descompuesta({
            ids: [_id]
        })

        if (registro.length < 0) throw new Error("El id del registro no existe")

        if (newData.tipoFruta !== registro[0].tipoFruta) cambioFruta = true

        if (newData.kilos !== registro[0].kilos) cambioIventario = true

        return { cambioFruta, cambioIventario, registro: registro[0] }

    }
    static async modificar_inventario_registro_cambioFruta(registro, newRegistro, descarteLavado, descarteEncerado) {

        const startTime = Date.now();
        console.info(`[INVENTARIO] Inicio modificación - Fruta: ${newRegistro.tipoFruta}, Lavado: ${JSON.stringify(descarteLavado)}, Encerado: ${JSON.stringify(descarteEncerado)}`);

        //se modifica el inventario
        const clientRedis = await RedisRepository.getClient()

        await Promise.all([
            RedisRepository.put_reprocesoDescarte_sumar(registro.descarteLavado._doc, 'descarteLavado:', registro.tipoFruta),
            RedisRepository.put_reprocesoDescarte_sumar(registro.descarteEncerado._doc, 'descarteEncerado:', registro.tipoFruta),
        ])

        // 2️⃣ Claves a vigilar
        const keyLavado = `inventarioDescarte:${newRegistro.tipoFruta}:descarteLavado:`;
        const keyEncerado = `inventarioDescarte:${newRegistro.tipoFruta}:descarteEncerado:`;


        try {
            // 3️⃣ WATCH antes de leer
            await clientRedis.watch(keyLavado, keyEncerado);

            const inventario = await RedisRepository.get_inventarioDescarte_porTipoFruta(newRegistro.tipoFruta)
            for (const tipoInv of Object.keys(inventario)) {
                for (const itemKey of Object.keys(inventario[tipoInv])) {
                    if (tipoInv === 'descarteLavado') {
                        if (Number(descarteLavado[itemKey] || 0) > Number(inventario[tipoInv][itemKey] || 0)) {
                            console.warn(`Modificacion mayor al inventario descarteLavado ${descarteLavado[itemKey]} > ${inventario[tipoInv][itemKey]}`);
                            throw new Error(`Los kilos a modificar son mayores que el inventario ${tipoInv}: ${itemKey}`)
                        }
                    } else if (tipoInv === 'descarteEncerado') {
                        if (Number(descarteEncerado[itemKey] || 0) > Number(inventario[tipoInv][itemKey] || 0)) {
                            console.warn(`Modificacion mayor al inventario descarteEncerado ${descarteEncerado[itemKey]} > ${inventario[tipoInv][itemKey]}`);

                            throw new Error(`Los kilos a modificar son mayores que el inventario ${tipoInv}: ${itemKey}`)
                        }
                    }
                }
            }

            const multi = clientRedis.multi();
            await RedisRepository.put_reprocesoDescarte(descarteLavado, 'descarteLavado:', newRegistro.tipoFruta, multi);
            await RedisRepository.put_reprocesoDescarte(descarteEncerado, 'descarteEncerado:', newRegistro.tipoFruta, multi);
            const resultado = await multi.exec();
            if (resultado === null) {
                console.warn(`[INVENTARIO] Transacción fallida por concurrencia. Intentando rollback...`);
                throw new Error('Transacción fallida: otro proceso modificó el inventario, reintente.');
            }

            console.info(`[INVENTARIO] Transacción exitosa. Resultado: ${JSON.stringify(resultado)}. Tiempo: ${Date.now() - startTime} ms`);


        } catch (err) {
            try {
                const multi = clientRedis.multi();
                await RedisRepository.put_reprocesoDescarte(registro.descarteLavado._doc, 'descarteLavado:', registro.tipoFruta, multi);
                await RedisRepository.put_reprocesoDescarte(registro.descarteEncerado._doc, 'descarteEncerado:', registro.tipoFruta, multi);
                const resultado = await multi.exec();
                if (resultado === null) {
                    throw new Error('Transacción fallida: otro proceso modificó el inventario, reintente.');
                }
            } catch (rollbackErr) {
                console.error("Error durante el rollback del inventario:", rollbackErr);
            }
            throw new Error(err.message);
        } finally {
            await clientRedis.unwatch();
            console.info(`[INVENTARIO] Fin de operación - Tiempo total: ${Date.now() - startTime} ms`);
        }

    }
    //! borrar dado el caso
    static async frutaDescarte_despachoDescarte_redis_store(descarteLavado, descarteEncerado, tipoFruta) {
        const startTime = Date.now();
        console.info(`[INVENTARIO DESCARTES] Inicio modificación - Fruta: ${tipoFruta}, Lavado: ${JSON.stringify(descarteLavado)}, Encerado ${JSON.stringify(descarteEncerado)}`);

        const keyLavado = `inventarioDescarte:${tipoFruta}:descarteLavado:`;
        const keyEncerado = `inventarioDescarte:${tipoFruta}:descarteEncerado:`;

        const clientRedis = await RedisRepository.getClient()

        try {
            await clientRedis.watch(keyLavado, keyEncerado);

            const inventario = await RedisRepository.get_inventarioDescarte_porTipoFruta(tipoFruta)
            for (const tipoInv of Object.keys(inventario)) {
                for (const itemKey of Object.keys(inventario[tipoInv])) {
                    if (tipoInv === 'descarteLavado') {
                        if (Number(descarteLavado[itemKey] || 0) > Number(inventario[tipoInv][itemKey] || 0)) {
                            throw new Error(`Los kilos a modificar son mayores que el inventario ${tipoInv}: ${itemKey}`)
                        }
                    } else if (tipoInv === 'descarteEncerado') {
                        if (Number(descarteEncerado[itemKey] || 0) > Number(inventario[tipoInv][itemKey] || 0)) {
                            throw new Error(`Los kilos a modificar son mayores que el inventario ${tipoInv}: ${itemKey}`)
                        }
                    }
                }
            }

            const multi = clientRedis.multi();
            await RedisRepository.put_reprocesoDescarte(descarteLavado, 'descarteLavado:', tipoFruta, multi);
            await RedisRepository.put_reprocesoDescarte(descarteEncerado, 'descarteEncerado:', tipoFruta, multi);
            const resultado = await multi.exec();

            if (resultado === null) {
                console.warn(`[INVENTARIO DESCARTES] Transacción fallida por concurrencia. Intentando rollback...`);
                throw new Error('Transacción fallida: otro proceso modificó el inventario, reintente.');
            }

            console.info(`[INVENTARIO DESCARTES] Transacción exitosa. Resultado: ${JSON.stringify(resultado)}. Tiempo: ${Date.now() - startTime} ms`);
        } catch (err) {
            console.error(`[INVENTARIO] Error en redis_store: ${err.message}`);
            throw err;

        } finally {
            await clientRedis.unwatch();
            console.info(`[INVENTARIO DESCARTES] Fin de operación - Tiempo total: ${Date.now() - startTime} ms`);
        }
    }
    static async frutaDescarte_despachoDescarte_redis_restore(descarteLavado, descarteEncerado, tipoFruta) {
        const startTime = Date.now();
        console.info(`[INVENTARIO DESCARTES][RESTORE] Inicio restauración - Fruta: ${tipoFruta}, Lavado: ${JSON.stringify(descarteLavado)}, Encerado: ${JSON.stringify(descarteEncerado)}`);

        const keyLavado = `inventarioDescarte:${tipoFruta}:descarteLavado:`;
        const keyEncerado = `inventarioDescarte:${tipoFruta}:descarteEncerado:`;

        const clientRedis = await RedisRepository.getClient();

        try {
            await clientRedis.watch(keyLavado, keyEncerado);

            const multi = clientRedis.multi();
            // Aquí sumas, no restas:
            await RedisRepository.put_reprocesoDescarte_sumar(descarteLavado, 'descarteLavado:', tipoFruta, multi);
            await RedisRepository.put_reprocesoDescarte_sumar(descarteEncerado, 'descarteEncerado:', tipoFruta, multi);

            const resultado = await multi.exec();

            if (resultado === null) {
                console.warn(`[INVENTARIO DESCARTES][RESTORE] Transacción fallida por concurrencia. Reintente si es necesario.`);
                throw new Error('Transacción fallida: otro proceso modificó el inventario, reintente.');
            }

            console.info(`[INVENTARIO DESCARTES][RESTORE] Restauración exitosa. Resultado: ${JSON.stringify(resultado)}. Tiempo: ${Date.now() - startTime} ms`);
        } catch (err) {
            console.error(`[INVENTARIO DESCARTES][RESTORE] Error en redis_restore: ${err.message}`);
            throw err;
        } finally {
            await clientRedis.unwatch();
            console.info(`[INVENTARIO DESCARTES][RESTORE] Fin de restauración - Tiempo total: ${Date.now() - startTime} ms`);
        }
    }
    static async modificarInventarioIngresoDesverdizado(canastillas, cuartoId, loteId) {

        console.info(`[INVENTARIO DESCARTES] Inicio modificación ingreso desverdizado ${canastillas}, en el cuarto ${cuartoId}, lote: ${loteId}`);

        await Promise.all([
            VariablesDelSistema.modificarInventario(loteId, canastillas),
            RedisRepository.update_inventarioDesverdizado(cuartoId, loteId, (canastillas),)
        ])
    }
    static async procesarInventarioDesverdizado(inventario) {
        const lotesIds = new Set()
        const cuartosIds = new Set();
        const result = []

        const inventarioData = inventario?.inventarioDesverdizado ?? {};
        for (const key of Object.keys(inventarioData)) {
            for (const loteId of Object.keys(inventarioData[key])) {
                lotesIds.add(loteId);
                result.push({
                    loteId,
                    cuartoId: key,
                    canastillas: inventarioData[key][loteId],
                })
            }
        }

        const [lotes, cuartosDesverdizado] = await Promise.all([
            LotesRepository.getLotes({
                ids: [...lotesIds],
            }),
            CuartosDesverdizados.get_cuartosDesverdizados({
                ids: [...cuartosIds]
            })
        ])

        for (let i = 0; i < result.length; i++) {
            let item = result[i];
            const lote = lotes.find(id => id._id.toString() === item.loteId);
            const cuarto = cuartosDesverdizado.find(id => id._id.toString() === item.cuartoId);
            if (lote && cuarto) {
                result[i] = {
                    ...item,
                    lote: lote?.predio?.PREDIO || "",
                    enf: lote?.enf || "",
                    promedio: lote?.promedio || 0,
                    cuarto: cuarto?.nombre || "",
                    fechaIngreso: lote?.desverdizado?.fechaIngreso || "",
                    GGN: lote?.GGN ? (lote?.predio?.GGN?.code || "") : ""
                }
            } else {
                console.warn(`Lote o cuarto no encontrado para item: ${JSON.stringify(item)}`);
            }
        }

        return result;
    }
    static async devolverDesverdizadoInventarioFrutaSinprocesar(cuarto, _id) {
        console.info(`[INVENTARIO DESCARTES] Inicio devolución desverdizado fruta sin procesar: ${_id}, en el cuarto ${cuarto}`);

        const datosCrudos = await RedisRepository.get_inventario_desverdizado(cuarto, _id);
        const canastillas = datosCrudos?.inventarioDesverdizado?.[cuarto]?.[_id];

        await Promise.all([
            VariablesDelSistema.modificarInventario(_id, -canastillas),
            RedisRepository.delete_inventarioDesverdizado_registro(cuarto, _id)
        ])

    }
    static async move_desverdizado_inventario_to_frutaSinProcesar(cuarto, _id, cantidad) {
        console.info(`[INVENTARIO DESCARTES] Inicio mover desverdizado a fruta sin procesar: ${_id}, en el cuarto ${cuarto}`);

        const datosCrudos = await RedisRepository.get_inventario_desverdizado(cuarto, _id);
        const canastillas = datosCrudos?.inventarioDesverdizado?.[cuarto]?.[_id];

        if (canastillas < cantidad) {
            throw new Error(`No hay suficientes canastillas para mover: ${canastillas} < ${cantidad}`);
        }


        await Promise.all([
            canastillas === cantidad ?
                RedisRepository.delete_inventarioDesverdizado_registro(cuarto, _id) :
                RedisRepository.update_inventarioDesverdizado(cuarto, _id, -cantidad),
            VariablesDelSistema.modificarInventario(_id, -cantidad),
        ])
    }
    static async move_entre_cuartos_desverdizados(cuartoOrigen, cuartoDestino, _id, cantidad) {
        console.info(`[INVENTARIO DESCARTES] Inicio mover entre cuartos desverdizados: ${_id}, de ${cuartoOrigen} a ${cuartoDestino}`);

        const datosCrudosOrigen = await RedisRepository.get_inventario_desverdizado(cuartoOrigen, _id);
        const canastillasOrigen = datosCrudosOrigen?.inventarioDesverdizado?.[cuartoOrigen]?.[_id];

        if (canastillasOrigen < cantidad) {
            throw new Error(`No hay suficientes canastillas en el cuarto origen: ${canastillasOrigen} < ${cantidad}`);
        }

        await Promise.all([
            canastillasOrigen === cantidad ?
                RedisRepository.delete_inventarioDesverdizado_registro(cuartoOrigen, _id) :
                RedisRepository.update_inventarioDesverdizado(cuartoOrigen, _id, -cantidad),
            RedisRepository.update_inventarioDesverdizado(cuartoDestino, _id, cantidad)
        ])
    }
    static async ingresar_salida_inventario_descartes() {
    }
    static async probar_deshidratacion_loteProcesando(user) {
        const predioVaciando = await FrutaProcesada.obtener_ultimaEntrada();

        if (!predioVaciando || !predioVaciando.loteId) {
            return null;
        }

        const loteIdBusqueda = predioVaciando.loteId._id ?? predioVaciando.loteId;

        const lotes = await LotesHelper.obtener_lote_helper({ ids: [loteIdBusqueda] });
        const lote = lotes[0] ?? null;

        if (!lote) {
            throw new InventariosLogicError(404, "El lote asociado al proceso no fue encontrado.");
        }

        const ROL_ADMIN = 0;
        const PERM_1 = config.COORDINADOR_PRODUCCION;
        const PERM_2 = config.DIR_OPERACIONES;

        if (!PERM_1 || !PERM_2) {
            throw new InventariosLogicError(500, "Configuración de permisos incompleta para validación de deshidratación.");
        }

        const CARGOS_AUTORIZADOS = [PERM_1, PERM_2];
        const puedeOmitirValidacion = Number(user?.Rol) === ROL_ADMIN || (user?.cargo && CARGOS_AUTORIZADOS.includes(user.cargo));

        if (!puedeOmitirValidacion) {
            const d = lote.deshidratacion;

            // Corregido: Validamos si el dato NO existe o si está fuera de rango
            const esDatoInvalido = typeof d !== "number" || !Number.isFinite(d);
            const estaFueraDeRango = d > 3 || d < -1;

            if (esDatoInvalido || estaFueraDeRango) {
                throw new InventariosLogicError(
                    470,
                    `El lote no se puede vaciar. La deshidratación de ${predioVaciando.enf} - ${predioVaciando.nombrePredio} (${d ?? 'N/A'}%) no es válida o está fuera del rango permitido (-1% a 3%).`
                );
            }
        }

        return lote;
    }
    static async construir_ef8_lote(data, enf, precio, user) {
        const totalCanastillas = Number(data.canastillasPropias || 0) + Number(data.canastillasVaciasPropias || 0);
        const totalCanastillasPrestadas = Number(data.canastillasVaciasPrestadas || 0) + Number(data.canastillasPrestadas || 0);
        const total = Number(data.descarteGeneral || 0) + Number(data.balin || 0) + Number(data.pareja || 0);
        const promedio = totalCanastillas > 0 ? total / totalCanastillas : 0;

        const loteEF8 = {
            balin: data.balin || 0,
            canastillas: totalCanastillas || 0,
            canastillasPrestadas: totalCanastillasPrestadas || 0,
            descarteGeneral: Number(data.descarteGeneral || 0),
            enf: enf,
            fecha_ingreso_inventario: colombiaToUTC(data.fecha_ingreso_inventario || Date.now()),
            numeroPrecintos: Number(data.numeroPrecintos || 0),
            numeroRemision: data.numeroRemision,
            observaciones: data.observaciones || '',
            pareja: Number(data.pareja || 0),
            placa: data.placa || '',
            predio: data.predio || '',
            precio: precio,
            promedio: promedio,
            tipoFruta: data.tipoFruta,
            user: user._id
        }

        return { loteEF8, total }
    }
    static async ingresarDescarteEf8(data, tipoFruta, logId, session) {
        const descarteObj = {
            descarteGeneral: data.descarteGeneral || 0,
            pareja: data.pareja || 0,
            balin: data.balin || 0,
        }
        const descartesArr = ["descarteGeneral", "pareja", "balin"];
        const descartesIds = await DescartesRepository.getDescartes({ ids: tipoFruta.descartes });
        console.log(descartesIds)
        for (const descarte of descartesArr) {
            console.log(descarte)
            if (descarteObj[descarte] === 0) continue;
            const descarteId = descartesIds.find(d => d.nombre === descarte);
            console.log(descarteId)
            const newRegistro = {
                lote: data._id,
                tipoFruta: tipoFruta._id,
                area: "LAVADO",
                tipoDescarte: descarteId._id,
                kilos: descarteObj[descarte],
                kilosActuales: descarteObj[descarte],
                loteType: "Loteef8"
            }
            await InventariosHistorialRepository.add_elemento_inventarioDescartes(newRegistro, logId, session);

            await InventariosHistorialRepository.put_cardex_invetariosdescartes(
                {},
                {
                    $inc: {
                        [`kilos_ingreso.${tipoFruta._id.toString()}.LAVADO.${descarteId._id.toString()}`]: descarteObj[descarte],
                    },
                },
                {
                    sort: { fecha: -1 },
                    new: true,
                    session,
                }
            );
            await registrarPasoLog(
                logId,
                "Modificar inventario descartes",
                "Completado",
                `Se modificó el inventario de descarte con ${descarteObj[descarte]} kilos del tipo de fruta ${tipoFruta._id.toString()}`);

        }


    }
    static async obtenerRecordLotesIngresoLote(filtro) {
        const { fechaInicio, fechaFin, tipoFruta = "" } = filtro;
        if (fechaInicio === "") return []
        let query = {}
        query = filtroFechaInicioFin(fechaInicio, fechaFin, query, 'fecha_estimada_llegada')

        if (tipoFruta) {
            query.tipoFruta = tipoFruta;
        }

        const lotes = await LotesRepository.getLotes({
            query: query,
            sort: { fecha_estimada_llegada: -1 }
        });

        return lotes;
    }
    static async obtenerRecordLotesIngresoLoteEF8(filtro) {
        const { fechaInicio, fechaFin, tipoFruta = "" } = filtro;
        if (fechaInicio === "") return []

        let query = {}
        query = filtroFechaInicioFin(fechaInicio, fechaFin, query, 'fecha_ingreso_inventario')

        if (tipoFruta) {
            query.tipoFruta = tipoFruta;
        }

        const lotes = await LotesRepository.getLotesEF8({
            query: query,
            limit: 'all',
            sort: { fecha_ingreso_inventario: -1 }
        });

        return lotes;
    }
    static async obtenerRecordLotesIngresoLoteMaquila(filtro) {
        const { fechaInicio, fechaFin, tipoFruta = "" } = filtro;
        if (fechaInicio === "") return []

        let query = {}
        query = filtroFechaInicioFin(fechaInicio, fechaFin, query, 'fecha_ingreso_inventario')

        if (tipoFruta) {
            query.tipoFruta = tipoFruta;
        }

        const lotes = await LotesRepository.getLotesMaquila({
            query: query,
            sort: { fecha_ingreso_inventario: -1 }
        });

        return lotes;
    }
    static async obtenerRecordLotesIngresolote_EF1_EF8(filtro) {
        const { fechaInicio, fechaFin, tipoFruta = "" } = filtro;
        let query1 = {}
        let query2 = {}

        query1 = filtroFechaInicioFin(fechaInicio, fechaFin, query1, 'fecha_ingreso_inventario')
        query2 = filtroFechaInicioFin(fechaInicio, fechaFin, query2, 'fecha_ingreso_inventario')

        if (tipoFruta) {
            query1.tipoFruta = new mongoose.Types.ObjectId(tipoFruta);
            query2.tipoFruta = new mongoose.Types.ObjectId(tipoFruta);
        }

        const data = await UnionsRepository.obtenerUnionRecordLotesIngresoLoteEF8(query1, query2);

        const usersId = [];

        for (const lote of data) {
            if (lote?.user) {
                usersId.push(lote.user.toString());
            }
        }

        const usersIdSet = new Set(usersId)
        const usersIdArr = [...usersIdSet]

        const user = await UsuariosRepository.get_users({
            ids: usersIdArr,
            getAll: true
        })

        const result = [];

        for (const lote of data) {

            const usuario = user.find(u => u._id.toString() === lote?.user);
            if (usuario) {
                lote.user = usuario.nombre + " " + usuario.apellido;
            }

            lote.predio = lote.predioInfo[0] || {};
            delete lote.predioInfo;
            result.push(lote);
        }

        return result;
    }
    static async ingresarCanasillas(datos, user, session = null) {
        const canastillasPropias = Number(datos.canastillasPropias || 0) + Number(datos.canastillasVaciasPropias || 0)
        const canastillasPrestadas = Number(datos.canastillasPrestadas || 0) + Number(datos.canastillasVaciasPrestadas || 0)

        const dataRegistro = await this.crearRegistroInventarioCanastillas({
            destino: "65c27f3870dd4b7f03ed9857",
            origen: datos.predio,
            observaciones: "ingreso lote",
            fecha: datos.fecha_ingreso_inventario,
            canastillas: canastillasPropias,
            canastillasPrestadas: canastillasPrestadas,
            accion: "ingreso",
            user
        })

        await this.ajustarCanastillasProveedorCliente(datos.predio, -canastillasPropias, user, session)
        await this.ajustarCanastillasProveedorCliente("65c27f3870dd4b7f03ed9857", canastillasPropias, user, session)
        const registroCanastillas = await CanastillasRepository.post_registro(dataRegistro)



        await VariablesDelSistema.modificar_canastillas_inventario(canastillasPrestadas, "canastillasPrestadas")


        return registroCanastillas;

    }
    static async itemsCuartosFrios(items, contenedores) {
        const out = [];
        for (const contenedor of contenedores) {
            if (!contenedor.pallets) continue;
            for (const [index, pallet] of contenedor.pallets.entries()) {
                if (!pallet.EF1) continue;
                for (const item of pallet.EF1) {
                    if (!item) continue;

                    if (items.includes(item._id.toString())) {
                        out.push({
                            ...item,
                            contenedor: contenedor.numeroContenedor,
                            pallet: index,
                        });
                    }
                }

            }
        }
        return out;
    }
    static async sumatorias_items_cuartosFrios(items) {
        const out = {}
        let operation = "";

        for (const item of items) {
            const { tipoCaja, cajas, tipoFruta } = item;
            if (!out[`totalFruta.${tipoFruta}.cajas`]) out[`totalFruta.${tipoFruta}.cajas`] = 0;
            if (!out[`totalFruta.${tipoFruta}.kilos`]) out[`totalFruta.${tipoFruta}.kilos`] = 0;
            const mult = parseMultTipoCaja(tipoCaja);
            out[`totalFruta.${tipoFruta}.kilos`] -= (cajas * mult);
            out[`totalFruta.${tipoFruta}.cajas`] -= cajas;
            operation += `${cajas} cajas de ${tipoCaja}, `

        }
        return { operation, out };
    }
    static async modificarRestarInventarioFrutaSinProocesar(canastillas, user, action, lote, session, descripcion) {
        const inventarioFrutaSinProcesar = config.INVENTARIO_FRUTA_SIN_PROCESAR;

        // Validaciones de entrada
        if (!canastillas || canastillas <= 0) throw new Error('Las canastillas deben ser un número positivo');
        if (!lote?._id || !lote?.enf) throw new Error('Datos del lote incompletos (_id, enf)');
        if (!user?._id) throw new Error('ID de usuario requerido');

        // Determinar campo de inventario
        const enfUpper = lote.enf.trim().toUpperCase();
        const tipoInventario = enfUpper.startsWith("EF1-") ? "inventario" :
            enfUpper.startsWith("EF10-") ? "inventarioMaquila" : null;

        if (!tipoInventario) {
            throw new Error(`ENF inválido: ${lote.enf}. No se reconoce el prefijo.`);
        }

        await InventariosHistorialRepository.put_inventarioSimple_updateOne(
            {
                _id: inventarioFrutaSinProcesar,
                [`${tipoInventario}.lote`]: lote._id
            },
            { $inc: { [tipoInventario + ".$[it].canastillas"]: -canastillas, __v: 1 } },
            {
                session,
                action: action,
                description: descripcion,
                user: user._id,
                arrayFilters: [{ 'it.lote': new mongoose.Types.ObjectId(lote._id) }],
            }
        );

        const pullResult = await InventariosHistorialRepository.put_inventarioSimple_updateOne(
            { _id: inventarioFrutaSinProcesar },
            { $pull: { [tipoInventario]: { lote: new mongoose.Types.ObjectId(lote._id), canastillas: { $lte: 0 } } } },
            { session, skipAudit: true, runValidators: false }
        );

        if (pullResult.matchedCount === 0) {
            throw new Error(`El lote ${lote.enf} ya no se encuentra en el inventario (posiblemente ya fue procesado)`);
        }

        return pullResult;
    }
    static async modificarSumarInventarioFrutaSinProocesar(
        canastillas, user, action, loteId, tipo, log, session, descripcion
    ) {
        const loteObjectId = new mongoose.Types.ObjectId(loteId);
        const campoInventario = tipo === 'loteMaquila' ? 'inventarioMaquila' : 'inventario';
        const inventarioId = config.INVENTARIO_FRUTA_SIN_PROCESAR;
        const pipelineUpdate = [
            {
                $set: {
                    [campoInventario]: {
                        $let: {
                            vars: { existe: { $in: [loteObjectId, `$${campoInventario}.lote`] } },
                            in: {
                                $cond: [
                                    "$$existe",
                                    {
                                        $map: {
                                            input: `$${campoInventario}`,
                                            as: "it",
                                            in: {
                                                $cond: [
                                                    { $eq: ["$$it.lote", loteObjectId] },
                                                    {
                                                        $mergeObjects: [
                                                            "$$it",
                                                            {
                                                                canastillas: {
                                                                    $add: ["$$it.canastillas", canastillas]
                                                                }
                                                            }
                                                        ]
                                                    },
                                                    "$$it"
                                                ]
                                            }
                                        }
                                    },
                                    {
                                        $concatArrays: [
                                            `$${campoInventario}`,
                                            [
                                                {
                                                    lote: loteObjectId,
                                                    canastillas: canastillas
                                                }
                                            ]
                                        ]
                                    }
                                ]
                            }
                        }
                    },
                    __v: { $add: ["$__v", 1] }
                }
            }
        ];

        const result = await InventariosHistorialRepository.put_inventarioSimple_updateOne(
            { _id: inventarioId },
            pipelineUpdate,
            {
                session,
                action,
                description: descripcion ?? `Sumar ${canastillas} canastillas al lote ${loteId} en ${campoInventario}`,
                user: user._id,
                runValidators: true
            }
        );

        await registrarPasoLog(
            log._id,
            "InventariosHistorialRepository.put_inventarioSimple_updateOne (sumar/crear)",
            "Completado",
            `Suma/Alta de canastillas: ${canastillas} en ${campoInventario}, matchedCount: ${result?.matchedCount}, modifiedCount: ${result?.modifiedCount}, versión incrementada`
        );

        return result;
    }
    static async item_in_ordenVaceo(itemId) {
        if (!itemId || typeof itemId !== 'string' || !itemId.trim()) {
            throw new Error(`No se proporcionó un item id válido`);
        }
        const ordenVaceo = await InventariosHistorialRepository.get_ordenVaceo();
        if (!ordenVaceo || !ordenVaceo.data || !Array.isArray(ordenVaceo.data)) {
            throw new Error(`Error al obtener la orden de vaceo`);
        }
        if (ordenVaceo.data.length === 0) {
            return true;
        }

        const ids = ordenVaceo.data
            .filter(id => id !== null && id !== undefined)
            .map(id => id?.toString() ?? "");

        if (ids.includes(itemId.toString())) {
            throw new Error(`EL lote ya está en la orden de vaceo, no se puede procesar como directo nacional.`);
        }
        return true
    }
    static async check_inventarioVersion(idInventario, versionrequest) {
        if (!idInventario || typeof idInventario !== 'string' || !idInventario.trim()) {
            throw new Error(`No se proporcionó un inventario id válido`);
        }
        if (versionrequest === null || versionrequest === undefined) {
            throw new Error(`No se proporcionó una versión válida`);
        }

        const inventario = await InventariosHistorialRepository.get_inventario_simple(idInventario);
        if (inventario.__v !== versionrequest) {
            throw new Error(`La versión del inventario ha cambiado. Por favor, recargue la página e intente de nuevo.`);
        }
        return true
    }
    static async respuesta_invetario_descartes_maquila(registros) {
        const out = []
        for (const registro of registros) {
            if (!registro.tipoDescarte.inventario) continue;
            const index = out.findIndex(item => item.lote._id.toString() === registro.lote._id.toString());
            if (index === -1) {
                out.push({
                    lote: registro.lote,
                    tipoFruta: registro.tipoFruta,
                    [`${registro.area}//${registro.tipoDescarte._id}`]: registro.kilosActuales,
                });
            } else {
                if (!out[index][`${registro.area}//${registro.tipoDescarte._id}`]) {
                    out[index][`${registro.area}//${registro.tipoDescarte._id}`] = 0;
                }
                out[index][`${registro.area}//${registro.tipoDescarte._id}`] += registro.kilosActuales;
            }
        }
        return out;
    }
    static async respuesta_invetario_descartes(registros) {
        const out = {}
        for (const registro of registros) {
            if (!registro.tipoDescarte.inventario) continue;

            if (registro.tipoDescarte._id.toString() === "69120e3ca1cf6dcb986f5893") {
                if (!out[`${registro.tipoFruta._id}//${registro.area}//690f643bbe7e33ae39bda1c6`]) {
                    out[`${registro.tipoFruta._id}//${registro.area}//690f643bbe7e33ae39bda1c6`] = 0;
                }
                out[`${registro.tipoFruta._id}//${registro.area}//690f643bbe7e33ae39bda1c6`] += registro.kilosActuales;

            } else {
                if (!out[`${registro.tipoFruta._id}//${registro.area}//${registro.tipoDescarte._id}`]) {
                    out[`${registro.tipoFruta._id}//${registro.area}//${registro.tipoDescarte._id}`] = 0;
                }
                out[`${registro.tipoFruta._id}//${registro.area}//${registro.tipoDescarte._id}`] += registro.kilosActuales;
            }
        }
        return out;
    }
    static async obtener_registros_inventario_descarteMaquila(_id, data, session) {
        // Extraer todas las combinaciones de área y tipoDescarte
        const condiciones = Object.keys(data).map(itemKey => {
            const [area, tipoDescarteId] = itemKey.split("//");
            return { area, tipoDescarte: tipoDescarteId };
        });

        // Si no hay condiciones, retornar array vacío
        if (condiciones.length === 0) return [];

        // Una sola consulta con $or para traer todos los registros
        const registros = await InventariosHistorialRepository.get_inventario_descarteMaquila_generico({
            query: {
                lote: _id,
                $or: condiciones,
                estado: "ACTIVO",
                loteType: "loteMaquila"
            }
        }, { session });
        // Ordenar por fecha de creación
        return registros.sort((a, b) => a.createdAt - b.createdAt);
    }
    static async eliminarKilos_inventario_descarte(registros, data, log, user, session) {
        // Crear un Map para búsqueda O(1) en lugar de find O(n)
        const registrosMap = new Map(
            registros.map(r => [`${r.area}//${r.tipoDescarte._id.toString()}`, r])
        );

        // Procesar todo en un solo loop secuencial
        for (const [key, kilos] of Object.entries(data)) {
            // Saltar si no hay kilos a eliminar
            if (kilos <= 0) continue;

            // Buscar registro en O(1)
            const registro = registrosMap.get(key);
            if (!registro) continue;

            // Validación de kilos suficientes
            if (registro.kilosActuales < kilos) {
                throw new Error(
                    `No hay suficientes kilos en el inventario para eliminar. ` +
                    `Registro ID: ${registro._id}, Kilos actuales: ${registro.kilosActuales}, ` +
                    `Kilos a eliminar: ${kilos}`
                );
            }

            // Calcular nuevo valor y preparar update
            const nuevoKilosActuales = registro.kilosActuales - Number(kilos);
            const update = {
                kilosActuales: nuevoKilosActuales,
                ...(nuevoKilosActuales === 0 && { estado: 'AGOTADO' })
            };

            // Actualizar inventario
            const response = await InventariosHistorialRepository.actualizar_registro_inventario_descarte(
                { _id: registro._id },
                update,
                {
                    session,
                    action: 'Modificar inventario descarte maquila',
                    description: `Se eliminaron ${kilos} kilos del inventario de descarte maquila para el lote ${registro.lote}`,
                    user: user._id,
                }
            );
            console.log("Respuesta de actualización de inventario:", response);
            // Registrar log
            await registrarPasoLog(
                log._id,
                "InventariosHistorialRepository.put_inventario_descarteMaquila_updateOne",
                "Completado",
                `Kilos eliminados: ${kilos} del registro ID: ${registro._id}, nuevos kilosActuales: ${nuevoKilosActuales}`
            );
        }
    }
    static async modificar_lotes_inventario_descarteMaquila(data, _id, remision, tipoAccion, log, user, session) {

        // Procesar todo en un solo loop secuencial
        for (const [key, kilos] of Object.entries(data)) {
            const [, tipoDescarteId] = key.split("//");

            let update;
            if (tipoAccion === 'Devolver') {
                update = {
                    $set: { remisionSalida: remision },
                    $inc: {
                        [`descartesDevueltos.${tipoDescarteId}`]: kilos
                    }
                }
            } else if (tipoAccion === 'Comprar') {
                update = {
                    $inc: {
                        [`descartesComprados.${tipoDescarteId}`]: kilos
                    }
                }
            }


            await LotesRepository.actualizar_lote_Maquila(
                { _id: _id },
                update,
                {
                    session, action: 'Modificar lote maquila inventario descarte',
                    description: `Se agregaron ${kilos} kilos a descartes${tipoAccion} para el tipoDescarteId: ${tipoDescarteId} en el lote ${_id}`,
                    user: user._id
                }
            );

            // Registrar log
            await registrarPasoLog(
                log._id,
                "LotesRepository.actualizar_lote_Maquila",
                "Completado",
                `Kilos modificados: ${kilos} para el tipoDescarteId: ${tipoDescarteId} en el lote ID: ${_id}`
            );

        }
    }
    static async ingresarFrutaDescarteMaquilaDescarteProceso(data, registro, loteId, log, session) {

        for (const [key, kilos] of Object.entries(data)) {
            const [area, tipoDescarteId] = key.split("//");
            const data = {
                lote: loteId,
                tipoFruta: registro.tipoFruta._id,
                area: area,
                tipoDescarte: tipoDescarteId,
                kilos: kilos,
                loteType: "Lote"
            }

            await InventariosHistorialRepository.add_elemento_inventarioDescartes(data, log._id, session);
        }
    }
    // static async modificarIngresoCanastillas(data) {
    //     const canastillasPropias = Number(datos.canastillasPropias || 0) + Number(datos.canastillasVaciasPropias || 0)
    //     const canastillasPrestadas = Number(datos.canastillasPrestadas || 0) + Number(datos.canastillasVaciasPrestadas || 0)
    // }
}
