/**
 * @file Configuración e inicialización de la base de datos MongoDB para el sistema.
 *
 * @summary
 * Este módulo centraliza la lógica para:<br>
 * - Verificar y arrancar el servicio de MongoDB si es necesario.<br>
 * - Establecer conexiones independientes a las bases de datos <b>'proceso'</b> y <b>'sistema'</b>.<br>
 * - Registrar y definir todos los esquemas de Mongoose para cada base de datos.<br>
 * - Exponer la función principal <code>initMongoDB</code> para inicializar todo el sistema de base de datos.
 *
 * @description
 * <h3>Estructura principal del módulo</h3>
 * <ul>
 *   <li><b>checkMongoDBRunning</b>: Verifica si MongoDB responde.</li>
 *   <li><b>startMongoDB</b>: Intenta iniciar el servicio de MongoDB.</li>
 *   <li><b>waitForMongoDB</b>: Espera hasta que MongoDB esté listo.</li>
 *   <li><b>initMongoDB</b>: Orquesta la verificación, arranque y conexión a las bases de datos y define los esquemas.</li>
 *   <li><b>defineSchemasProceso</b> / <b>defineSchemasSistema</b>: Registra los modelos de Mongoose para cada base de datos.</li>
 * </ul>
 *
 * @module DB/mongoDB/config/init
 */


require('dotenv').config('.');

const { exec } = require('child_process');
const mongoose = require('mongoose');
const { connectProcesoDB, connectSistemaDB } = require('./config');
const { defineCargo } = require('../schemas/usuarios/schemaCargos');
const { defineUser } = require('../schemas/usuarios/schemaUsuarios');
const { defineFrutaDescompuesta } = require('../schemas/frutaDescompuesta/schemaFrutaDecompuesta');
const { defineRecordcargo } = require('../schemas/usuarios/schemaRecordCargos');
const { defineRecordusuario } = require('../schemas/usuarios/schemaRecordUsuarios');
const { defineControlPlagas } = require('../schemas/calidad/schemaControlPlagas');
const { defineHigienePersonal } = require('../schemas/calidad/schemaHigienePersonal');
const { defineLimpiezaDiaria } = require('../schemas/calidad/schemaLimpiezaDiaria');
const { defineLimpiezaMensual } = require('../schemas/calidad/schemaLimpiezaMensual');
const { defineVolanteCalidad } = require('../schemas/calidad/schemaVolanteCalidad');
const { defineClientes } = require('../schemas/clientes/schemaClientes');
const { defineRecordClientes } = require('../schemas/clientes/schemaRecordClientes');
const { defineproveedores } = require('../schemas/proveedores/schemaProveedores');
const { defineLotes } = require('../schemas/lotes/schemaLotes');
const { defineContenedores } = require('../schemas/contenedores/schemaContenedores');
const { defineRecordContenedores } = require('../schemas/contenedores/schemaRecordContenedores');
const { defineErrores } = require('../schemas/errors/schemaErrores');
const { defineRecordTipoInsumos } = require('../schemas/insumos/RecordSchemaInsumos');
const { defineInsumos } = require('../schemas/insumos/schemaInsumos');
const { defineHistorialDescarte } = require('../schemas/lotes/schemaHistorialDescarte');
const { defineHistorialDespachoDescarte } = require('../schemas/lotes/schemaHistorialDespachosDescartes');
const { defineTurnoData } = require('../schemas/proceso/TurnoData');
const { defineRecordProveedor } = require('../schemas/proveedores/schemaRecordProveedores');
const { defineRecordLotes } = require('../schemas/lotes/schemaRecordLotes');
const { defineIndicadores } = require('../schemas/indicadores/schemaIndicadoresProceso');
const { definePrecios } = require('../schemas/precios/schemaPrecios');
const { defineModificarElemento } = require('../schemas/transaccionesRecord/ModificacionesRecord');
const { defineCrearElemento } = require('../schemas/transaccionesRecord/AddsRecord');
const { defineDeleteRecords } = require('../schemas/transaccionesRecord/DeleteRecord');
const { defineRegistroCanastillas } = require('../schemas/canastillas/canastillasRegistrosSchema');
const { defineClientesNacionales } = require('../schemas/clientes/schemaClientesNacionales');
const { defineAuditLogs } = require('../schemas/audit/AuditLogSchema');
const db = {};

 /**
 * Verifica si el servicio de MongoDB está corriendo y responde a conexiones.
 *
 * Intenta establecer una conexión temporal a la base de datos definida en la variable de entorno `MONGODB_SISTEMA`.
 * Si la conexión es exitosa, la cierra inmediatamente y retorna `true`. Si falla, retorna `false`.
 *
 * @async
 * @function checkMongoDBRunning
 * @memberof module:DB/mongoDB/config/init
 * @returns {Promise<boolean>} Retorna `true` si MongoDB responde, `false` si no es posible conectarse.
 */
