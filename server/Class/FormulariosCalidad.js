import { db } from "../../DB/mongoDB/config/init.js";
import { ConnectionDBError, PutError } from "../../Error/ConnectionErrors.js";
import { ItemBussyError } from "../../Error/ProcessError.js";
import { BaseRepository } from "./base/BaseRepository.js";

let bussyIds = new Set();


export class FormulariosCalidadRepository {
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


    //NUEVO JP
    //#region historial concentraciones
    static async get_historial_concentraciones(options = {}) {
        const {
            query = {},
            // select = {},
            populate = [],
            skip = 0,
            limit = 0,
            sort = {}
        } = options;

        try {
            const HistorialConcentraciones = db.HistorialConcentraciones;
            
            let queryBuilder = HistorialConcentraciones.find(query);
            
            // if (Object.keys(select).length > 0) {
            //     queryBuilder = queryBuilder.select(select);
            // }
            
            if (populate.length > 0) {
                populate.forEach(pop => {
                    queryBuilder = queryBuilder.populate(pop);
                });
            }
            
            if (Object.keys(sort).length > 0) {
                queryBuilder = queryBuilder.sort(sort);
            }
            
            if (skip > 0) queryBuilder = queryBuilder.skip(skip);
            if (limit > 0) queryBuilder = queryBuilder.limit(limit);
            
            const registros = await queryBuilder.lean();
            return registros;
            
        } catch (err) {
            console.error('Error en get_historial_concentraciones:', err);
            throw new Error(`Error al obtener historial de concentraciones: ${err.message}`);
        }
    }

    static async crear_historial_concentracion(data) {
        try {
            const HistorialConcentraciones = db.HistorialConcentraciones;
            
            const nuevoRegistro = new HistorialConcentraciones(data);
            await nuevoRegistro.save();
            
            // Retornar el registro completo con populate
            const registroCompleto = await HistorialConcentraciones.findById(nuevoRegistro._id)
                .populate('tipoFruta', 'tipoFruta')
                .populate('usuario', 'nombre apellido')
                .lean();
            
            return registroCompleto;
            
        } catch (err) {
            console.error('Error en crear_historial_concentracion:', err);
            throw new Error(`Error al crear registro de concentración: ${err.message}`);
        }
    }

    static async actualizar_historial_concentracion(_id, updateData) {
        try {
            const HistorialConcentraciones = db.HistorialConcentraciones;
            
            const registroActualizado = await HistorialConcentraciones.findByIdAndUpdate(
                _id,
                { $set: updateData },
                { new: true, runValidators: true }
            )
            .populate('tipoFruta', 'tipoFruta')
            .populate('usuario', 'nombre apellido')
            .lean();
            
            if (!registroActualizado) {
                throw new Error('Registro no encontrado');
            }
            
            return registroActualizado;
            
        } catch (err) {
            console.error('Error en actualizar_historial_concentracion:', err);
            throw new Error(`Error al actualizar registro de concentración: ${err.message}`);
        }
    }

    static async eliminar_historial_concentracion(_id) {
        try {
            const HistorialConcentraciones = db.HistorialConcentraciones;
            
            // Soft delete
            const registroDesactivado = await HistorialConcentraciones.findByIdAndUpdate(
                _id,
                { $set: { activo: false } },
                { new: true }
            ).lean();
            
            if (!registroDesactivado) {
                throw new Error('Registro no encontrado');
            }
            
            return registroDesactivado;
            
        } catch (err) {
            console.error('Error en eliminar_historial_concentracion:', err);
            throw new Error(`Error al eliminar registro de concentración: ${err.message}`);
        }
    }

    static async get_calidad_formularios_historialConcentraciones_numeroElementos(filtro = {}) {
        try {
            const HistorialConcentraciones = db.HistorialConcentraciones;
            
            const query = { activo: true, ...filtro };
            const count = await HistorialConcentraciones.countDocuments(query);
            
            return count;
            
        } catch (err) {
            console.error('Error en get_calidad_formularios_historialConcentraciones_numeroElementos:', err);
            throw new Error(`Error al contar registros: ${err.message}`);
        }
    }
    //#endregion
    
     // //#region Control Limpieza EPP
    static async crear_control_limpieza_epp(data) {
        try {

            const formulario = new db.ControlLimpiezaEPP({
                fecha: new Date(data.fecha),
                codigoCareta: data.codigoCareta,
                estadoCareta: data.estadoCareta,
                tipoLimpieza: data.tipoLimpieza?.charAt(0).toUpperCase() + data.tipoLimpieza?.slice(1),
                retiroCartuchos: data.retiroCartuchos,
                limpiezaRealizada: data.limpiezaRealizada === true || data.limpiezaRealizada === "si",
                cargo: data.cargo,
                observaciones: data.observaciones || "",
                responsable: data.responsable,
                usuario: data.usuario
            });

            await formulario.save();

            return formulario;

        } catch (err) {
            throw new ConnectionDBError(522, `Error creando formulario control limpieza EPP ${err.message}`);
        }
    }
    static async get_control_limpieza_epp(options = {}) {

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

            const formularios = await db.ControlLimpiezaEPP.find(newQuery)
                .populate("usuario", "nombre apellido")
                .select(select)
                .sort(sort)
                .limit(limit)
                .skip(skip)
                .exec();

            return formularios;

        } catch (err) {
            throw new ConnectionDBError(522, `Error obteniendo formularios control limpieza EPP ${err.message}`);
        }
    }
    static async get_calidad_formularios_controlLimpiezaEPP_numeroElementos() {
        try {

            const count = await db.ControlLimpiezaEPP.countDocuments();

            return count;

        } catch (err) {
            throw new ConnectionDBError(524, `Error contando formularios control limpieza EPP ${err.message}`);
        }
    }
}


export class FormularioCalidadLimpiezaDiariaRepository extends BaseRepository {
    static get model() { return db.LimpiezaDiaria; }
    static modelName = 'LimpiezaDiaria';
}

export class FormularioCalidadLimpiezaMensualRepository extends BaseRepository {
    static get model() { return db.LimpiezaMensual; }
    static modelName = 'LimpiezaMensual';
}

export class FormularioCalidadControlPlagasRepository extends BaseRepository {
    static get model() { return db.ControlPlagas; }
    static modelName = 'ControlPlagas';
}