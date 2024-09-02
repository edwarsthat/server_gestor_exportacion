const fs = require('fs');
const path = require('path');
const { ProcessError } = require('../../Error/ProcessError');
const { iniciarRedisDB } = require('../../DB/redis/init');
const { ConnectRedisError } = require('../../Error/ConnectionErrors');
const { obtener_datos_lotes_listaEmpaque_cajasSinPallet } = require('../mobile/utils/contenedoresLotes');
const { procesoEventEmitter } = require('../../events/eventos');

const pathIDs = path.join(__dirname, '..', '..', 'inventory', 'seriales.json');
const inventarioPath = path.join(__dirname, '..', '..', 'inventory', 'inventario.json');
const inventarioDesverdizadoPath = path.join(__dirname, '..', '..', 'inventory', 'inventarioDesverdizado.json');
const ordenVaceoPath = path.join(__dirname, '..', '..', 'inventory', 'OrdenDeVaceo.json');
const inventarioDescartesPath = path.join(__dirname, '..', '..', 'inventory', 'inventariodescarte.json');
const cajasSinPalletPath = path.join(__dirname, '..', '..', 'inventory', 'cajasSinPallet.json');
const observacionesCalidadPath = path.join(__dirname, '..', '..', 'constants', 'observacionesCalidad.json');


let inventarioFleg = false; // bandera que indica que el inventario se esta escribiendo
let inventarioDesFleg = false; // bandera que indica que el inventarioDesverdizado se esta escribiendo
let ordenVaceoFlag = false; //bandera que indica que la orden de vaceo se esta escribiendo
let inventarioDescarteFlag = false; // bandera que indica que el inventario descarte se está escribiendo
let cajasSinPalletFlag = false;

const clientePromise = iniciarRedisDB();