const checkMongoDBRunning = async () => {
    try {
        console.log("🧪 Probando conexión con MongoDB...");

        const db = mongoose.createConnection(process.env.MONGODB_SISTEMA, {
            serverSelectionTimeoutMS: 2000, // Tiempo máximo de espera
        });

        // Esperamos a que se conecte, para evitar mentirle al usuario
        await db.asPromise();
        console.log("✅ MongoDB respondió. Está vivito y coleando.");

        await db.close(); // Cerramos porque somos civilizados
        return true;
    } catch (error) {
        console.log("❌ No se pudo establecer conexión con MongoDB.");
        console.error(`🔍 Detalle del error: ${error.message || "Sin mensaje. Aún más misterioso."}`);
        return false;
    }
};

/**
 * Intenta iniciar el servicio de MongoDB ejecutando el comando `mongod` en el puerto 27017.
 *
 * Utiliza el módulo `child_process` para lanzar el proceso y retorna una promesa que se resuelve o rechaza según el resultado.
 *
 * @function startMongoDB
 * @memberof module:DB/mongoDB/config/init
 * @returns {Promise<string>} Promesa que se resuelve con el mensaje de inicio o se rechaza con el error correspondiente.
 */
const startMongoDB = () => {
    return new Promise((resolve, reject) => {
        exec("mongod --port 27017", (error, stdout, stderr) => {
            if (error) {
                reject(`Error al iniciar MongoDB: ${error}`);
            } else if (stderr) {
                reject(`Error de MongoDB: ${stderr}`);
            } else {
                resolve(`MongoDB iniciado: ${stdout}`);
            }
        });
    });
};

/**
 * Espera de forma activa hasta que el servicio de MongoDB esté listo para aceptar conexiones.
 *
 * Llama periódicamente a `checkMongoDBRunning` cada segundo hasta que la base de datos responda.
 *
 * @function waitForMongoDB
 * @memberof module:DB/mongoDB/config/init
 * @returns {Promise<void>} Promesa que se resuelve cuando MongoDB está listo.
 */
const waitForMongoDB = () => {
    return new Promise((resolve) => {
        const checkInterval = setInterval(async () => {
            const isRunning = await checkMongoDBRunning();
            if (isRunning) {
                clearInterval(checkInterval);
                resolve();
            }
        }, 1000);
    });
};

/**
 * Inicializa la conexión a MongoDB, verifica el estado del servicio, lo arranca si es necesario,
 * y define todos los esquemas de la base de datos para el sistema y los procesos.
 *
 * @async
 * @function initMongoDB
 * @memberof module:DB/mongoDB/config/init
 * @returns {Promise<Array>} Retorna un array con las conexiones a las bases de datos [procesoDB, sistemaDb].
 *
 * @example
 * // Inicializar MongoDB y obtener las conexiones
 * const [procesoDB, sistemaDb] = await initMongoDB();
 */
async function initMongoDB() {
    try {
        console.log("🔍 Verificando estado de MongoDB...");

        const isMongoDBRunning = await checkMongoDBRunning();
        console.log(`⚙️  MongoDB en ejecución: ${isMongoDBRunning ? "✅ Sí" : "❌ No"}`);

        if (!isMongoDBRunning) {
            console.log("🚫 MongoDB no está activo.");
            console.log("🛠️  Intentando iniciar MongoDB...");
            await startMongoDB();
            console.log("⏳ Esperando a que MongoDB esté listo para recibir conexiones...");
            await waitForMongoDB();
        }

        console.log("🔗 Iniciando conexión a las bases de datos...");

        const procesoDB = await connectProcesoDB();
        const sistemaDb = await connectSistemaDB();

        console.log("🧬 Definiendo esquemas para cada base de datos...");
        await defineSchemasSistema(sistemaDb);
        console.log("📦 Esquemas definidos para *Sistema*." );

        await defineSchemasProceso(procesoDB);
        console.log("📦 Esquemas definidos para *Proceso*.");

        console.log("🎉 Conexiones establecidas con éxito. MongoDB está listo para causar caos (o al menos guardar datos).");

        return [procesoDB, sistemaDb];

    } catch (error) {
        console.error("💥 Error durante la inicialización de MongoDB:");
        console.error(error);
        console.log("💀 Y así termina otra gloriosa sesión de inicialización fallida.");
    }
};

