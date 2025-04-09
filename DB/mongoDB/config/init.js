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
const db = {};

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

const initMongoDB = async () => {
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
        console.log("📦 Esquemas definidos para *Sistema*.");

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

const defineSchemasProceso = async (sysConn) => {
    try {

        db.Precios = await definePrecios(sysConn)
        db.Insumos = await defineInsumos(sysConn);
        db.RecordTipoInsumos = await defineRecordTipoInsumos(sysConn);
        db.frutaDescompuesta = await defineFrutaDescompuesta(sysConn);
        db.Clientes = await defineClientes(sysConn);
        db.recordClientes = await defineRecordClientes(sysConn);
        db.Proveedores = await defineproveedores(sysConn);
        db.recordProveedor = await defineRecordProveedor(sysConn);
        db.recordContenedores = await defineRecordContenedores(sysConn);
        db.Lotes = await defineLotes(sysConn);
        db.recordLotes = await defineRecordLotes(sysConn);
        db.Contenedores = await defineContenedores(sysConn);
        db.historialDescarte = await defineHistorialDescarte(sysConn);
        db.historialDespachoDescarte = await defineHistorialDespachoDescarte(sysConn);
        db.TurnoData = await defineTurnoData(sysConn);
        db.Indicadores = await defineIndicadores(sysConn);
        db.RegistrosCanastillas = await defineRegistroCanastillas(sysConn)

        db.RecordModificacion = await defineModificarElemento(sysConn)
        db.RecordCreacion = await defineCrearElemento(sysConn)
        db.RecordDelete = await defineDeleteRecords(sysConn)

    } catch (error) {
        console.error("Error durante la inicialización de MongoDB: creando los schemas", error);
    }
}

const defineSchemasSistema = async (sysConn) => {
    try {

        db.Cargo = await defineCargo(sysConn);
        db.recordCargo = await defineRecordcargo(sysConn);
        db.Usuarios = await defineUser(sysConn);
        db.recordUsuario = await defineRecordusuario(sysConn);
        db.ControlPlagas = await defineControlPlagas(sysConn);
        db.HigienePersonal = await defineHigienePersonal(sysConn);
        db.LimpiezaDiaria = await defineLimpiezaDiaria(sysConn);
        db.LimpiezaMensual = await defineLimpiezaMensual(sysConn);
        db.VolanteCalidad = await defineVolanteCalidad(sysConn);
        db.Errores = await defineErrores(sysConn);

    } catch (error) {
        console.error("Error durante la inicialización de MongoDB: creando los schemas", error);
    }
}

module.exports = {
    initMongoDB,
    db
};