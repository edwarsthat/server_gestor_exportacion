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
import { InventarioDescartesRepository, InventariosHistorialRepository } from "../Class/Inventarios.js";
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
        // Validación de parámetros - fallar explícitamente                                                                                             
        if (!_id) {
            throw new Error('El _id es requerido para ajustar canastillas');
        }
        if (!Number.isFinite(cantidad)) {
            throw new Error('La cantidad debe ser un número finito');
        }
        if (!user?._id) {
            throw new Error('El user._id es requerido para ajustar canastillas');
        }

        // Si cantidad es 0, no hay nada que hacer (esto sí es válido retornar)                                                                         
        if (cantidad === 0) return null;

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
    static validarGGN(proveedor, tipoFruta, user) {
        if (!proveedor) throw new Error("No se proporcionaron proveedores");

        if (!proveedor.GGN || !proveedor.GGN.fechaVencimiento) {
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
    static async procesar_formulario_inventario_descarte_sumar(data, tipoFruta, session, user) {

        const dataMap = new Map();
        //se estrucutra los datos de entrada, kilos y acnastillas por item
        for (const [key, value] of Object.entries(data)) {
            const [area, descarteId, tipo] = key.split(':');
            const campoDestino = tipo || 'kilos';
            const valorNumerico = value === '' ? 0 : parseInt(value);
            if (isNaN(valorNumerico)) throw new Error("El valor no es un numero");

            const llaveUnica = area + ":" + descarteId;
            const registroExistente = dataMap.get(llaveUnica) || { kilos: 0, canastillas: 0 };
            registroExistente[campoDestino] = valorNumerico;
            dataMap.set(llaveUnica, registroExistente);
        }
        //se recorre el mapa para descontar los kilos y canastillas
        for (const [key, value] of dataMap) {
            const [area, descarteId] = key.split(":");

            let kilos = value.kilos;
            let canastillas = value.canastillas;

            const registros = await InventarioDescartesRepository.get_data({
                query: {
                    tipoFruta: tipoFruta,
                    area: area,
                    tipoDescarte: descarteId,
                    estado: "ACTIVO",
                    loteType: { $in: ["Lote", "Loteef8"] }
                },
                sort: { fechaIngreso: -1 },
            }, { session })
            if (registros.length === 0) throw new Error("No hay inventario suficiente")

            for (const registro of registros) {

                if (kilos <= 0 && canastillas <= 0) break; // Ya se descontaron todos los kilos necesarios

                let update = {
                    $inc: {},
                    $set: {}
                }
                let kilosASumar = 0;
                let canastillasASumar = 0;

                if (kilos > 0) {
                    // Calcular cuántos kilos se van a sumar de ESTE registro específico
                    kilosASumar = Math.min(kilos, registro.kilosIniciales);
                }
                if (canastillas > 0) {
                    // Calcular cuántas canastillas se van a sumar de ESTE registro específico
                    canastillasASumar = Math.min(canastillas, registro.canastillasIniciales);
                }

                //se crea el update para el registro
                if (kilosASumar > 0) {
                    update.$inc.kilosActuales = kilosASumar;
                }
                if (canastillasASumar > 0) {
                    update.$inc.canastillasActuales = canastillasASumar;
                }

                update.$set.estado = "ACTIVO";

                //se modifica el registro 
                await InventariosHistorialRepository.actualizar_registro_inventario_descarte(
                    { _id: registro._id },
                    update,
                    { user: user._id, action: 'Actualizar inventario descarte reproceso predio', session }
                )

                // Registrar la SALIDA en el cardex (los kilos que realmente se descontaron)
                await InventariosHistorialRepository.put_cardex_invetariosdescartes(
                    {},
                    { $inc: { [`kilos_salida.${tipoFruta}.${area}.${descarteId}`]: kilosASumar } },
                    { sort: { fecha: -1 }, new: true, session }
                );

                // Reducir los kilos pendientes por descontar
                kilos -= kilosASumar;
                canastillas -= canastillasASumar;
            }

            // Verificar que se pudieron descontar todos los kilos
            if (kilos > 0) {
                throw new InventariosLogicError(470, `No hay inventario suficiente. Faltan ${kilos} kilos para el tipo de fruta ${tipoFruta} en el área ${area} y tipo de descarte ${descarteId}`);
            }
            if (canastillas > 0) {
                throw new InventariosLogicError(470, `No hay inventario suficiente. Faltan ${canastillas} canastillas para el tipo de fruta ${tipoFruta} en el área ${area} y tipo de descarte ${descarteId}`);
            }

        }

    }
    static async procesar_formulario_inventario_descarte(data, tipoFruta, session, user, opts = {}) {
        const { descompuesta = false } = opts;
        let totalKilos = 0;
        let totalCanastillas = 0;
        const dataMap = new Map();
        //se estrucutra los datos de entrada, kilos y acnastillas por item
        for (const [key, value] of Object.entries(data)) {
            const [area, descarteId, tipo] = key.split(':');
            const campoDestino = tipo || 'kilos';
            const valorNumerico = value === '' ? 0 : parseInt(value);
            if (isNaN(valorNumerico)) throw new Error("El valor no es un numero");

            const llaveUnica = area + ":" + descarteId;
            const registroExistente = dataMap.get(llaveUnica) || { kilos: 0, canastillas: 0 };
            registroExistente[campoDestino] = valorNumerico;
            dataMap.set(llaveUnica, registroExistente);


        }
        //se recorre el mapa para descontar los kilos y canastillas
        for (const [key, value] of dataMap) {
            const [area, descarteId] = key.split(":");
            totalKilos += value.kilos;
            totalCanastillas += value.canastillas;
            const kilosEliminar = value.kilos;
            const canastillasEliminar = value.canastillas;


            // 1. Si NO es descompuesta: Validación estricta de pareja (XOR)
            if (!descompuesta && (kilosEliminar === 0) !== (canastillasEliminar === 0)) {
                throw new Error("Inconsistencia: Debes reportar tanto kilos como canastillas.");
            }

            // 2. Si ES descompuesta: Solo error si hay canastillas pero no hay kilos
            if (descompuesta && canastillasEliminar > 0 && kilosEliminar <= 0) {
                throw new Error("Inconsistencia: No puedes enviar canastillas de descompuesta con 0 kilos.");
            }

            let kilos = value.kilos;
            let canastillas = value.canastillas;
            let kilosTotalTipo = 0;
            let canastillasTotalTipo = 0;

            const registros = await InventarioDescartesRepository.get_data({
                query: {
                    tipoFruta: tipoFruta,
                    area: area,
                    tipoDescarte: descarteId,
                    estado: "ACTIVO",
                    loteType: { $in: ["Lote", "Loteef8"] }
                },
                sort: { fechaIngreso: 1 },
            }, { session })
            console.log("registros", registros)

            if (registros.length === 0) throw new Error("No hay inventario suficiente")

            for (const registro of registros) {
                //se suma el valor total del tipo de descarte
                kilosTotalTipo += registro.kilosActuales;
                canastillasTotalTipo += registro.canastillasActuales;

                if (kilos <= 0 && canastillas <= 0) break; // Ya se descontaron todos los kilos necesarios

                let update = {
                    $set: {}
                }
                let kilosRestantes = registro.kilosActuales;
                let kilosADescontar = 0;
                let canastillasRestantes = registro.canastillasActuales;
                let canastillasADescontar = 0;

                if (kilos > 0) {
                    // Calcular cuántos kilos se van a descontar de ESTE registro específico
                    kilosADescontar = Math.min(kilos, registro.kilosActuales);
                    kilosRestantes = registro.kilosActuales - kilosADescontar;
                }
                if (canastillas > 0) {
                    // Calcular cuántas canastillas se van a descontar de ESTE registro específico
                    canastillasADescontar = Math.min(canastillas, registro.canastillasActuales);
                    canastillasRestantes = registro.canastillasActuales - canastillasADescontar;
                }

                //se crea el update para el registro
                if (kilosRestantes > 0) {
                    update.$set.kilosActuales = kilosRestantes;
                } else {
                    update.$set.kilosActuales = 0;
                }
                if (canastillasRestantes > 0) {
                    update.$set.canastillasActuales = canastillasRestantes;
                } else {
                    update.$set.canastillasActuales = 0;
                }

                if (kilosRestantes <= 0 && canastillasRestantes <= 0) {
                    update.$set.estado = "AGOTADO";
                }
                //se modifica el registro 
                await InventariosHistorialRepository.actualizar_registro_inventario_descarte(
                    { _id: registro._id },
                    update,
                    { user: user._id, action: 'Actualizar inventario descarte reproceso predio', session }
                )

                // Registrar la SALIDA en el cardex (los kilos que realmente se descontaron)
                await InventariosHistorialRepository.put_cardex_invetariosdescartes(
                    {},
                    { $inc: { [`kilos_salida.${tipoFruta}.${area}.${descarteId}`]: kilosADescontar } },
                    { sort: { fecha: -1 }, new: true, session }
                );

                // Reducir los kilos pendientes por descontar
                kilos -= kilosADescontar;
                canastillas -= canastillasADescontar;

            }
            const restanteKilos = kilosTotalTipo - kilosEliminar;
            const restanteCanastillas = canastillasTotalTipo - canastillasEliminar;

            // Error si: (Kilos es 0 Y Canastillas > 0) O (Kilos > 0 Y Canastillas es 0)
            if ((restanteKilos === 0) !== (restanteCanastillas === 0)) {
                throw new Error("Inconsistencia: No pueden quedar kilos sin canastillas o viceversa.");
            }

            // Validación adicional: No permitir valores negativos (opcional pero recomendado)
            if (restanteKilos < 0 || restanteCanastillas < 0) {
                throw new Error("El descuento supera el inventario disponible.");
            }

            // Verificar que se pudieron descontar todos los kilos
            if (kilos > 0) {
                throw new InventariosLogicError(470, `No hay inventario suficiente. Faltan ${kilos} kilos para el tipo de fruta ${tipoFruta} en el área ${area} y tipo de descarte ${descarteId}`);
            }
            if (canastillas > 0) {
                throw new InventariosLogicError(470, `No hay inventario suficiente. Faltan ${canastillas} canastillas para el tipo de fruta ${tipoFruta} en el área ${area} y tipo de descarte ${descarteId}`);
            }

        }

        return { totalKilos, totalCanastillas };

    }
    static async crear_lote_celifrut(tipoFruta, kilos, canastillas, user, session) {
        try {
            const numKilos = Number(kilos);
            const numCanastillas = Number(canastillas);

            if (!Number.isFinite(numKilos) || numKilos <= 0) throw new Error('Lote Celifrut: Kilos debe ser un número positivo');
            if (!Number.isFinite(numCanastillas) || numCanastillas <= 0) throw new Error('Lote Celifrut: Canastillas debe ser un número positivo');
            if (!tipoFruta?._id || !tipoFruta?.valorPromedio || tipoFruta.valorPromedio === 0) {
                throw new Error('Lote Celifrut: Datos de fruta inválidos o valor promedio en cero');
            }
            const fecha = new Date()
            const codigo = await dataService.get_Celifrut_serial(session)
            const lote = {
                enf: codigo,
                predio: config.ID_CELIFRUT,
                canastillas: numCanastillas,
                kilos: numKilos,
                placa: 'AAA000',
                tipoFruta: tipoFruta._id,
                observaciones: 'Reproceso',
                promedio: numKilos / numCanastillas,
                "fecha_estimada_llegada": fecha,
                "fecha_ingreso_patio": fecha,
                "fecha_salida_patio": fecha,
                "fecha_ingreso_inventario": fecha,
            }

            const newLote = await LotesRepository.post_data(lote, { user: user._id, session });
            const update = {
                $inc: {
                    kilosVaciados: newLote.kilos,
                },
                $set: {
                    fechaProceso: fecha
                }
            }
            await LotesRepository.actualizar_lote(
                { _id: newLote._id },
                update,
                {
                    user: user._id, action: "vaciarLote", canastillas: newLote.canastillas,
                    vaciar: true, session

                })
            return newLote
        } catch (error) {
            console.error("Error creando lote Celifrut:", error);
            throw error
        }
    }
    static async revisar_cambio_registro_despachodescarte(_id, newData) {
        let cambioFruta = false
        let cambioIventario = false
        const registro = await DespachoDescartesRepository.get_data({
            ids: [_id],
            populate: [
                { path: 'cliente', select: 'cliente' },
                { path: 'tipoFruta', select: 'tipoFruta' },
                { path: "user", select: "usuario" }
            ]
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
    static construir_ef8_lote(data, enf, precio, user) {
        if (!enf) throw new Error("No se encontro el enf");
        if (precio === null || precio === undefined) {
            throw new Error("No se encontró el precio");
        }

        const totalCanastillas = Number(data.canastillasPropias || 0) + Number(data.canastillasVaciasPropias || 0);
        const totalCanastillasPrestadas = Number(data.canastillasVaciasPrestadas || 0) + Number(data.canastillasPrestadas || 0);
        const total = Number(data.descarteGeneral || 0) + Number(data.balin || 0) + Number(data.pareja || 0);
        const promedio = totalCanastillas > 0 ? total / totalCanastillas : 0;

        const loteEF8 = {
            balin: Number(data.balin || 0),
            canastillas: totalCanastillas || 0,
            canastillasPrestadas: totalCanastillasPrestadas || 0,
            descarteGeneral: Number(data.descarteGeneral || 0),
            enf: enf,
            fecha_ingreso_inventario: colombiaToUTC(data.fecha_ingreso_inventario || Date.now()),
            numeroPrecintos: Number(data.numeroPrecintos || 0),
            numeroRemision: data.numeroRemision || '',
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
    static async ingresarDescarteEf8(registroEF8, data, tipoFruta, user, session) {
        console.log(data);
        console.log(registroEF8);

        if (!tipoFruta || !tipoFruta._id) throw new Error("No se encontro el tipo de fruta");
        if (!mongoose.isValidObjectId(tipoFruta._id)) throw new Error("No se encontro el tipo de fruta");
        if (!mongoose.isValidObjectId(registroEF8._id)) throw new Error(`No se encontro el lote ${registroEF8.enf}`);

        const descarteObj = {
            descarteGeneral: data.descarteGeneral || 0,
            pareja: data.pareja || 0,
            balin: data.balin || 0,
            descarteGeneralCanastillas: data.descarteGeneralCanastillas || 0,
            parejaCanastillas: data.parejaCanastillas || 0,
            balinCanastillas: data.balinCanastillas || 0,
        }
        const descartesArr = ["descarteGeneral", "pareja", "balin"];
        const descartesIds = await DescartesRepository.get_data({ ids: tipoFruta.descartes }, { session });

        if (descartesIds.length === 0) throw new Error("No se encontraron los descartes");
        for (const descarte of descartesArr) {
            if (descarteObj[descarte] === 0 && descarteObj[`${descarte}Canastillas`] === 0) continue;
            const descarteId = descartesIds.find(d => d.nombre === descarte);
            if (!descarteId) throw new Error(`No se encontro el descarte ${descarte}`);
            if (!mongoose.isValidObjectId(descarteId._id)) throw new Error(`No se encontro el descarte ${descarte}`);

            const newRegistro = {
                lote: registroEF8._id,
                tipoFruta: tipoFruta._id,
                area: "LAVADO",
                tipoDescarte: descarteId._id,
                kilos: Number(descarteObj[descarte]),
                canastillas: Number(descarteObj[`${descarte}Canastillas`]),
                loteType: "Loteef8"
            }
            await InventariosHistorialRepository.add_elemento_inventarioDescartes(newRegistro, user, { session });

            await InventariosHistorialRepository.put_cardex_invetariosdescartes(
                {},
                {
                    $inc: {
                        [`kilos_ingreso.${tipoFruta._id.toString()}.LAVADO.${descarteId._id.toString()}`]: descarteObj[descarte],
                        [`canastillas_ingreso.${tipoFruta._id.toString()}.LAVADO.${descarteId._id.toString()}`]: descarteObj[`${descarte}Canastillas`],
                    },
                },
                {
                    sort: { fecha: -1 },
                    new: true,
                    session,
                }
            );
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
    static async ingresarCanastillas(datos, user, session = null) {
        const canastillasPropias = Number(datos.canastillasPropias || 0) + Number(datos.canastillasVaciasPropias || 0)
        const canastillasPrestadas = Number(datos.canastillasPrestadas || 0) + Number(datos.canastillasVaciasPrestadas || 0)

        const dataRegistro = this.crearRegistroInventarioCanastillas({
            destino: config.ID_CELIFRUT,
            origen: datos.predio,
            observaciones: "ingreso lote",
            fecha: datos.fecha_ingreso_inventario,
            canastillas: canastillasPropias,
            canastillasPrestadas: canastillasPrestadas,
            accion: "ingreso",
            user
        })

        await this.ajustarCanastillasProveedorCliente(datos.predio, -canastillasPropias, user, session)
        await this.ajustarCanastillasProveedorCliente(config.ID_CELIFRUT, canastillasPropias, user, session)
        const registroCanastillas = await CanastillasRepository.post_data(dataRegistro, { session, user: user._id })
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

        await InventariosHistorialRepository.put_inventarioSimple(
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

        const pullResult = await InventariosHistorialRepository.put_inventarioSimple(
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

        const result = await InventariosHistorialRepository.put_inventarioSimple(
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
            "InventariosHistorialRepository.put_inventarioSimple (sumar/crear)",
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
    static respuesta_invetario_descartes(registros) {
        if (!Array.isArray(registros)) return {};

        const out = new Map();

        for (const registro of registros) {
            if (!registro?.tipoDescarte?.inventario) continue;

            const frutaId = registro.tipoFruta?._id;
            const areaId = registro.area;
            const descarteId = registro.tipoDescarte?._id;

            if (!frutaId || !areaId || !descarteId) continue;

            const key = `${frutaId}//${areaId}//${descarteId}`;
            const kilos = Number(registro.kilosActuales) || 0;
            const canastillas = Number(registro.canastillasActuales) || 0;
            const actual = out.get(key) || { kilos: 0, canastillas: 0 };

            out.set(key, {
                kilos: actual.kilos + kilos,
                canastillas: actual.canastillas + canastillas
            });
        }

        return Object.fromEntries(out);
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

            await InventariosHistorialRepository.add_elemento_inventarioDescartes(data, log._id, { session });
        }
    }
    // static async modificarIngresoCanastillas(data) {
    //     const canastillasPropias = Number(datos.canastillasPropias || 0) + Number(datos.canastillasVaciasPropias || 0)
    //     const canastillasPrestadas = Number(datos.canastillasPrestadas || 0) + Number(datos.canastillasVaciasPrestadas || 0)
    // }
}
