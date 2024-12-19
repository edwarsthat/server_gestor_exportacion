const { db } = require("../../DB/mongoDB/config/init");
const { ConnectionDBError, PutError } = require("../../Error/ConnectionErrors");
const { ProcessError, ItemBussyError } = require("../../Error/ProcessError");
const { oobtener_datos_lotes_to_listaEmpaque } = require("../mobile/utils/contenedoresLotes");
let bussyIds = new Set();
let lockedItems = new Map();

class ContenedoresRepository {

    static lockItem(_id, elemento, pallet = -1) {
        const key = `${_id}:${elemento}:${pallet}`
        if (lockedItems.has(key)) {
            throw new ItemBussyError(413, 'El elemento ya está bloqueado');
        }
        lockedItems.set(key, Date.now());
        console.log(lockedItems)
    }
    static unlockItem(_id, elemento, pallet = 0) {
        const key = `${_id}:${elemento}:${pallet}`
        lockedItems.delete(key);
    }


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
            const contenedor = new db.Contenedores(data.data.data);
            const contenedorGuardado = await contenedor.save();

            let record = new db.recordContenedores({ operacionRealizada: 'crearContenedor', user: data.user.user, documento: contenedorGuardado })
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
            const contenedores = await db.Contenedores.find(contenedorQuery)
                .select(select)
                .populate(populate)
                .sort(sort)
                .limit(limit)
                .skip(skip)
                .exec();


