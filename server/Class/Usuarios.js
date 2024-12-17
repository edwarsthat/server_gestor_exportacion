const { db } = require("../../DB/mongoDB/config/init");
const { VolanteCalidad } = require("../../DB/mongoDB/schemas/calidad/schemaVolanteCalidad");
const { ConnectionDBError, PostError, PutError } = require("../../Error/ConnectionErrors");
const { ItemBussyError } = require("../../Error/ProcessError");
let bussyIdsUsuario = new Set();
let bussyIdsCargo = new Set();

class UsuariosRepository {
    static async get_cargos(options = {}) {
        /**
        * Funcion que obtiene los cargos de la base de datos de MongoDB.
        *
        * @param {Object} options - Objeto de configuración para obtener los cargos.
        * @param {Array<string>} [options.ids=[]] - Array de IDs de los cargos.
        * @param {Object} [options.query={}] - Filtros adicionales para la consulta.
        * @param {Object} [options.select={}] - Campos a seleccionar en los documentos obtenidos.
        * @param {Object} [options.sort={ createdAt: -1 }] - Criterios de ordenación para los resultados.
        * @param {number} [options.limit=50] - Número máximo de documentos a obtener.
        * @param {number} [options.skip=0] - Número de documentos a omitir desde el inicio.
        * @returns {Promise<Array>} - Promesa que resuelve a un array de lotes obtenidos.
        * @throws {PostError} - Lanza un error si ocurre un problema al obtener los lotes.
        */
        const {
            ids = [],
            query = {},
            select = {},
            sort = { createdAt: -1 },
            limit = 50,
            skip = 0,
        } = options;
        try {
            let cargosQuery = { ...query };

            if (ids.length > 0) {
                cargosQuery._id = { $in: ids };
            }
            const cargos = await db.Cargo.find(cargosQuery)
                .select(select)
                .sort(sort)
                .limit(limit)
                .skip(skip)
                .exec();
            return cargos

        } catch (err) {
            throw new ConnectionDBError(408, `Error obteniendo Cargo ${err.message}`);
        }
    }
    static async get_users(options = {}) {
        /**
        * Funcion que obtiene los usuarios de la base de datos de MongoDB.
        *
        * @param {Object} options - Objeto de configuración para obtener los cargos.
        * @param {Array<string>} [options.ids=[]] - Array de IDs de los usuarios.
        * @param {Object} [options.query={}] - Filtros adicionales para la consulta.
        * @param {Object} [options.select={}] - Campos a seleccionar en los documentos obtenidos.
        * @param {Object} [options.sort={ createdAt: -1 }] - Criterios de ordenación para los resultados.
        * @param {number} [options.limit=50] - Número máximo de documentos a obtener.
        * @param {number} [options.skip=0] - Número de documentos a omitir desde el inicio.
        * @returns {Promise<Array>} - Promesa que resuelve a un array de lotes obtenidos.
        * @throws {PostError} - Lanza un error si ocurre un problema al obtener los lotes.
        */
        const {
            ids = [],
            query = {},
            select = {},
            sort = { createdAt: -1 },
            populate = { path: 'cargo' },
            limit = 50,
            skip = 0,
        } = options;
        try {
            let usuariosQuery = { ...query };

            if (ids.length > 0) {
                usuariosQuery._id = { $in: ids };
            }
            const usuario = await db.Usuarios.find(usuariosQuery)
                .select(select)
                .sort(sort)
                .populate(populate)
                .limit(limit)
                .skip(skip)
                .exec();

            return usuario

        } catch (err) {
            console.log(err)
            throw new ConnectionDBError(408, `Error obteniendo lotes ${err.message}`);
        }
    }
    static async add_cargo(data, user) {
        const session = await db.Cargo.startSession();
        session.startTransaction();
        try {
            const cargo = new db.Cargo(data);
            const saveCargo = await cargo.save();
            let record = new db.recordCargo({
                operacionRealizada: 'crearCargo',
                user: user.user,
                documento: saveCargo
            })
            await record.save();

            await session.commitTransaction();
            session.endSession();

            return saveCargo
        } catch (err) {
            await session.abortTransaction();
            session.endSession();
            throw new PostError(409, `Error agregando cargo ${err.message}`);
        }
    }
    static async eliminar_cargo(_id, user) {
        const session = await db.Cargo.startSession();
        session.startTransaction();
        try {
            const cargo = await db.Cargo.findByIdAndDelete(_id)
            const cargoObj = new Object(cargo.toObject());
            let record = new db.recordCargo({
                operacionRealizada: 'Eliminar cargo',
                user: user.user,
                documento: cargoObj
            })
            await record.save();

            await session.commitTransaction();
            session.endSession();
            return cargo
        } catch (err) {
            await session.abortTransaction();
            session.endSession();
            throw new PostError(409, `Error eliminando cargo ${err.message}`);
        }
    }
    static async modificar_cargo(id, query, action, user) {
        this.validateBussyCargoIds(id)
        const session = await db.Cargo.startSession();
        session.startTransaction();
        try {

            await db.Cargo.replaceOne({ _id: id }, query, { new: true });

            let record = new db.recordCargo({
                operacionRealizada: action,
                user: user,
                documento: { ...query, _id: id }
            })
            await record.save()

            await session.commitTransaction();
            session.endSession();
        } catch (err) {
            await session.commitTransaction();
            session.endSession();
            throw new PutError(414, `Error al modificar el cargo => ${err.message} `);
        } finally {
            bussyIdsCargo.delete(id);
        }
    }
    static async add_user(data, user) {
        const session = await db.Usuarios.startSession();
        session.startTransaction();
        try {

            const usuario = new db.Usuarios(data);
            const saveUsuario = await usuario.save();
            let record = new db.recordUsuario({
                operacionRealizada: 'crearUsuario',
                user: user,
                documento: saveUsuario
            })
            await record.save();

            await session.commitTransaction();
            session.endSession();

            return saveUsuario
        } catch (err) {
            await session.commitTransaction();
            session.endSession();
            throw new PostError(409, `Error agregando usuario ${err.message}`);
        }
    }
    static async modificar_usuario(id, query, action, user, __v) {
        /**
         * Modifica un usuario en la base de datos de MongoDB.
         *
         * @param {string} id - ID del usuario a modificar.
         * @param {Object} query - Objeto con los cambios a aplicar al usuario.
         * @param {string} action - Descripción de la acción realizada.
         * @param {string} user - Usuario que realiza la acción.
         * @param {number} [__v] - Versión del documento a modificar (opcional).
         * @returns {Promise<Object>} - Promesa que resuelve al objeto del usuario modificado.
         * @throws {PutError} - Lanza un error si ocurre un problema al modificar el usuario.
         */
        this.validateBussyUsuarioIds(id);
        const session = await db.Usuarios.startSession();
        session.startTransaction();
        try {
            const filter = { _id: id };

            // Solo agregar __v al filtro si fue proporcionado
            if (__v !== undefined) {
                filter.__v = __v;
            }

            const usuario = await db.Usuarios.findOneAndUpdate(filter, query, { new: true });
            const usuario_obj = usuario ? usuario.toObject() : null;

            if (usuario_obj) {
                const record = new db.recordUsuario({
                    operacionRealizada: action,
                    user: user,
                    documento: { ...query, _id: id }
                });
                await record.save();
            }

            await session.commitTransaction();
            session.endSession();

            return usuario_obj;
        } catch (err) {
            await session.commitTransaction();
            session.endSession();
            throw new PutError(414, `Error al modificar el dato ${id} => ${err.name}`);
        } finally {
            bussyIdsUsuario.delete(id);
        }
    }
    static async add_volante_calidad(data) {
        /**
         * Funcion que agrega una fila a volante calidad a la base de datos lote de mongoDB
         * 
         * @param {object} data - Recibe un objeto, donde estan los datos del volante de calidad que se va a ingresar, 
         *                      
         */
        try {
            const lote = new VolanteCalidad(data);
            const saveLote = await lote.save();
            return saveLote
        } catch (err) {
            throw new PostError(409, `Error agregando formulario Volante calidad ${err.message}`);
        }
    }
    static async add_higiene_personal(data) {
        /**
         * Funcion que agrega una fila a higiene personal  a la base de datos lote de mongoDB
         * 
         * @param {object} data - Recibe un objeto, donde estan los datos del formulario 
         * higiene personal que se va a ingresar, 
         *                      
         */
        try {
            const formulario = new db.HigienePersonal(data);
            const saveFormulario = await formulario.save();
            return saveFormulario
        } catch (err) {
            throw new PostError(409, `Error agregando formulario higiene personal ${err.message}`);
        }
    }
    static async obtener_volante_calidad(options = {}) {
        /**
        * Funcion que obtiene los formularios de volante calidad de la base de datos de MongoDB.
        *
        * @param {Object} options - Objeto de configuración para obtener los cargos.
        * @param {Array<string>} [options.ids=[]] - Array de IDs de los formularios.
        * @param {Object} [options.query={}] - Filtros adicionales para la consulta.
        * @param {Object} [options.select={}] - Campos a seleccionar en los documentos obtenidos.
        * @param {Object} [options.sort={ createdAt: -1 }] - Criterios de ordenación para los resultados.
        * @param {number} [options.limit=50] - Número máximo de documentos a obtener.
        * @param {number} [options.skip=0] - Número de documentos a omitir desde el inicio.
        * @returns {Promise<Array>} - Promesa que resuelve a un array de lotes obtenidos.
        * @throws {PostError} - Lanza un error si ocurre un problema al obtener los formularios.
        */
        const {
            ids = [],
            query = {},
            select = {},
            sort = { fecha: -1 },
            limit = 50,
            skip = 0,
        } = options;
        try {
            let volanteCalidadQuery = { ...query };

            if (ids.length > 0) {
                volanteCalidadQuery._id = { $in: ids };
            }
            const volanteCalidad = await VolanteCalidad.find(volanteCalidadQuery)
                .select(select)
                .sort(sort)
                .populate({
                    path: 'operario',
                    select: 'nombre apellido usuario', // Especifica los campos a seleccionar del documento relacionado
                })
                .populate({
                    path: 'responsable',
                    select: 'nombre apellido usuario', // Especifica los campos a seleccionar del documento relacionado
                })
                .limit(limit)
                .skip(skip)
                .exec();

            return volanteCalidad

        } catch (err) {
            console.log(err)
            throw new ConnectionDBError(408, `Error obteniendo volante calidad ${err.message}`);
        }
    }
    static async obtener_formularios_higiene_personal(options = {}) {
        /**
        * Funcion que obtiene los formularios de higiene personal de la base de datos de MongoDB.
        *
        * @param {Object} options - Objeto de configuración para obtener los formularios.
        * @param {Array<string>} [options.ids=[]] - Array de IDs de los formularios.
        * @param {Object} [options.query={}] - Filtros adicionales para la consulta.
        * @param {Object} [options.select={}] - Campos a seleccionar en los documentos obtenidos.
        * @param {Object} [options.sort={ createdAt: -1 }] - Criterios de ordenación para los resultados.
        * @param {number} [options.limit=50] - Número máximo de documentos a obtener.
        * @param {number} [options.skip=0] - Número de documentos a omitir desde el inicio.
        * @returns {Promise<Array>} - Promesa que resuelve a un array de lotes obtenidos.
        * @throws {PostError} - Lanza un error si ocurre un problema al obtener los formularios.
        */
        const {
            ids = [],
            query = {},
            select = {},
            sort = { fecha: -1 },
            limit = 50,
            skip = 0,
        } = options;
        try {
            let higienePersonalQuery = { ...query };

            if (ids.length > 0) {
                higienePersonalQuery._id = { $in: ids };
            }
            const higienePersonal = await db.HigienePersonal.find(higienePersonalQuery)
                .select(select)
                .sort(sort)
                .populate({
                    path: 'operario',
                    select: 'nombre apellido usuario',
                })
                .populate({
                    path: 'responsable',
                    select: 'nombre apellido usuario',
                })
                .limit(limit)
                .skip(skip)
                .exec();

            return higienePersonal

        } catch (err) {
            console.log(err)
            throw new ConnectionDBError(408, `Error obteniendo formularios higiene personal ${err.message}`);
        }
    }
    static async obtener_cantidad_usuarios() {
        try {
            const count = await global.Usuarios.countDocuments();
            return count;
        } catch (err) {
            throw new ConnectionDBError(408, `Error obteniendo formularios ${err.message}`);
        }
    }
    static validateBussyUsuarioIds(id) {
        /**
         * Funcion que añade el id del elemento que se este m0odificando para que no se creen errores de doble escritura
         * 
         * @param {string} id - El id del elemento que se esta modificando
         */
        if (bussyIdsUsuario.has(id)) throw new ItemBussyError(413, "Elemento no disponible por el momento");
        bussyIdsUsuario.add(id)
    }
    static validateBussyCargoIds(id) {
        /**
         * Funcion que añade el id del elemento que se este m0odificando para que no se creen errores de doble escritura
         * 
         * @param {string} id - El id del elemento que se esta modificando
         */
        if (bussyIdsCargo.has(id)) throw new ItemBussyError(413, "Elemento no disponible por el momento");
        bussyIdsCargo.add(id)
    }
}

module.exports.UsuariosRepository = UsuariosRepository;
