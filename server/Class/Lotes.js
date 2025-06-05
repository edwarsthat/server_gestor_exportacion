import { db } from "../../DB/mongoDB/config/init.js";
import { PostError, PutError, ConnectionDBError } from "../../Error/ConnectionErrors.js";
import { ItemBussyError, ProcessError } from "../../Error/ProcessError.js";
import fs from 'fs';

let bussyIds = new Set();

export class LotesRepository {
    static async addLote(data, user) {
        try {
            const lote = new db.Lotes(data);
            lote._user = user;
            const saveLote = await lote.save();
            let record = new db.recordLotes({ operacionRealizada: 'crearLote', user: user, documento: saveLote })
            await record.save();
            return saveLote
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



    static async modificar_lote(id, query, action, user, __v = 0) {
        /**
         * Modifica un lote en la base de datos de MongoDB.
         *
         * @param {string} id - ID del lote a modificar.
         * @param {Object} query - Objeto con los cambios a aplicar al lote.
         * @param {string} action - Descripción de la acción realizada.
         * @param {string} user - Usuario que realiza la acción.
         * @returns {Promise<Object>} - Promesa que resuelve al objeto del lote modificado.
         * @throws {PutError} - Lanza un error si ocurre un problema al modificar el lote.
         */
        this.validateBussyIds(id)
        try {

            const lote = await db.Lotes.findOneAndUpdate({ _id: id, __v: __v }, query, { new: true });
            const lote_obj = new Object(lote.toObject());

            let record = new db.recordLotes({ operacionRealizada: action, user: user, documento: { ...query, _id: id } })
            await record.save()
            return lote_obj;
        } catch (err) {
            throw new PutError(523, `Error ${err.name} -- ${id} - ${query}`);
        } finally {
            bussyIds.delete(id);
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
        this.validateBussyIds(id)
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
        } finally {
            bussyIds.delete(id);
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
        this.validateBussyIds(id)
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
        } finally {
            bussyIds.delete(id);
        }
    }
    static async add_historial_descarte(data) {
        /**
        * Función que agrega un historial de descarte en la base de datos.
        *
        * @param {Object} data - Objeto que contiene la información necesaria para agregar el historial de descarte.
        * @param {Object} data.data - Datos necesarios para crear el historial de descarte.
        * @param {Object} data.data.datos - Información adicional del descarte.
        * @param {Array<string>} data.data.inventario - Inventario de fruta de salida para el descarte.
        * @param {Object} data.user - Información del usuario que realiza la operación.
        * @param {string} data.user.user - Nombre o identificador del usuario.
        * @throws {ProcessError} - Lanza un error si ocurre un problema al agregar el historial de descarte.
        */
        try {
            const descarteI = data.data.inventario
            const query = {
                ...data.data.datos,
                frutaSalida: descarteI
            }

            const descarte = new db.historialDescarte(query);

            await descarte.save();

            let record = new db.recordLotes({ operacionRealizada: 'enviar_descarte', user: data.user.user, documento: descarte })
            await record.save();

        } catch (err) {
            throw new ProcessError(415, `Error creando el registro del descarte ${err.message}`);
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
    static validateBussyIds(id) {
        /**
         * Funcion que añade el id del elemento que se este m0odificando para que no se creen errores de doble escritura
         * 
         * @param {string} id - El id del elemento que se esta modificando
         */
        if (bussyIds.has(id)) throw new ItemBussyError(413, "Elemento no disponible por el momento");
        bussyIds.add(id)
    }
    static async crear_informe_lote() {

        // const lote = await db.Lotes.findById(data._id).populate("predio", "PREDIO ICA DEPARTAMENTO GGN");
        // const contIds = lote.contenedores.map(item => new mongoose.Types.ObjectId(item));


    }

    static async actualizar_lote(filter, update, options = {}, session = null, user = '', action = '') {
        /**
         * Función genérica para actualizar documentos en MongoDB usando Mongoose
         *
         * @param {Model} model - Modelo Mongoose (db.Lotes, etc.)
         * @param {Object} filter - Objeto de filtrado para encontrar el documento
         * @param {Object} update - Objeto con los campos a actualizar
         * @param {Object} options - Opciones adicionales de findOneAndUpdate (opcional)
         * @param {ClientSession} session - Sesión de transacción (opcional)
         * @returns Documento actualizado
         */
        const defaultOptions = { new: true }; // retorna el documento actualizado
        const finalOptions = session
            ? { ...defaultOptions, ...options, session }
            : { ...defaultOptions, ...options };
        // finalOptions.user = user;
        // finalOptions.action = action;

        try {
            const documentoActualizado = await db.Lotes.findOneAndUpdate(
                filter,
                update,
                finalOptions,
                { new: true, user: user, action: action }
            );
            return documentoActualizado;
        } catch (err) {
            throw new ConnectionDBError(523, `Error modificando los datos${err.message}`);

        }
    }

}
