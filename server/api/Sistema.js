import fs from 'fs';
import path from 'path';
import yaml from "js-yaml";

import { UsuariosRepository } from '../Class/Usuarios.js';
import bcrypt from 'bcrypt';
import { UserRepository } from '../auth/users.js';
import { ValidationUserError } from '../../Error/ValidationErrors.js';
import { ConstantesDelSistema } from '../Class/ConstantesDelSistema.js';
import { ProcessError } from '../../Error/ProcessError.js';
import { SistemaLogicError } from '../../Error/logicLayerError.js';
import { filtroFechaInicioFin } from './utils/filtros.js';
import { LotesRepository } from '../Class/Lotes.js';
import { db } from '../../DB/mongoDB/config/init.js';
import { dirname } from 'path';
import { fileURLToPath } from 'url';
import { dataService } from '../services/data.js';
import { LogsRepository } from '../Class/LogsSistema.js';
import { registrarPasoLog } from './helper/logs.js';
import { FrutaProcesada } from '../Class/frutaProcesada.js';
import { LotesHelper } from '../helper/lotes.js';

import { SistemaProcesoClass } from "../Class/sistema/ProcesoClass.js";
//import { SistemaLogicError } from "../../Error/ConnectionErrors.js";



const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);


export class SistemaRepository {
    //#region proceso sistema
    static async put_sistema_proceso_habilitarPrediosDescarte(req) {
        try {
            const { data } = req.data
            const registro = await FrutaProcesada.get_frutaProcesada({
                ids: data,
            })
            delete registro[0]._doc._id
            delete registro[0]._doc.createdAt
            delete registro[0]._doc.updatedAt
            delete registro[0]._doc.__v

            const newRegistro = {
                ...registro[0]._doc,
                fechaProcesamiento: new Date(),
                proceso: "Habilitar",
                canastillas: 0,
                loteId: registro[0]._doc.loteId._id,
                tipoFruta: registro[0]._doc.tipoFruta._id,
                predio: registro[0]._doc.predio._id,
                user: req.user._id
            }
            await FrutaProcesada.addFrutaProcesada(newRegistro, req.user._id)
        } catch (err) {
            if (err.status === 521) {
                throw err
            }
            throw new SistemaLogicError(471, `Error ${err.type}: ${err.message}`)
        }
    }
    static async get_sistema_proceso_lotesProcesados() {
        try {
            // Obtener la fecha actual en Colombia
            const ahora = new Date();

            // Crear fechaInicio (comienzo del día en Colombia, pero en UTC)
            const fechaInicio = new Date(Date.UTC(
                ahora.getFullYear(),
                ahora.getMonth(),
                ahora.getDate() - 1,
                0, 0, 0, 0
            ));

            // Crear fechaFin (final del día en Colombia, pero en UTC)
            const fechaFin = new Date();

            let query = {}

            query = filtroFechaInicioFin(fechaInicio, fechaFin, query, 'fechaProcesamiento')


            const lotes = await FrutaProcesada.get_frutaProcesada({
                query: query,
            });
            return lotes
        } catch (err) {
            if (err.status === 522) {
                throw err
            }
            throw new SistemaLogicError(470, `Error ${err.type}: ${err.message}`)
        }
    }



    static async get_sistema_habilitarInstancias_lotes() {
        try {
            const lotes = await LotesRepository.getLotes({
                sort: { fechaProceso: -1 },
                select: { enf: 1, fecha_creacion: 1 },
                limit: 200
            })
            const lotesMaquila = await LotesRepository.getLotesMaquila({
                sort: { fechaProceso: -1 },
                select: { enf: 1, fecha_creacion: 1 },
                limit: 100
            })
            const result = [...lotes, ...lotesMaquila].sort((a, b) => b.fecha_creacion - a.fecha_creacion)
            return result
        } catch (err) {
            if (err.status === 531) {
                throw err
            }
            throw new SistemaLogicError(471, `Error ${err.type}: ${err.message}`)
        }
    }
    //-----------------------------------------------------------------------------------------
    static async put_sistema_habilitarInstancias_habilitarPredio(req) {
        const { user } = req
        const { data } = req.data
        let log
        const session = await db.Contenedores.db.startSession();
        log = await LogsRepository.create({
            user: user._id,
            action: "habilitarPredio",
            acciones: [{ paso: "Inicio de la función", status: "Iniciado", timestamp: new Date() }]
        });

        try {

            await session.withTransaction(async () => {

                // 1. ACTUALIZAR LOTE.Jp
                const lote = await LotesHelper.actualizar_lotes_helper(
                    { _id: data.loteId }, //esto se le agrego.loteId para que tome el id del lote.Jp
                    { finalizado: false },
                    { action: "habilitarPredio", user: user, session }
                );
                await registrarPasoLog(log, "Lote actualizado", "Iniciado", new Date());
                if (!lote) {
                    throw new SistemaLogicError(471, `Error al actualizar el lote`)
                }
                //Determinar el tipo de lote para el registro correcto. Jp
                const loteType = lote.enf.startsWith("EF10-") ? "loteMaquila" : "Lote";

                // 2. GUARDAR REGISTRO EN frutaProcesada
                const newRegistro = {
                    loteId: lote._id,
                    predio: lote.predio,
                    loteType: loteType,
                    tipoFruta: lote.tipoFruta,
                    promedio: lote.promedio,
                    canastillas: 0,
                    user: user._id,
                    proceso: 'Habilitar'
                }
                await FrutaProcesada.addFrutaProcesada(newRegistro, user, session);
                await registrarPasoLog(log, "Fruta procesada guardada", "Iniciado", new Date());

                // 3. 🔥 NUEVO: REGISTRAR EN habilitarestancias
                await SistemaProcesoClass.addRegistroHabilitarEstancia(
                    {
                        user: user._id,
                        lote: lote._id,
                        loteType: loteType,
                        motivo: data.motivo,
                        justificacion: data.justificacion
                    },
                    user._id,
                    { session }
                );
                await registrarPasoLog(log, "Registro guardado", "Iniciado", new Date());
            });


        } catch (err) {
            if (err.status === 531) {
                throw err
            }
            await registrarPasoLog(log, "Error", "Fallido", err.message);
            throw new SistemaLogicError(471, `Error ${err.type}: ${err.message}`)
        } finally {
            await session.endSession();
            await registrarPasoLog(log, "Finalizo la funcion", "Completado");
        }
    }
    //-----------------------------------------------------------------------------------------
    static async get_sistema_habilitarInstancias_registros() {
        try {
            const registros = await SistemaProcesoClass.getRegistrosHabiliarInstancia({
                populate: [
                    { path: 'user', select: 'nombre correo', model: 'usuario' },
                    { path: 'lote', select: '_id enf predio loteID codigoPropio calidad' }
                ],
                sort: { createdAt: -1 }
            });

            return registros.map(r => ({
                _id: r._id,
                fecha: r.createdAt,
                usuario: r.user?.nombre ?? 'Sin nombre',
                // Manejar variación de campos ENTRE tipos de lote Jp
                lote:
                    r.lote?.enf ??
                    r.lote?.loteID ??
                    r.lote?.codigoPropio ??
                    'Sin lote',
                motivo: r.motivo,
                justificacion: r.justificacion
            }));

        } catch (err) {
            throw new SistemaLogicError(
                500,
                `Error obteniendo registros: ${err.message}`
            );
        }
    }

