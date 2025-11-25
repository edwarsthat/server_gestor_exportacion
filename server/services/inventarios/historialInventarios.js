import { parse } from "date-fns";
import { InventariosHistorialServiceError } from "../../../Error/ServiceError.js";
import { DespachoDescartesRepository } from "../../Class/DespachoDescarte.js";
import { InventariosHistorialRepository } from "../../Class/Inventarios.js";

export class HistorialInventariosService {
    static async modificar_inventario_descartes_modificar_salida(idRegistro, newData, tipoFruta, user, session) {
        try {
            const registro = await DespachoDescartesRepository.get_historial_descarte({ ids: [idRegistro] });
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