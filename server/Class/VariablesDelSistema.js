import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { ProcessError } from '../../Error/ProcessError.js';
import { getRedisClient } from '../../DB/redis/init.js';
import { ConnectRedisError } from '../../Error/ConnectionErrors.js';

// 🪄 Magia para __dirname y __filename:
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const pathIDs = path.join(__dirname, '..', '..', 'inventory', 'seriales.json');
const canastillasPath = path.join(__dirname, '..', '..', 'inventory', 'canastillas.json');

export class VariablesDelSistema {

  static async generar_codigo_informe_calidad() {
    /**
 * Se genera el codigo calidad del sistema, el codigo se genera sienfo CA- los primero caracteres
 * Luego los segundo dos son los ultimos dos digitos del año
 * Luego los siguientes dos digitos son el mes del año
 * por ultimo el consecutivo que esta guardado en un archivo json dentro de inventory
 * 
 * @throws - Devuelve un error si hay algun error abriendo y guardadndo el archivo
 * @return {string} enf - El string con el codigo EF1-
 */
    try {

      const idsJSON = fs.readFileSync(pathIDs);
      const ids = JSON.parse(idsJSON);

      let fecha = new Date();
      let year = fecha.getFullYear().toString().slice(-2);
      let month = String(fecha.getMonth() + 1).padStart(2, "0");
      let calidad;
      if (ids.calidad < 10) {
        calidad = "CA-" + year + month + "0" + ids.calidad;
      } else {
        calidad = "CA-" + year + month + ids.calidad;
      }
      return calidad;
    } catch (e) {
      throw new ProcessError(506, `Error creando el codigo calidad: ${e.message}`)
    }
  }
  static async incrementar_codigo_informes_calidad() {
    /**
     * Funcion que aumenta en 1 el serial del codigo calidad que esta almacenado en el archivo json
     *  en inventario  seriales.json
     * 
     * @throws - Devuelve un error si hay algun error abriendo y guardadndo el archivo
     * @return {void} - no devuelve nada
     */
    try {
      const idsJSON = fs.readFileSync(pathIDs);
      const ids = JSON.parse(idsJSON);
      ids.calidad += 1;
      const newidsJSON = JSON.stringify(ids);
      fs.writeFileSync(pathIDs, newidsJSON);
    } catch (err) {
      throw new ProcessError(411, `Error incrementando el EF1 ${err.message}`)
    }
  }
  // #region inventario descartes

  // #region Datos del proceso

  static async reiniciarValores_proceso() {

    try {
      const cliente = await getRedisClient();
      const status = await cliente.get("statusProceso");

      if (status === 'on' || status === 'pause') {
        await this.set_hora_fin_proceso();
      }

      console.info("Valores del proceso reiniciados correctamente");

    } catch (err) {
      throw new ConnectRedisError(419, `Error con la conexion con redis sumar exportacion: ${err.name}`);
    }
  }

  //#region Constantes
  static async modificar_canastillas_inventario(nCanastillas, tipo) {
    try {
      if (!["canastillas", "canastillasPrestadas"].includes(tipo)) {
        throw new ProcessError(400, `Tipo inválido de canastillas: ${tipo}`);
      }
      if (!Number.isInteger(nCanastillas)) {
        throw new ProcessError(400, `La cantidad debe ser un número entero.`);
      }

      const canastillasJSON = fs.readFileSync(canastillasPath);
      const canastillas = JSON.parse(canastillasJSON);

      const canastillasActual = canastillas[tipo] ?? 0;

      if (canastillasActual + nCanastillas < 0) {
        throw new ProcessError(523, `Error modificando el inventario canastillas, no hay suficientes canastillas ${tipo}`)
      }


      canastillas[tipo] += nCanastillas;
      const newCanastillasJSON = JSON.stringify(canastillas);
      fs.writeFileSync(canastillasPath, newCanastillasJSON);
    } catch (err) {
      throw new ProcessError(523, `Error modificando el inventario canastillas ${err.message}`)
    }
  }
  static async set_canastillas_inventario(nCanastillas) {
    try {
      const canastillasJSON = fs.readFileSync(canastillasPath);
      const canastillas = JSON.parse(canastillasJSON);
      canastillas["canastillasPrestadas"] = nCanastillas;
      const newCanastillasJSON = JSON.stringify(canastillas);
      fs.writeFileSync(canastillasPath, newCanastillasJSON);
    } catch (err) {
      throw new ProcessError(523, `Error modificando el inventario canastillas ${err.message}`)
    }
  }

  // estado del proceso (usado por validaciones de acciones como agrupar fletes). Jp

  static async set_hora_inicio_proceso() {

  }
}