class VariablesDelSistema {
  // #region EF1 o Predios
  static async generarEF1() {
    /**
     * Se genera el codigo EF1 del sistema, el codigo se genera sienfo EF1- los primero caracteres
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
      let enf;
      if (ids.enf < 10) {
        enf = "EF1-" + year + month + "0" + ids.enf;
      } else {
        enf = "EF1-" + year + month + ids.enf;
      }
      return enf;
    } catch (e) {
      throw new ProcessError(406, `Error creando la EF1: ${e.message}`)
    }
  }
  static async procesarEF1(lote, inventario) {
    /**
   * Función que procesa un lote en el inventario y actualiza diversos valores como el predio vaciado
   * la cantidad de kilos vaciados y la suma de los kilos vaciados hoy
   *
   * @param {Object} lote - El lote a procesar.
   * @param {number} inventario - La cantidad de inventario a procesar.
   * @returns {Promise<void>} - Promesa que se resuelve cuando el procesamiento ha terminado.
   * @throws {ConnectRedisError} - Lanza un error si ocurre un problema con la conexión a Redis.
   */
    try {
      const cliente = await clientePromise;
      const kilosVaciados = lote.promedio * inventario;
      const kilosVaciadosExist = await cliente.exists("kilosVaciadosHoy");
      if (kilosVaciadosExist !== 1) {
        await cliente.set("kilosVaciadosHoy", 0);
      }

      let kilosVaciadosHoy = await cliente.get("kilosVaciadosHoy");

      if (isNaN(kilosVaciadosHoy)) {
        kilosVaciadosHoy = 0;
      }

      const kilosVaciadosRedis = Number(kilosVaciadosHoy) + Number(kilosVaciados);
      //se ingresa los datos a redis
      await cliente.set("descarteLavado", 0);
      await cliente.set("descarteEncerado", 0);
      await cliente.set("kilosVaciadosHoy", kilosVaciadosRedis);

      await this.modificar_predio_proceso(lote, cliente);
      await this.modificar_predio_proceso_descartes(lote, cliente);
      await this.modificar_predio_proceso_listaEmpaque(lote, cliente);

    } catch (err) {
      throw new ConnectRedisError(419, `Error con la conexion con redis ${err.name}`)
    }
  }
  static async obtenerEF1proceso() {
    /**
   * Obtiene los datos del predio procesando desde Redis.
   *
   * @returns {Promise<Object>} - Promesa que resuelve con los datos del predio procesando descartes.
   * @throws {ConnectRedisError} - Lanza un error si ocurre un problema al conectarse a Redis.
   */
    try {
      const cliente = await clientePromise;
      const predioData = await cliente.hGetAll("predioProcesando");
      return predioData
    } catch (err) {
      throw new ConnectRedisError(419, `Error con la conexion con redis ${err.name}`)
    }
  }
  static async obtenerEF1Descartes() {
    /**
   * Obtiene los datos de descartes del predio procesando desde Redis.
   *
   * @returns {Promise<Object>} - Promesa que resuelve con los datos del predio procesando descartes.
   * @throws {ConnectRedisError} - Lanza un error si ocurre un problema al conectarse a Redis.
   */
    try {
      const cliente = await clientePromise;
      const predioData = await cliente.hGetAll("predioProcesandoDescartes");
      return predioData
    } catch (err) {
      throw new ConnectRedisError(419, `Error con la conexion con redis ${err.name}`)
    }
  }
  static async obtener_EF1_listaDeEmpaque() {
    /**
* Obtiene los datos de lista de empaque del predio procesando desde Redis.
*
* @returns {Promise<Object>} - Promesa que resuelve con los datos del predio procesando descartes.
* @throws {ConnectRedisError} - Lanza un error si ocurre un problema al conectarse a Redis.
*/
    try {
      const cliente = await clientePromise;
      const predioData = await cliente.hGetAll("predioProcesandoListaEmpaque");
      return predioData
    } catch (err) {
      throw new ConnectRedisError(419, `Error con la conexion con redis ${err.name}`)
    }
  }
  static async incrementarEF1() {
    /**
     * Funcion que aumenta en 1 el serial del codigo EF1 que esta almacenado en el archivo json
     *  en inventario  seriales.json
     * 
     * @throws - Devuelve un error si hay algun error abriendo y guardadndo el archivo
     * @return {void} - no devuelve nada
     */
    try {
      const idsJSON = fs.readFileSync(pathIDs);
      const ids = JSON.parse(idsJSON);
      ids.enf += 1;
      const newidsJSON = JSON.stringify(ids);
      fs.writeFileSync(pathIDs, newidsJSON);
    } catch (err) {
      throw new ProcessError(411, `Error incrementando el EF1 ${err.message}`)
    }
  }
  static async incrementar_codigo_celifrut() {
    /**
   * Funcion que aumenta en 1 el serial del codigo idCelifrut que esta almacenado en el archivo json
   *  en inventario  seriales.json
   * 
   * @throws - Devuelve un error si hay algun error abriendo y guardadndo el archivo
   * @return {void} - no devuelve nada
   */
    try {
      const idsJSON = fs.readFileSync(pathIDs);
      const ids = JSON.parse(idsJSON);
      ids.idCelifrut += 1;
      const newidsJSON = JSON.stringify(ids);
      fs.writeFileSync(pathIDs, newidsJSON);
    } catch (err) {
      throw new ProcessError(411, `Error incrementando el serial celifrut ${err.message}`)
    }

  }
  static modificar_predio_proceso = async (lote, cliente) => {
    /**
   * Función que modifica la información del predio en proceso en Redis.
   *
   * @param {Object} lote - El lote con la información a actualizar.
   * @param {Object} cliente - El cliente de Redis.
   * @returns {Promise<void>} - Promesa que se resuelve cuando la modificación ha terminado.
   * @throws {ConnectRedisError} - Lanza un error si ocurre un problema con la conexión a Redis.
   */
    try {
      await cliente.hSet("predioProcesando", {
        _id: lote._id.toString(),
        enf: lote.enf,
        predio: lote.predio._id.toString(),
        nombrePredio: lote.predio.PREDIO,
        tipoFruta: lote.tipoFruta,
      });
    } catch (err) {
      throw new ConnectRedisError(419, `Error con la conexion con redis predio proceso: ${err.name}`)

    }
  }
  static modificar_predio_proceso_descartes = async (lote, cliente) => {
    /**
   * Función que modifica la información del predio en proceso descartes en Redis.
   *
   * @param {Object} lote - El lote con la información a actualizar.
   * @param {Object} cliente - El cliente de Redis.
   * @returns {Promise<void>} - Promesa que se resuelve cuando la modificación ha terminado.
   * @throws {ConnectRedisError} - Lanza un error si ocurre un problema con la conexión a Redis.
   */
    try {
      await cliente.hSet("predioProcesandoDescartes", {
        _id: lote._id.toString(),
        enf: lote.enf,
        predio: lote.predio._id.toString(),
        nombrePredio: lote.predio.PREDIO,
        tipoFruta: lote.tipoFruta,
      });

    } catch (err) {
      throw new ConnectRedisError(419, `Error con la conexion con redis predio descarte: ${err.name}`)
    }
  }
  static modificar_predio_proceso_listaEmpaque = async (lote) => {
    /**
   * Función que modifica la información del predio en proceso lista de empaque en Redis.
   *
   * @param {Object} lote - El lote con la información a actualizar.
   * @returns {Promise<void>} - Promesa que se resuelve cuando la modificación ha terminado.
   * @throws {ConnectRedisError} - Lanza un error si ocurre un problema con la conexión a Redis.
   */
    let cliente
    try {
      const clientePromise = iniciarRedisDB();
      cliente = await clientePromise;
      await cliente.hSet("predioProcesandoListaEmpaque", {
        _id: lote._id.toString(),
        enf: lote.enf,
        predio: lote.predio._id.toString(),
        nombrePredio: lote.predio.PREDIO,
        tipoFruta: lote.tipoFruta,
      });

    } catch (err) {
      throw new ConnectRedisError(419, `Error con la conexion con redis predio lista de empaque: ${err.name}`)
    } finally {
      if (cliente) {
        cliente.quit();
        console.log('Cerrando la conexión con Redis...');
      }
    }
  }
  static async generar_codigo_celifrut() {
    /**
     * Se genera el codigo celifrut , es un codigo que se asigna a un lote que se crea 
     * cuando se reprocesan los descartes de varios predios
     * 
     * @throws - Devuelve un error si hay algun error abriendo y guardadndo el archivo
     * @return {string}  - El string con el codigo Celifrut- mas el consecutivo
     */
    try {
      const idsJSON = fs.readFileSync(pathIDs);
      const ids = JSON.parse(idsJSON);

      return 'Celifrut-' + ids.idCelifrut;
    } catch (err) {
      throw new ProcessError(406, `Error creando el codigo celifrut: ${err.message}`)
    }
  }

