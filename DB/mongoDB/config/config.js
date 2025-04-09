
const mongoose = require("mongoose");

const connectProcesoDB = async (url = '') => {

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

const connectSistemaDB = async () => {

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

const disconnectDB = (db) => {
  db.close((err) => {
    if (err) {
      console.log("Hubo un error al cerrar la conexión:", err);
    } else {
      console.log("Conexión cerrada exitosamente");
    }
  });
};

module.exports = {
  connectProcesoDB,
  connectSistemaDB,
  disconnectDB
};