/**
 * @typedef {Object} MongooseConnection
 * @see https://mongoosejs.com/docs/api/connection.html
 */

/**
 * Registra y define todos los esquemas de Mongoose para la base de datos de procesos.
 *
 * @async
 * @function defineSchemasProceso
 * @memberof module:DB/mongoDB/config/init
 * @param {Object} sysConn - Conexión activa a la base de datos de procesos (Mongoose Connection).
 * @returns {Promise<void>} Promesa que se resuelve cuando todos los esquemas han sido definidos.
 *
 * @throws {Error} Si ocurre un error durante la definición de los esquemas.
 */
const defineSchemasProceso = async (sysConn) => {
    try {
        console.log("🔍 Iniciando definición de schemas proceso...");

        // 1. Primero definimos el esquema de auditoría ya que otros lo necesitan
        console.log("⚡ Definiendo AuditLog...");
        const AuditLog = await defineAuditLogs(sysConn)
        console.log("✅ AuditLog definido");

        // 2. Esquemas relacionados con clientes (base para otras dependencias)
        console.log("⚡ Definiendo Clientes...");
        db.Clientes = await defineClientes(sysConn);
        console.log("✅ Clientes definido");

        console.log("⚡ Definiendo ClientesNacionales...");
        db.ClientesNacionales = await defineClientesNacionales(sysConn);
        console.log("✅ ClientesNacionales definido");

        console.log("⚡ Definiendo recordClientes...");
        db.recordClientes = await defineRecordClientes(sysConn);
        console.log("✅ recordClientes definido");

        // 3. Esquemas relacionados con proveedores
        console.log("⚡ Definiendo Proveedores...");
        db.Proveedores = await defineproveedores(sysConn);
        console.log("✅ Proveedores definido");

        console.log("⚡ Definiendo recordProveedor...");
        db.recordProveedor = await defineRecordProveedor(sysConn);
        console.log("✅ recordProveedor definido");

        // 4. Esquemas de descartes (dependen de clientes)
        console.log("⚡ Definiendo historialDespachoDescarte...");
        db.historialDespachoDescarte = await defineHistorialDespachoDescarte(sysConn, AuditLog);
        console.log("✅ historialDespachoDescarte definido");

        console.log("⚡ Definiendo historialDescarte...");
        db.historialDescarte = await defineHistorialDescarte(sysConn);
        console.log("✅ historialDescarte definido");

        console.log("⚡ Definiendo frutaDescompuesta...");
        db.frutaDescompuesta = await defineFrutaDescompuesta(sysConn, AuditLog);
        console.log("✅ frutaDescompuesta definido");

        // 5. Esquemas independientes
        console.log("⚡ Definiendo Precios...");
        db.Precios = await definePrecios(sysConn);
        console.log("✅ Precios definido");

        console.log("⚡ Definiendo Insumos...");
        db.Insumos = await defineInsumos(sysConn);
        console.log("✅ Insumos definido");

        console.log("⚡ Definiendo RecordTipoInsumos...");
        db.RecordTipoInsumos = await defineRecordTipoInsumos(sysConn);
        console.log("✅ RecordTipoInsumos definido");

        console.log("⚡ Definiendo TurnoData...");
        db.TurnoData = await defineTurnoData(sysConn);
        console.log("✅ TurnoData definido");

        console.log("⚡ Definiendo Indicadores...");
        db.Indicadores = await defineIndicadores(sysConn);
        console.log("✅ Indicadores definido");

        // 6. Esquemas relacionados con contenedores (dependen de lotes)
        console.log("⚡ Definiendo Contenedores...");
        db.Contenedores = await defineContenedores(sysConn);
        console.log("✅ Contenedores definido");

        console.log("⚡ Definiendo recordContenedores...");
        db.recordContenedores = await defineRecordContenedores(sysConn);
        console.log("✅ recordContenedores definido");        // 7. Esquemas de canastillas
        console.log("⚡ Definiendo RegistrosCanastillas...");
        db.RegistrosCanastillas = await defineRegistroCanastillas(sysConn);
        console.log("✅ RegistrosCanastillas definido");

        // 8. Esquemas relacionados con lotes (dependen de proveedores y descartes)
        console.log("⚡ Definiendo Lotes...");
        db.Lotes = await defineLotes(sysConn, AuditLog);
        console.log("✅ Lotes definido");

        console.log("⚡ Definiendo recordLotes...");
        db.recordLotes = await defineRecordLotes(sysConn);
        console.log("✅ recordLotes definido");

        // 9. Esquemas de registro de transacciones
        console.log("⚡ Definiendo RecordModificacion...");
        db.RecordModificacion = await defineModificarElemento(sysConn);
        console.log("✅ RecordModificacion definido");

        console.log("⚡ Definiendo RecordCreacion...");
        db.RecordCreacion = await defineCrearElemento(sysConn);
        console.log("✅ RecordCreacion definido");

        console.log("⚡ Definiendo RecordDelete...");
        db.RecordDelete = await defineDeleteRecords(sysConn);
        console.log("✅ RecordDelete definido");

        console.log("🎉 Todos los schemas de proceso han sido definidos correctamente.")

    } catch (error) {
        console.error("Error durante la inicialización de MongoDB: creando los schemas", error);
    }
}

