import { db } from "../../DB/mongoDB/config/init.js";
import { PostError, ConnectionDBError } from "../../Error/ConnectionErrors.js";
import { ProcessError } from "../../Error/ProcessError.js";
import fs from 'fs';
import { registrarPasoLog } from "../api/helper/logs.js";
import { BaseRepository } from "./base/BaseRepository.js";

export class LotesRepository extends BaseRepository {
    static get model() { return db.Lotes; }
    static modelName = 'Lotes';

    static async addLote(data, opts = {}) {
        const { session, user, action } = opts;
        try {
            const year = new Date(data.fecha_ingreso_inventario).getFullYear()

            const tarifa = await db.tarifapredios.finOne({
                predio: data.predio,
                year,
                tipo: "FIJA",
                activo: true
            })

            if (!tarifa) {
                throw new Error("No hay tarifa configurada para este predio en ese año")
            }

            data. tarifaAplicada = tarifa.valor
//-------------------------------------------------------------------------------------------
            const lote = new db.Lotes(data);
            lote._user = user;

            const saved = await lote.save({ session, action });
            return saved;
        } catch (err) {
            throw new PostError(409, `Error agregando lote ${err.message}`);
        }
    }
    static async getLotes(options = {}, { session = null } = {}) {
        const {
            ids = [],
            query = {},
            select = {},
            sort = { fecha_creacion: -1, fechaIngreso: -1 },
            limit = 0,
            skip = 0,
            populate = [
                { path: 'predio', select: 'PREDIO ICA GGN SISPAP' },
                { path: 'tipoFruta' },
                { path: "user", select: "usuario nombre apellido" }
            ]
        } = options;

        try {
            let lotesQuery = { ...query };

            if (ids.length > 0) {
                lotesQuery._id = { $in: ids };
            }

            const lotes = await db.Lotes.find(lotesQuery)
                .select(select)
                .sort(sort)
                .limit(limit)
                .skip(skip)
                .populate(populate)
                .lean()
                .session(session)
                .exec();

            return lotes

        } catch (err) {
            throw new ConnectionDBError(522, `Error obteniendo lotes ${err.message}`);
        }
    }
    static async obtener_imagen_lote_calidad(url) {
        try {
            // eslint-disable-next-line security/detect-non-literal-fs-filename
            const data = fs.readFileSync(url)
            const base64Image = data.toString('base64');
            return base64Image
        } catch (err) {
            throw new ProcessError(525, `Error obteniendo la imagen ${err.message}`);
        }
    }
    static async get_numero_lotes(filtro = {}) {
        try {
            const count = await db.Lotes.countDocuments(filtro);
            return count;
        } catch (err) {
            throw new ConnectionDBError(524, `Error obteniendo cantidad lotes ${filtro} --- ${err.message}`);
        }
    }
    static async actualizar_lote(filter, update, options = {}) {
        const { session, arrayFilters, canastillas = 0,
            softNotFound = false, calculateFields = false, vaciar = false, ...restOptions } = options;

        const finalOptions = {
            new: true,
            ...restOptions,
            ...(session && { session }),
            ...(arrayFilters && { arrayFilters })
        };

        try {
            // 1. Actualiza el lote con los datos proporcionados y obtiene el nuevo estado
            let documento = await db.Lotes.findOneAndUpdate(filter, update, finalOptions)
                .populate([{ path: 'predio', select: 'PREDIO ICA GGN SISPAP' }, { path: 'tipoFruta' }]);
            if (!documento) {
                if (softNotFound) return null;
                throw new Error('Lote no encontrado');
            }

            if (vaciar) {
                const userId = finalOptions.user?._id || finalOptions.user;
                let record = new db.frutaProcesada({
                    loteId: documento._id,
                    predio: documento.predio,
                    loteType: 'Lote',
                    tipoFruta: documento.tipoFruta,
                    promedio: documento.promedio,
                    canastillas: canastillas,
                    user: userId,
                    proceso: 'Vaceo'

                });
                await record.save({ session: options.session });
            }

            if (calculateFields) {
                // 2. Calcula los campos mágicos
                const get = (campo) => Reflect.get(documento, campo) ?? 0;

                const kilosProcesados = get('kilosProcesados');
                const kilos = get('kilos');
                const kilosVaciados = get('kilosVaciados');
                const exportacionTotal = documento?.salidaExportacion?.totalKilos || 0;


                let deshidratacion = 100;
                let rendimiento = 0;

                if (kilos > 0) {

                    deshidratacion = 100 - (kilosProcesados * 100) / kilos;
                    rendimiento = kilosVaciados === 0 ? 0 : ((exportacionTotal * 100) / kilosVaciados);

                }

                // 3. Si hay que actualizar la deshidratación, hazlo solo si cambia
                if (documento.deshidratacion !== deshidratacion || documento.rendimiento !== rendimiento) {

                    const recalcOptions = {
                        new: true,
                        ...restOptions, // Solo las opciones básicas
                        ...(session && { session }),
                        skipAudit: true,
                        action: 'system:recalc_desh_rend',
                    };

                    documento = await db.Lotes.findOneAndUpdate(
                        filter,
                        { deshidratacion, rendimiento },
                        recalcOptions //  Usar opciones sin arrayFilters
                    ).populate([{ path: 'predio', select: 'PREDIO ICA GGN SISPAP' }, { path: 'tipoFruta' }]);
                }

            }

            return documento;

        } catch (err) {
            throw new ConnectionDBError(523, `Error modificando los datos: ${err.message}`);
        }
    }

