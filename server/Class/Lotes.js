const { historialDescarte } = require("../../DB/mongoDB/schemas/lotes/schemaHistorialDescarte");
const { Lotes } = require("../../DB/mongoDB/schemas/lotes/schemaLotes");
const { recordLotes } = require("../../DB/mongoDB/schemas/lotes/schemaRecordLotes");
const { PostError, PutError, ConnectionDBError } = require("../../Error/ConnectionErrors");
const { ItemBussyError, ProcessError } = require("../../Error/ProcessError");
const fs = require('fs')


let bussyIds = new Set();

class LotesRepository {
    static async addLote(data, user) {
        /**
         * Funcion que agrega un lote a la base de datos lote de mongoDB
         * 
         * @param {object} data - Recibe un objeto, donde estan los datos del lote que se va a ingresar, 
         *                        ademas del tipo de accion, y tipo de accion que se esta haciendo, el usuario y el cargo
         */


        try {
            const lote = new Lotes(data);
            const saveLote = await lote.save();
            let record = new recordLotes({ operacionRealizada: 'crearLote', user: user, documento: saveLote })
            await record.save();
            return saveLote
        } catch (err) {
            throw new PostError(409, `Error agregando lote ${err.message}`);
        }
    }
    static async crear_lote(data, user, otherInfo = {}) {
        /**
         * Funcion que agrega un lote a la base de datos lote de mongoDB
         * 
         * @param {object} data - Recibe un objeto, donde estan los datos del lote que se va a crear
         * @param {string} user - el usuario que esta creando el lote
         */
        try {
            const lote = new Lotes(data);
            const new_lote = await lote.save();
            let record = new recordLotes({
                operacionRealizada: 'crear lote celifrut',
                user: user,
                documento: { ...new_lote, otherInfo: otherInfo }
            })
            await record.save();
            return new_lote;
        } catch (err) {
            throw new PostError(409, `Error agregando lote ${err.message}`);
        }
    }
    static async getLotes(options = {}) {
        /**
         * Funcion que obtiene lotes de la base de datos de MongoDB.
         *
         * @param {Object} options - Objeto de configuración para obtener los lotes.
         * @param {Array<string>} [options.ids=[]] - Array de IDs de los lotes a obtener.
         * @param {Object} [options.query={}] - Filtros adicionales para la consulta.
         * @param {Object} [options.select={}] - Campos a seleccionar en los documentos obtenidos.
         * @param {Object} [options.sort={ fechaIngreso: -1 }] - Criterios de ordenación para los resultados.
         * @param {number} [options.limit=50] - Número máximo de documentos a obtener.
         * @param {number} [options.skip=0] - Número de documentos a omitir desde el inicio.
         * @param {Object} [options.populate={ path: 'predio', select: 'PREDIO ICA' }] - Configuración para la población de referencias.
         * @returns {Promise<Array>} - Promesa que resuelve a un array de lotes obtenidos.
         * @throws {PostError} - Lanza un error si ocurre un problema al obtener los lotes.
         */
        const {
            ids = [],
            query = {},
            select = {},
            sort = { fecha_creacion: -1, },
            limit = 50,
            skip = 0,
            populate = { path: 'predio', select: 'PREDIO ICA GGN' }
        } = options;
        try {
            let lotesQuery = { ...query };

            if (ids.length > 0) {
                lotesQuery._id = { $in: ids };
            }
            const lotes = await Lotes.find(lotesQuery)
                .select(select)
                .populate(populate)
                .sort(sort)
                .limit(limit)
                .skip(skip)
                .exec();

            return lotes

        } catch (err) {
            throw new ConnectionDBError(408, `Error obteniendo lotes ${err.message}`);
        }
    }
    // static async modifyLote(data) {
    //     /**
    //      * Funcion que modifica el lote especifico en la base de datos
    //      * 
    //      * @param {object} data - objeto con los datos de la peticion, la _id del lote 
    //      *                        y los datos que se van a modificar en el elemento
    //      * @return - retorna el lote ya modificado en forma de objeto js, para procesamientos futuros
    //      */
    //     const id = data.data.data.query._id;
    //     const query = data.data.data.query;
    //     const action = data.data.action;
    //     const user = data.user.user;
    //     this.validateBussyIds(id)
    //     try {
    //         const lote = await Lotes.findOneAndUpdate({ _id: id }, query, { new: true });
    //         const lote_obj = new Object(lote.toObject());
    //         let record = new recordLotes({ operacionRealizada: action, user: user, documento: query })
    //         await record.save()
    //         return lote_obj;
    //     } catch (err) {
    //         throw new PutError(414, `Error al modificar el dato  ${err.essage}`);
    //     } finally {
    //         bussyIds.delete(id);
    //     }
    // }
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

            const lote = await Lotes.findOneAndUpdate({ _id: id, __v: __v }, query, { new: true });
            const lote_obj = new Object(lote.toObject());

            let record = new recordLotes({ operacionRealizada: action, user: user, documento: { ...query, _id: id } })
            await record.save()
            return lote_obj;
        } catch (err) {
            throw new PutError(414, `Error al modificar el dato ${id} => ${err.name} `);
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
            const lote = await Lotes.findOneAndUpdate({ _id: id, }, query, { new: true });

            const lote_obj = new Object(lote.toObject());
            let record = new recordLotes({ operacionRealizada: action, user: user, documento: { ...query, _id: id } })
            await record.save()
            return lote_obj;
        } catch (err) {
            throw new PutError(414, `Error al modificar el dato  ${err.name}`);
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

            await Lotes.updateOne({ _id: id }, { rendimiento: rendimiento });

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
            const descarteLavado = this.descarteTotal(data.descarteLavado);
            const descarteEncerado = this.descarteTotal(data.descarteEncerado);
            const frutaNacional = data.frutaNacional;
            const directoNacional = data.directoNacional;
            const calidad1 = data.calidad1;
            const calidad15 = data.calidad15;
            const calidad2 = data.calidad2;
            const total = calidad1 + calidad15 + calidad2 + descarteLavado + descarteEncerado + frutaNacional + directoNacional;
            const deshidratacion = 100 - (total * 100) / kilosTotal;
            await Lotes.updateOne({ _id: id }, { deshidratacion: deshidratacion });

            return deshidratacion;

        } catch (err) {
            throw new ProcessError(415, `Error sumando los descartes ${err.message}`);
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

            const descarte = new historialDescarte(query);

            await descarte.save();

            let record = new recordLotes({ operacionRealizada: 'enviar_descarte', user: data.user.user, documento: descarte })
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
            throw new ProcessError(416, `Error obteniendo la imagen ${err.message}`);
        }
    }
    static async eliminar_lote(id, user, action) {
        try {
            const lote = await Lotes.deleteOne({ id: id })
            let record = new recordLotes({
                operacionRealizada: action,
                user: user,
                documento: lote
            })
            await record.save();
        } catch (err) {
            throw new ProcessError(416, `Error eliminando lote ${err.message}`);

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

        // const lote = await Lotes.findById(data._id).populate("predio", "PREDIO ICA DEPARTAMENTO GGN");
        // const contIds = lote.contenedores.map(item => new mongoose.Types.ObjectId(item));


    }

}

module.exports.LotesRepository = LotesRepository