  // #region inventario
  static async ingresarInventario(_id, canastillas) {
    /**
     * Funcion que guarda el numero de canastillas que van a ingresar al inventario
     * el inventario esta en un documento json en inventory
     * 
     * @param {string} _id - Es el id correspondiente al lote
     * @param {number} canastillas - Es el numero de canastillas que se le va a asignar al id
     * @throws debe devolver un error si hay algun problema abriendo y escribiendo el archivo de inventario
     * @return {void} 
     */
    try {
      if (inventarioFleg) throw new ProcessError(413, "Error el archivo se esta escribiendo")

      inventarioFleg = true
      const inventarioJSON = fs.readFileSync(inventarioPath);
      const inventario = JSON.parse(inventarioJSON);

      inventario[_id] = canastillas;

      const newInventarioJSON = JSON.stringify(inventario);
      fs.writeFileSync(inventarioPath, newInventarioJSON);
    } catch (err) {
      throw new ProcessError(410, `Error Guardando datos en el inventario ${err.message}`)
    } finally {
      inventarioFleg = false
    }
  }
  static async ingresarInventarioDesverdizado(_id, canastillas) {
    /**
     * Funcion que guarda el numero de canastillas que van a ingresar al inventario desverdizado
     * el inventario esta en un documento json en inventory
     * 
     * @param {string} _id - Es el id correspondiente al lote
     * @param {number} canastillas - Es el numero de canastillas que se le va a asignar al id
     * @throws debe devolver un error si hay algun problema abriendo y escribiendo el archivo de inventario
     * @return {void} 
     */
    try {
      if (inventarioDesFleg) throw new ProcessError(413, "Error el archivo se esta escribiendo")

      inventarioDesFleg = true
      const inventarioJSON = fs.readFileSync(inventarioDesverdizadoPath);
      const inventario = JSON.parse(inventarioJSON);

      inventario[_id] = canastillas;

      const newInventarioJSON = JSON.stringify(inventario);
      fs.writeFileSync(inventarioDesverdizadoPath, newInventarioJSON);
    } catch (err) {
      throw new ProcessError(410, `Error Guardando datos en el inventario desverdizado ${err.essage}`)
    } finally {
      inventarioDesFleg = false
    }
  }
  static async getInventario() {
    /**
     * Funcion que envia el inventario que esta en el archivo inventario.json
     * 
     * @throws envia error 413 si el archivo se esta escribiendo en esos momentos
     * @throws - envia error 410 si hay algun error abriendo el archivo
     * 
     * @return {object} - Envia un objeto donde las keys son el _id del lote y el valor es la cantidad
     *                    de canastillas en el inventario
     */
    try {
      if (inventarioFleg) throw new ProcessError(413, "Error el archivo se esta escribiendo")

      const inventarioJSON = fs.readFileSync(inventarioPath);
      const inventario = JSON.parse(inventarioJSON);

      return inventario;

    } catch (err) {
      throw new ProcessError(410, `Error Obteniendo datos del inventario  ${err.name}`)
    } finally {
      inventarioFleg = false
    }
  }
  static async get_item_inventario(id) {
    /**
   * Funcion que obtiene un item del inventario  según su id.
   * 
   * @param {string} id - El id del item en el inventario.
   * 
   * @throws {ProcessError} - Envia error 413 si el archivo se está escribiendo en esos momentos.
   * @throws {ProcessError} - Envia error 410 si hay algún error abriendo el archivo o si el id no existe.
   * 
   * @return {number} - Devuelve la cantidad de canastillas en el inventario correspondiente al id proporcionado.
   */
    try {
      if (inventarioFleg) throw new ProcessError(413, "Error el archivo se esta escribiendo")

      const inventarioJSON = fs.readFileSync(inventarioPath);
      const inventario = JSON.parse(inventarioJSON);

      if (!Object.prototype.hasOwnProperty.call(inventario, id)) {
        return false
      }
      return inventario[id];

    } catch (err) {
      throw new ProcessError(410, `Error Obteniendo datos del inventario ${err.name}`)
    } finally {
      inventarioFleg = false
    }
  }
  static async getInventarioDesverdizado() {
    /**
     * Funcion que envia el inventario desverdizado que esta en el archivo inventarioDesverdizado.json
     * 
     * @throws envia error 413 si el archivo se esta escribiendo en esos momentos
     * @throws - envia error 410 si hay algun error abriendo el archivo
     * 
     * @return {object} - Envia un objeto donde las keys son el _id del lote y el valor es la cantidad
     *                    de canastillas en el inventario
     */
    try {
      if (inventarioDesFleg) throw new ProcessError(413, "Error el archivo se esta escribiendo")

      const inventarioJSON = fs.readFileSync(inventarioDesverdizadoPath);
      const inventario = JSON.parse(inventarioJSON);

      return inventario;

    } catch (err) {
      throw new ProcessError(410, `Error Obteniendo datos del inventario desverdizado ${err.name}`)
    } finally {
      inventarioDesFleg = false
    }
  }
  static async modificarInventario(_id, canastillas) {
    /**
     * 
     * Funcion que modifica el inventario restando las canastillas que entran 
     * y si el resultado es 0 o menos, se borra el elemento
     * 
     * @param {string} _id - String con el _id del lote
     * @param {number} canastillas - numero de canastillas a borrar
     */
    if (inventarioFleg) throw new ProcessError(413, "Error el archivo se esta escribiendo")
    try {
      inventarioFleg = true
      const inventarioJSON = fs.readFileSync(inventarioPath);
      const inventario = JSON.parse(inventarioJSON);
      let flagEliminarItem = false;

      if (!(_id in inventario)) {
        inventario[_id] = 0;
      }

      inventario[_id] = inventario[_id] - canastillas

      if (inventario[_id] <= 0) {
        delete inventario[_id]
        flagEliminarItem = true;
      }
      const newInventarioJSON = JSON.stringify(inventario);
      fs.writeFileSync(inventarioPath, newInventarioJSON);

      return flagEliminarItem;

    } catch (err) {
      throw new ProcessError(418, `Error modificando datos del inventario json ${err.name}`)
    } finally {
      inventarioFleg = false
    }
  }
  static async modificarInventario_desverdizado(_id, canastillas) {
    /**
     * 
     * Funcion que modifica el inventario restando las canastillas que entran 
     * y si el resultado es 0 o menos, se borra el elemento
     * 
     * @param {string} _id - String con el _id del lote
     * @param {number} canastillas - numero de canastillas a borrar
     */
    if (inventarioDesFleg) throw new ProcessError(413, "Error el archivo se esta escribiendo")
    try {
      inventarioDesFleg = true
      const inventarioJSON = fs.readFileSync(inventarioDesverdizadoPath);
      const inventario = JSON.parse(inventarioJSON);

      if (!(_id in inventario)) {
        inventario[_id] = 0;
      }

      inventario[_id] = inventario[_id] - canastillas

      if (inventario[_id] <= 0) {
        delete inventario[_id]
      }
      const newInventarioJSON = JSON.stringify(inventario);
      fs.writeFileSync(inventarioDesverdizadoPath, newInventarioJSON);

    } catch (err) {
      throw new ProcessError(418, `Error modificando datos del inventario desverdizado json ${err.name}`)
    } finally {
      inventarioDesFleg = false
    }
  }
  static async getOrdenVaceo() {
    /**
     * Funcion que obtiene los datos de la orden de vaceo desde un archivo JSON.
     *
     * @returns {Promise<Object>} - Promesa que resuelve al contenido del inventario como un objeto.
     * @throws {ProcessError} - Lanza un error si el archivo se está escribiendo o si ocurre un problema al leer o parsear el archivo.
     */
    try {
      if (ordenVaceoFlag) throw new ProcessError(413, "Error el archivo se esta escribiendo")

      const inventarioJSON = fs.readFileSync(ordenVaceoPath);
      const inventario = JSON.parse(inventarioJSON);

      return inventario;

    } catch (err) {
      throw new ProcessError(410, `Error Obteniendo datos de la orden de vaceo ${err.name}`)
    } finally {
      ordenVaceoFlag = false
    }
  }
  static async borrarDatoOrdenVaceo(_id) {
    /**
     * Función que borra un dato de la orden de vaceo identificado por su ID.
     *
     * @param {string} _id - El ID del dato a borrar.
     * @returns {Promise<void>} - Promesa que se resuelve cuando el dato ha sido borrado.
     * @throws {ProcessError} - Lanza un error si el archivo se está escribiendo, si el item no existe en la orden de vaceo, o si ocurre un problema al leer, parsear, o escribir el archivo.
     */
    try {
      if (ordenVaceoFlag) throw new ProcessError(413, "Error el archivo se esta escribiendo")
      ordenVaceoFlag = true
      const ordenVaceoJSON = fs.readFileSync(ordenVaceoPath);
      const ordenVaceo = JSON.parse(ordenVaceoJSON);


      let index = ordenVaceo.indexOf(_id);
      if (index === -1) throw new ProcessError(420, "Error el item no existe en la orden de vaceo");

      ordenVaceo.splice(index, 1);

      const newOrdenVaceoJSON = JSON.stringify(ordenVaceo);
      fs.writeFileSync(ordenVaceoPath, newOrdenVaceoJSON);

    } catch (err) {
      console.log(err)
      throw new ProcessError(410, "Error Obteniendo datos de la orden de vaceo")
    } finally {
      ordenVaceoFlag = false
    }
  }
  static async modificarOrdenVaceo(data) {
    /**
   * Modifica los datos de la orden de vaciado y los guarda en un archivo.
   *
   * @param {Object} data - Objeto que contiene los nuevos datos de la orden de vaciado.
   * @throws {ProcessError} - Lanza un error si el archivo se está escribiendo o si ocurre un problema al modificar los datos.
   */
    if (ordenVaceoFlag) throw new ProcessError(413, "Error el archivo se esta escribiendo")
    try {
      ordenVaceoFlag = true

      const ordenVaceo = data;

      procesoEventEmitter.emit("orden_vaceo_update", {
        ordenVaceo: ordenVaceo
      });

      const newOrdenVaceoJSON = JSON.stringify(ordenVaceo);
      fs.writeFileSync(ordenVaceoPath, newOrdenVaceoJSON);

    } catch (err) {
      throw new ProcessError(418, `Error modificando datos de la orden de vaceo ${err.name}`)
    } finally {
      ordenVaceoFlag = false
    }
  }