            return contenedores

        } catch (err) {
            throw new ConnectionDBError(520, `Error obteniendo contenedores ${options} --- ${err.message}`);
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
                select: 'CLIENTE PAIS_DESTINO',
            },
        } = options;
        try {
            let contenedorQuery = { ...query };

            if (ids.length > 0) {
                contenedorQuery._id = { $in: ids };
            }
            const contenedores = await db.Contenedores.find(contenedorQuery)
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
        try {
            this.lockItem(id, "pallets", pallet)

            const contenedor = await db.Contenedores.findById({ _id: id });
            if (!contenedor) throw new ConnectionDBError(407, "La busqueda de contenedores retorna null")

            contenedor.pallets[pallet].get("settings").tipoCaja = settings.tipoCaja;
            contenedor.pallets[pallet].get("settings").calidad = settings.calidad;
            contenedor.pallets[pallet].get("settings").calibre = settings.calibre;
            await db.Contenedores.updateOne({ _id: id }, {
                $set: { [`pallets.${pallet}`]: contenedor.pallets[pallet] }
            });


            let record = new db.recordContenedores({
                operacionRealizada: action,
                user: user,
                documento: {
                    contenedor: id,
                    pallet: pallet,
                    settings: settings
                }
            })
            await record.save();
            return contenedor

        } catch (err) {
            throw new ConnectionDBError(408, `Error guardando la configuracion del pallet ${err.message}`);
        } finally {
            this.unlockItem(id, "pallets", pallet)
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
        try {
            this.lockItem(id, "pallets", pallet)

            const contenedor = await db.Contenedores.findById({ _id: id });
            if (!contenedor) throw new ConnectionDBError(407, "La busqueda de contenedores retorna null")

            contenedor.pallets[pallet].get("EF1").push(item);
            await db.Contenedores.updateOne({ _id: id }, { $set: { pallets: contenedor.pallets } });

            let record = new db.recordContenedores({
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
            this.unlockItem(id, "pallets", pallet)
        }
    }
    static async actualizar_pallet_item_contenedor(id, pallet, item, newPallet, action, user) {

        try {
            this.lockItem(id, "pallets", pallet)
            await db.Contenedores.updateOne(
                { _id: id },
                {
                    $set: {
                        [`pallets.${pallet}`]: newPallet
                    }
                });

            //se guarda el record
            let record = new db.recordContenedores({
                operacionRealizada: action,
                user: user,
                documento: {
                    contenedor: id,
                    pallet: pallet,
                    item: {
                        lote: item.lote,
                        cajas: item.cajas
                    }
                }
            })
            await record.save();

        } catch (err) {
            throw new ConnectionDBError(408, `Error modificando el item en el pallet ${err.message}`);
        } finally {
            this.unlockItem(id, "pallets", pallet)
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
        this.lockItem(id, "pallets", pallet)
        try {
            const len = seleccion.length;
            let cajas = [];
            const contenedor = await db.Contenedores.findById({ _id: id });
            for (let i = 0; i < len; i++) {
                cajas.push(contenedor.pallets[pallet].get("EF1").splice(seleccion[i], 1)[0]);
            }
            await db.Contenedores.updateOne({ _id: id },
                {
                    $set:
                        { [`pallets.${pallet}`]: contenedor.pallets[pallet] }
                });

            let record = new db.recordContenedores({
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
            this.unlockItem(id, "pallets", pallet)
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
        try {
            this.lockItem(id, "pallets", pallet)

            let item;

            const contenedor = await db.Contenedores.findById({ _id: id });
            if (!contenedor) throw new ConnectionDBError(407, "La busqueda de contenedores retorna null")

            contenedor.pallets[pallet].get("EF1")[seleccion].cajas -= cajas;

            item = contenedor.pallets[pallet].get("EF1")[seleccion];
            if (contenedor.pallets[pallet].get("EF1")[seleccion].cajas === 0) {
                contenedor.pallets[pallet].get("EF1").splice(seleccion, 1)[0];
            }
            await db.Contenedores.updateOne(
                { _id: id }, { $set: { [`pallets.${pallet}`]: contenedor.pallets[pallet] } }
            );


            let record = new db.recordContenedores({
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
            this.unlockItem(id, "pallets", pallet)
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
            this.lockItem(id1, "pallets", pallet1)
        } else {
            this.lockItem(id1, "pallets", pallet1)
            this.lockItem(id2, "pallets", pallet2)
        }
        const pilaFunciones = [];

        try {
            const len = seleccion.length;
            let cajas = [];

            //se obtienen los items y se borran
            const contenedor = await db.Contenedores.findById({ _id: id1 });
            for (let i = 0; i < len; i++) {
                cajas.push(contenedor.pallets[pallet1].get("EF1").splice(seleccion[i], 1)[0]);
            }
            await db.Contenedores.updateOne({ _id: id1 }, { $set: { [`pallets.${pallet1}`]: contenedor.pallets[pallet1] } });

            pilaFunciones.push({
                funcion: "borrar_item_pallet",
                datos: cajas
            })

            const contenedor2 = await db.Contenedores.findById({ _id: id2 });
            for (let i = 0; i < len; i++) {
                const index = contenedor2
                    .pallets[pallet2].get("EF1").findIndex(item => (
                        item.lote === cajas[i].lote &&
                        item.tipoCaja === cajas[i].tipoCaja &&
                        item.calibre === cajas[i].calibre &&
                        item.calidad === cajas[i].calidad &&
                        item.tipoFruta === cajas[i].tipoFruta
                    ))
                if (index === -1) {
                    contenedor2.pallets[pallet2].get("EF1").push(cajas[i]);
                } else {
                    contenedor2.pallets[pallet2].get("EF1")[index].cajas += cajas[i].cajas
                }
            }
            await db.Contenedores.updateOne({ _id: id2 }, { $set: { [`pallets.${pallet2}`]: contenedor2.pallets[pallet2] } });

            let record = new db.recordContenedores({
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
            //regresa los itemas al contenedor 1 si hay problema ingresandolos al contenedor 2
            for (const value of Object.values(pilaFunciones)) {
                if (value.funcion === "borrar_item_pallet") {
                    const { datos } = value
                    const contenedor = await db.Contenedores.findById({ _id: id1 });

                    for (const item of datos) {
                        contenedor.pallets[pallet1].get("EF1").push(item);
                    }
                    await db.Contenedores.updateOne(
                        { _id: id1 },
                        { $set: { [`pallets.${pallet1}`]: contenedor.pallets[pallet1] } }
                    );

                }
            }
            throw new ConnectionDBError(408, `Error mmoviendo el item entre contenedores ${err.message}`);
        } finally {

            if (id1 === id2) {
                this.unlockItem(id1, "pallets", pallet1)
            } else {
                this.unlockItem(id1, "pallets", pallet1)
                this.unlockItem(id2, "pallets", pallet2)

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
            const contenedor = await db.Contenedores.findById({ _id: id });
            for (let i = 0; i < cajas.length; i++) {
                contenedor.pallets[pallet].get("EF1").push(cajas[i]);
            }
            await db.Contenedores.updateOne({ _id: id }, { $set: { pallets: contenedor.pallets } });

            let record = new db.recordContenedores({
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
            this.lockItem(id1, "pallets", pallet1)
        } else {
            this.lockItem(id1, "pallets", pallet1)
            this.lockItem(id2, "pallets", pallet2)
        }
        const pilaFunciones = [];

        try {
            let itemRecord = [];
            let item;
            //se restan las cajas en el item
            const contenedor = await db.Contenedores.findById({ _id: id1 });
            if (!contenedor) throw new ConnectionDBError(407, "La busqueda de contenedores retorna null")

            itemRecord.push(contenedor.pallets[pallet1].get("EF1")[seleccion])
            contenedor.pallets[pallet1].get("EF1")[seleccion].cajas -= cajas;
            item = contenedor.pallets[pallet1].get("EF1")[seleccion];

            if (contenedor.pallets[pallet1].get("EF1")[seleccion].cajas === 0) {
                contenedor.pallets[pallet1].get("EF1").splice(seleccion, 1)[0];
            }

            await db.Contenedores.updateOne(
                { _id: id1 },
                { $set: { [`pallets.${pallet1}`]: contenedor.pallets[pallet1] } }
            );

            console.log(itemRecord)
            pilaFunciones.push({
                funcion: "borrar_item_pallet",
                datos: {
                    item: itemRecord,
                    cajas: cajas
                }
            })
            //se añade el item al contenedor
            const contenedor2 = await db.Contenedores.findById({ _id: id2 });
            if (!contenedor2) throw new ConnectionDBError(407, "La busqueda de contenedores retorna null")

            item.cajas = cajas;

            const index = contenedor2.pallets[pallet2].get("EF1").findIndex(lote =>
                lote.lote === item.lote &&
                lote.calibre === item.calibre &&
                lote.calidad === item.calidad &&
                lote.tipoCaja === item.tipoCaja
            )

            if (index === -1) {
                contenedor2.pallets[pallet2].get("EF1").push(item);
                await db.Contenedores.updateOne({ _id: id2 }, { $set: { pallets: contenedor2.pallets } });
            } else {
                contenedor2.pallets[pallet2].get("EF1")[index].cajas += cajas;
                await db.Contenedores.updateOne({ _id: id2 }, { $set: { pallets: contenedor2.pallets } });

            }


            let record = new db.recordContenedores({
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
            //regresa los itemas al contenedor 1 si hay problema ingresandolos al contenedor 2
            for (const value of Object.values(pilaFunciones)) {
                if (value.funcion === "borrar_item_pallet") {
                    const { item, cajas } = value.datos
                    let newPallet;
                    const contenedor = await db.Contenedores.findById({ _id: id1 });

                    const index = contenedor.pallets[pallet1].get("EF1").findIndex(
                        lote => lote.lote === item[0].lote &&
                            lote.calibre === item[0].calibre &&
                            lote.calidad === item[0].calidad &&
                            lote.tipoCaja === item[0].tipoCaja
                    )
                    if (index === -1) {
                        newPallet = contenedor.pallets[pallet1];
                        item[0].cajas = cajas
                        newPallet.get("EF1").push(item[0])
                    } else {
                        newPallet = contenedor.pallets[pallet1];
                        newPallet.get("EF1")[index].cajas += cajas;
                    }

                    await db.Contenedores.updateOne(
                        { _id: id1 },
                        {
                            $set: {
                                [`pallets.${pallet1}`]: newPallet
                            }
                        });

                }
            }
            throw new ConnectionDBError(408, `Error mmoviendo y restando el item entre contenedores ${err.message}`);
        } finally {

            if (id1 === id2) {
                this.unlockItem(id1, "pallets", pallet1)
            } else {
                this.unlockItem(id1, "pallets", pallet1)
                this.unlockItem(id2, "pallets", pallet2)

            }
        }
    }
    static async liberar_pallet_lista_empaque(id, pallet, item, action, user) {
        try {
            this.lockItem(id, "pallets", pallet)

            const contenedor = await db.Contenedores.findById({ _id: id });
            if (!contenedor) throw new ConnectionDBError(407, "La busqueda de contenedores retorna null");

            contenedor.pallets[pallet].get("listaLiberarPallet").rotulado = item.rotulado;
            contenedor.pallets[pallet].get("listaLiberarPallet").paletizado = item.paletizado;
            contenedor.pallets[pallet].get("listaLiberarPallet").enzunchado = item.enzunchado;
            contenedor.pallets[pallet].get("listaLiberarPallet").estadoCajas = item.estadoCajas;
            contenedor.pallets[pallet].get("listaLiberarPallet").estiba = item.estiba;

            await db.Contenedores.updateOne(
                { _id: id },
                {
                    $set: { [`pallets.${pallet}`]: contenedor.pallets[pallet] }
                });


            let record = new db.recordContenedores({
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
            this.unlockItem(id, "pallets", pallet)
        }
    }
    static async cerrar_lista_empaque(id, insumos, action, user) {
        this.validateBussyIds(id)
        try {

            await db.Contenedores.updateOne(
                { _id: id },
                {
                    ...insumos,
                    'infoContenedor.cerrado': true,
                    'infoContenedor.fechaFinalizado': new Date(),
                });

            let record = new db.recordContenedores({
                operacionRealizada: action,
                user: user,
                documento: {
                    contenedor: id,
                    cerrado: true
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
        this.lockItem(id, "pallets", pallet)

        try {
            const contenedor = await db.Contenedores.findById({ _id: id });
            if (!contenedor) throw new ConnectionDBError(407, "La busqueda de contenedores retorna null");

            let oldData = JSON.parse(JSON.stringify(contenedor.pallets[pallet].get("EF1")));
            for (let i = 0; i < seleccion.length; i++) {
                contenedor.pallets[pallet].get("EF1")[seleccion[i]].calidad = data.calidad;
                contenedor.pallets[pallet].get("EF1")[seleccion[i]].calibre = data.calibre;
                contenedor.pallets[pallet].get("EF1")[seleccion[i]].tipoCaja = data.tipoCaja;
            }

            await db.Contenedores.updateOne(
                { _id: id },
                { $set: { [`pallets.${pallet}`]: contenedor.pallets[pallet] } }
            );

            let record = new db.recordContenedores({
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
            return oldData.filter((_, index) => seleccion.includes(index));
        } catch (err) {
            throw new ConnectionDBError(408, `Error modificando los datos${err.message}`);
        } finally {
            this.unlockItem(id, "pallets", pallet)
        }
    }
    static async modificar_contenedor(id, query, user, action, __v) {
        /**
         * Modifica un contenedor en la base de datos de MongoDB.
         *
         * @param {string} id - ID del contenedor a modificar.
         * @param {Object} query - Objeto con los cambios a aplicar al contendor.
         * @param {string} action - Descripción de la acción realizada.
         * @param {string} user - Usuario que realiza la acción.
         * @returns {Promise<Object>} - Promesa que resuelve al objeto del lote modificado.
         * @throws {PutError} - Lanza un error si ocurre un problema al modificar el contenedor.
         */
        try {
            this.lockItem(id, "Contenedor", "general")

            let updateQuery = { ...query };
            let findQuery = { _id: id };

            if (__v !== undefined) {
                // Si se proporciona __v, incluye la comparación de versiones
                findQuery.__v = __v;
                updateQuery.$inc = { __v: 1 };
            }

            const contenedor = await db.Contenedores.findOneAndUpdate(
                findQuery,
                updateQuery,
                { new: true }
            );

            if (!contenedor) {
                throw new Error('Contenedor no encontrado o versión incorrecta');
            }

            const contenedor_obj = new Object(contenedor.toObject());

            let record = new db.recordContenedores({
                operacionRealizada: action,
                user: user,
                documento: { ...query, _id: id }
            })

            await record.save()

            if (!record) {
                throw new Error('No se pudo guardar el registro de la operación');
            }
            return contenedor_obj;
        } catch (err) {
            console.error(err)
            throw new PutError(524, `Error al modificar el contenedor ${id} -- query ${query} `);
        } finally {
            this.unlockItem(id, "Contenedor", "general")
        }
    }
    static async obtener_cantidad_contenedores(filtro = {}) {
        try {
            const count = await db.Contenedores.countDocuments(filtro);
            return count;
        } catch (err) {
            throw new ConnectionDBError(520, `Error obteniendo cantidad contenedores ${filtro} --- ${err.message}`);
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
