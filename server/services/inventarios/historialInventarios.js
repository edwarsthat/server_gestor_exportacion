import { InventariosHistorialServiceError } from "../../../Error/ServiceError.js";
import { DespachoDescartesRepository } from "../../Class/DespachoDescarte.js";
import { FrutaDescompuestaRepository } from "../../Class/FrutaDescompuesta.js";
import { InventariosHistorialRepository, InventarioDescartesRepository } from "../../Class/Inventarios.js";
import { ServiceError } from "../../models/ErrorModels.js";
import { crear_arreglo_modificar_descartes, crear_arreglo_modificar_descartes_sumar } from "../helpers/descartes.js";
import { InventariosService } from "../inventarios.js";

export class HistorialInventariosService {
    static async calcular_modificaciones(registro, data) {
        //se verifica que tenga tipoFruta
        if (!registro.tipoFruta || !data.tipoFruta) {
            throw new ServiceError(400, `El registro de inventario descarte con ID: ${registro._id} no tiene tipoFruta`)
        }
        // se verifica si cambio la fruta

        const cambioFruta = {
            old: registro.tipoFruta.toString(),
            new: data.tipoFruta.toString()
        };

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

                if ((valorNuevo !== valorOriginal) || (cambioFruta && cambioFruta.old !== registro.new)) {
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
    static async verificar_modificacion_del_inventario_descartes(changesDescartes, cambioFruta, user, session) {

        const outOBjSumar = crear_arreglo_modificar_descartes_sumar(changesDescartes);
        await InventariosService.procesar_formulario_inventario_descarte_sumar(outOBjSumar, cambioFruta.old, session, user);

        // se obtienen los totales del inventario DESPUES del sumar para validar con datos actualizados
        const result = await InventarioDescartesRepository.get_totales_inventario_descarte({
            estado: "ACTIVO",
            loteType: { $in: ['Lote', 'Loteef8'] }
        }, { session });

        const inventarioMap = new Map(
            result.map(item => [`${item.area}:${item.tipoDescarte}:${item.tipoFruta}`, item])
        );

        //se verifica si el inventario es suficiente para restar
        for (const [key, value] of changesDescartes) {
            const [area, tipoDescarte] = key.split(":");
            //se revisa si el inventario es mayor al que se desea restar
            const inventario = inventarioMap.get(`${area}:${tipoDescarte}:${cambioFruta.new}`);
            if (!inventario) {
                throw new ServiceError(400, `No se puede restar más inventario de descarte que el disponible`);
            }
            if (inventario.totalCanastillasActuales < (value.canastillas?.value ?? 0)) {
                throw new ServiceError(400, `No se puede restar más inventario de descarte que el disponible`);
            }
            if (inventario.totalKilosActuales < (value.kilos?.value ?? 0)) {
                throw new ServiceError(400, `No se puede restar más inventario de descarte que el disponible`);
            }
        }
        const outOBj = crear_arreglo_modificar_descartes(changesDescartes);
        await InventariosService.procesar_formulario_inventario_descarte(outOBj, cambioFruta.new, session, user);

    }
    static async modificar_registro_despacho_en_inventario_descarte(idRegistro, changesData, changesDescartes, user, session) {
        try {
            const update = {
                $set: {},
                $inc: {}
            };

            // Campos fijos que cambiaron
            for (const { key, value } of changesData) {
                update.$set[key] = value;
            }

            // Campos dinámicos (descartes) que cambiaron
            let kilosDelta = 0;
            for (const [key, value] of changesDescartes) {
                if (value.kilos !== undefined) {
                    update.$set[`descartes.${key}:kilos`] = value.kilos.value;
                    kilosDelta += value.kilos.value - value.kilos.valueOriginal;
                }
                if (value.canastillas !== undefined) {
                    update.$set[`descartes.${key}:canastillas`] = value.canastillas.value;
                }
            }

            if (kilosDelta !== 0) {
                update.$inc.kilos = kilosDelta;
            }

            // Limpiar operadores vacíos
            if (Object.keys(update.$set).length === 0) delete update.$set;
            if (Object.keys(update.$inc).length === 0) delete update.$inc;

            if (Object.keys(update).length === 0) return true;

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
    static async modificar_registro_fruta_descompuesta_en_inventario_descarte(idRegistro, changesData, changesDescartes, user, session) {
        try {
            const update = {
                $set: {},
                $inc: {}
            };

            // Campos fijos que cambiaron
            for (const { key, value } of changesData) {
                update.$set[key] = value;
            }

            // Campos dinámicos (descartes) que cambiaron
            let kilosDelta = 0;
            for (const [key, value] of changesDescartes) {
                if (value.kilos !== undefined) {
                    update.$set[`descartes.${key}:kilos`] = value.kilos.value;
                    kilosDelta += value.kilos.value - value.kilos.valueOriginal;
                }
                if (value.canastillas !== undefined) {
                    update.$set[`descartes.${key}:canastillas`] = value.canastillas.value;
                }
            }

            if (kilosDelta !== 0) {
                update.$inc.kilos = kilosDelta;
            }

            // Limpiar operadores vacíos
            if (Object.keys(update.$set).length === 0) delete update.$set;
            if (Object.keys(update.$inc).length === 0) delete update.$inc;

            if (Object.keys(update).length === 0) return true;

            await FrutaDescompuestaRepository.actualizar_registro(
                { _id: idRegistro },
                update,
                { session },
                null,
                user._id,
                'Modificar registro fruta descompuesta en inventario descarte'
            )
            return true
        } catch (err) {
            throw new InventariosHistorialServiceError(`Error service: ${err.message}`);
        }
    }
    static async modificar_cardex_modificar_registro_despacho(changesDescartes, cambioFruta, session) {
        try {
            const inc = {};
            for (const [key, value] of changesDescartes) {
                if (value.kilos !== undefined) {
                    const [area, descarteId] = key.split(":");
                    const delta = value.kilos.value - value.kilos.valueOriginal;
                    if (delta !== 0) {
                        inc[`kilos_salida.${cambioFruta.new}.${area}.${descarteId}`] = delta;
                    }
                }
            }

            if (Object.keys(inc).length === 0) return true;

            await InventariosHistorialRepository.put_cardex_invetariosdescartes(
                {},
                { $inc: inc },
                {
                    sort: { fecha: -1 },
                    new: true,
                    session,
                }
            );

            return true
        } catch (err) {
            throw new InventariosHistorialServiceError(`Error cardex: ${err.message ?? err.status ?? err}`);
        }
    }
}