  // #region Lista de empaque
  static async ingresar_item_cajas_sin_pallet(item) {
    /**
   * Función que ingresa un item a la lista de cajas sin pallet.
   *
   * @param {Object} item - Objeto del item a agregar a la lista de cajas sin pallet.
   * @returns {Promise<void>} - Promesa que se resuelve cuando la operación se completa.
   * @throws {ProcessError} - Lanza un error si ocurre un problema al guardar los datos de las cajas sin pallet.
   */
    try {
      if (cajasSinPalletFlag) throw new ProcessError(413, "Error el archivo se esta escribiendo")

      cajasSinPalletFlag = true
      const cajasSinPalletJSON = fs.readFileSync(cajasSinPalletPath);
      const cajasSinPallet = JSON.parse(cajasSinPalletJSON);

      cajasSinPallet.push(item)

      const newCajasSinPalletJSON = JSON.stringify(cajasSinPallet);
      fs.writeFileSync(cajasSinPalletPath, newCajasSinPalletJSON);
    } catch (err) {
      throw new ProcessError(410, `Error Guardando datos de las cajas sin pallet: ${err.name}`)
    } finally {
      cajasSinPalletFlag = false
    }
  }
  static async obtener_cajas_sin_pallet() {
    /**
   * Función que obtiene la lista de cajas sin pallet.
   *
   * @returns {Promise<Array>} - Promesa que resuelve a un array con la lista de cajas sin pallet.
   * @throws {ProcessError} - Lanza un error si ocurre un problema al obtener los datos de las cajas sin pallet.
   */
    try {
      if (cajasSinPalletFlag) throw new ProcessError(413, "Error el archivo se esta escribiendo")

      cajasSinPalletFlag = true
      const cajasSinPalletJSON = fs.readFileSync(cajasSinPalletPath);
      const cajasSinPallet = JSON.parse(cajasSinPalletJSON);

      const data = await obtener_datos_lotes_listaEmpaque_cajasSinPallet(cajasSinPallet);
      return data
    } catch (err) {
      throw new ProcessError(410, `Error obteniendo datos de las cajas sin pallet: ${err.name}`)
    } finally {
      cajasSinPalletFlag = false
    }
  }
  static async eliminar_items_cajas_sin_pallet(items) {
    /**
   * Elimina elementos específicos de las cajas sin pallet.
   *
   * @param {Array<number>} items - Índices de los elementos a eliminar de las cajas sin pallet.
   * @returns {Promise<Array<Object>>} - Promesa que resuelve al arreglo de cajas eliminadas.
   * @throws {ProcessError} - Lanza un error si ocurre un problema al eliminar los elementos o si el archivo está siendo escrito.
   */
    try {
      if (cajasSinPalletFlag) throw new ProcessError(413, "Error el archivo se esta escribiendo")
      cajasSinPalletFlag = true

      const cajasSinPalletJSON = fs.readFileSync(cajasSinPalletPath);
      const cajasSinPallet = JSON.parse(cajasSinPalletJSON);
      let cajas = [];

      for (let i = 0; i < items.length; i++) {
        cajas.push(cajasSinPallet.splice(items[i], 1)[0]);
      }

      const newCajasSinPalletJSON = JSON.stringify(cajasSinPallet);
      fs.writeFileSync(cajasSinPalletPath, newCajasSinPalletJSON);

      return cajas;
    } catch (err) {
      throw new ProcessError(410, `Error eliminando los items ${err.message}`);
    } finally {
      cajasSinPalletFlag = false;
    }
  }
  static async restar_items_cajas_sin_pallet(item, cajas) {
    /**
   * Resta una cantidad específica de cajas de un ítem en las cajas sin pallet.
   *
   * @param {number} item - Índice del ítem al que se le restarán las cajas.
   * @param {number} cajas - Cantidad de cajas a restar del ítem.
   * @returns {Promise<Object>} - Promesa que resuelve al objeto del ítem modificado.
   * @throws {ProcessError} - Lanza un error si ocurre un problema al restar las cajas o si el archivo está siendo escrito.
   */
    try {
      if (cajasSinPalletFlag) throw new ProcessError(413, "Error el archivo se esta escribiendo")
      cajasSinPalletFlag = true

      const cajasSinPalletJSON = fs.readFileSync(cajasSinPalletPath);
      const cajasSinPallet = JSON.parse(cajasSinPalletJSON);

      let newItem = JSON.parse(JSON.stringify(cajasSinPallet[item]));
      newItem.cajas = cajas;

      cajasSinPallet[item].cajas -= cajas

      if (cajasSinPallet[item].cajas <= 0) {
        cajasSinPallet.splice(item, 1)[0];
      }

      const newCajasSinPalletJSON = JSON.stringify(cajasSinPallet);
      fs.writeFileSync(cajasSinPalletPath, newCajasSinPalletJSON);

      return newItem;
    } catch (err) {
      throw new ProcessError(410, `Error eliminando los items ${err.message}`);
    } finally {
      cajasSinPalletFlag = false;
    }
  }
  // #region inventario descartes
  static async obtener_inventario_descartes() {
    /**
   * Función que obtiene el inventario de descartes desde un archivo JSON.
   * 
   * @returns {Promise<Object>} - Promesa que se resuelve con el inventario de descartes.
   * @throws {ProcessError} - Lanza un error si ocurre un problema durante la lectura o el parseo del archivo.
   */
    if (inventarioDescarteFlag) throw new ProcessError(413, "Error el archivo se esta escribiendo");
    try {
      inventarioDescarteFlag = true
      const inventarioJSON = fs.readFileSync(inventarioDescartesPath);
      const inventario = JSON.parse(inventarioJSON);

      return inventario

    } catch (err) {
      throw new ProcessError(418, `Error modificando datos del inventario descarte json: ${err.name}`)
    } finally {
      inventarioDescarteFlag = false
    }
  }
  static async modificar_inventario_descarte(_id, data, tipoDescarte, lote) {
    /**
   * Modifica los datos del inventario de descarte y los guarda en un archivo JSON.
   *
   * @param {Object} data - Objeto que contiene los datos a modificar en el inventario de descarte.
   * @throws {ProcessError} - Lanza un error si el archivo se está escribiendo o si ocurre un problema al modificar los datos.
   */
    if (inventarioDescarteFlag) throw new ProcessError(413, "Error el archivo se esta escribiendo");
    try {
      const inventarioJSON = fs.readFileSync(inventarioDescartesPath);
      const inventario = JSON.parse(inventarioJSON);

      const index = inventario.findIndex(item => item._id === _id)
      const descartes = ['descarteGeneral', 'pareja', 'balin', 'extra', 'suelo']
      if (index !== -1) {

        if (!Object.prototype.hasOwnProperty.call(inventario[index], tipoDescarte)) {
          inventario[index][tipoDescarte] = {}
          Object.keys(data).map(item => {
            if (descartes.includes(item)) {
              inventario[index][tipoDescarte][item] = data[item]
            }
          })
        } else {
          Object.keys(data).map(item => {
            if (descartes.includes(item)) {
              inventario[index][tipoDescarte][item] += data[item]
            }
          })
        }
      } else {
        const newItem = { _id: _id, fecha: lote.fechaIngreso, tipoFruta: lote.tipoFruta }
        newItem[tipoDescarte] = {}
        Object.keys(data).map(item => {

          if (descartes.includes(item)) {
            newItem[tipoDescarte][item] = data[item]
          }
        })
        inventario.push(newItem)
      }

      //se borran los items que ya no tienen fruta
      for (let i = inventario.length - 1; i >= 0; i--) {
        const totalDescarteLavado = inventario[i].descarteLavado ? Object.values(inventario[i].descarteLavado).reduce((acu, item) => acu += item, 0) : 0;
        const totalDescarteEncerado = inventario[i].descarteEncerado ? Object.values(inventario[i].descarteEncerado).reduce((acu, item) => acu += item, 0) : 0;
        const total = totalDescarteLavado + totalDescarteEncerado;
        if (total === 0) {
          inventario.splice(i, 1);
        }
      }
      const newInventarioJSON = JSON.stringify(inventario);
      fs.writeFileSync(inventarioDescartesPath, newInventarioJSON);

    } catch (err) {
      throw new ProcessError(418, `Error modificando datos del inventario descarte json ${err.name}`)
    } finally {
      inventarioDescarteFlag = false
    }
  }
  static async restar_fruta_inventario_descarte(kilos, tipoFruta) {
    /**
   * Resta una cantidad específica de kilos de fruta del inventario de descarte según el tipo de fruta.
   *
   * @param {Object} kilos - Objeto que contiene los kilos a restar de cada tipo de descarte.
   * @param {string} tipoFruta - Tipo de fruta del que se restarán los kilos.
   * @throws {ProcessError} - Lanza un error si ocurre un problema al restar los kilos o si el archivo está siendo escrito.
   */
    if (inventarioDescarteFlag) throw new ProcessError(413, "Error el archivo se esta escribiendo");
    try {
      inventarioDescarteFlag = true
      let inventoryOut = {}
      const inventarioJSON = fs.readFileSync(inventarioDescartesPath);
      const inventario = JSON.parse(inventarioJSON);


      inventario.sort((a, b) => {
        const fechaA = new Date(a.fecha);
        const fechaB = new Date(b.fecha);
        return fechaA - fechaB; // Si fechaA es anterior, será un valor negativo, y por lo tanto a quedará antes de b
      });

      const descartes = Object.keys(kilos)
      //se recorre el tipo de descarte

      for (let descarteIndex = 0; descarteIndex < descartes.length; descarteIndex++) {
        const items = Object.keys(kilos[descartes[descarteIndex]]);
        //se recorre el item de cada tipo de descarte
        for (let itemIndex = 0; itemIndex < items.length; itemIndex++) {
          let item = kilos[descartes[descarteIndex]][items[itemIndex]];
          //se recorre el inventario de descarte
          if (item === 0) {
            continue;
          }
          for (let i = 0; i < inventario.length; i++) {
            //se resta solo a los items que son del mismo tipo de fruta
            if (inventario[i].tipoFruta === tipoFruta &&
              Object.prototype.hasOwnProperty.call(inventario[i], descartes[descarteIndex])
            ) {
              if (!inventoryOut[inventario[i]._id]) {
                inventoryOut[inventario[i]._id] = {
                  descarteEncerado: {
                    descarteGeneral: 0,
                    pareja: 0,
                    balin: 0,
                    extra: 0,
                    suelo: 0
                  },
                  descarteLavado: {
                    descarteGeneral: 0,
                    pareja: 0,
                    balin: 0
                  }
                }
              }
              const itemInv = inventario[i][descartes[descarteIndex]][items[itemIndex]];
              if (itemInv === item) {
                inventoryOut[inventario[i]._id][descartes[descarteIndex]][items[itemIndex]] = itemInv
                inventario[i][descartes[descarteIndex]][items[itemIndex]] = 0
                item = 0
              } else if (itemInv < item) {
                item -= itemInv
                inventoryOut[inventario[i]._id][descartes[descarteIndex]][items[itemIndex]] = itemInv
                inventario[i][descartes[descarteIndex]][items[itemIndex]] = 0
              } else if (itemInv > item) {
                inventoryOut[inventario[i]._id][descartes[descarteIndex]][items[itemIndex]] = item
                inventario[i][descartes[descarteIndex]][items[itemIndex]] -= item
                item = 0
              }

            }
            if (item === 0) {
              break;
            }
          }
        }
      }

      //se borran los items que ya no tienen fruta
      for (let i = inventario.length - 1; i >= 0; i--) {
        const totalDescarteLavado = inventario[i].descarteLavado ?
          Object.values(inventario[i].descarteLavado).reduce((acu, item) => acu += item, 0) : 0;

        const totalDescarteEncerado = inventario[i].descarteEncerado ?
          Object.values(inventario[i].descarteEncerado).reduce((acu, item) => acu += item, 0) : 0;

        const total = totalDescarteLavado + totalDescarteEncerado;
        if (total < 0.5) {
          inventario.splice(i, 1);

        }
      }

      //se guarda el nuevo inventario
      const newInventarioJSON = JSON.stringify(inventario);
      fs.writeFileSync(inventarioDescartesPath, newInventarioJSON);
      return inventoryOut;

    } catch (err) {
      console.log(err.message)
      throw new ProcessError(418, `Error modificando las variables del sistema: ${err.message}`)
    } finally {
      inventarioDescarteFlag = false

    }

  }
  static async reprocesar_predio(lote, kilosTotal) {
    try {
      /**
     * Función que reprocesa un lote en el inventario y actualiza diversas variables del sistema relacionadas con el reprocesamiento.
     *
     * @param {Object} lote - El lote a reprocesar.
     * @param {number} kilosTotal - La cantidad total de kilos a reprocesar.
     * @returns {Promise<void>} - Promesa que se resuelve cuando el reprocesamiento ha terminado.
     * @throws {ProcessError} - Lanza un error si ocurre un problema durante el reprocesamiento.
     */
      const cliente = await clientePromise;
      const kilosReprocesadorExist = await cliente.exists("kilosReprocesadorHoy");
      if (kilosReprocesadorExist !== 1) {
        await cliente.set("kilosReprocesadorHoy", 0);
      }

      let kilosReprocesadosHoy = await cliente.get("kilosReprocesadorHoy");

      if (isNaN(kilosReprocesadosHoy)) {
        kilosReprocesadosHoy = 0;
      }
      const kilosReprocesadosRedis = Number(kilosReprocesadosHoy) + Number(kilosTotal);

      await cliente.set("kilosReprocesadorHoy", kilosReprocesadosRedis);
      await cliente.set("descarteLavado", 0);
      await cliente.set("descarteEncerado", 0);
      await this.modificar_predio_proceso(lote, cliente)
      await this.modificar_predio_proceso_descartes(lote, cliente)
      await this.modificar_predio_proceso_listaEmpaque(lote, cliente)

    } catch (err) {
      throw new ProcessError(418, `Error modificando las variables del sistema: ${err.name}`)
    }
  }
  static async reprocesar_predio_celifrut(lote, kilosTotal) {
    try {
      /**
     * Función que reprocesa un lote de tipo celifrutm lo envia a las aplicacion de descarte y lista de empaque.
     *
     * @param {Object} lote - El lote a reprocesar.
     * @param {number} kilosTotal - La cantidad total de kilos a reprocesar.
     * @returns {Promise<void>} - Promesa que se resuelve cuando el reprocesamiento ha terminado.
     * @throws {ProcessError} - Lanza un error si ocurre un problema durante el reprocesamiento.
     */
      const cliente = await clientePromise;
      const kilosReprocesadorExist = await cliente.exists("kilosReprocesadorHoy");
      if (kilosReprocesadorExist !== 1) {
        await cliente.set("kilosReprocesadorHoy", 0);
      }

      let kilosReprocesadosHoy = await cliente.get("kilosReprocesadorHoy");

      if (isNaN(kilosReprocesadosHoy)) {
        kilosReprocesadosHoy = 0;
      }
      const kilosReprocesadosRedis = Number(kilosReprocesadosHoy) + Number(kilosTotal);

      await cliente.set("kilosReprocesadorHoy", kilosReprocesadosRedis);
      await cliente.set("descarteLavado", 0);
      await cliente.set("descarteEncerado", 0);
      await cliente.hSet("predioProcesandoDescartes", {
        _id: lote._id.toString(),
        enf: lote.enf,
        predio: "Celifrut",
        nombrePredio: "Celifrut",
        tipoFruta: lote.tipoFruta,
      });
      await cliente.hSet("predioProcesando", {
        _id: lote._id.toString(),
        enf: lote.enf,
        predio: "Celifrut",
        nombrePredio: "Celifrut",
        tipoFruta: lote.tipoFruta,
      });
      await cliente.hSet("predioProcesandoListaEmpaque", {
        _id: lote._id.toString(),
        enf: lote.enf,
        predio: "Celifrut",
        nombrePredio: "Celifrut",
        tipoFruta: lote.tipoFruta,
      });

    } catch (err) {
      throw new ProcessError(418, `Error modificando las variables del sistema: ${err.name}`)
    }
  }

