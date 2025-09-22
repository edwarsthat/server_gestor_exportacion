import { db } from "../../DB/mongoDB/config/init.js";
import { PostError, PutError, ConnectionDBError } from "../../Error/ConnectionErrors.js";
import { ProcessError } from "../../Error/ProcessError.js";
import fs from 'fs';
import { registrarPasoLog } from "../api/helper/logs.js";
import { tipoFrutaCache } from "../cache/tipoFruta.js";

const camposDescartes = [
    "descarteLavado.balin",
    "descarteLavado.descarteGeneral",
    "descarteLavado.descompuesta",
    "descarteLavado.hojas",
    "descarteLavado.pareja",
    "descarteLavado.piel",
    "descarteEncerado.balin",
    "descarteEncerado.descarteGeneral",
    "descarteEncerado.descompuesta",
    "descarteEncerado.extra",
    "descarteEncerado.pareja",
    "descarteEncerado.suelo",
    "frutaNacional"
];

export class LotesRepository {
    static async addLote(data, user, opts = {}) {
        const { session } = opts; 
        try {
            const lote = new db.Lotes(data);
            lote._user = user;
            
            const saved = await lote.save({ session });
            return saved;
        } catch (err) {
            throw new PostError(409, `Error agregando lote ${err.message}`);
        }
    }
    static async crear_lote(data, user, otherInfo = {}) {
        try {
            const lote = new db.Lotes(data);
            const new_lote = await lote.save();
            let record = new db.recordLotes({
                operacionRealizada: 'crear lote celifrut',
                user: user,
                documento: { ...new_lote, otherInfo: otherInfo }
            })
            await record.save();
            return new_lote;
        } catch (err) {
            throw new PostError(521, `Error creando lote ${err.message}`);
        }
    }
    static async getLotes(options = {}) {
        const {
            ids = [],
            query = {},
            select = {},
            sort = { fecha_creacion: -1, fechaIngreso: -1 },
            limit = 50,
            skip = 0,
            populate = { path: 'predio', select: 'PREDIO ICA GGN SISPAP' }
        } = options;
        try {
            let lotesQuery = { ...query };

            if (ids.length > 0) {
                lotesQuery._id = { $in: ids };
            }

            const limitToUse = (limit === 0 || limit === 'all') ? 0 : limit;


            const lotes = await db.Lotes.find(lotesQuery)
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
    static async get_Lotes_strict(options = {}) {
        const {
            ids = [],
            query = {},
            select = {},
            sort = { fecha_creacion: -1, fechaIngreso: -1 },
            limit = 50,
            skip = 0,
            populate = { path: 'predio', select: 'PREDIO ICA GGN SISPAP' }
        } = options;
        try {
            let lotesQuery = { ...query };

            if (ids.length > 0) {
                lotesQuery._id = { $in: ids };
            }

            const limitToUse = (limit === 0 || limit === 'all') ? 0 : limit;

            const lotes = await db.Lotes.find(lotesQuery)
                .select(select)
                .sort(sort)
                .limit(limitToUse)
                .skip(skip)
                .populate(populate)
                .lean()
                .exec();


            return lotes

        } catch (err) {
            throw new ConnectionDBError(522, `Error obteniendo lotes ${err.message}`);
        }
    }
    static async modificar_lote(id, update, options = {}, session = null) {
        /**
         * Modifica un lote en la base de datos de MongoDB.
         *
         * @param {string} id - ID del lote a modificar.
         * @param {Object} update - Objeto con los cambios a aplicar al lote.
         * @param {string} action - Descripción de la acción realizada.
         * @param {string} user - Usuario que realiza la acción.
         * @returns {Promise<Object>} - Promesa que resuelve al objeto del lote modificado.
         * @throws {PutError} - Lanza un error si ocurre un problema al modificar el lote.
         */
        try {
            console.log(options)
            const finalOptions = {
                new: true,
                ...options,
                ...(session && { session })
            };


            const lote = await db.Lotes.findOneAndUpdate({ _id: id }, update, { ...finalOptions, new: true });
            const lote_obj = new Object(lote.toObject());

            let record = new db.recordLotes({ operacionRealizada: options.action, user: options.user, documento: { ...update, _id: id } })
            await record.save()
            return lote_obj;
        } catch (err) {
            throw new PutError(523, `Error ${err.name} -- ${id} - ${update}`);
        }
    }
    static async modificar_lote_proceso(id, query, action, user) {
        /**
         * Modifica un lote en la base de datos de MongoDB desde las aplicaciones
         * debido a que no requiere version del lote
         *
         * @param {string} id - ID del lote a modificar.
         * @param {Object} query - Objeto con los cambios a aplicar al lote.
         * @param {string} action - Descripción de la acción realizada.
         * @param {string} user - Usuario que realiza la acción.
         * @returns {Promise<Object>} - Promesa que resuelve al objeto del lote modificado.
         * @throws {PutError} - Lanza un error si ocurre un problema al modificar el lote.
         */
        try {
            const lote = await db.Lotes.findOneAndUpdate({ _id: id, }, query, { new: true });

            const lote_obj = new Object(lote.toObject());
            let record = new db.recordLotes({ operacionRealizada: action, user: user, documento: { ...query, _id: id } })
            await record.save()
            return lote_obj;
        } catch (err) {
            throw new PutError(523, `Error  ${err.name}`);
        }
    }
    static async rendimiento(data) {
        /**
         * Funcion que calcula y guarda el rendimiento del lote sumando la cantidad de kilos que hay 
         * en exportacion y dividiendola en la cantidad de kilos procesador o vaceados
         * 
         * @param {object} data - informacion del lote
         * @return {number} - retorna el valor del rendimiento
         */
        const id = data._id
        try {
            const kilosVaciados = Number(data.kilosVaciados);
            if (kilosVaciados === 0) return 0;
            const calidad1 = data.calidad1;
            const calidad15 = data.calidad15;
            const calidad2 = data.calidad2;
            const total = calidad1 + calidad15 + calidad2;
            const rendimiento = (total * 100) / kilosVaciados;

            await db.Lotes.updateOne({ _id: id }, { rendimiento: rendimiento });

            return rendimiento;
        } catch (e) {
            throw new ProcessError(415, "Error obteniendo rendimiento del lote" + e.message);
        }
    }
    static async deshidratacion(data) {
        /**
         * Funcion que calcula y guarda la deshidratacion del lote, sumando toda la fruta procesada
         * los descartes totales, la fruta nacional, directo nacional, exportacion y luego lo divide
         * en los kilos totales ingresados
         * 
         * @param {object} data - objeto con los elementos del lote
         * @return {number} - devuelve la deshidratacion total
         */
        const id = data._id
        try {
            const kilosTotal = data.kilos;
            if (kilosTotal === 0) return 0;
            const descarteLavado = data.descarteLavado ? this.descarteTotal(data.descarteLavado) : 0;
            const descarteEncerado = data.descarteEncerado ? this.descarteTotal(data.descarteEncerado) : 0;
            const frutaNacional = data.frutaNacional;
            const directoNacional = data.directoNacional;
            const calidad1 = data.calidad1;
            const calidad15 = data.calidad15;
            const calidad2 = data.calidad2;
            const total = calidad1 + calidad15 + calidad2 + descarteLavado + descarteEncerado + frutaNacional + directoNacional;
            const deshidratacion = 100 - (total * 100) / kilosTotal;
            await db.Lotes.updateOne({ _id: id }, { deshidratacion: deshidratacion });

            return deshidratacion;

        } catch (err) {
            throw new ProcessError(515, `Error sumando los descartes ${err.message}`);
        }
    }
    static async obtener_imagen_lote_calidad(url) {
        try {
            const data = fs.readFileSync(url)
            const base64Image = data.toString('base64');
            return base64Image
        } catch (err) {
            throw new ProcessError(525, `Error obteniendo la imagen ${err.message}`);
        }
    }
    static async eliminar_lote(id, user, action) {
        try {
            const lote = await db.Lotes.deleteOne({ id: id })
            let record = new db.recordLotes({
                operacionRealizada: action,
                user: user,
                documento: lote
            })
            await record.save();
        } catch (err) {
            throw new ProcessError(416, `Error eliminando lote ${err.message}`);

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
    static async bulkWrite(operations) {
        try {
            const result = await db.Lotes.bulkWrite(operations)
            return result;
        } catch (error) {
            throw new ConnectionDBError(523, `Error performing bulkWrite ${error.message} `);
        }
    }
    static descarteTotal(descarte) {
        /**
         * Funcion que suma los descartes 
         * 
         * @param {descarteObject} descarte - objeto de los descartes, ya sead escarte lavado o descarte encerado
         * @return {numeric} - el total del tipo de descarte
         */
        try {
            const sum = Object.values(descarte).reduce((acu, descarte) => acu += descarte, 0);
            return sum;
        } catch (err) {
            throw new ProcessError(416, `Error sumando los descartes ${err.message}`);
        }
    }


    static async getLotes2(options = {}) {
        const {
            ids = [],
            query = {},
            select = {},
            sort = { fecha_creacion: -1, fechaIngreso: -1 },
            limit = 50,
            skip = 0,
            populate = { path: 'predio', select: 'PREDIO ICA GGN SISPAP' }
        } = options;

        try {
            let lotesQuery = { ...query };

            if (ids.length > 0) {
                lotesQuery._id = { $in: ids };
            }

            const limitToUse = (limit === 0 || limit === 'all') ? 0 : limit;

            const lotes = await db.Lotes.find(lotesQuery)
                .select(select)
                .sort(sort)
                .limit(limitToUse)
                .skip(skip)
                .populate(populate)
                .lean()
                .exec();

            for (const lote of lotes) {
                lote.tipoFruta = tipoFrutaCache.getTipoFruta(lote.tipoFruta);
            }

            return lotes
        } catch (err) {
            throw new ConnectionDBError(522, `Error obteniendo lotes ${err.message}`);
        }
    }
    static async actualizar_lote(filter, update, options = {}, session = null, calculateFields = true) {
        // ...toda la magia anterior...
        /**
         * El update más lírico y funcional del reino Mongo.
         */
        const finalOptions = {
            new: true,
            ...options,
            ...(session && { session })
        };

        try {
            // 1. Actualiza el lote con los datos proporcionados y obtiene el nuevo estado
            let documento = await db.Lotes.findOneAndUpdate(filter, update, { ...finalOptions, new: true });
            if (!documento) throw new Error('Lote no encontrado');

            if (calculateFields) {
                // 2. Calcula los campos mágicos
                const get = (campo) => documento[campo] ?? 0;

                const frutaNacional = get('frutaNacional');
                const directoNacional = get('directoNacional');
                const kilos = get('kilos');
                const kilosVaciados = get('kilosVaciados');

                const exportacionPlano = documento.exportacion?.toObject?.() || null;

                const sumarDescartes = (desc) =>
                    desc ? Object.values(desc._doc ? desc._doc : desc).reduce((acu, item) => acu + (item ?? 0), 0) : 0;

                const totalDescarteLavado = sumarDescartes(documento.descarteLavado);
                const totalDescarteEncerado = sumarDescartes(documento.descarteEncerado);

                let deshidratacion = 100;
                let rendimiento = 0;
                if (kilos > 0) {

                    const exportacionTotal = exportacionPlano ? Object.values(exportacionPlano).reduce((acu1, contenedor) =>
                        acu1 += Object.values(contenedor).reduce((acu2, item) => acu2 += (item ?? 0), 0), 0) : 0;

                    const total = exportacionTotal + totalDescarteLavado + totalDescarteEncerado + frutaNacional + directoNacional;
                    deshidratacion = 100 - (total * 100) / kilos;
                    rendimiento = kilosVaciados === 0 ? 0 : ((exportacionTotal * 100) / kilosVaciados);
                }

                // 3. Si hay que actualizar la deshidratación, hazlo solo si cambia
                if (documento.deshidratacion !== deshidratacion || documento.rendimiento !== rendimiento) {
                    documento = await db.Lotes.findOneAndUpdate(
                        filter,
                        { deshidratacion, rendimiento },
                        {
                            ...finalOptions,
                            new: true,
                            skipAudit: true,
                            action: 'system:recalc_desh_rend'
                        }
                    );
                }

            }

            documento = await db.Lotes.findById(documento._id)
                .populate({ path: 'predio', select: 'PREDIO ICA GGN SISPAP' })
                .lean()
                .exec();

            documento.tipoFruta = tipoFrutaCache.getTipoFruta(documento.tipoFruta);

            return documento;

        } catch (err) {
            // Aquí los errores se lamentan en verso
            throw new ConnectionDBError(523, `Error modificando los datos: ${err.message}`);
        }
    }
    static async sumar_elemento(filter, elements) {
        try {

            const addArray = elements.map(c => ({ $ifNull: [`$${c}`, 0] }));

            const result = await db.Lotes.aggregate([
                { $match: filter },
                { $project: { sumaElementos: { $add: addArray } } },
                { $group: { _id: null, totalKilos: { $sum: '$sumaElementos' } } }
            ])

            return result[0]?.totalKilos || 0;

        } catch (err) {
            throw new ConnectionDBError(522, `Error obteniendo lotes ${err.message}`);
        }
    }
    static async eficiencia_lote(query) {
        try {
            const result = await db.Lotes.aggregate([
                { $match: query },
                {
                    $group: {
                        _id: null,
                        totalKilosIngreso: { $sum: { $ifNull: ["$kilos", 0] } },
                        totalKilosProcesados: { $sum: { $ifNull: ["$kilosVaciados", 0] } },
                        totalKilosExportacion: {
                            $sum: {
                                $add: [
                                    { $ifNull: ["$calidad1", 0] },
                                    { $ifNull: ["$calidad15", 0] },
                                    { $ifNull: ["$calidad2", 0] }
                                ]
                            }
                        },
                        totalKilosDescarte: {
                            $sum: {
                                $add: camposDescartes.map(campo => ({ $ifNull: [`$${campo}`, 0] }))
                            }
                        }
                    }
                }
            ]);
            return result[0]

        } catch (err) {
            throw new ConnectionDBError(522, `Error obteniendo lotes ${err.message}`);
        }
    }
    static async eficiencia_lote_calidad(query) {
        try {
            const result = await db.Lotes.aggregate([
                { $match: query },
                {
                    $group: {
                        _id: null,
                        totalKilosIngreso: { $sum: { $ifNull: ["$kilos", 0] } },
                        totalKilosProcesados: { $sum: { $ifNull: ["$kilosVaciados", 0] } },
                        totalKilosDescarte: {
                            $sum: {
                                $add: camposDescartes.map(campo => ({ $ifNull: [`$${campo}`, 0] }))
                            }
                        }
                    }
                }
            ]);
            return result[0]

        } catch (err) {
            throw new ConnectionDBError(522, `Error obteniendo lotes ${err.message}`);
        }
    }

    //#region EF8
    static async crear_lote_EF8(data, user, logId = null) {
        try {
            const query = {
                ...data,
                user: user._id
            }
            const lote = new db.LotesEF8(query);
            const new_lote = await lote.save();

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
            populate = [{ path: 'predio', select: 'PREDIO' }]
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
            let documento = await db.LotesEF8.findOneAndUpdate(filter, update, { ...finalOptions, new: true });
            if (!documento) throw new Error('Lote no encontrado');

            return documento;

        } catch (err) {
            throw new ConnectionDBError(523, `Error modificando los datos: ${err.message}`);
        }
    }
    //#endregion
}
