import mongoose from "mongoose";
import { InventariosHistorialServiceError } from "../../../Error/ServiceError.js";
import { DespachoDescartesRepository } from "../../Class/DespachoDescarte.js";
import { InventariosHistorialRepository, InventarioDescartesRepository } from "../../Class/Inventarios.js";
import { ServiceError } from "../../models/ErrorModels.js";

export class HistorialInventariosService {
    static async calcular_modificaciones(data, idRegistro, session) {
        //se obtiene el registro original 
        const registroDocs = await DespachoDescartesRepository.get_data({ ids: [idRegistro] }, session);
        if (registroDocs.length === 0) {
            throw new ServiceError(404, `No se encontró el registro de inventario descarte con ID: ${idRegistro}`)
        }
        const registro = registroDocs[0];
        //se verifica que tenga tipoFruta
        if (!registro.tipoFruta || !data.tipoFruta) {
            throw new ServiceError(400, `El registro de inventario descarte con ID: ${idRegistro} no tiene tipoFruta`)
        }
        // se verifica si cambio la fruta
        let cambioFruta = null;
        if (registro.tipoFruta.toString() !== data.tipoFruta) {
            cambioFruta = {
                old: registro.tipoFruta,
                new: data.tipoFruta
            };
        }
        //ver si hay algun cambio en el registro
        const changesData = []
        const changesDescartes = new Map();
        //se obtienen los datos de inventario
        // data contiene los campos fijos y los dinámicos del catchall
        for (const [key, value] of Object.entries(data)) {
            // Evitar contaminación de prototipo
            if (!Object.prototype.hasOwnProperty.call(data, key)) continue;
            const isDynamic = key.includes(":");
            const [area, descarteId, tipo] = key.split(":");

            if (!isDynamic) {
                // Validar existencia en el registro original
                if (!(key in registro)) {
                    throw new ServiceError(400, `El campo '${key}' no existe en el registro original`);
                }

                const valueOriginal = registro[key];

                // Comparación débil controlada
                if (value !== String(valueOriginal)) {
                    changesData.push({ key, value, valueOriginal });
                }
            } else {
                // Manejo de campos dinámicos (Descartes)
                const valorOriginal = Number(registro.descartes?.get(key) ?? 0);
                const valorNuevo = Number(value);

                // Validar que el valor nuevo sea un número válido para evitar el bug de NaN
                if (isNaN(valorNuevo)) {
                    throw new ServiceError(400, `El valor para '${key}' debe ser numérico`);
                }

                if ((valorNuevo !== valorOriginal) || cambioFruta) {
                    const existente = changesDescartes.get(`${area}:${descarteId}`) || {};

                    changesDescartes.set(`${area}:${descarteId}`, {
                        ...existente,
                        [tipo]: {
                            value: valorNuevo,
                            valueOriginal: valorOriginal
                        }
                    });

                }
            };
        }

        return {
            changesData,
            changesDescartes,
            cambioFruta
        }

    }
    static async verificar_modificacion_del_inventario_descartes(changesDescartes, cambioFruta, session) {

        // se obtienen los totales del inventario
        const result = await InventarioDescartesRepository.get_totales_inventario_descarte({
            estado: "ACTIVO",
            loteType: { $in: ['Lote', 'Loteef8'] }
        }, { session });

        const inventarioMap = new Map(
            result.map(item => [`${item.area}:${item.tipoDescarte}:${item.tipoFruta}`, item])
        );
        const movimientosARestar = [];


        //se verifica si se cambio la fruta
        if (cambioFruta) {

            //se verifica si se aumento el inventario
            for (const [key, value] of changesDescartes) {
                console.log(cambio);
                const [area, tipoFruta] = key.split(":");
                // const [area, descarteId, tipo] = key.split(":");

                // //se verifica si se aumento el inventario de la nueva fruta
                // if (valueOriginal < value) {
                //     const { key, value, valueOriginal } = cambio;
                //     const [area, descarteId] = key.split(":");
                //     const totalARestar = value - valueOriginal;

                //     const inventario = inventarioMap.get(`${area}:${descarteId}:${cambioFruta.new}`);
                //     if (inventario.total < totalARestar) {
                //         throw new ServiceError(400, `No se puede restar más inventario de descarte que el disponible`);
                //     }

                // }

            }
        }
    }
    static async modificar_inventario_descartes_modificar_salida(idRegistro, newData, tipoFruta, user, session) {
        try {
            const registro = await DespachoDescartesRepository.get_data({ ids: [idRegistro] });
            if (registro.length === 0) {
                throw new InventariosHistorialServiceError(`No se encontró el registro de despacho descarte con ID: ${idRegistro}`);
            }
            for (const [key, value] of Object.entries(newData)) {
                const [area, descarteId] = key.split(":");
                if (Number(value) > Number(registro[0].descartes.get(key))) {
                    //se la salida fue mas grande
                    let kilos = Number(value) - Number(registro[0].descartes.get(key));
                    const registros = await InventariosHistorialRepository.get_inventario_descarteMaquila_generico({
                        query: {
                            tipoFruta: tipoFruta,
                            area: area,
                            tipoDescarte: descarteId,
                            estado: "ACTIVO",
                            loteType: "Lote"
                        },
                        sort: { fechaIngreso: 1 },
                    }, session)

                    if (registros.length === 0) {
                        throw new InventariosHistorialServiceError(`No se encontró un registro activo en el inventario de descartes para el área ${area} y tipo de descarte ${descarteId}`);
                    }
                    const total = registros.reduce((acc, curr) => acc + curr.kilosActuales, 0);
                    if (total < kilos) {
                        throw new InventariosHistorialServiceError(`No hay suficientes kilos en el inventario de descartes para el área ${area} y tipo de descarte ${descarteId}. Kilos disponibles: ${total}, Kilos requeridos: ${kilos}`);
                    }
                    for (const registro of registros) {
                        const nuevosKilos = Number(kilos) - Number(registro.kilosActuales);
                        if (nuevosKilos < 0) {
                            await InventariosHistorialRepository.actualizar_registro_inventario_descarte(
                                { _id: registro._id },
                                { $set: { kilosActuales: - nuevosKilos } },
                                { user: user._id, action: 'Actualizar inventario descarte reproceso predio', session }
                            )
                        } else {
                            await InventariosHistorialRepository.actualizar_registro_inventario_descarte(
                                { _id: registro._id },
                                { $set: { kilosActuales: 0, estado: "AGOTADO" } },
                                { user: user._id, action: 'Actualizar inventario descarte reproceso predio', session }
                            )
                        }
                        kilos = nuevosKilos;

                    }
                } else if (parseInt(value) < parseInt(registro[0].descartes.get(key))) {

                    const kilos = parseInt(registro[0].descartes.get(key)) - parseInt(value);

                    const registros = await InventariosHistorialRepository.get_inventario_descarteMaquila_generico({
                        query: {
                            tipoFruta: tipoFruta,
                            area: area,
                            tipoDescarte: descarteId,
                            loteType: "Lote"
                        },
                        sort: { fechaIngreso: -1 },
                        limit: 1
                    }, session)

                    if (registros.length === 0) {
                        throw new InventariosHistorialServiceError(`No se encontró un registro activo en el inventario de descartes para el área ${area} y tipo de descarte ${descarteId}`);
                    }
                    const update = {
                        $inc: {
                            kilosActuales: parseInt(kilos)
                        },
                        $set: {}
                    }
                    if (registros[0].estado === "AGOTADO") {
                        update.$set.estado = "ACTIVO"
                    }
                    await InventariosHistorialRepository.actualizar_registro_inventario_descarte(
                        { _id: registros[0]._id },
                        update,
                        { user: user._id, action: 'Actualizar inventario descarte reproceso predio', session }
                    )
                }
            }

            return registro

        } catch (err) {
            throw new InventariosHistorialServiceError(`Error service: ${err.message}`);
        }
    }
    static async modificar_registro_despacho_en_inventario_descarte(idRegistro, newData, newRegistro, user, session) {
        try {
            const update = {
                $set: { ...newRegistro }
            };
            let kilosTotal = 0
            for (const [key, value] of Object.entries(newData)) {
                update[`descartes.${key}`] = value;
                kilosTotal += parseInt(value)
            }

            update.$set.kilos = kilosTotal;
            await DespachoDescartesRepository.actualizar_registro(
                { _id: idRegistro },
                update,
                { user: user._id, action: 'Modificar registro despacho descarte en inventario descarte', session }
            )
            return true
        } catch (err) {
            throw new InventariosHistorialServiceError(`Error service: ${err.message}`);
        }
    }
    static async modificar_cardex_modificar_registro_despacho(oldRegistro, tipoFruta, newData, user, session) {
        try {

            const kilosNuevos = Object.values(newData).reduce((acc, curr) => acc + parseInt(curr), 0);
            if (kilosNuevos === 0) return true;

            const total = parseInt(kilosNuevos) - parseInt(oldRegistro.kilos)

            await InventariosHistorialRepository.put_cardex_invetariosdescartes(
                {},
                {
                    $inc: {
                        [`kilos_salida.${tipoFruta}`]: total,
                    },
                },
                {
                    sort: { fecha: -1 },
                    new: true,
                    session,
                }
            );

            return true
        } catch (err) {
            throw new InventariosHistorialServiceError(`Error service: ${err.message}`);
        }
    }
}