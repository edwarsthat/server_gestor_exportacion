
const fs = require('fs');
const path = require('path');
const yaml = require("js-yaml");

const { UsuariosRepository } = require('../Class/Usuarios');
const bcrypt = require('bcrypt');
const { UserRepository } = require('../auth/users');
const { ValidationUserError } = require('../../Error/ValidationErrors');
const { ConstantesDelSistema } = require('../Class/ConstantesDelSistema');
const { ProcessError } = require('../../Error/ProcessError');
const { VariablesDelSistema } = require('../Class/VariablesDelSistema');
const { SistemaLogicError } = require('../../Error/logicLayerError');
const { filtroFechaInicioFin } = require('./utils/filtros');
const { RecordLotesRepository } = require('../archive/ArchiveLotes');
const { LotesRepository } = require('../Class/Lotes');
const { procesoEventEmitter } = require('../../events/eventos');
const { db } = require('../../DB/mongoDB/config/init');


class SistemaRepository {
    //#region proceso sistema
    static async put_sistema_proceso_habilitarPrediosDescarte(req) {
        try {
            const { data } = req.data
            VariablesDelSistema.modificar_predio_proceso_descartes(data)
        } catch (err) {
            if (err.status === 532) {
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


            let query = {
                operacionRealizada: 'vaciarLote'
            }

            query = filtroFechaInicioFin(fechaInicio, fechaFin, query, 'fecha')

            const recordLotes = await RecordLotesRepository.getVaciadoRecord({ query: query })
            const lotesIds = recordLotes.map(lote => lote.documento._id);

            const lotes = await LotesRepository.getLotes({
                ids: lotesIds,
                limit: recordLotes.length,
                select: { enf: 1, promedio: 1, tipoFruta: 1, __v: 1 }
            });
            const resultado = recordLotes.map(item => {
                const lote = lotes.find(lote => lote._id.toString() === item.documento._id);
                if (lote) {
                    if (Object.prototype.hasOwnProperty.call(item.documento, "$inc")) {
                        item.documento = { ...lote, kilosVaciados: item.documento.$inc.kilosVaciados }
                        return (item)
                    }
                    else {
                        return item
                    }
                }
                return null
            }).filter(item => item !== null);
            return resultado
        } catch (err) {
            if (err.status === 522) {
                throw err
            }
            throw new SistemaLogicError(470, `Error ${err.type}: ${err.message}`)
        }
    }
    static async put_sistema_proceso_inicioHoraProceso() {
        try {
            const date = await VariablesDelSistema.set_hora_inicio_proceso();
            procesoEventEmitter.emit("status_proceso", {
                status: true
            });
            return date
        } catch (err) {
            if (err.status === 532) {
                throw err
            }
            throw new SistemaLogicError(471, `Error ${err.type}: ${err.message}`)
        }
    }
    static async get_sistema_proceso_inicioHoraProceso() {
        try {
            const fecha = VariablesDelSistema.obtener_fecha_inicio_proceso()
            return fecha
        } catch (err) {
            if (err.status === 531) {
                throw err
            }
            throw new SistemaLogicError(471, `Error ${err.type}: ${err.message}`)
        }
    }
    static async put_sistema_proceso_finalizarProceso() {
        try {
            const status_proceso = await VariablesDelSistema.obtener_status_proceso()

            if (status_proceso === 'pause') {
                await VariablesDelSistema.set_hora_reanudar_proceso();
            }
            await VariablesDelSistema.set_hora_fin_proceso();
            procesoEventEmitter.emit("status_proceso", {
                status: "off"
            });
        } catch (err) {
            if (err.status === 532 || err.status === 531) {
                throw err
            }
            throw new SistemaLogicError(471, `Error ${err.type}: ${err.message}`)
        }
    }
    static async put_sistema_proceso_pausaProceso() {
        try {
            await VariablesDelSistema.set_hora_pausa_proceso();
            procesoEventEmitter.emit("status_proceso", {
                status: "pause"
            });
        } catch (err) {
            if (err.status === 532) {
                throw err
            }
            throw new SistemaLogicError(471, `Error ${err.type}: ${err.message}`)
        }
    }
    static async put_sistema_proceso_reanudarProceso() {
        try {
            await VariablesDelSistema.set_hora_reanudar_proceso();
            procesoEventEmitter.emit("status_proceso", {
                status: "on"
            });
        } catch (err) {
            if (err.status === 532) {
                throw err
            }
            throw new SistemaLogicError(471, `Error ${err.type}: ${err.message}`)
        }
    }
    static async get_sistema_proceso_dataProceso() {
        try {
            const predio = await VariablesDelSistema.obtenerEF1proceso();
            const kilosProcesadosHoy = await VariablesDelSistema.get_kilos_procesados_hoy2();
            const kilosExportacionHoy = await VariablesDelSistema.get_kilos_exportacion_hoy2();
            return {
                predio: predio,
                kilosProcesadosHoy: kilosProcesadosHoy,
                kilosExportacionHoy: kilosExportacionHoy
            }
        } catch (err) {
            if (err.status === 531) {
                throw err
            }
            throw new SistemaLogicError(471, `Error ${err.type}: ${err.message}`)
        }
    }
    static async get_sistema_habilitarInstancias_lotes() {
        try {
            const lotes = await LotesRepository.getLotes({
                sort: { fechaProceso: -1 },
                select: { enf: 1 },
                limit: 200
            })
            return lotes
        } catch (err) {
            if (err.status === 531) {
                throw err
            }
            throw new SistemaLogicError(471, `Error ${err.type}: ${err.message}`)
        }
    }
    static async put_sistema_habilitarInstancias_habilitarPredio(req) {
        try {
            const { user } = req
            const { data } = req.data
            let record = new db.recordLotes({
                operacionRealizada: "vaciarLote",
                user: user,
                documento: {
                    $inc: {
                        kilosVaciados: 0,
                    },
                    fechaProceso: new Date(),
                    _id: data
                }
            })
            await record.save()
        } catch (err) {
            if (err.status === 531) {
                throw err
            }
            throw new SistemaLogicError(471, `Error ${err.type}: ${err.message}`)
        }
    }
    //#endregion
    //#region modificar seriales
    static async get_sistema_parametros_configuracionSeriales_EF1() {
        try {
            const enf = await VariablesDelSistema.generarEF1()
            return enf
        } catch (err) {
            if (err.status === 506) {
                throw err
            }
            throw new SistemaLogicError(472, `Error ${err.type}: ${err.message}`)
        }
    }
    static async put_sistema_parametros_configuracionSeriales_EF1(req) {
        try {
            const { serial } = req.data
            await VariablesDelSistema.modificar_serial(serial, "enf")
        } catch (err) {
            if (err.status === 523) {
                throw err
            }
            throw new SistemaLogicError(472, `Error ${err.type}: ${err.message}`)
        }
    }
    static async get_sistema_parametros_configuracionSeriales_EF8() {
        try {
            const enf = await VariablesDelSistema.generarEF8()
            return enf
        } catch (err) {
            if (err.status === 506) {
                throw err
            }
            throw new SistemaLogicError(472, `Error ${err.type}: ${err.message}`)
        }
    }
    static async put_sistema_parametros_configuracionSeriales_EF8(req) {
        try {
            const { serial } = req.data
            await VariablesDelSistema.modificar_serial(serial, "ef8")

        } catch (err) {
            if (err.status === 523) {
                throw err
            }
            throw new SistemaLogicError(472, `Error ${err.type}: ${err.message}`)
        }
    }
    static async get_sistema_parametros_configuracionSeriales_Celifrut() {
        try {
            const enf = await VariablesDelSistema.generar_codigo_celifrut()
            return enf
        } catch (err) {
            if (err.status === 506) {
                throw err
            }
            throw new SistemaLogicError(472, `Error ${err.type}: ${err.message}`)
        }
    }
    static async put_sistema_parametros_configuracionSeriales_Celifrut(req) {
        try {
            const { serial } = req.data
            await VariablesDelSistema.modificar_serial(serial, "idCelifrut")
        } catch (err) {
            if (err.status === 523) {
                throw err
            }
            throw new SistemaLogicError(472, `Error ${err.type}: ${err.message}`)
        }
    }
    //#endregion

    static async check_mobile_version() {
        const apkLatest = path.join(__dirname, '..', '..', 'updates', 'mobile', 'latest.yml');
        const fileContents = fs.readFileSync(apkLatest, 'utf8');
        const latest = yaml.load(fileContents);
        return latest;
    }
    static async download_mobilApp(data) {
        const apkPath = path.join(__dirname, '..', '..', 'updates', 'mobile', data);
        // Verificar si el archivo existe
        if (!fs.existsSync(apkPath)) {
            throw { status: 404, message: 'File not found' };
        }
        return apkPath;
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
        await VariablesDelSistema.guardar_codigo_recuperacion_password(user[0]._id, codigo)
        return codigo
    }
    static async isNewVersion() {
        const apkLatest = path.join(__dirname, '..', '..', 'updates', 'desktop', 'latest.yml');
        const fileContents = fs.readFileSync(apkLatest, 'utf8');
        return fileContents
    }
    static async getCelifrutAppFile(filename) {
        const filePath = path.join(__dirname, '..', '..', 'updates', 'desktop', filename);
        const fileContents = fs.readFileSync(filePath);
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

module.exports.SistemaRepository = SistemaRepository