  // #region Datos del proceso
  static async get_kilos_procesados_hoy() {
    let cliente
    try {
      const clientePromise = iniciarRedisDB();
      cliente = await clientePromise;
      let kilosProcesados = await cliente.get("kilosProcesadosHoy");
      if (kilosProcesados === undefined) kilosProcesados = 0;

      return kilosProcesados;
    } catch (err) {
      throw new ConnectRedisError(419, `Error con la conexion con redis obteniendo kilosProcesados: ${err.name}`)

    } finally {
      if (cliente) {
        cliente.quit();
        console.log('Cerrando la conexión con Redis...');
      }
    }
  }
  static async get_kilos_exportacion_hoy() {
    let cliente
    try {
      const clientePromise = iniciarRedisDB();
      cliente = await clientePromise;
      let kilosExportacion = await cliente.get("kilosExportacionHoy");
      if (kilosExportacion === undefined) kilosExportacion = 0;

      return kilosExportacion;
    } catch (err) {
      throw new ConnectRedisError(419, `Error con la conexion con redis obteniendo kilosProcesados: ${err.name}`)

    } finally {
      if (cliente) {
        cliente.quit();
        console.log('Cerrando la conexión con Redis...');
      }
    }
  }
  static async set_hora_inicio_proceso() {
    let cliente
    try {
      const hoy = new Date();
      const zonaHoraria = 'America/Bogota';

      const clientePromise = iniciarRedisDB();
      cliente = await clientePromise;

      const fechaInicioRedis = await cliente.get('fechaInicioProceso');

      if (!fechaInicioRedis) {
        // Si no hay fecha en Redis, establecer la fecha actual
        await cliente.set('fechaInicioProceso', hoy.toISOString());
        return hoy;
      }

      // Convertir las fechas a la zona horaria especificada y establecer la hora a las 00:00:00
      const fechaRedis = new Date(fechaInicioRedis);
      const fechaRedisLocal = new Date(fechaRedis.toLocaleString('en-US', { timeZone: zonaHoraria }));
      fechaRedisLocal.setHours(0, 0, 0, 0);

      const fechaAhoraLocal = new Date(hoy.toLocaleString('en-US', { timeZone: zonaHoraria }));
      fechaAhoraLocal.setHours(0, 0, 0, 0);
      // Comparar las fechas
      if (fechaRedisLocal.getDay() !== fechaAhoraLocal.getDay()) {
        // Si la fecha en Redis es anterior, actualizar con la fecha actual
        await cliente.set('fechaInicioProceso', hoy.toISOString());
        return hoy;
      } else {
        // Si la fecha en Redis es del mismo día o posterior, no cambiar
        return fechaInicioRedis;
      }

    } catch (err) {
      throw new ConnectRedisError(419, `Error con la conexion con redis obteniendo kilosProcesados: ${err.name}`)

    } finally {
      if (cliente) {
        cliente.quit();
        console.log('Cerrando la conexión con Redis...');
      }
    }
  }
  static async ingresar_kilos_procesados(kilos) {
    let cliente
    try {
      const clientePromise = iniciarRedisDB();
      cliente = await clientePromise;
      let kilosProcesados = await cliente.get("kilosProcesadosHoy");
      if (kilosProcesados === undefined || isNaN(kilosProcesados)) kilosProcesados = 0;

      kilosProcesados = kilos + Number(kilosProcesados);

      await cliente.set("kilosProcesadosHoy", kilosProcesados);

      return kilosProcesados;
    } catch (err) {
      throw new ConnectRedisError(419, `Error con la conexion con redis sumando kilosProcesados: ${err.name}`)

    } finally {
      if (cliente) {
        cliente.quit();
        console.log('Cerrando la conexión con Redis...');
      }
    }
  }
  static async ingresar_exportacion(kilos) {
    /**
   * Función que ingresa y actualiza los kilos de exportación en el sistema.
   *
   * @param {number} kilos - Cantidad de kilos a agregar al total de kilos exportados hoy.
   * @returns {Promise<void>} - Promesa que se resuelve cuando la operación se completa.
   * @throws {ConnectRedisError} - Lanza un error si ocurre un problema al actualizar los kilos en Redis.
   */
    let cliente

    try {
      const clientePromise = iniciarRedisDB();
      cliente = await clientePromise;
      let kilosProcesadosHoy = await cliente.get("kilosProcesadosHoy");
      if (kilosProcesadosHoy === undefined || isNaN(kilosProcesadosHoy)) kilosProcesadosHoy = 0;

      let kilosExportacionHoy = await cliente.get("kilosExportacionHoy");
      if (kilosExportacionHoy === undefined || isNaN(kilosExportacionHoy)) kilosExportacionHoy = 0;

      const new_kilos = Number(kilosProcesadosHoy) + kilos;
      const kilosExportacion = Number(kilosExportacionHoy) + kilos;

      await cliente.set("kilosProcesadosHoy", new_kilos);
      await cliente.set("kilosExportacionHoy", kilosExportacion);

      return { kilosProcesadosHoy: new_kilos, kilosExportacionHoy: kilosExportacion }
    } catch (err) {
      throw new ConnectRedisError(419, `Error con la conexion con redis sumar exportacion: ${err.name}`)

    } finally {
      if (cliente) {
        cliente.quit();
        console.log('Cerrando la conexión con Redis...');
      }
    }
  }
  static async reiniciarValores_proceso() {
    let cliente

    try {
      const clientePromise = iniciarRedisDB();
      cliente = await clientePromise;
      await cliente.set("kilosProcesadosHoy", 0);
      await cliente.set("kilosExportacionHoy", 0);
      await cliente.set("fechaInicioProceso", '');
    } catch (err) {
      throw new ConnectRedisError(419, `Error con la conexion con redis sumar exportacion: ${err.name}`)

    } finally {
      if (cliente) {
        cliente.quit();
        console.log('Cerrando la conexión con Redis...');
      }
    }
  }

  //#region Constantes
  static async obtener_observaciones_calidad() {
    try {

      const observacionesJSON = fs.readFileSync(observacionesCalidadPath);
      const observaciones = JSON.parse(observacionesJSON);

      return observaciones;
    } catch (err) {
      throw new ProcessError(410, `Error Obteniendo observaciones calidad ${err.name}`)
    }
  }
}

module.exports.VariablesDelSistema = VariablesDelSistema