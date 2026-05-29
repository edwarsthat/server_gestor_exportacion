import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { ProcessError } from '../../Error/ProcessError.js';
import { db } from '../../DB/mongoDB/config/init.js';
import { registrarPasoLog } from '../api/helper/logs.js';
import { CARNET_ENUMS, TIPOS_IDENTIFICACION_ENUMS } from '../../constants/personal.js';
import { AREAS_SELECCION } from '../../constants/AreasProceso.js';
// La magia para tener __dirname:
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const inspeccion_calidad_path = path.join(__dirname, '..', '..', 'constants', 'inspeccionCalidad.json');
const observaciones_calidad_path = path.join(__dirname, '..', '..', 'constants', 'observacionesCalidad.json');
const tipo_fruta_path = path.join(__dirname, '..', '..', 'constants', 'tipo_fruta.json');


export class ConstantesDelSistema {
    static async get_info_formulario_inspeccion_fruta() {
        try {

            const inspeccionCalidadJSON = fs.readFileSync(inspeccion_calidad_path);
            const inspeccionCalidad = JSON.parse(inspeccionCalidadJSON);

            return inspeccionCalidad;

        } catch (err) {
            throw new ProcessError(526, `Error Obteniendo datos de inspeccionCalidadJSON ${err.name}`)
        }
    }
    static async get_constantes_sistema_observaciones_calidad() {
        try {
            const dataJSON = fs.readFileSync(observaciones_calidad_path);
            const data = JSON.parse(dataJSON);

            return data;

        } catch (err) {
            throw new ProcessError(410, `Error Obteniendo datos de inspeccionCalidadJSON ${err.name}`)
        }
    }
    static async get_constantes_sistema_tipo_frutas() {
        try {
            const dataJSON = fs.readFileSync(tipo_fruta_path);
            const data = JSON.parse(dataJSON);

            return data;

        } catch (err) {
            throw new ProcessError(540, `Error Obteniendo datos de inspeccionCalidadJSON ${err.name}`)
        }
    }
    static async get_constantes_sistema_tipo_frutas2(_id, session = null) {
        try {
            const filter = _id ? { _id } : {};
            const registros = await db.TipoFrutas.find(filter)
                .populate({ path: 'descartes', select: 'nombre descripcion seccion' })
                .session(session)
            return registros;
        } catch (err) {
            throw new ProcessError(540, `Error Obteniendo datos de inspeccionCalidadJSON ${err.name}`);
        }
    }
    static async get_constantes_sistema_calidades(_id, logId = null, session = null) {
        try {
            const filter = _id ? { _id } : {};
            const registros = await db.CalidadesExpFruta.find(filter)
                .populate({ path: 'tipoFruta', select: 'tipoFruta' })
                .session(session)
            if (logId) {
                await registrarPasoLog(logId, "ConstantesDelSistema.get_constantes_sistema_calidades", "Completado");
            }
            return registros;
        } catch (err) {
            throw new ProcessError(540, `Error Obteniendo datos de inspeccionCalidadJSON ${err.name}`);
        }
    }
    static async get_constantes_sistema_descartes(_id, logId = null, session = null) {
        try {
            const filter = _id ? { _id } : {};
            const registros = await db.Descartes.find(filter)
                .session(session)
            if (logId) {
                await registrarPasoLog(logId, "ConstantesDelSistema.get_constantes_sistema_descartes", "Completado");
            }
            return registros;
        } catch (err) {
            throw new ProcessError(540, `Error Obteniendo datos de inspeccionCalidadJSON ${err.name}`);
        }
    }
    static async get_constantes_carnets() {
        try {
            return CARNET_ENUMS;
        } catch (err) {
            throw new ProcessError(540, `Error Obteniendo datos de inspeccionCalidadJSON ${err.name}`)
        }
    }
    static async get_constantes_sistema_areasSeleccion() {
        try {
            return AREAS_SELECCION;
        } catch (err) {
            throw new ProcessError(540, `Error Obteniendo datos de inspeccionCalidadJSON ${err.name}`)
        }
    }
    static get_constantes_sistema_tiposIdentificacion() {
        return TIPOS_IDENTIFICACION_ENUMS;
    }
    static async get_constantes_sistema_paises_Exportacion() {
        const docs = await db.Paises.find({})
        return docs
    }
}



