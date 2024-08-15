const { Contenedores } = require("../../DB/mongoDB/schemas/contenedores/schemaContenedores");
const { recordContenedores } = require("../../DB/mongoDB/schemas/contenedores/schemaRecordContenedores");
const { ConnectionDBError } = require("../../Error/ConnectionErrors");
const { ProcessError, ItemBussyError } = require("../../Error/ProcessError");
const { oobtener_datos_lotes_to_listaEmpaque } = require("../mobile/utils/contenedoresLotes");
let bussyIds = new Set();
class ContenedoresRepository {
    static async crearContenedor(data) {
        /**
         * Función que crea un nuevo contenedor en la base de datos de MongoDB.
         *
         * @param {Object} data - Objeto que contiene la información del contenedor y del usuario.
         * @param {Object} data.data - Información del contenedor a crear.
         * @param {Object} data.user - Información del usuario que realiza la operación.
         * @returns {Promise<void>} - Promesa que se resuelve cuando el contenedor ha sido creado y registrado.
         * @throws {ProcessError} - Lanza un error si ocurre un problema al crear el contenedor.
         */
        try {
            const contenedor = new Contenedores(data.data.data);
            const contenedorGuardado = await contenedor.save();

            let record = new recordContenedores({ operacionRealizada: 'crearContenedor', user: data.user.user, documento: contenedorGuardado })
            await record.save();

        } catch (err) {
            throw new ProcessError(421, `Error creando contenedor: ${err.name}`);

        }
    }
    static async get_Contenedores_sin_lotes(options = {}) {
        /**
         * Función que obtiene contenedores de la base de datos de MongoDB.
         *
         * @param {Object} options - Objeto de configuración para obtener los contenedores.
         * @param {Array<string>} [options.ids=[]] - Array de IDs de los contenedores a obtener.
         * @param {Object} [options.query={}] - Filtros adicionales para la consulta.
         * @param {Object} [options.select={}] - Campos a seleccionar en los documentos obtenidos.
         * @param {Object} [options.sort={ 'infoContenedor.fechaCreacion': -1 }] - Criterios de ordenación para los resultados.
         * @param {number} [options.limit=50] - Número máximo de documentos a obtener.
         * @param {number} [options.skip=0] - Número de documentos a omitir desde el inicio.
         * @param {Object} [options.populate={ path: 'infoContenedor.clienteInfo', select: 'CLIENTE' }] - Configuración para la población de referencias.
         * @returns {Promise<Array>} - Promesa que resuelve a un array de contenedores obtenidos.
         * @throws {ConnectionDBError} - Lanza un error si ocurre un problema al obtener los contenedores.
         */
        const {
            ids = [],
            query = {},
            select = {},
            sort = { 'infoContenedor.fechaCreacion': -1 },
            limit = 50,
            skip = 0,
            populate = {
                path: 'infoContenedor.clienteInfo',
                select: 'CLIENTE',
            },
        } = options;
        try {
            let contenedorQuery = { ...query };

            if (ids.length > 0) {
                contenedorQuery._id = { $in: ids };
            }
            const contenedores = await Contenedores.find(contenedorQuery)
                .select(select)
                .populate(populate)
                .sort(sort)
                .limit(limit)
                .skip(skip)
                .exec();


            return contenedores

        } catch (err) {
            throw new ConnectionDBError(408, `Error obteniendo contenedores ${err.message}`);
        }
    }
    static async getContenedores(options = {}) {
        /**
         * Función que obtiene contenedores de la base de datos de MongoDB.
         *
         * @param {Object} options - Objeto de configuración para obtener los contenedores.
         * @param {Array<string>} [options.ids=[]] - Array de IDs de los contenedores a obtener.
         * @param {Object} [options.query={}] - Filtros adicionales para la consulta.
         * @param {Object} [options.select={}] - Campos a seleccionar en los documentos obtenidos.
         * @param {Object} [options.sort={ 'infoContenedor.fechaCreacion': -1 }] - Criterios de ordenación para los resultados.
         * @param {number} [options.limit=50] - Número máximo de documentos a obtener.
         * @param {number} [options.skip=0] - Número de documentos a omitir desde el inicio.
         * @param {Object} [options.populate={ path: 'infoContenedor.clienteInfo', select: 'CLIENTE' }] - Configuración para la población de referencias.
         * @returns {Promise<Array>} - Promesa que resuelve a un array de contenedores obtenidos.
         * @throws {ConnectionDBError} - Lanza un error si ocurre un problema al obtener los contenedores.
         */
        const {
            ids = [],
            query = {},
            select = {},
            sort = { 'infoContenedor.fechaCreacion': -1 },
            limit = 50,
            skip = 0,
            populate = {
                path: 'infoContenedor.clienteInfo',
                select: 'CLIENTE',
            },
        } = options;
        try {
            let contenedorQuery = { ...query };

            if (ids.length > 0) {
                contenedorQuery._id = { $in: ids };
            }
            const contenedores = await Contenedores.find(contenedorQuery)
                .select(select)
                .populate(populate)
                .sort(sort)
                .limit(limit)
                .skip(skip)
                .exec();

            const new_conts = contenedores.map(contenedor => contenedor.toObject());
            const response = await oobtener_datos_lotes_to_listaEmpaque(new_conts);
            return response

        } catch (err) {
            throw new ConnectionDBError(408, `Error obteniendo contenedores ${err.message}`);
        }
    }
    static async agregar_settings_pallet(id, pallet, settings, action, user) {
        /**
         * Función que agrega o actualiza la configuración de un pallet en un contenedor.
         *
         * @param {string} id - ID del contenedor en el que se va a actualizar el pallet.
         * @param {string} pallet - Identificador del pallet dentro del contenedor.
         * @param {Object} settings - Objeto con los ajustes del pallet.
         * @param {string} settings.tipoCaja - Tipo de caja del pallet.
         * @param {string} settings.calidad - Calidad del pallet.
         * @param {string} settings.calibre - Calibre del pallet.
         * @param {string} action - Acción realizada para registrar en el historial.
         * @param {string} user - Usuario que realiza la acción.
         * @returns {Promise<void>} - Promesa que se resuelve cuando la operación se completa.
         * @throws {ConnectionDBError} - Lanza un error si ocurre un problema al actualizar el pallet.
         */
        this.validateBussyIds(id)
        try {
            const contenedor = await Contenedores.findById({ _id: id });
            if (!contenedor) throw new ConnectionDBError(407, "La busqueda de contenedores retorna null")

            contenedor.pallets[pallet].get("settings").tipoCaja = settings.tipoCaja;
            contenedor.pallets[pallet].get("settings").calidad = settings.calidad;
            contenedor.pallets[pallet].get("settings").calibre = settings.calibre;
            await Contenedores.updateOne({ _id: id }, { $set: { pallets: contenedor.pallets } });


            let record = new recordContenedores({
                operacionRealizada: action,
                user: user,
                documento: {
                    contenedor: id,
                    pallet: pallet,
                    settings: settings
                }
            })
            await record.save();

        } catch (err) {
            throw new ConnectionDBError(408, `Error guardando la configuracion del pallet ${err.message}`);
        } finally {
            bussyIds.delete(id);
        }
    }
    static async actualizar_pallet_contenedor(id, pallet, item, action, user) {
        /**
         * Función que actualiza un pallet en un contenedor agregando un nuevo item.
         *
         * @param {string} id - ID del contenedor en el que se va a actualizar el pallet.
         * @param {string} pallet - Identificador del pallet dentro del contenedor.
         * @param {Object} item - Objeto del item a agregar en el pallet.
         * @param {string} action - Acción realizada para registrar en el historial.
         * @param {string} user - Usuario que realiza la acción.
         * @returns {Promise<Object>} - Promesa que resuelve al contenedor actualizado.
         * @throws {ConnectionDBError} - Lanza un error si ocurre un problema al actualizar el pallet.
         */
        this.validateBussyIds(id)
        try {
            const contenedor = await Contenedores.findById({ _id: id });
            if (!contenedor) throw new ConnectionDBError(407, "La busqueda de contenedores retorna null")

            contenedor.pallets[pallet].get("EF1").push(item);
            await Contenedores.updateOne({ _id: id }, { $set: { pallets: contenedor.pallets } });

            let record = new recordContenedores({
                operacionRealizada: action,
                user: user,
                documento: {
                    contenedor: id,
                    pallet: pallet,
                    item: item
                }
            })
            await record.save();

            return contenedor;
        } catch (err) {
            throw new ConnectionDBError(408, `Error guardando el item en el pallet ${err.message}`);
        } finally {
            bussyIds.delete(id);
        }
    }
    static async eliminar_items_lista_empaque(id, pallet, seleccion, action, user) {
        /**
         * Función que elimina items de la lista de empaque de un pallet en un contenedor.
         *
         * @param {string} id - ID del contenedor en el que se va a actualizar el pallet.
         * @param {string} pallet - Identificador del pallet dentro del contenedor.
         * @param {Array<number>} seleccion - Índices de los items a eliminar en la lista de empaque.
         * @param {string} action - Acción realizada para registrar en el historial.
         * @param {string} user - Usuario que realiza la acción.
         * @returns {Promise<Array>} - Promesa que resuelve a un array con los items eliminados.
         * @throws {ConnectionDBError} - Lanza un error si ocurre un problema al eliminar los items del pallet.
         */
        this.validateBussyIds(id)
        try {
            const len = seleccion.length;
            let cajas = [];
            const contenedor = await Contenedores.findById({ _id: id });
            for (let i = 0; i < len; i++) {
                cajas.push(contenedor.pallets[pallet].get("EF1").splice(seleccion[i], 1)[0]);
            }
            await Contenedores.updateOne({ _id: id }, { $set: { pallets: contenedor.pallets } });

            let record = new recordContenedores({
                operacionRealizada: action,
                user: user,
                documento: {
                    contenedor: id,
                    pallet: pallet,
                    item: cajas
                }
            })
            await record.save();

            return cajas;

        } catch (err) {
            throw new ConnectionDBError(408, `Error eliminando el item en el pallet ${err.message}`);
        } finally {
            bussyIds.delete(id);
        }
    }
    static async restar_item_lista_empaque(id, pallet, seleccion, cajas, action, user) {
        /**
         * Función que resta una cantidad de cajas de un item en la lista de empaque de un pallet en un contenedor.
         *
         * @param {string} id - ID del contenedor en el que se va a actualizar el pallet.
         * @param {string} pallet - Identificador del pallet dentro del contenedor.
         * @param {number} seleccion - Índice del item en la lista de empaque al que se le va a restar cajas.
         * @param {number} cajas - Cantidad de cajas a restar del item seleccionado.
         * @param {string} action - Acción realizada para registrar en el historial.
         * @param {string} user - Usuario que realiza la acción.
         * @returns {Promise<void>} - Promesa que se resuelve cuando la operación se completa.
         * @throws {ConnectionDBError} - Lanza un error si ocurre un problema al restar las cajas del item en el pallet.
         */
        this.validateBussyIds(id)
        try {
            let item;

            const contenedor = await Contenedores.findById({ _id: id });
            if (!contenedor) throw new ConnectionDBError(407, "La busqueda de contenedores retorna null")

            contenedor.pallets[pallet].get("EF1")[seleccion].cajas -= cajas;

            item = contenedor.pallets[pallet].get("EF1")[seleccion];
            if (contenedor.pallets[pallet].get("EF1")[seleccion].cajas === 0) {
                contenedor.pallets[pallet].get("EF1").splice(seleccion, 1)[0];
            }
            await Contenedores.updateOne({ _id: id }, { $set: { pallets: contenedor.pallets } });


            let record = new recordContenedores({
                operacionRealizada: action,
                user: user,
                documento: {
                    contenedor: id,
                    pallet: pallet,
                    item: item,
                    cajas: cajas
                }
            })
            await record.save();
            return item;
        } catch (err) {
            throw new ConnectionDBError(408, `Error restando el item en el pallet ${err.message}`);
        } finally {
            bussyIds.delete(id);
        }
    }
    static async mover_items_lista_empaque(id1, id2, pallet1, pallet2, seleccion, action, user) {
        /**
         * Función que mueve items de la lista de empaque de un pallet en un contenedor a otro pallet en otro contenedor.
         *
         * @param {string} id1 - ID del contenedor origen.
         * @param {string} id2 - ID del contenedor destino.
         * @param {string} pallet1 - Identificador del pallet en el contenedor origen.
         * @param {string} pallet2 - Identificador del pallet en el contenedor destino.
         * @param {Array<number>} seleccion - Índices de los items a mover en la lista de empaque.
         * @param {string} action - Acción realizada para registrar en el historial.
         * @param {string} user - Usuario que realiza la acción.
         * @returns {Promise<void>} - Promesa que se resuelve cuando la operación se completa.
         * @throws {ConnectionDBError} - Lanza un error si ocurre un problema al mover los items entre los pallets.
         */

        if (id1 === id2) {
            this.validateBussyIds(id1)
        } else {
            this.validateBussyIds(id1)
            this.validateBussyIds(id2)
        }
        try {
            const len = seleccion.length;
            let cajas = [];

            const contenedor = await Contenedores.findById({ _id: id1 });
            for (let i = 0; i < len; i++) {
                cajas.push(contenedor.pallets[pallet1].get("EF1").splice(seleccion[i], 1)[0]);
            }
            await Contenedores.updateOne({ _id: id1 }, { $set: { pallets: contenedor.pallets } });


            const contenedor2 = await Contenedores.findById({ _id: id2 });
            for (let i = 0; i < len; i++) {
                contenedor2.pallets[pallet2].get("EF1").push(cajas[i]);
            }
            await Contenedores.updateOne({ _id: id2 }, { $set: { pallets: contenedor2.pallets } });

            let record = new recordContenedores({
                operacionRealizada: action,
                user: user,
                documento: {
                    contenedor1: id1,
                    contenedor2: id2,
                    pallet1: pallet1,
                    pallet2: pallet2,
                    item: cajas
                }
            })
            await record.save();

            return cajas

        } catch (err) {
            throw new ConnectionDBError(408, `Error mmoviendo el item entre contenedores ${err.message}`);
        } finally {

            if (id1 === id2) {
                bussyIds.delete(id1);
            } else {
                bussyIds.delete(id1);
                bussyIds.delete(id2);
            }
        }
    }
    static async agregar_items_lista_empaque(id, pallet, cajas, action, user) {
        /**
         * Función que agrega una lista de cajas a un pallet en un contenedor.
         *
         * @param {string} id - ID del contenedor en el que se va a actualizar el pallet.
         * @param {string} pallet - Identificador del pallet dentro del contenedor.
         * @param {Array} cajas - Lista de cajas a agregar al pallet.
         * @param {string} action - Acción realizada para registrar en el historial.
         * @param {string} user - Usuario que realiza la acción.
         * @returns {Promise<void>} - Promesa que se resuelve cuando la operación se completa.
         * @throws {ConnectionDBError} - Lanza un error si ocurre un problema al agregar las cajas al pallet.
         */
        this.validateBussyIds(id)
        try {
            const contenedor = await Contenedores.findById({ _id: id });
            for (let i = 0; i < cajas.length; i++) {
                contenedor.pallets[pallet].get("EF1").push(cajas[i]);
            }
            await Contenedores.updateOne({ _id: id }, { $set: { pallets: contenedor.pallets } });

            let record = new recordContenedores({
                operacionRealizada: action,
                user: user,
                documento: {
                    contenedor: id,
                    pallet: pallet,
                    item: cajas
                }
            })
            await record.save();
        } catch (err) {
            throw new ConnectionDBError(408, `Error restando el item en el pallet ${err.message}`);
        } finally {
            bussyIds.delete(id);
        }
    }
    static async restar_mover_items_lista_empaque(id1, id2, pallet1, pallet2, seleccion, cajas, action, user) {
        /**
         * Función que resta una cantidad de cajas de un item en un pallet de un contenedor y lo mueve a otro pallet en otro contenedor.
         *
         * @param {string} id1 - ID del contenedor origen.
         * @param {string} id2 - ID del contenedor destino.
         * @param {string} pallet1 - Identificador del pallet origen dentro del contenedor id1.
         * @param {string} pallet2 - Identificador del pallet destino dentro del contenedor id2.
         * @param {number} seleccion - Índice del item en la lista de empaque del pallet origen al que se le va a restar cajas.
         * @param {number} cajas - Cantidad de cajas a restar del item seleccionado y mover al pallet destino.
         * @param {string} action - Acción realizada para registrar en el historial.
         * @param {string} user - Usuario que realiza la acción.
         * @returns {Promise<Object>} - Promesa que se resuelve con el item movido cuando la operación se completa.
         * @throws {ConnectionDBError} - Lanza un error si ocurre un problema al restar o mover las cajas entre los pallets.
         */
        if (id1 === id2) {
            this.validateBussyIds(id1)
        } else {
            this.validateBussyIds(id1)
            this.validateBussyIds(id2)
        }
        try {
            let item;
            //se restan las cajas en el item
            const contenedor = await Contenedores.findById({ _id: id1 });
            if (!contenedor) throw new ConnectionDBError(407, "La busqueda de contenedores retorna null")

            contenedor.pallets[pallet1].get("EF1")[seleccion].cajas -= cajas;
            item = contenedor.pallets[pallet1].get("EF1")[seleccion];
            if (contenedor.pallets[pallet1].get("EF1")[seleccion].cajas === 0) {
                contenedor.pallets[pallet1].get("EF1").splice(seleccion, 1)[0];
            }
            await Contenedores.updateOne({ _id: id1 }, { $set: { pallets: contenedor.pallets } });

            //se añade el item al contenedor
            const contenedor2 = await Contenedores.findById({ _id: id2 });
            if (!contenedor2) throw new ConnectionDBError(407, "La busqueda de contenedores retorna null")

            item.cajas = cajas;
            contenedor2.pallets[pallet2].get("EF1").push(item);
            await Contenedores.updateOne({ _id: id2 }, { $set: { pallets: contenedor2.pallets } });

            let record = new recordContenedores({
                operacionRealizada: action,
                user: user,
                documento: {
                    contenedor1: id1,
                    contenedor2: id2,
                    pallet1: pallet1,
                    pallet2: pallet2,
                    cajas: cajas,
                    item: item
                }
            })
            await record.save();

            return item
        } catch (err) {
            throw new ConnectionDBError(408, `Error mmoviendo y restando el item entre contenedores ${err.message}`);
        } finally {

            if (id1 === id2) {
                bussyIds.delete(id1);
            } else {
                bussyIds.delete(id1);
                bussyIds.delete(id2);
            }
        }
    }
    static async liberar_pallet_lista_empaque(id, pallet, item, action, user) {
        this.validateBussyIds(id)
        try {
            const contenedor = await Contenedores.findById({ _id: id });
            if (!contenedor) throw new ConnectionDBError(407, "La busqueda de contenedores retorna null");

            contenedor.pallets[pallet].get("listaLiberarPallet").rotulado = item.rotulado;
            contenedor.pallets[pallet].get("listaLiberarPallet").paletizado = item.paletizado;
            contenedor.pallets[pallet].get("listaLiberarPallet").enzunchado = item.enzunchado;
            contenedor.pallets[pallet].get("listaLiberarPallet").estadoCajas = item.estadoCajas;
            contenedor.pallets[pallet].get("listaLiberarPallet").estiba = item.estiba;

            await Contenedores.updateOne({ _id: id }, { $set: { pallets: contenedor.pallets } });


            let record = new recordContenedores({
                operacionRealizada: action,
                user: user,
                documento: {
                    contenedor: id,
                    pallet: pallet,
                    item: item
                }
            })
            await record.save();

        } catch (err) {
            throw new ConnectionDBError(408, `Error guardando la liberacion del pallet ${err.message}`);
        } finally {
            bussyIds.delete(id);
        }
    }
    static async cerrar_lista_empaque(id, action, user) {
        this.validateBussyIds(id)
        try {

            await Contenedores.updateOne({ _id: id }, { 'infoContenedor.cerrado': true });

            let record = new recordContenedores({
                operacionRealizada: action,
                user: user,
                documento: {
                    contenedor: id,
                    cerrado: true,
                }
            })
            await record.save();
        } catch (err) {
            throw new ConnectionDBError(408, `Error cerrando el contenedor ${err.message}`);
        } finally {
            bussyIds.delete(id);
        }
    }
    static async modificar_items_pallet(id, pallet, seleccion, data, action, user) {
        this.validateBussyIds(id)
        try {
            const contenedor = await Contenedores.findById({ _id: id });
            if (!contenedor) throw new ConnectionDBError(407, "La busqueda de contenedores retorna null");

            let oldData = JSON.parse(JSON.stringify(contenedor.pallets[pallet].get("EF1")));
            for (let i = 0; i < seleccion.length; i++) {
                contenedor.pallets[pallet].get("EF1")[seleccion[i]].calidad = data.calidad;
                contenedor.pallets[pallet].get("EF1")[seleccion[i]].calibre = data.calibre;
            }

            await Contenedores.updateOne({ _id: id }, { $set: { pallets: contenedor.pallets } });
            let record = new recordContenedores({
                operacionRealizada: action,
                user: user,
                documento: {
                    contenedor: id,
                    pallet: pallet,
                    seleccion: seleccion,
                    data: data,
                    dataVieja: oldData,
                }
            })
            await record.save();
            return oldData;
        } catch (err) {
            throw new ConnectionDBError(408, `Error modificando los datos${err.message}`);
        } finally {
            bussyIds.delete(id);
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
}

module.exports.ContenedoresRepository = ContenedoresRepository
