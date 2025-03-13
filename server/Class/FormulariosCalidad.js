const { db } = require("../../DB/mongoDB/config/init");
const { ConnectionDBError, PutError } = require("../../Error/ConnectionErrors");
const { ItemBussyError } = require("../../Error/ProcessError");

let bussyIds = new Set();


class FormulariosCalidadRepository {
    static async crear_formulario_limpieza_diaria(ID, fechaInicio, fechaFin) {
        const formulario = new db.LimpiezaDiaria({
            ID: ID,
            fechaInicio: new Date(fechaInicio),
            fechaFin: new Date(fechaFin),
        })
        await formulario.save();
    }
    static async crear_formulario_limpieza_mensual(ID, fechaInicio, fechaFin, user) {
        const formulario = new db.LimpiezaMensual({
            ID: ID,
            fechaInicio: new Date(fechaInicio).setHours(0, 0, 0, 0),
            fechaFin: new Date(fechaFin).setHours(23, 59, 59, 59),
            responsable: user
        })
        await formulario.save();
    }
    static async crear_formulario_control_plagas(ID, fechaInicio, fechaFin, user) {
        const formulario = new db.ControlPlagas({
            ID: ID,
            fechaInicio: new Date(fechaInicio).setHours(0, 0, 0, 0),
            fechaFin: new Date(fechaFin).setHours(23, 59, 59, 59),
            responsable: user
        })
        await formulario.save();
    }

    //obtener formularios de calidad
    static async get_formularios_calidad_limpieza_diaria(options = {}) {
        const {
            ids = [],
            query = {},
            select = {},
            sort = { fechaIngreso: -1 },
            limit = 50,
            skip = 0
        } = options;
        try {
            let newQuery = { ...query };

            if (ids.length > 0) {
                newQuery._id = { $in: ids };
            }
            const formularios = await db.LimpiezaDiaria.find(newQuery)
                .select(select)
                .sort(sort)
                .limit(limit)
                .skip(skip)
                .exec();
            return formularios

        } catch (err) {
            throw new ConnectionDBError(522, `Error obteniendo formularios ${err.message}`);
        }
    }
    static async get_calidad_formulario_limpiezaDiaria_numeroElementos() {
        try {
            const count = await db.LimpiezaDiaria.countDocuments();
            return count;
        } catch (err) {
            throw new ConnectionDBError(524, `Error obteniendo formularios ${err.message}`);
        }
    }
    static async get_formularios_calidad_limpieza_mensual(options = {}) {
        const {
            ids = [],
            query = {},
            select = {},
            sort = { fechaIngreso: -1 },
            limit = 50,
            skip = 0
        } = options;
        try {
            let newQuery = { ...query };

            if (ids.length > 0) {
                newQuery._id = { $in: ids };
            }
            const formularios = await db.LimpiezaMensual.find(newQuery)
                .select(select)
                .sort(sort)
                .limit(limit)
                .skip(skip)
                .exec();
            return formularios

        } catch (err) {
            throw new ConnectionDBError(522, `Error obteniendo formularios ${err.message}`);
        }
    }
    static async get_calidad_formularios_limpiezaMensual_numeroElementos() {
        try {
            const count = await db.LimpiezaMensual.countDocuments();
            return count;
        } catch (err) {
            throw new ConnectionDBError(524, `Error obteniendo formularios ${err.message}`);
        }
    }
    static async get_formularios_calidad_control_plagas(options = {}) {
        const {
            ids = [],
            query = {},
            select = {},
            sort = { fechaIngreso: -1 },
            limit = 50,
            skip = 0
        } = options;
        try {
            let newQuery = { ...query };

            if (ids.length > 0) {
                newQuery._id = { $in: ids };
            }
            const formularios = await db.ControlPlagas.find(newQuery)
                .select(select)
                .sort(sort)
                .limit(limit)
                .skip(skip)
                .exec();
            return formularios

        } catch (err) {
            throw new ConnectionDBError(522, `Error obteniendo formularios ${err.message}`);
        }
    }
    static async get_calidad_formularios_controlPlagas_numeroElementos() {
        try {
            const count = await db.ControlPlagas.countDocuments();
            return count;
        } catch (err) {
            throw new ConnectionDBError(524, `Error obteniendo formularios ${err.message}`);
        }
    }

    //
    static async modificar_limpieza_diaria(id, query) {
        /**
         * Modifica un formulario de calidad de limpieza diaria en la base de datos de MongoDB desde las aplicaciones
         * 
         *
         * @param {string} id - ID del formulario a modificar.
         * @param {Object} query - Objeto con los cambios a aplicar al lote.
         * @param {string} action - Descripción de la acción realizada.
         * @param {string} user - Usuario que realiza la acción.
         * @returns {Promise<Object>} - Promesa que resuelve al objeto del lote modificado.
         * @throws {PutError} - Lanza un error si ocurre un problema al modificar el lote.
         */
        this.validateBussyIds(id)
        try {
            await db.LimpiezaDiaria.findOneAndUpdate({ _id: id, }, query, { new: true });

        } catch (err) {
            throw new PutError(523, `Error formularios limpieza diaria  ${err.name}`);
        } finally {
            bussyIds.delete(id);
        }

    }
    static async modificar_limpieza_mensual(id, query) {
        /**
         * Modifica un formulario de calidad de limpieza diaria en la base de datos de MongoDB desde las aplicaciones
         * 
         *
         * @param {string} id - ID del formulario a modificar.
         * @param {Object} query - Objeto con los cambios a aplicar al lote.
         * @param {string} action - Descripción de la acción realizada.
         * @param {string} user - Usuario que realiza la acción.
         * @returns {Promise<Object>} - Promesa que resuelve al objeto del lote modificado.
         * @throws {PutError} - Lanza un error si ocurre un problema al modificar el lote.
         */
        this.validateBussyIds(id)
        try {
            await db.LimpiezaMensual.findOneAndUpdate({ _id: id, }, query, { new: true });

        } catch (err) {
            throw new PutError(523, `Error formularios limpieza mensual  ${err.name}`);
        } finally {
            bussyIds.delete(id);
        }

    }
    static async modificar_control_plagas(id, query) {
        /**
         * Modifica un formulario de calidad de limpieza diaria en la base de datos de MongoDB desde las aplicaciones
         * 
         *
         * @param {string} id - ID del formulario a modificar.
         * @param {Object} query - Objeto con los cambios a aplicar al lote.
         * @param {string} action - Descripción de la acción realizada.
         * @param {string} user - Usuario que realiza la acción.
         * @returns {Promise<Object>} - Promesa que resuelve al objeto del lote modificado.
         * @throws {PutError} - Lanza un error si ocurre un problema al modificar el lote.
         */
        this.validateBussyIds(id)
        try {
            await db.ControlPlagas.findOneAndUpdate({ _id: id, }, query, { new: true });

        } catch (err) {
            throw new PutError(523, `Error al modificar control plagas  ${err.name}`);
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

module.exports.FormulariosCalidadRepository = FormulariosCalidadRepository