    //-----------------------------------------------------------------------------------------------

   
    static async put_sistema_parametros_configuracionSeriales_EF8(req) {
        let log
        try {
            const { user } = req
            log = await LogsRepository.create({
                user: user._id,
                action: "put_sistema_parametros_configuracionSeriales_EF8",
                acciones: [{ paso: "Inicio de la función", status: "Iniciado", timestamp: new Date() }]
            })
            const { serial } = req.data
            await dataService.modificar_ef8_serial(serial, log)

        } catch (err) {
            await registrarPasoLog(log._id, "Error", "Fallido", err.message);
            if (err.status === 523) {
                throw err
            }
            throw new SistemaLogicError(472, `Error ${err.type}: ${err.message}`)
        } finally {
            await registrarPasoLog(log._id, "Finalizo la funcion", "Completado");
        }
    }
    //#endregion

    static async check_mobile_version() {
        const apkLatest = path.join(__dirname, '..', '..', 'public', 'updates', 'mobile', 'latest.yml');
        const fileContents = fs.readFileSync(apkLatest, 'utf8');
        const latest = yaml.load(fileContents);
        return latest;
    }
    static async login2(data) {
        await UserRepository.validate_userName(data);
        await UserRepository.validate_password(data);
        const user = await UsuariosRepository.get_users({
            query: { usuario: data.user, estado: true }
        })
        if (!user[0]) throw new ValidationUserError(401, "Error usuario no encontrado");
        const isValid = await bcrypt.compare(data.password, user[0].password);
        if (!isValid) throw new ValidationUserError(402, "Contraseña incorrecta");

        return { usuario: user[0].usuario, cargo: user[0].cargo, _id: user[0]._id, status: 200 }

    }
    static async crear_codigo_recuperacion(data) {
        const user = await UsuariosRepository.get_users({
            query: { usuario: data, estado: true }
        })
        if (!user[0]) throw new ValidationUserError(401, "Error usuario no encontrado");

        const codigo = await UserRepository.generarTokenRecuperacion()
        return codigo
    }
    static async isNewVersion() {
        const apkLatest = path.join(__dirname, '..', '..', 'public', 'updates', 'desktop', 'latest.yml');
        const fileContents = fs.readFileSync(apkLatest, 'utf8');
        return fileContents
    }
    static async obtener_info_mi_cuenta(user) {
        const { _id } = user
        const usuario = await UsuariosRepository.get_users({
            ids: [_id]
        })
        delete usuario.password
        return usuario[0]
    }
    static async modificar_mi_password(req, user) {
        const { data, action } = req
        const { _id } = user
        const hashedPassword = await bcrypt.hash(data, 10);
        const query = {
            password: hashedPassword
        }
        await UsuariosRepository.modificar_usuario(_id, query, action, user);
    }
    static async obtener_cantidad_usuarios() {
        const cantidad = await UsuariosRepository.obtener_cantidad_usuarios()
        return cantidad
    }
    static async get_constantes_sistema_tipo_frutas() {
        try {
            const response = await ConstantesDelSistema.get_constantes_sistema_tipo_frutas();
            return response
        } catch (err) {

            if (err.status === 540) {
                throw err
            }
            throw new ProcessError(490, `Error ${err.type}: ${err.message}`)
        }
    }
    static async get_constantes_sistema_paises_GGN() {
        try {
            const response = await ConstantesDelSistema.get_constantes_sistema_paises_GGN();
            return response
        } catch (err) {

            if (err.status === 540) {
                throw err
            }
            throw new ProcessError(490, `Error ${err.type}: ${err.message}`)
        }
    }


}


