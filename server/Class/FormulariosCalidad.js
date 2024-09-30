const { ControlPlagas } = require("../../DB/mongoDB/schemas/calidad/schemaControlPlagas");
const { LimpiezaDiaria } = require("../../DB/mongoDB/schemas/calidad/schemaLimpiezaDiaria");
const { LimpiezaMensual } = require("../../DB/mongoDB/schemas/calidad/schemaLimpiezaMensual");
const { ConnectionDBError, PutError } = require("../../Error/ConnectionErrors");
const { ItemBussyError } = require("../../Error/ProcessError");

let bussyIds = new Set();


class FormulariosCalidadRepository {
    static async crear_formulario_limpieza_diaria(ID, fechaInicio, fechaFin, user) {
        const formulario = new LimpiezaDiaria({
            ID: ID,
            fechaInicio: new Date(fechaInicio).setHours(0, 0, 0, 0),
            fechaFin: new Date(fechaFin).setHours(23, 59, 59, 59),
            responsable: user
        })
        await formulario.save();
    }
    static async crear_formulario_limpieza_mensual(ID, fechaInicio, fechaFin, user) {
        const formulario = new LimpiezaMensual({
            ID: ID,
            fechaInicio: new Date(fechaInicio).setHours(0, 0, 0, 0),
            fechaFin: new Date(fechaFin).setHours(23, 59, 59, 59),
            responsable: user
        })
        await formulario.save();
    }
    static async crear_formulario_control_plagas(ID, fechaInicio, fechaFin, user) {
        const formulario = new ControlPlagas({
            ID: ID,
            fechaInicio: new Date(fechaInicio).setHours(0, 0, 0, 0),
            fechaFin: new Date(fechaFin).setHours(23, 59, 59, 59),
            responsable: user
        })
        await formulario.save();
    }
    static async get_formularios_calidad_creados() {
        /**
       * Funcion que obtiene informes de calidad que no se han diligenciado de la base de datos de MongoDB.
       *
       * @returns {Promise<Array>} - Promesa que resuelve a un array de lotes obtenidos.
       * @throws {PostError} - Lanza un error si ocurre un problema al obtener los lotes.
       */
        try {
            const now = new Date()
            const limpieza_diaria = await LimpiezaDiaria.find({
                $and: [
                    { fechaInicio: { $lte: now } },
                    { fechaFin: { $gt: now } }
                ]
            });

            return limpieza_diaria

        } catch (err) {
            throw new ConnectionDBError(408, `Error obteniendo formulario limpieza diaria ${err.message}`);
        }
    }
    static async get_formularios_calidad_limpieza_mensual_creados() {
        /**
       * Funcion que obtiene informes de calidad que no se han diligenciado de la base de datos de MongoDB.
       *
       * @returns {Promise<Array>} - Promesa que resuelve a un array de lotes obtenidos.
       * @throws {PostError} - Lanza un error si ocurre un problema al obtener los lotes.
       */
        try {
            const now = new Date()
            const limpieza_mensual = await LimpiezaMensual.find({
                $and: [
                    { fechaInicio: { $lte: now } },
                    { fechaFin: { $gt: now } }
                ]
            });

            return limpieza_mensual

        } catch (err) {
            throw new ConnectionDBError(408, `Error obteniendo formulario limpieza mensual ${err.message}`);
        }
    }
    static async get_formularios_calidad_control_plagas_creados() {
        /**
       * Funcion que obtiene informes de calidad que no se han diligenciado de la base de datos de MongoDB.
       *
       * @returns {Promise<Array>} - Promesa que resuelve a un array de lotes obtenidos.
       * @throws {PostError} - Lanza un error si ocurre un problema al obtener los lotes.
       */
        try {
            const now = new Date()
            const control_plagas = await ControlPlagas.find({
                $and: [
                    { fechaInicio: { $lte: now } },
                    { fechaFin: { $gt: now } }
                ]
            });

            return control_plagas

        } catch (err) {
            throw new ConnectionDBError(408, `Error obteniendo formulario limpieza mensual ${err.message}`);
        }
    }
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
            await LimpiezaDiaria.findOneAndUpdate({ _id: id, }, query, { new: true });

        } catch (err) {
            throw new PutError(414, `Error al modificar el dato  ${err.name}`);
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
            await LimpiezaMensual.findOneAndUpdate({ _id: id, }, query, { new: true });

        } catch (err) {
            throw new PutError(414, `Error al modificar el dato  ${err.name}`);
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
            await ControlPlagas.findOneAndUpdate({ _id: id, }, query, { new: true });

        } catch (err) {
            throw new PutError(414, `Error al modificar el dato  ${err.name}`);
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