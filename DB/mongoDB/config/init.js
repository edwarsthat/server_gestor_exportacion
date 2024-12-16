const { exec } = require('child_process');
const mongoose = require('mongoose');
const { connectProcesoDB, connectSistemaDB } = require('./config');
const { defineCargo } = require('../schemas/usuarios/schemaCargos');
const { defineUser } = require('../schemas/usuarios/schemaUsuarios');
const { defineFrutaDescompuesta } = require('../schemas/frutaDescompuesta/schemaFrutaDecompuesta');

const checkMongoDBRunning = () => {
    return new Promise((resolve) => {
        mongoose.connect(`mongodb://localhost:${process.env.MONGO_PORT}/`,
            { serverSelectionTimeoutMS: 5000 })
            .then(() => {
                mongoose.connection.close();
                resolve(true);
            })
            .catch(() => {
                resolve(false);
            });
    });
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
        const isMongoDBRunning = await checkMongoDBRunning();
        console.log("Probando MongoDB:", isMongoDBRunning);

        if (!isMongoDBRunning) {
            console.log("MongoDB no está en ejecución. Intentando iniciar...");
            await startMongoDB();
            console.log("Esperando a que MongoDB esté listo...");
            await waitForMongoDB();
        }

        console.log("Conectando a las bases de datos...");
        const procesoDB = await connectProcesoDB();
        const sistemaDb = await connectSistemaDB();

        await defineSchemasSistema(sistemaDb)
        await defineSchemasProceso(procesoDB)
        console.log("Conexiones establecidas con éxito.");
    } catch (error) {
        console.error("Error durante la inicialización de MongoDB:", error);
    }
};

const defineSchemasProceso = async (sysConn) => {
    try {

        const frutaDescompuesta = await defineFrutaDescompuesta(sysConn);

        global.frutaDescompuesta = frutaDescompuesta;

    } catch (error) {
        console.error("Error durante la inicialización de MongoDB: creando los schemas", error);
    }
}

const defineSchemasSistema = async (sysConn) => {
    try {

        const Cargo = await defineCargo(sysConn);
        const Usuarios = await defineUser(sysConn);

        global.Cargo = Cargo;
        global.Usuarios = Usuarios;

    } catch (error) {
        console.error("Error durante la inicialización de MongoDB: creando los schemas", error);
    }
}

module.exports.initMongoDB = initMongoDB;