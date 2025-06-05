/**
 * @module DB/mongoDB/config/config
 * @summary Funciones utilitarias para la conexión y desconexión de bases de datos MongoDB usando Mongoose.
 * @description
 * Este módulo proporciona funciones para conectar y desconectar las bases de datos 'proceso' y 'sistema' del sistema,
 * gestionando los eventos de conexión y error para facilitar el monitoreo y la estabilidad.
 *
 * ### Funciones principales:
 * - {@link module:DB/mongoDB/config/config.connectProcesoDB}
 * - {@link module:DB/mongoDB/config/config.connectSistemaDB}
 * - {@link module:DB/mongoDB/config/config.disconnectDB}
 *
 * @see module:DB
 */
import mongoose from "mongoose";

/**
 * Conecta a la base de datos de procesos de MongoDB.
 *
 * @async
 * @function
 * @memberof module:DB/mongoDB/config/config
 * @param {string} [url] - URL de conexión a MongoDB. Si se omite, se utiliza la variable de entorno `MONGODB_PROCESO`.
 * @returns {Promise<mongoose.Connection>} Conexión activa a la base de datos de procesos.
 */
export const connectProcesoDB = async (url = '') => {

  let tipoBaseDatos

  if (url === '') {
    tipoBaseDatos = process.env.MONGODB_PROCESO;

  } else {
    tipoBaseDatos = url
  }
  try {

    const db = mongoose.createConnection(tipoBaseDatos);

    db.on("error", () => console.error("connection error:"));
    db.once("open", function () {
      console.log(`✅ Conectado a la base de datos ${tipoBaseDatos}.`);

    });
    return db;
  } catch (error) {
    console.error("Error conectando a la base de datos:", error);
  }
};

/**
 * Conecta a la base de datos del sistema de MongoDB.
 *
 * @async
 * @function
 * @memberof module:DB/mongoDB/config/config
 * @returns {Promise<mongoose.Connection>} Conexión activa a la base de datos del sistema.
 */
export const connectSistemaDB = async () => {

  let tipoBaseDatos = process.env.MONGODB_SISTEMA;

  try {

    const db = mongoose.createConnection(tipoBaseDatos);

    db.on("error", () => console.error("connection error:"));
    db.once("open", function () {
      console.log(`✅ Conectado a la base de datos ${tipoBaseDatos}.`);
    });
    return db;
  } catch (error) {
    console.error("Error conectando a la base de datos:", error);
  }
};

/**
 * Cierra la conexión a una base de datos MongoDB.
 *
 * @function
 * @memberof module:DB/mongoDB/config/config
 * @param {mongoose.Connection} db - Conexión activa a MongoDB que se va a cerrar.
 * @returns {void}
 */
export const disconnectDB = (db) => {
  db.close((err) => {
    if (err) {
      console.log("Hubo un error al cerrar la conexión:", err);
    } else {
      console.log("Conexión cerrada exitosamente");
    }
  });
};