    //#region Lotes Maquila
    static async addLoteMaquila(data, user, opts = {}) {
        const { session } = opts;
        try {

            const loteMaquila = new db.LotesMaquila(data);
            loteMaquila._user = user;

            const saved = await loteMaquila.save({ session });
            return saved;
        } catch (err) {
            throw new PostError(409, `Error agregando lote maquila ${err.message}`);
        }
    }
    static async getLotesMaquila(options = {}, { session = null } = {}) {
        const {
            ids = [],
            query = {},
            select = {},
            sort = { fecha_creacion: -1 },
            limit = 0,
            skip = 0,
            populate = [
                { path: 'predio', select: 'PREDIO ICA GGN SISPAP' },
                { path: 'tipoFruta', select: 'tipoFruta' },
                { path: 'cliente', select: 'CLIENTE' },
                { path: "user", select: "usuario nombre apellido" }
            ]
        } = options;
        try {
            let lotesQuery = { ...query };

            if (ids.length > 0) {
                lotesQuery._id = { $in: ids };
            }

            const lotes = await db.LotesMaquila.find(lotesQuery)
                .select(select)
                .sort(sort)
                .limit(limit)
                .skip(skip)
                .populate(populate)
                .session(session)
                .exec();

            return lotes

        } catch (err) {
            throw new ConnectionDBError(522, `Error obteniendo lotes maquila ${err.message}`);
        }
    }
    static async actualizar_lote_Maquila(filter, update, options = {}) {
        const { session, arrayFilters, canastillas = 0,
            softNotFound = false, calculateFields = false, vaciar = false, ...restOptions } = options;

        const finalOptions = {
            new: true,
            ...restOptions,
            ...(session && { session }),
            ...(arrayFilters && { arrayFilters })
        };

        try {
            let documento = await db.LotesMaquila.findOneAndUpdate(filter, update, { ...finalOptions });
            if (!documento) {
                if (softNotFound) return null;
                throw new Error('Lote no encontrado');
            }

            if (vaciar) {
                const userId = finalOptions.user?._id || finalOptions.user;
                let record = new db.frutaProcesada({
                    loteId: documento._id,
                    predio: documento.predio,
                    loteType: 'loteMaquila',
                    tipoFruta: documento.tipoFruta,
                    promedio: documento.promedio,
                    canastillas: canastillas,
                    user: userId,
                    proceso: 'Vaceo'

                });
                await record.save({ session: options.session });
            }


            if (calculateFields) {
                // 2. Calcula los campos mágicos
                const get = (campo) => Reflect.get(documento, campo) ?? 0;

                const kilosProcesados = get('kilosProcesados');
                const kilos = get('kilos');
                const kilosVaciados = get('kilosVaciados');
                const exportacionTotal = documento?.salidaExportacion?.totalKilos || 0;


                let deshidratacion = 100;
                let rendimiento = 0;

                if (kilos > 0) {

                    deshidratacion = 100 - (kilosProcesados * 100) / kilos;
                    rendimiento = kilosVaciados === 0 ? 0 : ((exportacionTotal * 100) / kilosVaciados);

                }

                // 3. Si hay que actualizar la deshidratación, hazlo solo si cambia
                if (documento.deshidratacion !== deshidratacion || documento.rendimiento !== rendimiento) {

                    const recalcOptions = {
                        new: true,
                        ...restOptions, // Solo las opciones básicas
                        ...(session && { session }),
                        skipAudit: true,
                        action: 'system:recalc_desh_rend',
                    };

                    documento = await db.LotesMaquila.findOneAndUpdate(
                        filter,
                        { deshidratacion, rendimiento },
                        recalcOptions // 👈 Usar opciones sin arrayFilters
                    ).populate([{ path: 'predio', select: 'PREDIO ICA GGN SISPAP' }, { path: 'tipoFruta' }]);
                }

            }

            return documento;

        } catch (err) {
            throw new ConnectionDBError(523, `Error modificando los datos: ${err.message}`);
        }
    }
    static async get_numero_lotes_maquila(filtro = {}) {
        try {
            const count = await db.LotesMaquila.countDocuments(filtro);
            return count;
        } catch (err) {
            throw new ConnectionDBError(524, `Error obteniendo cantidad lotes ${filtro} --- ${err.message}`);
        }
    }
    //#endregion
    //#region EF8
    static async crear_lote_EF8(data, user, logId = null, session = null) {
        try {
            const query = {
                ...data,
                user: user._id
            }
            const lote = new db.LotesEF8(query);
            const new_lote = await lote.save({ session });

            if (logId) {
                await registrarPasoLog(logId, "LotesRepository.crear_lote_EF8", "Completado");

            }
            return new_lote;
        } catch (err) {
            throw new PostError(521, `Error creando lote ${err.message}`);
        }
    }
    static async getLotesEF8(options = {}) {
        const {
            ids = [],
            query = {},
            select = {},
            sort = { fecha_creacion: -1 },
            limit = 50,
            skip = 0,
            populate = [
                { path: 'predio', select: 'PREDIO' },
                { path: 'tipoFruta', select: 'tipoFruta' },
                { path: "user", select: "usuario nombre apellido" }
            ]
        } = options;
        try {
            let lotesQuery = { ...query };

            if (ids.length > 0) {
                lotesQuery._id = { $in: ids };
            }

            const limitToUse = (limit === 0 || limit === 'all') ? 0 : limit;

            const lotes = await db.LotesEF8.find(lotesQuery)
                .select(select)
                .sort(sort)
                .limit(limitToUse)
                .skip(skip)
                .populate(populate)
                .exec();

            return lotes

        } catch (err) {
            throw new ConnectionDBError(522, `Error obteniendo lotes ${err.message}`);
        }
    }
    static async actualizar_lote_EF8(filter, update, options = {}, session = null) {

        const finalOptions = {
            new: true,
            ...options,
            ...(session && { session })
        };

        try {
            let documento = await db.LotesEF8.findOneAndUpdate(filter, update, { ...finalOptions });
            if (!documento) throw new Error('Lote no encontrado');

            return documento;

        } catch (err) {
            throw new ConnectionDBError(523, `Error modificando los datos: ${err.message}`);
        }
    }
//se agrega metodo bulkWrite. Jp
    static async bulkWrite(operations, { session = null } = {}) {
    try {
        return await db.Lotes.collection.bulkWrite(operations, { session });
    } catch (err) {
        throw new ConnectionDBError(
            523,
            `Error en bulkWrite de lotes: ${err.message}`
        );
    }
}
    //#endregion

}

export class LotesEF8Repository extends BaseRepository {
    static get model() { return db.LotesEF8; }
    static modelName = 'LotesEF8';

}

export class LoteMaquilaRepository extends BaseRepository {
    static get model() { return db.LotesMaquila; }
    static modelName = 'LotesMaquila';
}