/**
 * Registra y define todos los esquemas de Mongoose para la base de datos del sistema.
 *
 * @async
 * @function defineSchemasSistema
 * @memberof module:DB/mongoDB/config/init
 * @param {Object} sysConn - Conexión activa a la base de datos del sistema (Mongoose Connection).
 * @returns {Promise<void>} Promesa que se resuelve cuando todos los esquemas han sido definidos.
 *
 * @throws {Error} Si ocurre un error durante la definición de los esquemas.
 */
const defineSchemasSistema = async (sysConn) => {
    try {
        console.log("🔍 Iniciando definición de schemas sistema...");

        console.log("⚡ Definiendo Cargo...");
        db.Cargo = await defineCargo(sysConn);
        console.log("✅ Cargo definido");

        console.log("⚡ Definiendo recordCargo...");
        db.recordCargo = await defineRecordcargo(sysConn);
        console.log("✅ recordCargo definido");

        console.log("⚡ Definiendo Usuarios...");
        db.Usuarios = await defineUser(sysConn);
        console.log("✅ Usuarios definido");

        console.log("⚡ Definiendo recordUsuario...");
        db.recordUsuario = await defineRecordusuario(sysConn);
        console.log("✅ recordUsuario definido");

        console.log("⚡ Definiendo ControlPlagas...");
        db.ControlPlagas = await defineControlPlagas(sysConn);
        console.log("✅ ControlPlagas definido");

        console.log("⚡ Definiendo HigienePersonal...");
        db.HigienePersonal = await defineHigienePersonal(sysConn);
        console.log("✅ HigienePersonal definido");

        console.log("⚡ Definiendo LimpiezaDiaria...");
        db.LimpiezaDiaria = await defineLimpiezaDiaria(sysConn);
        console.log("✅ LimpiezaDiaria definido");

        console.log("⚡ Definiendo LimpiezaMensual...");
        db.LimpiezaMensual = await defineLimpiezaMensual(sysConn);
        console.log("✅ LimpiezaMensual definido");

        console.log("⚡ Definiendo VolanteCalidad...");
        db.VolanteCalidad = await defineVolanteCalidad(sysConn);
        console.log("✅ VolanteCalidad definido");

        console.log("⚡ Definiendo Errores...");
        db.Errores = await defineErrores(sysConn);
        console.log("✅ Errores definido");

        console.log("🎉 Todos los schemas de sistema han sido definidos correctamente.");

    } catch (error) {
        console.error("Error durante la inicialización de MongoDB: creando los schemas", error);
    }
}

/** @exports DB/mongoDB/config/init */
module.exports = {
    initMongoDB,
    db
};